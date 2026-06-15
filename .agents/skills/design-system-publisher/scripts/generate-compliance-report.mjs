#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const cwd = process.cwd();
const cwdRealpath = fs.realpathSync(cwd);
const skillRootRealpath = fs.realpathSync(skillRoot);
const now = new Date().toISOString();
const rawArgs = process.argv.slice(2);
const checkTimeoutMs = 5 * 60 * 1000;
const checkMaxBuffer = 10 * 1024 * 1024;
const reportOutputLimit = 12000;

let out = 'design-compliance-report.generated.md';
let platform = 'all';
let allowFallback = false;
let runChecks = false;
let requireTokenSource = false;
let requireTokenArtifacts = false;

function failUsage(message) {
  console.error(`ERROR ${message}`);
  process.exit(2);
}

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === '--platform') {
    if (!rawArgs[i + 1] || rawArgs[i + 1].startsWith('--')) failUsage('--platform requires a value');
    platform = rawArgs[i + 1];
    i += 1;
  } else if (arg.startsWith('--platform=')) {
    platform = arg.slice('--platform='.length);
  } else if (arg === '--allow-fallback' || arg === '--init') {
    allowFallback = true;
  } else if (arg === '--require-token-source') {
    requireTokenSource = true;
  } else if (arg === '--require-token-artifacts') {
    requireTokenArtifacts = true;
  } else if (arg === '--run-checks') {
    runChecks = true;
  } else if (arg === '--no-run-checks') {
    runChecks = false;
  } else if (arg === '--out') {
    if (!rawArgs[i + 1] || rawArgs[i + 1].startsWith('--')) failUsage('--out requires a value');
    out = rawArgs[i + 1];
    i += 1;
  } else if (!arg.startsWith('--')) {
    if (out !== 'design-compliance-report.generated.md') failUsage(`unexpected positional argument "${arg}"`);
    out = arg;
  } else {
    failUsage(`unknown option "${arg}"`);
  }
}

if (!['all', 'web', 'native'].includes(platform)) {
  failUsage(`invalid --platform "${platform}". Expected web, native, or all.`);
}

if (!runChecks && (requireTokenSource || requireTokenArtifacts)) {
  failUsage('--require-token-source and --require-token-artifacts require --run-checks because report-only mode does not execute validation');
}

function exists(p) {
  return fs.existsSync(path.join(cwd, p));
}

function isInsidePath(file, directory) {
  const relative = path.relative(directory, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isInsideRepo(resolvedPath) {
  const relative = path.relative(cwd, resolvedPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function nearestExistingAncestor(file) {
  let current = file;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return current;
}

function resolveOutputPath(value) {
  const resolved = path.resolve(cwd, value);
  if (!isInsideRepo(resolved)) {
    failUsage(`--out must stay inside the repo: ${value}`);
  }
  const existingAncestor = nearestExistingAncestor(path.dirname(resolved));
  if (!existingAncestor) failUsage(`--out parent could not be resolved: ${value}`);
  const parentRealpath = fs.realpathSync(existingAncestor);
  if (!isInsidePath(parentRealpath, cwdRealpath)) {
    failUsage(`--out parent must stay inside the repo after resolving symlinks: ${value}`);
  }
  if (fs.existsSync(resolved)) {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink()) failUsage(`--out must not be a symlink: ${value}`);
    const real = fs.realpathSync(resolved);
    if (!isInsidePath(real, cwdRealpath)) {
      failUsage(`--out must stay inside the repo after resolving symlinks: ${value}`);
    }
  }
  return resolved;
}

function assertExistingPathInsideRepo(file) {
  const real = fs.realpathSync(file);
  if (!isInsidePath(real, cwdRealpath)) {
    failUsage(`path must stay inside the repo after resolving symlinks: ${file}`);
  }
}

function assertExistingPathInsideRepoOrSkill(file) {
  const real = fs.realpathSync(file);
  if (!isInsidePath(real, cwdRealpath) && !isInsidePath(real, skillRootRealpath)) {
    failUsage(`path must stay inside the repo or bundled skill after resolving symlinks: ${file}`);
  }
}

function readPackageJson() {
  const packagePath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packagePath)) return null;
  assertExistingPathInsideRepo(packagePath);
  return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
}

function detectPackageManager(packageJson) {
  const declared = packageJson?.packageManager;
  if (declared) {
    const name = declared.split('@')[0];
    if (['pnpm', 'yarn', 'npm'].includes(name)) return name;
  }
  if (exists('pnpm-lock.yaml')) return 'pnpm';
  if (exists('yarn.lock')) return 'yarn';
  if (exists('package-lock.json') || exists('npm-shrinkwrap.json')) return 'npm';
  if (packageJson) return 'npm';
  return null;
}

function scriptArgs(packageManager, scriptName, extraArgs = []) {
  if (!packageManager) return null;
  return extraArgs.length > 0 ? ['run', scriptName, '--', ...extraArgs] : ['run', scriptName];
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/^[A-Za-z0-9_@%+=:,./-]+$/.test(part) ? part : JSON.stringify(part)))
    .join(' ');
}

