#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const cwd = process.cwd();
const cwdRealpath = fs.realpathSync(cwd);
const skillRootRealpath = fs.realpathSync(skillRoot);
const rawArgs = process.argv.slice(2);
const roots = [];
let platform = 'all';

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
  } else if (arg.startsWith('--')) {
    failUsage(`unknown option "${arg}"`);
  } else {
    roots.push(arg);
  }
}

if (!['all', 'web', 'native'].includes(platform)) {
  failUsage(`invalid --platform "${platform}". Expected web, native, or all.`);
}

if (roots.length === 0) roots.push('.');

const findings = [];

function assertExistingPathInsideRepoOrSkill(file) {
  const real = fs.realpathSync(file);
  if (!isInsidePath(real, cwdRealpath) && !isInsidePath(real, skillRootRealpath)) {
    failUsage(`path must stay inside the repo or bundled skill after resolving symlinks: ${file}`);
  }
}

function readRules(fileName) {
  const file = path.join(skillRoot, 'assets', fileName);
  assertExistingPathInsideRepoOrSkill(file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  assertExistingPathInsideRepoOrSkill(file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readRepoOrAssetJson(repoRelativePath, assetFileName) {
  return (
    readJsonIfExists(path.join(cwd, repoRelativePath)) ||
    readJsonIfExists(path.join(skillRoot, 'assets', assetFileName))
  );
}

const commonRules = readRules('platform-rules.common.json');
const webRules = readRules('platform-rules.react-web.json');
const nativeRules = readRules('platform-rules.react-native.json');
const tokenPolicy = readRepoOrAssetJson('.design-system/token-policy.json', 'token-policy.json') || {};
const componentSpec = readRepoOrAssetJson('.design-system/component-spec.json', 'component-spec.example.json') || {};
const manifest = readRepoOrAssetJson('.design-system/design-system-manifest.json', 'design-system-manifest.example.json') || {};
const packageJson = readJsonIfExists(path.join(cwd, 'package.json')) || {};
const ignoredDirs = new Set(commonRules.ignoredDirs);
const ignoredPathIncludes = commonRules.ignoredPathIncludes || [];
const dynamicIgnoredPaths = collectDynamicIgnoredPaths();
const exts = new Set(commonRules.extensions);
const visitedRealpaths = new Set();

function compileRules(rules) {
  return (rules || []).map((rule) => ({
    type: rule.type,
    regex: new RegExp(rule.regex, 'g'),
  }));
}

const commonPatternRules = compileRules(commonRules.patterns);
const webPatternRules = compileRules(webRules.patterns);
const nativePatternRules = compileRules(nativeRules.patterns);
const reactNativeImportRegex = /\b(?:from\s*['"]react-native['"]|require\(['"]react-native['"]\))/;
const nativePathRegex = /(?:^|\/)(?:apps\/)?(?:mobile|native|react-native|expo)(?:\/|$)|(?:^|\/)rn(?:\/|$)|\.(?:native|ios|android)\.[^.]+$/;
const webPathRegex = /(?:^|\/)(?:apps\/)?(?:web|frontend|browser)(?:\/|$)|\.web\.[^.]+$/;
const jsxExtensions = new Set(['.jsx', '.tsx']);
const stylesheetExtensions = new Set(['.css', '.scss']);
const rawStyleNumberPropertyPattern = '(?:padding(?:Top|Right|Bottom|Left|Horizontal|Vertical|Block|Inline)?|margin(?:Top|Right|Bottom|Left|Horizontal|Vertical|Block|Inline)?|gap|rowGap|columnGap|radius|borderRadius|border(?:TopLeft|TopRight|BottomLeft|BottomRight)?Radius|fontSize|lineHeight|letterSpacing|fontWeight|width|height|minWidth|minHeight|maxWidth|maxHeight|top|right|bottom|left|inset|zIndex|padding(?:-(?:top|right|bottom|left|block|inline))?|margin(?:-(?:top|right|bottom|left|block|inline))?|row-gap|column-gap|border-radius|border-(?:top-left|top-right|bottom-left|bottom-right)-radius|font-size|line-height|letter-spacing|font-weight|min-width|min-height|max-width|max-height|z-index)';
const tokenReferencePropertyPattern = '(?:color|bg|background|backgroundColor|background-color|border|borderColor|border-color|padding|paddingX|paddingY|paddingTop|paddingRight|paddingBottom|paddingLeft|paddingHorizontal|paddingVertical|margin|marginX|marginY|marginTop|marginRight|marginBottom|marginLeft|marginHorizontal|marginVertical|gap|rowGap|columnGap|radius|borderRadius|font|fontSize|lineHeight|letterSpacing|shadow)';
const namedCssColors = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue',
  'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
  'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon',
  'darkseagreen', 'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise',
  'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick',
  'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod',
  'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred', 'indigo',
  'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue',
  'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey',
  'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
  'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen',
  'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple',
  'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
  'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite',
  'navy', 'oldlace', 'olive', 'olivedrab', 'orange', 'orangered', 'orchid',
  'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip',
  'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red',
  'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow',
  'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet',
  'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen'
]);
const colorPropertyRegex = /(?:^|[^\w$-])((?:background(?:Color|-color)?|border(?:Color|-color)?|shadowColor|textDecorationColor|text-decoration-color|outlineColor|outline-color|caretColor|caret-color|color|fill|stroke))\s*[:=]\s*["']?([A-Za-z]+)["']?/g;
const shorthandColorPropertyRegex = /(?:^|[^\w$-])((?:border(?:Top|Right|Bottom|Left)?|border(?:-top|-right|-bottom|-left)?|boxShadow|box-shadow|textShadow|text-shadow))\s*[:=]\s*["']?([^;"'\n}]+)["']?/g;
const rawShadowRegex = /(?:^|[^\w$-])((?:boxShadow|box-shadow|textShadow|text-shadow))\s*[:=]\s*["']?[^;"'\n}]*-?\d+(?:\.\d+)?(?:px|rem|em)\b[^;"'\n}]*/g;
const jsxRawStylePropRegex = new RegExp(`\\b(${rawStyleNumberPropertyPattern})\\s*=\\s*(?:\\{\\s*-?\\d+(?:\\.\\d+)?\\s*\\}|["']-?\\d+(?:\\.\\d+)?(?:px|rem|em|%)?["'])`, 'g');
const tokenReferenceRegex = new RegExp(`(?:^|[^\\w$-])(${tokenReferencePropertyPattern})\\s*[:=]\\s*["']([^"']+)["']`, 'g');
const allowedTokenPrefixes = Array.isArray(tokenPolicy.allowedTokenPrefixes) ? tokenPolicy.allowedTokenPrefixes : [];
const disallowedTokenLayers = new Set([
  'primitive',
  ...(Array.isArray(tokenPolicy.disallowedLayersInProductCode) ? tokenPolicy.disallowedLayersInProductCode : []),
]);
const knownTokens = collectKnownTokenNames();
const knownTokenNames = knownTokens.names;
const shouldEnforceKnownTokenNames = knownTokens.enforceExact;

function isProductFile(file) {
  const normalized = file.split(path.sep).join('/');
  const resolved = path.normalize(path.resolve(file));
  return (
    !ignoredPathIncludes.some((ignored) => normalized.includes(ignored)) &&
    !dynamicIgnoredPaths.files.has(resolved) &&
    ![...dynamicIgnoredPaths.dirs].some((ignoredDir) => isInsidePath(resolved, ignoredDir))
  );
}

function walk(target) {
  const full = path.resolve(target);
  if (!isInsidePath(full, cwd)) failUsage(`scan root must stay inside the repo: ${target}`);
  if (!fs.existsSync(full)) return;
  const real = fs.realpathSync(full);
  if (!isInsidePath(real, cwdRealpath)) {
    failUsage(`scan path must stay inside the repo after resolving symlinks: ${target}`);
  }
  const lstat = fs.lstatSync(full);
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    if (visitedRealpaths.has(real)) return;
    visitedRealpaths.add(real);
    const name = path.basename(full);
    if (ignoredDirs.has(name)) return;
    for (const entry of fs.readdirSync(full)) walk(path.join(full, entry));
    return;
  }
  if (lstat.isSymbolicLink() && !isInsidePath(real, cwdRealpath)) return;
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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeTokenName(value) {
  return value.replace(/\//g, '.');
}

function tokenMatchesPrefix(token, prefix) {
  const normalizedToken = normalizeTokenName(token);
  const normalizedPrefix = normalizeTokenName(prefix);
  return normalizedToken === normalizedPrefix || normalizedToken.startsWith(`${normalizedPrefix}.`);
}

function isDisallowedTokenReference(value) {
  const firstSegment = normalizeTokenName(value).split('.')[0];
  return disallowedTokenLayers.has(firstSegment);
}

function isTokenLike(value) {
  return value.includes('.') || value.includes('/') || isDisallowedTokenReference(value);
}

function propertyTokenPrefixes(property) {
  const normalized = property.replace(/-/g, '').toLowerCase();
  if (['padding', 'paddingx', 'paddingy', 'paddingtop', 'paddingright', 'paddingbottom', 'paddingleft', 'paddinghorizontal', 'paddingvertical', 'margin', 'marginx', 'marginy', 'margintop', 'marginright', 'marginbottom', 'marginleft', 'marginhorizontal', 'marginvertical', 'gap', 'rowgap', 'columngap'].includes(normalized)) {
    return ['space'];
  }
  if (normalized.includes('radius')) return ['radius'];
  if (normalized.includes('font') || normalized === 'lineheight' || normalized === 'letterspacing') return ['font'];
  if (normalized.includes('shadow')) return ['shadow'];
  if (normalized.includes('border')) return ['color.border'];
  if (normalized.includes('background') || normalized === 'bg') return ['color.bg'];
  if (normalized === 'color') return ['color.text', 'color'];
  return allowedTokenPrefixes;
}

function isKnownTokenOrAlias(value, property) {
  const normalized = normalizeTokenName(value);
  if (knownTokenNames.has(value) || knownTokenNames.has(normalized)) return true;
  const prefixes = propertyTokenPrefixes(property).map(normalizeTokenName);
  for (const token of knownTokenNames) {
    const normalizedToken = normalizeTokenName(token);
    const matchesPrefix = prefixes.some((prefix) => normalizedToken === prefix || normalizedToken.startsWith(`${prefix}.`));
    if (matchesPrefix && normalizedToken.endsWith(`.${normalized}`)) return true;
  }
  return false;
}

function addTokenName(out, parts) {
  if (parts.length === 0) return;
  const dotted = parts.join('.');
  out.add(dotted);
  out.add(parts.join('/'));
  if (disallowedTokenLayers.has(parts[0]) || parts[0] === 'semantic' || parts[0] === 'component') {
    const withoutLayer = parts.slice(1);
    if (withoutLayer.length > 0) {
      out.add(withoutLayer.join('.'));
      out.add(withoutLayer.join('/'));
    }
  }
}

function collectTokenSourceNames(value, out, parts = []) {
  if (!isPlainObject(value)) return;
  if ((Object.prototype.hasOwnProperty.call(value, '$value') || Object.prototype.hasOwnProperty.call(value, 'value')) && parts.length > 0) {
    addTokenName(out, parts);
  }
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('$') || ['value', 'type', 'description', 'comment'].includes(key)) continue;
    collectTokenSourceNames(child, out, [...parts, key]);
  }
}

function collectComponentSpecTokenNames(value, out) {
  const components = value?.components || {};
  for (const component of Object.values(components)) {
    for (const token of component?.tokens || []) {
      if (typeof token === 'string') addTokenName(out, normalizeTokenName(token).split('.'));
    }
  }
}

function resolveRepoRelativePath(value) {
  if (typeof value !== 'string' || !value.trim() || path.isAbsolute(value)) return null;
  const resolved = path.resolve(cwd, value);
  const relative = path.relative(cwd, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  if (fs.existsSync(resolved)) {
    const real = fs.realpathSync(resolved);
    if (!isInsidePath(real, cwdRealpath)) return null;
  }
  return resolved;
}

function isInsidePath(file, directory) {
  const relative = path.relative(directory, file);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function packageDependencySpec(packageName) {
  if (typeof packageName !== 'string' || !packageName.trim()) return null;
  const dependencyGroups = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ];
  for (const dependencies of dependencyGroups) {
    if (isPlainObject(dependencies) && typeof dependencies[packageName] === 'string') {
      return dependencies[packageName];
    }
  }
  return null;
}

function addRepoRelativeDir(out, value) {
  const resolved = resolveRepoRelativePath(value);
  if (resolved) out.add(path.normalize(resolved));
}

function addRepoRelativeFile(out, value) {
  const resolved = resolveRepoRelativePath(value);
  if (resolved) out.add(path.normalize(resolved));
}

function addFileDependencyDir(out, packageName) {
  const spec = packageDependencySpec(packageName);
  if (!spec?.startsWith('file:')) return;
  addRepoRelativeDir(out, spec.slice('file:'.length));
}

function workspacePatterns() {
  const workspaces = packageJson.workspaces;
  if (Array.isArray(workspaces)) return workspaces;
  if (isPlainObject(workspaces) && Array.isArray(workspaces.packages)) return workspaces.packages;
  return [];
}

function workspaceCandidateDirs(pattern) {
  if (typeof pattern !== 'string' || !pattern.trim()) return [];
  const normalized = pattern.replace(/\\/g, '/');
  if (normalized.includes('**')) return [];
  if (!normalized.includes('*')) {
    const direct = resolveRepoRelativePath(normalized);
    return direct && fs.existsSync(direct) ? [direct] : [];
  }
  if (!normalized.endsWith('/*')) return [];
  const base = resolveRepoRelativePath(normalized.slice(0, -2));
  if (!base || !fs.existsSync(base)) return [];
  return fs.readdirSync(base)
    .map((entry) => path.join(base, entry))
    .filter((candidate) => fs.existsSync(path.join(candidate, 'package.json')));
}

function addWorkspaceDependencyDir(out, packageName) {
  if (typeof packageName !== 'string' || !packageName.trim()) return;
  for (const pattern of workspacePatterns()) {
    for (const dir of workspaceCandidateDirs(pattern)) {
      const workspacePackage = readJsonIfExists(path.join(dir, 'package.json'));
      if (workspacePackage?.name === packageName) out.add(path.normalize(dir));
    }
  }
}

function collectDynamicIgnoredPaths() {
  const dirs = new Set();
  const files = new Set();

  addFileDependencyDir(dirs, manifest?.packages?.ui);
  addFileDependencyDir(dirs, manifest?.packages?.tokens);
  addWorkspaceDependencyDir(dirs, manifest?.packages?.ui);
  addWorkspaceDependencyDir(dirs, manifest?.packages?.tokens);

  for (const outputPath of Object.values(manifest?.sources?.tokens?.outputs || {})) {
    addRepoRelativeFile(files, outputPath);
  }

  return { dirs, files };
}

function collectKnownTokenNames() {
  const out = new Set();
  let enforceExact = false;
  collectComponentSpecTokenNames(componentSpec, out);
  const tokenSourcePath = resolveRepoRelativePath(manifest?.sources?.tokens?.source);
  if (tokenSourcePath && fs.existsSync(tokenSourcePath)) {
    collectTokenSourceNames(readJsonIfExists(tokenSourcePath), out);
    enforceExact = true;
  }
  return { names: out, enforceExact };
}

function scanNamedCssColors(file, text) {
  colorPropertyRegex.lastIndex = 0;
  let match;
  while ((match = colorPropertyRegex.exec(text))) {
    const color = match[2].toLowerCase();
    if (!namedCssColors.has(color)) continue;
    addFinding(file, lineFromIndex(text, match.index), 'named-css-color', match[0].trim());
  }

  shorthandColorPropertyRegex.lastIndex = 0;
  while ((match = shorthandColorPropertyRegex.exec(text))) {
    const color = match[2].split(/\s+/).find((part) => namedCssColors.has(part.toLowerCase()));
    if (!color) continue;
    addFinding(file, lineFromIndex(text, match.index), 'named-css-color', match[0].trim());
  }
}

function scanRawShadows(file, text) {
  rawShadowRegex.lastIndex = 0;
  let match;
  while ((match = rawShadowRegex.exec(text))) {
    addFinding(file, lineFromIndex(text, match.index), 'raw-shadow', match[0].trim());
  }
}

function scanRawJsxStyleProps(file, text) {
  jsxRawStylePropRegex.lastIndex = 0;
  let match;
  while ((match = jsxRawStylePropRegex.exec(text))) {
    addFinding(file, lineFromIndex(text, match.index), 'raw-style-number', match[0].trim());
  }
}

function scanTokenReferences(file, text) {
  tokenReferenceRegex.lastIndex = 0;
  let match;
  while ((match = tokenReferenceRegex.exec(text))) {
    const property = match[1];
    const value = match[2].trim();
    if (!isTokenLike(value)) {
      if (shouldEnforceKnownTokenNames && knownTokenNames.size > 0 && !isKnownTokenOrAlias(value, property)) {
        addFinding(file, lineFromIndex(text, match.index), 'unknown-token-reference', match[0].trim());
      }
      continue;
    }
    const normalized = normalizeTokenName(value);
    const snippet = match[0].trim();

    if (isDisallowedTokenReference(value)) {
      addFinding(file, lineFromIndex(text, match.index), 'primitive-token-reference', snippet);
      continue;
    }

    if (!allowedTokenPrefixes.some((prefix) => tokenMatchesPrefix(value, prefix))) {
      addFinding(file, lineFromIndex(text, match.index), 'unknown-token-reference', snippet);
      continue;
    }

    if (shouldEnforceKnownTokenNames && knownTokenNames.size > 0 && !isKnownTokenOrAlias(value, property) && !knownTokenNames.has(normalized)) {
      addFinding(file, lineFromIndex(text, match.index), 'unknown-token-reference', snippet);
    }
  }
}

function maskComments(text) {
  let out = '';
  let i = 0;
  let state = 'code';
  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];
    if (state === 'code' && char === '/' && next === '/') {
      out += '  ';
      i += 2;
      state = 'line-comment';
      continue;
    }
    if (state === 'code' && char === '/' && next === '*') {
      out += '  ';
      i += 2;
      state = 'block-comment';
      continue;
    }
    if (state === 'line-comment') {
      out += char === '\n' ? '\n' : ' ';
      if (char === '\n') state = 'code';
      i += 1;
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        out += '  ';
        i += 2;
        state = 'code';
        continue;
      }
      out += char === '\n' ? '\n' : ' ';
      i += 1;
      continue;
    }
    out += char;
    i += 1;
  }
  return out;
}

