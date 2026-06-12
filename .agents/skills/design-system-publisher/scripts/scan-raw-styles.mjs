#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const rawArgs = process.argv.slice(2);
const roots = [];
let platform = 'all';

for (let i = 0; i < rawArgs.length; i += 1) {
  const arg = rawArgs[i];
  if (arg === '--platform') {
    platform = rawArgs[i + 1] || platform;
    i += 1;
  } else if (arg.startsWith('--platform=')) {
    platform = arg.slice('--platform='.length);
  } else {
    roots.push(arg);
  }
}

if (!['all', 'web', 'native'].includes(platform)) {
  console.error(`Invalid --platform "${platform}". Expected web, native, or all.`);
  process.exit(2);
}

if (roots.length === 0) roots.push('.');

const findings = [];

function readRules(fileName) {
  const file = path.join(skillRoot, 'assets', fileName);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const commonRules = readRules('platform-rules.common.json');
const webRules = platform === 'web' || platform === 'all' ? readRules('platform-rules.react-web.json') : null;
const nativeRules = platform === 'native' || platform === 'all' ? readRules('platform-rules.react-native.json') : null;
const ignoredDirs = new Set(commonRules.ignoredDirs);
const ignoredPathIncludes = commonRules.ignoredPathIncludes || [];
const exts = new Set(commonRules.extensions);
const patternRules = [
  ...(commonRules.patterns || []),
  ...((webRules && webRules.patterns) || []),
  ...((nativeRules && nativeRules.patterns) || []),
].map((rule) => ({
  type: rule.type,
  regex: new RegExp(rule.regex, 'g'),
}));

function isProductFile(file) {
  const normalized = file.split(path.sep).join('/');
  return !ignoredPathIncludes.some((ignored) => normalized.includes(ignored));
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addFinding(file, line, type, snippet) {
  findings.push({ file, line, type, snippet });
}

function lineFromIndex(text, index) {
  return text.slice(0, index).split('\n').length;
}

function parseReactNativeImportLocals(text) {
  const forbidden = new Set(nativeRules?.reactNativeForbiddenImports || []);
  const locals = new Set();
  const namespaces = new Set();
  const namedImport = /import\s*\{([\s\S]*?)\}\s*from\s*['"]react-native['"]/g;
  const namespaceImport = /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]react-native['"]/g;
  const destructuredRequire = /(?:const|let|var)\s*\{([\s\S]*?)\}\s*=\s*require\(['"]react-native['"]\)/g;

  function parseNamedBlock(block) {
    for (const rawPart of block.split(',')) {
      const part = rawPart.trim();
      if (!part) continue;
      const aliasMatch = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
      const colonAliasMatch = part.match(/^([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)$/);
      const imported = aliasMatch?.[1] || colonAliasMatch?.[1] || part;
      const local = aliasMatch?.[2] || colonAliasMatch?.[2] || part;
      if (forbidden.has(imported)) locals.add(local);
    }
  }

  for (const match of text.matchAll(namedImport)) parseNamedBlock(match[1]);
  for (const match of text.matchAll(destructuredRequire)) parseNamedBlock(match[1]);
  for (const match of text.matchAll(namespaceImport)) namespaces.add(match[1]);

  return { locals, namespaces };
}

function scanReactNativePrimitives(file, text) {
  if (!nativeRules) return;
  const forbidden = nativeRules.reactNativeForbiddenImports || [];
  const { locals, namespaces } = parseReactNativeImportLocals(text);

  for (const local of locals) {
    const importRegex = new RegExp(`\\b${escapeRegex(local)}\\b`, 'g');
    const first = importRegex.exec(text);
    addFinding(
      file,
      first ? lineFromIndex(text, first.index) : 1,
      'native-forbidden-react-native-import',
      `react-native ${local}`
    );
  }

  if (locals.size > 0) {
    const localNames = [...locals].map(escapeRegex).join('|');
    addMatches(file, 'native-direct-primitive-jsx', new RegExp(`<\\s*(?:${localNames})\\b`, 'g'), text);
  }

  for (const namespace of namespaces) {
    addFinding(file, lineFromIndex(text, text.indexOf(namespace)), 'native-forbidden-react-native-namespace-import', namespace);
    const members = forbidden.map(escapeRegex).join('|');
    addMatches(
      file,
      'native-direct-primitive-jsx',
      new RegExp(`<\\s*${escapeRegex(namespace)}\\.(?:${members})\\b`, 'g'),
      text
    );
  }
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  for (const pattern of patternRules) {
    addMatches(file, pattern.type, pattern.regex, text);
  }
  scanReactNativePrimitives(file, text);
}

for (const root of roots) walk(root);

if (findings.length) {
  console.error(`FAIL design source scan found ${findings.length} issue(s) for platform=${platform}:`);
  for (const f of findings.slice(0, 200)) {
    console.error(`${path.relative(process.cwd(), f.file)}:${f.line} [${f.type}] ${f.snippet}`);
  }
  if (findings.length > 200) console.error(`...and ${findings.length - 200} more`);
  process.exit(1);
}

console.log(`PASS design source scan found no forbidden product UI patterns for platform=${platform}`);
