#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = process.cwd();
const cwdRealpath = fs.realpathSync(cwd);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const rawArgs = process.argv.slice(2);
const validArgs = new Set([
  '--allow-fallback',
  '--init',
  '--check-examples',
  '--require-token-source',
  '--require-token-artifacts',
]);

for (const arg of rawArgs) {
  if (!validArgs.has(arg)) {
    console.error(`ERROR unknown option "${arg}"`);
    process.exit(2);
  }
}

const args = new Set(rawArgs);
const allowFallback = args.has('--allow-fallback') || args.has('--init') || args.has('--check-examples');
const requireTokenSource = args.has('--require-token-source');
const requireTokenArtifacts = args.has('--require-token-artifacts');
const validComponentStatuses = new Set(['draft', 'stable', 'deprecated']);
const validPlatforms = new Set(['web', 'native']);
const validTokenPipelineModes = new Set(['style-dictionary', 'custom']);
const recommendedRequiredChecks = [
  'typecheck',
  'lint',
  'ds:validate-contract',
  'ds:scan-raw-styles',
  'test',
  'ds:compliance-report',
];

const candidates = {
  manifest: [
    {
      file: path.join(cwd, '.design-system/design-system-manifest.json'),
      required: true,
    },
    {
      file: path.join(skillRoot, 'assets/design-system-manifest.example.json'),
      fallback: true,
    },
  ],
  componentSpec: [
    {
      file: path.join(cwd, '.design-system/component-spec.json'),
      required: true,
    },
    {
      file: path.join(skillRoot, 'assets/component-spec.example.json'),
      fallback: true,
    },
  ],
  recipes: [
    {
      file: path.join(cwd, '.design-system/layout-recipes.json'),
      required: true,
    },
    {
      file: path.join(skillRoot, 'assets/layout-recipes.json'),
      fallback: true,
    },
  ],
  tokenPolicy: [
    {
      file: path.join(cwd, '.design-system/token-policy.json'),
      required: true,
    },
    {
      file: path.join(skillRoot, 'assets/token-policy.json'),
      fallback: true,
    },
  ],
};

