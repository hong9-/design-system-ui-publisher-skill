#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const skillRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const candidates = {
  manifest: [
    path.join(cwd, '.design-system/design-system-manifest.json'),
    path.join(skillRoot, 'assets/design-system-manifest.example.json'),
  ],
  componentSpec: [
    path.join(cwd, '.design-system/component-spec.json'),
    path.join(skillRoot, 'assets/component-spec.example.json'),
  ],
  recipes: [
    path.join(cwd, '.design-system/layout-recipes.json'),
    path.join(skillRoot, 'assets/layout-recipes.json'),
  ],
  tokenPolicy: [
    path.join(cwd, '.design-system/token-policy.json'),
    path.join(skillRoot, 'assets/token-policy.json'),
  ],
};

function readFirst(name, paths) {
  for (const file of paths) {
    if (fs.existsSync(file)) {
      return { file, value: JSON.parse(fs.readFileSync(file, 'utf8')) };
    }
  }
  throw new Error(`Missing ${name}. Checked:\n${paths.map(p => `- ${p}`).join('\n')}`);
}

const errors = [];
const warnings = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

const manifest = readFirst('manifest', candidates.manifest);
const componentSpec = readFirst('componentSpec', candidates.componentSpec);
const recipes = readFirst('recipes', candidates.recipes);
const tokenPolicy = readFirst('tokenPolicy', candidates.tokenPolicy);

assert(componentSpec.value.components && typeof componentSpec.value.components === 'object', 'component spec must contain a components object');
assert(recipes.value.recipes && typeof recipes.value.recipes === 'object', 'layout recipes must contain a recipes object');
assert(Array.isArray(tokenPolicy.value.allowedLayersInProductCode), 'token policy must define allowedLayersInProductCode');

for (const [name, component] of Object.entries(componentSpec.value.components || {})) {
  assert(component.status, `${name}: missing status`);
  assert(component.purpose, `${name}: missing purpose`);
  assert(component.props && typeof component.props === 'object', `${name}: missing props`);
  assert(Array.isArray(component.slots), `${name}: missing slots array`);
  warn(component.states || component.accessibility, `${name}: should define states or accessibility guidance`);
}

for (const [name, recipe] of Object.entries(recipes.value.recipes || {})) {
  assert(recipe.purpose, `${name}: missing purpose`);
  assert(Array.isArray(recipe.requiredStates), `${name}: missing requiredStates array`);
  warn(recipe.layout || recipe.extends, `${name}: should define layout or extends`);
}

console.log('Design contract validation');
console.log(`- manifest: ${path.relative(cwd, manifest.file) || manifest.file}`);
console.log(`- component spec: ${path.relative(cwd, componentSpec.file) || componentSpec.file}`);
console.log(`- layout recipes: ${path.relative(cwd, recipes.file) || recipes.file}`);
console.log(`- token policy: ${path.relative(cwd, tokenPolicy.file) || tokenPolicy.file}`);

for (const w of warnings) console.log(`WARN ${w}`);

if (errors.length) {
  for (const e of errors) console.error(`FAIL ${e}`);
  process.exit(1);
}

console.log('PASS design contract is valid enough for AI publishing');
