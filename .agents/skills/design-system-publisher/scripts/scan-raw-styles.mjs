#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const roots = process.argv.slice(2);
if (roots.length === 0) roots.push('.');

const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.expo', 'ios', 'android']);
const exts = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.scss']);
const findings = [];

const rawColor = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;
const rawStyleNumber = /\b(?:padding|margin|gap|rowGap|columnGap|borderRadius|fontSize|lineHeight|letterSpacing)\s*:\s*(?:['"])?\d+(?:px)?(?:['"])?/g;
const inlineStyle = /\bstyle\s*=\s*\{\s*\{/g;
const lintSuppression = /eslint-disable[^\n]*design|@ts-ignore[^\n]*design/g;

function isProductFile(file) {
  const normalized = file.split(path.sep).join('/');
  if (normalized.includes('/packages/ui/')) return false;
  if (normalized.includes('/design-tokens/')) return false;
  if (normalized.includes('/.agents/skills/')) return false;
  if (normalized.includes('/.design-system/')) return false;
  return true;
}

function walk(target) {
  const full = path.resolve(target);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    const name = path.basename(full);
    if (ignoredDirs.has(name)) return;
    for (const entry of fs.readdirSync(full)) walk(path.join(full, entry));
    return;
  }
  if (!stat.isFile()) return;
  if (!exts.has(path.extname(full))) return;
  if (!isProductFile(full)) return;
  scanFile(full);
}

function addMatches(file, type, regex, text) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text))) {
    const before = text.slice(0, match.index);
    const line = before.split('\n').length;
    const snippet = text.slice(match.index, match.index + 100).split('\n')[0];
    findings.push({ file, line, type, snippet });
  }
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  addMatches(file, 'raw-color', rawColor, text);
  addMatches(file, 'raw-style-number', rawStyleNumber, text);
  addMatches(file, 'inline-style-object', inlineStyle, text);
  addMatches(file, 'design-lint-suppression', lintSuppression, text);
}

for (const root of roots) walk(root);

if (findings.length) {
  console.error(`FAIL raw style scan found ${findings.length} issue(s):`);
  for (const f of findings.slice(0, 200)) {
    console.error(`${path.relative(process.cwd(), f.file)}:${f.line} [${f.type}] ${f.snippet}`);
  }
  if (findings.length > 200) console.error(`...and ${findings.length - 200} more`);
  process.exit(1);
}

console.log('PASS raw style scan found no forbidden product UI patterns');