function redactOutput(value) {
  return value
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,})\b/g, '[REDACTED_TOKEN]')
    .replace(/(["']?[\w.-]*(?:TOKEN|SECRET|PASSWORD|PASS|CREDENTIAL|AUTH|API[_-]?KEY|PRIVATE[_-]?KEY|ACCESS[_-]?KEY)[\w.-]*["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,}]+)/gi, '$1[REDACTED]')
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/g, '$1 [REDACTED]');
}

function prepareOutput(value) {
  const redacted = redactOutput(value || '');
  if (redacted.length <= reportOutputLimit) return redacted;
  return `${redacted.slice(0, reportOutputLimit)}\n...output truncated at ${reportOutputLimit} characters...`;
}

function runCheck(name, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: checkMaxBuffer,
    shell: process.platform === 'win32',
    timeout: checkTimeoutMs,
  });
  const rawOutput = `${result.stdout || ''}${result.stderr || ''}`.trim();
  const status = result.error ? 1 : result.status ?? 1;
  const errorOutput = result.error
    ? `${result.error.message}${result.error.code === 'ETIMEDOUT' ? ` after ${checkTimeoutMs}ms` : ''}`
    : rawOutput;
  const output = prepareOutput([options.note, errorOutput].filter(Boolean).join('\n').trim());
  return {
    name,
    command: formatCommand(command, args),
    critical: options.critical !== false,
    skipped: false,
    status,
    output,
  };
}

function skipCheck(name, reason) {
  return {
    name,
    command: '',
    critical: false,
    skipped: true,
    status: null,
    output: reason,
  };
}