function isInsidePath(file, directory) {
  const relative = path.relative(directory, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertExistingRepoPath(file, label) {
  const real = fs.realpathSync(file);
  if (!isInsidePath(real, cwdRealpath)) {
    throw new Error(`${label} must stay inside the repo after resolving symlinks: ${file}`);
  }
}

function readFirst(name, paths) {
  for (const candidate of paths) {
    const { file, fallback } = candidate;
    if (fallback && !allowFallback) continue;
    if (fs.existsSync(file)) {
      if (!fallback) assertExistingRepoPath(file, name);
      return {
        file,
        fallback: Boolean(fallback),
        value: JSON.parse(fs.readFileSync(file, 'utf8')),
      };
    }
  }
  const checked = paths
    .filter((candidate) => !candidate.fallback || allowFallback)
    .map((candidate) => `- ${candidate.file}`)
    .join('\n');
  const fallbackHint = allowFallback
    ? ''
    : '\nStarter assets are intentionally not used in strict mode. Re-run with --allow-fallback only for initialization or skill smoke tests.';
  throw new Error(`Missing required ${name}. Checked:\n${checked}${fallbackHint}`);
}

const errors = [];
const warnings = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function tokenMatchesPrefix(token, prefix) {
  return token === prefix || token.startsWith(`${prefix}.`);
}

function isInsideRepo(resolvedPath) {
  const relative = path.relative(cwd, resolvedPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveRepoPath(value, label) {
  if (!isNonEmptyString(value)) return null;
  if (path.isAbsolute(value)) {
    errors.push(`${label} must be a repo-relative path, not an absolute path: ${value}`);
    return null;
  }
  const resolved = path.resolve(cwd, value);
  if (!isInsideRepo(resolved)) {
    errors.push(`${label} must stay inside the repo: ${value}`);
    return null;
  }
  if (fs.existsSync(resolved)) {
    const real = fs.realpathSync(resolved);
    if (!isInsidePath(real, cwdRealpath)) {
      errors.push(`${label} must stay inside the repo after resolving symlinks: ${value}`);
      return null;
    }
  }
  return resolved;
}

function pathExistsFromRepo(value, label) {
  const resolved = resolveRepoPath(value, label);
  return Boolean(resolved && fs.existsSync(resolved));
}

function assertOrWarnFileExists(value, label, message, required) {
  const errorCountBefore = errors.length;
  const exists = pathExistsFromRepo(value, label);
  if (errors.length > errorCountBefore) return;
  if (required) {
    assert(exists, message);
  } else {
    warn(exists, message);
  }
}

let manifest;
let componentSpec;
let recipes;
let tokenPolicy;

try {
  manifest = readFirst('manifest', candidates.manifest);
  componentSpec = readFirst('componentSpec', candidates.componentSpec);
  recipes = readFirst('recipes', candidates.recipes);
  tokenPolicy = readFirst('tokenPolicy', candidates.tokenPolicy);
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
}

if ([manifest, componentSpec, recipes, tokenPolicy].some((input) => input.fallback)) {
  warnings.push('validation used starter assets; do not treat this as CI proof for a product repo');
}

assert(isNonEmptyString(manifest.value.version), 'manifest must define version');
assert(isPlainObject(manifest.value.packages), 'manifest must define packages object');
assert(isNonEmptyString(manifest.value.packages?.tokens), 'manifest packages must define tokens package');
assert(isNonEmptyString(manifest.value.packages?.ui), 'manifest packages must define ui package');
assert(isNonEmptyArray(manifest.value.platforms), 'manifest must define non-empty platforms array');
assert(Array.isArray(manifest.value.requiredChecks), 'manifest must define requiredChecks array');
assert(isPlainObject(manifest.value.sources), 'manifest must define sources object');
assert(isPlainObject(manifest.value.sources?.tokens), 'manifest sources.tokens must define token pipeline');
assert(isPlainObject(componentSpec.value.components), 'component spec must contain a components object');
assert(isPlainObject(recipes.value.recipes), 'layout recipes must contain a recipes object');
assert(Object.keys(componentSpec.value.components || {}).length > 0, 'component spec must define at least one component in strict mode');
assert(Object.keys(recipes.value.recipes || {}).length > 0, 'layout recipes must define at least one recipe in strict mode');
assert(Array.isArray(tokenPolicy.value.allowedLayersInProductCode), 'token policy must define allowedLayersInProductCode');
assert(Array.isArray(tokenPolicy.value.allowedTokenPrefixes), 'token policy must define allowedTokenPrefixes array');

const tokenPipeline = manifest.value.sources?.tokens || {};

assert(
  validTokenPipelineModes.has(tokenPipeline.mode),
  `manifest sources.tokens.mode must be one of: ${[...validTokenPipelineModes].join(', ')}`
);
assert(isNonEmptyString(tokenPipeline.source), 'manifest sources.tokens.source must define token source path');
assert(isNonEmptyString(tokenPipeline.config), 'manifest sources.tokens.config must define token build config path');
assert(isPlainObject(tokenPipeline.outputs), 'manifest sources.tokens.outputs must define platform output paths');

for (const platform of manifest.value.platforms || []) {
  assert(validPlatforms.has(platform), `manifest platform "${platform}" must be one of: ${[...validPlatforms].join(', ')}`);
  assert(
    isNonEmptyString(tokenPipeline.outputs?.[platform]),
    `manifest sources.tokens.outputs.${platform} must define generated token artifact path`
  );
}

if (isNonEmptyString(tokenPipeline.source)) {
  assertOrWarnFileExists(
    tokenPipeline.source,
    'manifest sources.tokens.source',
    `token source file is missing: ${tokenPipeline.source}`,
    requireTokenSource
  );
}

if (isNonEmptyString(tokenPipeline.config)) {
  assertOrWarnFileExists(
    tokenPipeline.config,
    'manifest sources.tokens.config',
    `token build config is missing: ${tokenPipeline.config}`,
    requireTokenSource
  );
}

for (const [platform, outputPath] of Object.entries(tokenPipeline.outputs || {})) {
  if (!isNonEmptyString(outputPath)) continue;
  assertOrWarnFileExists(
    outputPath,
    `manifest sources.tokens.outputs.${platform}`,
    `generated token artifact for ${platform} is missing: ${outputPath}`,
    requireTokenArtifacts
  );
}

for (const requiredCheck of manifest.value.requiredChecks || []) {
  assert(isNonEmptyString(requiredCheck), 'manifest requiredChecks must contain only non-empty strings');
}

for (const check of recommendedRequiredChecks) {
  warn((manifest.value.requiredChecks || []).includes(check), `manifest requiredChecks should include ${check}`);
}

const allowedTokenPrefixes = tokenPolicy.value.allowedTokenPrefixes || [];

for (const prefix of allowedTokenPrefixes) {
  assert(isNonEmptyString(prefix), 'token policy allowedTokenPrefixes must contain only non-empty strings');
}

for (const [name, component] of Object.entries(componentSpec.value.components || {})) {
  assert(validComponentStatuses.has(component.status), `${name}: status must be one of: ${[...validComponentStatuses].join(', ')}`);
  assert(isNonEmptyString(component.purpose), `${name}: missing purpose`);
  assert(isPlainObject(component.props), `${name}: missing props object`);
  assert(Array.isArray(component.slots), `${name}: missing slots array`);
  for (const slot of component.slots || []) {
    assert(isNonEmptyString(slot), `${name}: slots must contain only non-empty strings`);
  }
  if (component.states !== undefined) {
    assert(Array.isArray(component.states), `${name}: states must be an array when provided`);
  }
  if (component.tokens !== undefined) {
    assert(Array.isArray(component.tokens), `${name}: tokens must be an array when provided`);
    for (const token of component.tokens || []) {
      assert(isNonEmptyString(token), `${name}: tokens must contain only non-empty strings`);
      assert(
        allowedTokenPrefixes.some((prefix) => tokenMatchesPrefix(token, prefix)),
        `${name}: token "${token}" must start with an allowed prefix`
      );
    }
  }
  warn(component.states || component.accessibility, `${name}: should define states or accessibility guidance`);
}

for (const [name, recipe] of Object.entries(recipes.value.recipes || {})) {
  assert(isNonEmptyString(recipe.purpose), `${name}: missing purpose`);
  assert(isNonEmptyArray(recipe.requiredStates), `${name}: missing non-empty requiredStates array`);
  for (const state of recipe.requiredStates || []) {
    assert(isNonEmptyString(state), `${name}: requiredStates must contain only non-empty strings`);
  }
  if (recipe.extends !== undefined) {
    assert(
      isNonEmptyString(recipe.extends) && Boolean(recipes.value.recipes?.[recipe.extends]),
      `${name}: extends must reference an existing recipe`
    );
  }
  warn(recipe.layout || recipe.extends, `${name}: should define layout or extends`);
}

console.log('Design contract validation');
console.log(`- manifest: ${path.relative(cwd, manifest.file) || manifest.file}`);
console.log(`- component spec: ${path.relative(cwd, componentSpec.file) || componentSpec.file}`);
console.log(`- layout recipes: ${path.relative(cwd, recipes.file) || recipes.file}`);
console.log(`- token policy: ${path.relative(cwd, tokenPolicy.file) || tokenPolicy.file}`);
console.log(`- mode: ${allowFallback ? 'fallback-enabled' : 'strict'}`);
console.log(`- token source required: ${requireTokenSource ? 'yes' : 'no'}`);
console.log(`- token artifacts required: ${requireTokenArtifacts ? 'yes' : 'no'}`);

for (const w of warnings) console.log(`WARN ${w}`);

if (errors.length) {
  for (const e of errors) console.error(`FAIL ${e}`);
  process.exit(1);
}

console.log('PASS design contract is valid enough for AI publishing');
