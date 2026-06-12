#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
const now = new Date().toISOString();
const rawArgs = process.argv.slice(2);

let out = 'design-compliance-report.generated.md';
let platform = 'all';
let allowFallback = false;

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === '--platform') {
    platform = rawArgs[i + 1] || platform;
    i += 1;
  } else if (arg.startsWith('--platform=')) {
    platform = arg.slice('--platform='.length);
  } else if (arg === '--allow-fallback' || arg === '--init') {
    allowFallback = true;
  } else if (arg === '--out') {
    out = rawArgs[i + 1] || out;
    i += 1;
  } else if (!arg.startsWith('--')) {
    out = arg;
  }
}

if (!['all', 'web', 'native'].includes(platform)) {
  console.error(`Invalid --platform "${platform}". Expected web, native, or all.`);
  process.exit(2);
}

function exists(p) {
  return fs.existsSync(path.join(cwd, p));
}

function readPackageJson() {
  const packagePath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packagePath)) return null;
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

function scriptArgs(packageManager, scriptName) {
  if (!packageManager) return null;
  return ['run', scriptName];
}

function runCheck(name, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  const status = result.error ? 1 : result.status ?? 1;
  return {
    name,
    command: [command, ...args].join(' '),
    critical: options.critical !== false,
    skipped: false,
    status,
    output: result.error ? result.error.message : output,
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

for (const scriptName of ['typecheck', 'lint', 'test']) {
  if (packageScripts[scriptName] && packageManager) {
    checks.push(runCheck(scriptName, packageManager, scriptArgs(packageManager, scriptName)));
  } else if (packageScripts[scriptName]) {
    checks.push(skipCheck(scriptName, 'package manager could not be detected'));
  } else {
    checks.push(skipCheck(scriptName, `package.json script "${scriptName}" is not defined`));
  }
}

checks.push(runCheck(
  'design contract validation',
  'node',
  [
    path.join(scriptDir, 'validate-design-contract.mjs'),
    ...(allowFallback ? ['--allow-fallback'] : []),
  ]
));

checks.push(runCheck(
  'design source scan',
  'node',
  [
    path.join(scriptDir, 'scan-raw-styles.mjs'),
    '.',
    '--platform',
    platform,
  ]
));

function statusLabel(check) {
  if (check.skipped) return 'SKIP';
  return check.status === 0 ? 'PASS' : 'FAIL';
}

function formatCheck(check) {
  return [
    `### ${check.name}`,
    '',
    `Status: ${statusLabel(check)}`,
    check.command ? `Command: \`${check.command}\`` : '',
    '',
    '```txt',
    check.output || '(no output)',
    '```',
    '',
  ].filter(Boolean).join('\n');
}

const report = `# Design Compliance Report

Generated at: ${now}

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

## Automated Checks

${checks.map(formatCheck).join('\n')}

## Design System Usage

- Components used: TODO
- Tokens used: TODO
- New tokens introduced: none / TODO
- New variants introduced: none / TODO

## Required States

- loading: TODO
- empty: TODO
- error: TODO
- success: TODO
- disabled/submitting, if applicable: TODO

## Static Compliance

- Raw colors: TODO
- Raw spacing/sizing: TODO
- Raw typography: TODO
- Direct DOM/RN primitives: TODO
- Inline style bypasses: TODO
- Unknown tokens: TODO

## Accessibility

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
- Unit/component tests: TODO
- Accessibility tests: TODO
- Visual tests: TODO

## Deviations

- None, or list deviations with rationale and follow-up.
`;

const outPath = path.isAbsolute(out) ? out : path.join(cwd, out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, report, 'utf8');
console.log(`Wrote ${path.relative(cwd, outPath) || outPath}`);

const failedCriticalChecks = checks.filter((check) => check.critical && !check.skipped && check.status !== 0);
if (failedCriticalChecks.length > 0) {
  process.exit(1);
}