function parseReactNativeImportLocals(text) {
  const forbidden = new Set(nativeRules.reactNativeForbiddenImports || []);
  const locals = new Set();
  const namespaces = new Set();
  const namedImport = /import\s*\{([\s\S]*?)\}\s*from\s*['"]react-native['"]/g;
  const defaultImport = /import\s+([A-Za-z_$][\w$]*)\s+from\s*['"]react-native['"]/g;
  const namespaceImport = /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]react-native['"]/g;
  const destructuredRequire = /(?:const|let|var)\s*\{([\s\S]*?)\}\s*=\s*require\(['"]react-native['"]\)/g;
  const namespaceRequire = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(['"]react-native['"]\)/g;

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
  for (const match of text.matchAll(defaultImport)) namespaces.add(match[1]);
  for (const match of text.matchAll(namespaceImport)) namespaces.add(match[1]);
  for (const match of text.matchAll(namespaceRequire)) namespaces.add(match[1]);

  return { locals, namespaces };
}

function scanReactNativePrimitives(file, text) {
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

function inferPlatforms(file, text) {
  if (platform !== 'all') return new Set([platform]);

  const normalized = path.relative(cwd, file).split(path.sep).join('/');
  const ext = path.extname(file);
  const inferred = new Set();

  if (stylesheetExtensions.has(ext) || webPathRegex.test(normalized)) inferred.add('web');
  if (nativePathRegex.test(normalized) || reactNativeImportRegex.test(text)) inferred.add('native');

  if (inferred.size === 0 && jsxExtensions.has(ext)) {
    inferred.add('web');
    inferred.add('native');
  }

  return inferred;
}

function scanFile(file) {
  const real = fs.realpathSync(file);
  if (!isInsidePath(real, cwdRealpath)) failUsage(`scan file must stay inside the repo after resolving symlinks: ${file}`);
  const text = fs.readFileSync(file, 'utf8');
  const scanText = maskComments(text);
  const filePlatforms = inferPlatforms(file, scanText);
  const activePatternRules = [
    ...commonPatternRules,
    ...(filePlatforms.has('web') ? webPatternRules : []),
    ...(filePlatforms.has('native') ? nativePatternRules : []),
  ];

  for (const pattern of activePatternRules) {
    addMatches(file, pattern.type, pattern.regex, pattern.type === 'design-lint-suppression' ? text : scanText);
  }
  scanNamedCssColors(file, scanText);
  scanRawShadows(file, scanText);
  scanRawJsxStyleProps(file, scanText);
  scanTokenReferences(file, scanText);
  if (filePlatforms.has('native')) scanReactNativePrimitives(file, scanText);
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