const packageJson = readPackageJson();
const packageScripts = packageJson?.scripts || {};
const packageManager = detectPackageManager(packageJson);
const checks = [];

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  assertExistingPathInsideRepoOrSkill(file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readManifestForChecks() {
  const repoManifest = readJsonIfExists(path.join(cwd, '.design-system/design-system-manifest.json'));
  if (repoManifest) return repoManifest;
  if (!allowFallback) return null;
  return readJsonIfExists(path.join(skillRoot, 'assets/design-system-manifest.example.json'));
}

const manifestForChecks = readManifestForChecks();
const requiredCheckPattern = /^[A-Za-z0-9:_@./-]+$/;
const rawRequiredChecks = Array.isArray(manifestForChecks?.requiredChecks)
  ? manifestForChecks.requiredChecks.filter((check) => typeof check === 'string' && check.trim())
  : [];
const invalidRequiredChecks = rawRequiredChecks.filter((check) => !requiredCheckPattern.test(check));
const requiredChecks = new Set(rawRequiredChecks.filter((check) => requiredCheckPattern.test(check)));
const builtInDesignChecks = new Set([
  'ds:validate-contract',
  'ds:scan-raw-styles',
  'ds:compliance-report',
]);
const defaultPackageChecks = ['typecheck', 'lint', 'test'];
const optionalPackageChecks = ['test:a11y', 'test:e2e:a11y', 'test:visual', 'storybook:build'];

function isRequiredCheck(name) {
  return requiredChecks.has(name);
}

function failedRequiredCheck(name, reason) {
  return {
    name,
    command: '',
    critical: true,
    skipped: false,
    status: 1,
    output: reason,
  };
}

for (const invalidCheck of invalidRequiredChecks) {
  checks.push(failedRequiredCheck(
    'manifest requiredChecks',
    `manifest requiredChecks contains an invalid script/check name: ${JSON.stringify(invalidCheck)}`
  ));
}

function addPackageScriptCheck(scriptName) {
  if (!runChecks) {
    checks.push(skipCheck(scriptName, 'not run by report generator; pass --run-checks to execute checks'));
  } else if (packageScripts[scriptName] && packageManager) {
    checks.push(runCheck(scriptName, packageManager, scriptArgs(packageManager, scriptName)));
  } else if (packageScripts[scriptName]) {
    const reason = 'package manager could not be detected';
    checks.push(isRequiredCheck(scriptName) ? failedRequiredCheck(scriptName, reason) : skipCheck(scriptName, reason));
  } else {
    const reason = `package.json script "${scriptName}" is not defined`;
    checks.push(isRequiredCheck(scriptName) ? failedRequiredCheck(scriptName, reason) : skipCheck(scriptName, reason));
  }
}

function collectPackageChecks() {
  const scriptNames = new Set(defaultPackageChecks);
  for (const requiredCheck of requiredChecks) {
    if (!builtInDesignChecks.has(requiredCheck)) scriptNames.add(requiredCheck);
  }
  for (const optionalCheck of optionalPackageChecks) {
    if (packageScripts[optionalCheck]) scriptNames.add(optionalCheck);
  }
  return scriptNames;
}

for (const scriptName of collectPackageChecks()) addPackageScriptCheck(scriptName);

function addDesignCheck(scriptName, displayName, fallbackArgs, nativeExtraArgs = []) {
  if (!runChecks) {
    checks.push(skipCheck(displayName, 'not run by report generator; pass --run-checks to execute checks'));
  } else if (packageScripts[scriptName] && packageManager) {
    checks.push(runCheck(`repo-native ${scriptName}`, packageManager, scriptArgs(packageManager, scriptName, nativeExtraArgs)));
    checks.push(runCheck(displayName, 'node', fallbackArgs, {
      note: `bundled ${displayName} gate also ran to enforce generator flags`,
    }));
  } else if (packageScripts[scriptName]) {
    const reason = 'package manager could not be detected';
    checks.push(isRequiredCheck(scriptName) ? failedRequiredCheck(displayName, reason) : skipCheck(displayName, reason));
  } else {
    checks.push(runCheck(displayName, 'node', fallbackArgs, {
      note: `package.json script "${scriptName}" is not defined; using bundled fallback`,
    }));
  }
}

if (runChecks) {
  const validationArgs = [
    path.join(scriptDir, 'validate-design-contract.mjs'),
    ...(allowFallback ? ['--allow-fallback'] : []),
    ...(requireTokenSource ? ['--require-token-source'] : []),
    ...(requireTokenArtifacts ? ['--require-token-artifacts'] : []),
  ];

  const validationExtraArgs = [
    ...(allowFallback ? ['--allow-fallback'] : []),
    ...(requireTokenSource ? ['--require-token-source'] : []),
    ...(requireTokenArtifacts ? ['--require-token-artifacts'] : []),
  ];

  addDesignCheck('ds:validate-contract', 'design contract validation', validationArgs, validationExtraArgs);
  addDesignCheck('ds:scan-raw-styles', 'design source scan', [
    path.join(scriptDir, 'scan-raw-styles.mjs'),
    '.',
    '--platform',
    platform,
  ], ['--platform', platform]);
} else {
  checks.push(skipCheck('design contract validation', 'not run by report generator; pass --run-checks to execute checks'));
  checks.push(skipCheck('design source scan', 'not run by report generator; pass --run-checks to execute checks'));
}

function statusLabel(check) {
  if (!check) return 'TODO';
  if (check.skipped) return 'SKIP';
  return check.status === 0 ? 'PASS' : 'FAIL';
}

function statusFor(names) {
  const check = names.map((name) => checks.find((candidate) => candidate.name === name)).find(Boolean);
  return check ? statusLabel(check) : 'TODO';
}

function formatCheck(check) {
  const output = check.output || '(no output)';
  const fence = '`'.repeat(Math.max(3, [...output.matchAll(/`+/g)].reduce((max, match) => Math.max(max, match[0].length + 1), 3)));
  const safeName = check.name.replace(/[\r\n]+/g, ' ');
  return [
    `### ${safeName}`,
    '',
    `Status: ${statusLabel(check)}`,
    check.command ? `Command: \`${check.command.replace(/`/g, '\\`')}\`` : '',
    '',
    `${fence}txt`,
    output,
    fence,
    '',
  ].filter(Boolean).join('\n');
}

const report = `# Design Compliance Report

Generated at: ${now}

> Draft scaffold: automated checks are summarized here, but the manual sections below must be completed before this report is treated as compliance proof.

## Scope

- Task: fill in from PR or agent task
- Target platforms: web/native as applicable
- Recipe: fill in selected layout recipe

## Contract Inputs

- .design-system/design-system-manifest.json: ${exists('.design-system/design-system-manifest.json') ? 'present' : 'missing, fallback examples may be used'}
- .design-system/component-spec.json: ${exists('.design-system/component-spec.json') ? 'present' : 'missing, fallback examples may be used'}
- .design-system/layout-recipes.json: ${exists('.design-system/layout-recipes.json') ? 'present' : 'missing, fallback examples may be used'}
- .design-system/token-policy.json: ${exists('.design-system/token-policy.json') ? 'present' : 'missing, fallback examples may be used'}
- package manager: ${packageManager || 'not detected'}
- manifest required checks: ${requiredChecks.size > 0 ? [...requiredChecks].join(', ') : 'not available'}
- check execution mode: ${runChecks ? 'run-checks' : 'report-only'}

## Automated Checks

${checks.map(formatCheck).join('\n')}

## Design System Usage - Manual Completion Required

- Components used: TODO
- Tokens used: TODO
- New tokens introduced: none / TODO
- New variants introduced: none / TODO

## Required States - Manual Completion Required

- loading: TODO
- empty: TODO
- error: TODO
- success: TODO
- disabled/submitting, if applicable: TODO

## Static Compliance - Manual Completion Required

- Raw colors: TODO
- Raw spacing/sizing: TODO
- Raw typography: TODO
- Direct DOM/RN primitives: TODO
- Inline style bypasses: TODO
- Unknown tokens: TODO

## Accessibility - Manual Completion Required

- Icon-only labels: TODO
- Form labels: TODO
- Dialog titles: TODO
- Disabled/loading interaction behavior: TODO
- Keyboard/screen-reader checks, if applicable: TODO

## Checks Run

\`\`\`bash
${checks.filter((check) => !check.skipped).map((check) => check.command).join('\n') || '(no automated checks executed)'}
\`\`\`

## Results

- Typecheck: ${statusLabel(checks.find((check) => check.name === 'typecheck'))}
- Lint: ${statusLabel(checks.find((check) => check.name === 'lint'))}
- Design contract validation: ${statusLabel(checks.find((check) => check.name === 'design contract validation'))}
- Design source scan: ${statusLabel(checks.find((check) => check.name === 'design source scan'))}
- Unit/component tests: ${statusLabel(checks.find((check) => check.name === 'test'))}
- Accessibility tests: ${statusFor(['test:a11y', 'test:e2e:a11y'])}
- Visual tests: ${statusFor(['test:visual', 'storybook:build'])}

## Deviations

- None, or list deviations with rationale and follow-up.
`;

const outPath = resolveOutputPath(out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, report, 'utf8');
console.log(`Wrote ${path.relative(cwd, outPath) || outPath}`);

const failedCriticalChecks = checks.filter((check) => check.critical && !check.skipped && check.status !== 0);
if (failedCriticalChecks.length > 0) {
  process.exit(1);
}
