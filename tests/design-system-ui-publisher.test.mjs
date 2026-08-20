import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = path.join(packageRoot, '.agents/skills/design-system-ui-publisher');
const scriptsDir = path.join(skillRoot, 'scripts');
const assetsDir = path.join(skillRoot, 'assets');
const referencesDir = path.join(skillRoot, 'references');

function makeTempRepo(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function copyAsset(assetName, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(assetsDir, assetName), target);
}

function runScript(scriptName, args, cwd) {
  return spawnSync('node', [path.join(scriptsDir, scriptName), ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function combinedOutput(result) {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

function runCommand(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: 'utf8' });
}

test('skill documents design-system extension proposal workflow', () => {
  const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
  const reference = fs.readFileSync(
    path.join(referencesDir, 'design-system-extension-proposals.md'),
    'utf8'
  );
  const template = fs.readFileSync(
    path.join(assetsDir, 'design-system-extension-proposal.template.yaml'),
    'utf8'
  );

  assert.match(skill, /do not invent it in product UI/i);
  assert.match(skill, /design-system-extension-proposal\.template\.yaml/);
  assert.match(reference, /Do not invent missing visual decisions directly in product UI/);
  assert.match(template, /type: design-system-extension-proposal/);
  assert.match(template, /status: needs-design-review/);
  assert.match(template, /approval:\n  required: true/);
});

test('skill documents Figma variable import without bloating SKILL.md', () => {
  const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
  const figmaImport = fs.readFileSync(path.join(referencesDir, 'figma-import.md'), 'utf8');

  assert.match(skill, /Do not preload every reference file/);
  assert.match(skill, /Figma Variables may be imported during explicit sync tasks/);
  assert.match(figmaImport, /sync-design-contract`: Figma MCP may import Variables/);
  assert.match(figmaImport, /raw Figma Variables snapshot/);
  assert.match(figmaImport, /During ordinary screen\/component publishing, do not fetch live Figma tokens/);
  assert.ok(skill.split('\n').length < 260);
});

test('skill documents visual quality review without making it a scorecard', () => {
  const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
  const reference = fs.readFileSync(
    path.join(referencesDir, 'visual-quality-review-gate.md'),
    'utf8'
  );
  const profileTemplate = fs.readFileSync(
    path.join(assetsDir, 'visual-quality-profile.template.md'),
    'utf8'
  );

  assert.match(skill, /visual-quality-review-gate\.md/);
  assert.match(skill, /visual quality status/);
  assert.match(reference, /does not invent product aesthetics/);
  assert.match(reference, /generic review only/);
  assert.doesNotMatch(reference, /finalScore|weighted score|0-100/);
  assert.match(profileTemplate, /Critical Flows/);
});

test('skill documents delivery authority, maturity, verdicts, and scoped evidence', () => {
  const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8');
  const deliveryContract = fs.readFileSync(
    path.join(referencesDir, 'delivery-contract.md'),
    'utf8'
  );
  const taskTemplate = fs.readFileSync(
    path.join(assetsDir, 'screen-task.template.yaml'),
    'utf8'
  );
  const reportTemplate = fs.readFileSync(
    path.join(assetsDir, 'compliance-report.template.md'),
    'utf8'
  );

  assert.match(skill, /page-level designs are absent, partial, stale, or non-authoritative/);
  assert.match(skill, /Do not use this list to resolve product behavior/);
  assert.match(deliveryContract, /priority: 1/);
  assert.match(deliveryContract, /pass-with-notes.*, `fail`, `blocked`/s);
  assert.match(deliveryContract, /does not prove that no regression was introduced/i);
  assert.match(taskTemplate, /targetMaturity: fixture-ready/);
  assert.match(taskTemplate, /dataPolicy:\n  sensitivity: public/);
  assert.doesNotMatch(taskTemplate, /dataSensitivity/);
  assert.match(reportTemplate, /## Independent Verdicts/);
  assert.match(reportTemplate, /## Changed-Scope Results/);
  assert.match(reportTemplate, /## Repository-Wide Results/);
});

function seedDesignContract(repo, overrides = {}) {
  const tokenSource = overrides.tokenSource || 'tokens/source/tokens.json';
  const tokenConfig = overrides.tokenConfig || 'style-dictionary.config.mjs';
  const tokenOutputs = overrides.tokenOutputs || {
    web: 'packages/design-tokens/build/web/tokens.css',
    native: 'packages/design-tokens/build/native/tokens.ts',
  };
  const manifest = {
    version: '0.1.0',
    sources: {
      tokens: {
        mode: 'style-dictionary',
        source: tokenSource,
        config: tokenConfig,
        outputs: tokenOutputs,
      },
    },
    packages: {
      tokens: '@acme/design-tokens',
      ui: '@acme/ui',
    },
    platforms: ['web', 'native'],
    requiredChecks: overrides.requiredChecks || [
      'typecheck',
      'lint',
      'ds:validate-contract',
      'ds:scan-raw-styles',
      'test',
      'ds:compliance-report',
    ],
  };

  writeJson(path.join(repo, '.design-system/design-system-manifest.json'), manifest);
  copyAsset('component-spec.example.json', path.join(repo, '.design-system/component-spec.json'));
  copyAsset('layout-recipes.json', path.join(repo, '.design-system/layout-recipes.json'));
  copyAsset('token-policy.json', path.join(repo, '.design-system/token-policy.json'));
  writeJson(path.join(repo, tokenSource), {
    color: {
      bg: {
        surface: { $value: '#ffffff' },
      },
      text: {
        secondary: { $value: '#333333' },
      },
      border: {
        default: { $value: '#dddddd' },
      },
    },
    space: {
      md: { $value: '16px' },
      lg: { $value: '24px' },
    },
    radius: {
      sm: { $value: '4px' },
    },
    font: {
      body: { $value: '16px' },
    },
    shadow: {
      card: { $value: '0 1px 2px rgba(0,0,0,0.1)' },
    },
  });
  writeFile(path.join(repo, tokenConfig), 'export default {};\n');
  for (const output of Object.values(tokenOutputs)) {
    writeFile(path.join(repo, output), 'export const tokens = {};\n');
  }

  return manifest;
}

test('validate-design-contract accepts bundled starter assets only in fallback mode', () => {
  const repo = makeTempRepo('dsp-validate');
  const strictResult = runScript('validate-design-contract.mjs', [], repo);
  assert.equal(strictResult.status, 1);
  assert.match(combinedOutput(strictResult), /Missing required manifest/);

  const fallbackResult = runScript('validate-design-contract.mjs', ['--allow-fallback'], repo);
  assert.equal(fallbackResult.status, 0);
  assert.match(combinedOutput(fallbackResult), /PASS design contract is valid enough/);
});

test('validate-design-contract hard-fails missing token source and artifacts when required', () => {
  const repo = makeTempRepo('dsp-validate-token-gates');
  seedDesignContract(repo);
  fs.rmSync(path.join(repo, 'tokens/source/tokens.json'));
  fs.rmSync(path.join(repo, 'packages/design-tokens/build/native/tokens.ts'));

  const result = runScript(
    'validate-design-contract.mjs',
    ['--require-token-source', '--require-token-artifacts'],
    repo
  );
  const output = combinedOutput(result);

  assert.equal(result.status, 1);
  assert.match(output, /token source file is missing/);
  assert.match(output, /generated token artifact for native is missing/);
});

test('validate-design-contract rejects token paths outside the repo', () => {
  const repo = makeTempRepo('dsp-validate-paths');
  seedDesignContract(repo, {
    tokenSource: '../tokens.json',
  });

  const result = runScript('validate-design-contract.mjs', ['--require-token-source'], repo);

  assert.equal(result.status, 1);
  assert.match(combinedOutput(result), /manifest sources\.tokens\.source must stay inside the repo/);
});

test('validate-design-contract rejects token paths that symlink outside the repo', () => {
  const repo = makeTempRepo('dsp-validate-symlink-paths');
  const outside = makeTempRepo('dsp-validate-symlink-outside');
  writeFile(path.join(outside, 'tokens.json'), '{"color":{"bg":{"surface":{"$value":"#fff"}}}}\n');
  fs.symlinkSync(path.join(outside, 'tokens.json'), path.join(repo, 'tokens-link.json'));
  seedDesignContract(repo, {
    tokenSource: 'tokens-link.json',
  });

  const result = runScript('validate-design-contract.mjs', ['--require-token-source'], repo);

  assert.equal(result.status, 1);
  assert.match(combinedOutput(result), /must stay inside the repo after resolving symlinks/);
});

test('validate-design-contract rejects empty strict contracts', () => {
  const repo = makeTempRepo('dsp-validate-empty-contract');
  seedDesignContract(repo);
  writeJson(path.join(repo, '.design-system/component-spec.json'), { components: {} });
  writeJson(path.join(repo, '.design-system/layout-recipes.json'), { recipes: {} });

  const result = runScript('validate-design-contract.mjs', [], repo);
  const output = combinedOutput(result);

  assert.equal(result.status, 1);
  assert.match(output, /component spec must define at least one component/);
  assert.match(output, /layout recipes must define at least one recipe/);
});

test('scan-raw-styles fails on forbidden product UI patterns', () => {
  const repo = makeTempRepo('dsp-scan-product');
  writeFile(
    path.join(repo, 'src/Bad.tsx'),
    'export function Bad(){ return <div style={{ padding: 17, backgroundColor: "red" }}>Bad</div>; }\n'
  );

  const result = runScript('scan-raw-styles.mjs', ['.', '--platform', 'web'], repo);
  const output = combinedOutput(result);

  assert.equal(result.status, 1);
  assert.match(output, /raw-style-number/);
  assert.match(output, /named-css-color/);
  assert.match(output, /web-direct-dom-primitive/);
});

test('scan-raw-styles fails on raw numeric JSX style props', () => {
  const repo = makeTempRepo('dsp-scan-jsx-raw-props');
  writeFile(
    path.join(repo, 'src/BadProps.tsx'),
    'export function BadProps(){ return <Stack gap={17} padding={24} fontSize="13px">Bad</Stack>; }\n'
  );

  const result = runScript('scan-raw-styles.mjs', ['.', '--platform', 'web'], repo);

  assert.equal(result.status, 1);
  assert.match(combinedOutput(result), /raw-style-number/);
});

test('scan-raw-styles fails on unknown shorthand token props when token source exists', () => {
  const repo = makeTempRepo('dsp-scan-short-token-props');
  seedDesignContract(repo);
  writeFile(
    path.join(repo, 'src/BadToken.tsx'),
    'export function BadToken(){ return <Stack gap="md" padding="mega" color="secondary">Bad</Stack>; }\n'
  );

  const result = runScript('scan-raw-styles.mjs', ['.', '--platform', 'web'], repo);
  const output = combinedOutput(result);

  assert.equal(result.status, 1);
  assert.match(output, /unknown-token-reference/);
  assert.match(output, /padding="mega"/);
  assert.doesNotMatch(output, /gap="md"/);
  assert.doesNotMatch(output, /color="secondary"/);
});

test('scan-raw-styles fails on CSS shorthand named colors and raw shadows', () => {
  const repo = makeTempRepo('dsp-scan-css-shorthand');
  writeFile(
    path.join(repo, 'src/bad.css'),
    '.banner { border: 1px solid red; box-shadow: 0 2px 8px black; }\n'
  );

  const result = runScript('scan-raw-styles.mjs', ['.', '--platform', 'web'], repo);
  const output = combinedOutput(result);

  assert.equal(result.status, 1);
  assert.match(output, /named-css-color/);
  assert.match(output, /raw-shadow/);
});

test('scan-raw-styles ignores forbidden patterns in comments', () => {
  const repo = makeTempRepo('dsp-scan-comments');
  writeFile(
    path.join(repo, 'src/CommentOnly.tsx'),
    '// <div style={{ padding: 17, color: "red" }}>example only</div>\nexport function CommentOnly(){ return <Stack />; }\n'
  );

  const result = runScript('scan-raw-styles.mjs', ['.', '--platform', 'web'], repo);

  assert.equal(result.status, 0, combinedOutput(result));
});

test('scan-raw-styles still catches design lint suppressions in comments', () => {
  const repo = makeTempRepo('dsp-scan-suppression-comments');
  writeFile(
    path.join(repo, 'src/Suppressed.tsx'),
    '// eslint-disable-next-line design-system/no-raw-styles\nexport function Suppressed(){ return <Stack />; }\n'
  );

  const result = runScript('scan-raw-styles.mjs', ['.', '--platform', 'web'], repo);

  assert.equal(result.status, 1);
  assert.match(combinedOutput(result), /design-lint-suppression/);
});

test('scan-raw-styles auto-routes React Native files when platform is all', () => {
  const repo = makeTempRepo('dsp-scan-native');
  writeFile(
    path.join(repo, 'src/NativeScreen.tsx'),
    'import { View } from "react-native"; export function NativeScreen(){ return <View />; }\n'
  );

  const result = runScript('scan-raw-styles.mjs', ['.', '--platform', 'all'], repo);
  const output = combinedOutput(result);

  assert.equal(result.status, 1);
  assert.match(output, /native-forbidden-react-native-import/);
  assert.match(output, /native-direct-primitive-jsx/);
});

test('scan-raw-styles ignores local UI package paths declared through package file dependencies', () => {
  const repo = makeTempRepo('dsp-scan-ui-package');
  seedDesignContract(repo);
  writeJson(path.join(repo, 'package.json'), {
    dependencies: {
      '@acme/ui': 'file:packages/design-system-ui',
      '@acme/design-tokens': 'file:packages/design-tokens',
    },
  });
  writeFile(
    path.join(repo, 'packages/design-system-ui/Button.tsx'),
    'export function Button(){ return <button style={{ padding: 17 }}>OK</button>; }\n'
  );

  const result = runScript('scan-raw-styles.mjs', ['.', '--platform', 'web'], repo);

  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(combinedOutput(result), /PASS design source scan/);
});

test('scan-raw-styles ignores local UI package paths declared through workspaces', () => {
  const repo = makeTempRepo('dsp-scan-workspace-ui-package');
  seedDesignContract(repo);
  writeJson(path.join(repo, 'package.json'), {
    dependencies: {
      '@acme/ui': 'workspace:*',
      '@acme/design-tokens': 'workspace:*',
    },
    workspaces: ['packages/*'],
  });
  writeJson(path.join(repo, 'packages/design-system-ui/package.json'), {
    name: '@acme/ui',
  });
  writeFile(
    path.join(repo, 'packages/design-system-ui/Button.tsx'),
    'export function Button(){ return <button style={{ padding: 17 }}>OK</button>; }\n'
  );

  const result = runScript('scan-raw-styles.mjs', ['.', '--platform', 'web'], repo);

  assert.equal(result.status, 0, combinedOutput(result));
});

test('scan-raw-styles rejects scan roots outside the repo', () => {
  const repo = makeTempRepo('dsp-scan-root-boundary');
  const result = runScript('scan-raw-styles.mjs', ['..', '--platform', 'web'], repo);

  assert.equal(result.status, 2);
  assert.match(combinedOutput(result), /scan root must stay inside the repo/);
});

test('scan-raw-styles rejects scan roots that symlink outside the repo', () => {
  const repo = makeTempRepo('dsp-scan-symlink-root');
  const outside = makeTempRepo('dsp-scan-symlink-outside');
  writeFile(
    path.join(outside, 'Leaked.tsx'),
    'export function Leaked(){ return <div style={{ padding: 17 }}>Leaked</div>; }\n'
  );
  fs.symlinkSync(outside, path.join(repo, 'linked'));

  const result = runScript('scan-raw-styles.mjs', ['linked', '--platform', 'web'], repo);

  assert.equal(result.status, 2);
  assert.match(combinedOutput(result), /after resolving symlinks/);
});

test('generate-compliance-report fails when a manifest-required custom script is missing', () => {
  const repo = makeTempRepo('dsp-required-missing');
  seedDesignContract(repo, { requiredChecks: ['test:a11y'] });
  writeJson(path.join(repo, 'package.json'), {
    scripts: {},
  });

  const result = runScript(
    'generate-compliance-report.mjs',
    ['--run-checks', '--require-token-source', '--require-token-artifacts'],
    repo
  );
  const report = fs.readFileSync(path.join(repo, 'design-compliance-report.generated.md'), 'utf8');

  assert.equal(result.status, 1);
  assert.match(report, /### test:a11y/);
  assert.match(report, /package\.json script "test:a11y" is not defined/);
});

test('generate-compliance-report fails when a manifest-required custom script exits nonzero', () => {
  const repo = makeTempRepo('dsp-required-failing');
  seedDesignContract(repo, { requiredChecks: ['test:a11y'] });
  writeJson(path.join(repo, 'package.json'), {
    scripts: {
      'test:a11y': 'node -e "console.error(\'a11y broke\'); process.exit(7)"',
    },
  });

  const result = runScript(
    'generate-compliance-report.mjs',
    ['--run-checks', '--require-token-source', '--require-token-artifacts'],
    repo
  );
  const report = fs.readFileSync(path.join(repo, 'design-compliance-report.generated.md'), 'utf8');

  assert.equal(result.status, 1);
  assert.match(report, /### test:a11y/);
  assert.match(report, /Status: FAIL/);
  assert.match(report, /a11y broke/);
});

test('generate-compliance-report executes manifest-required custom scripts when present', () => {
  const repo = makeTempRepo('dsp-required-present');
  seedDesignContract(repo, { requiredChecks: ['test:a11y'] });
  writeJson(path.join(repo, 'package.json'), {
    scripts: {
      'test:a11y': 'node -e "process.exit(0)"',
    },
  });

  const result = runScript(
    'generate-compliance-report.mjs',
    ['--run-checks', '--require-token-source', '--require-token-artifacts'],
    repo
  );
  const report = fs.readFileSync(path.join(repo, 'design-compliance-report.generated.md'), 'utf8');

  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(report, /### test:a11y/);
  assert.match(report, /Status: PASS/);
});

test('generate-compliance-report runs repo-native design scripts before bundled fallbacks', () => {
  const repo = makeTempRepo('dsp-required-native-design-script');
  seedDesignContract(repo, { requiredChecks: ['ds:scan-raw-styles'] });
  writeJson(path.join(repo, 'package.json'), {
    scripts: {
      'ds:scan-raw-styles': 'node -e "console.error(\'repo scan failed\'); process.exit(9)"',
    },
  });

  const result = runScript(
    'generate-compliance-report.mjs',
    ['--run-checks', '--require-token-source', '--require-token-artifacts'],
    repo
  );
  const report = fs.readFileSync(path.join(repo, 'design-compliance-report.generated.md'), 'utf8');

  assert.equal(result.status, 1);
  assert.match(report, /### repo-native ds:scan-raw-styles/);
  assert.match(report, /Command: `npm run ds:scan-raw-styles -- --platform all`/);
  assert.match(report, /repo scan failed/);
});

test('generate-compliance-report bundled validation still enforces token gates with repo-native scripts', () => {
  const repo = makeTempRepo('dsp-native-validation-token-gates');
  seedDesignContract(repo, { requiredChecks: ['ds:validate-contract'] });
  fs.rmSync(path.join(repo, 'tokens/source/tokens.json'));
  writeJson(path.join(repo, 'package.json'), {
    scripts: {
      'ds:validate-contract': 'node -e "process.exit(0)"',
    },
  });

  const result = runScript(
    'generate-compliance-report.mjs',
    ['--run-checks', '--require-token-source'],
    repo
  );
  const report = fs.readFileSync(path.join(repo, 'design-compliance-report.generated.md'), 'utf8');

  assert.equal(result.status, 1);
  assert.match(report, /### repo-native ds:validate-contract/);
  assert.match(report, /### design contract validation/);
  assert.match(report, /token source file is missing/);
});

test('generate-compliance-report redacts and safely fences command output', () => {
  const repo = makeTempRepo('dsp-report-safe-output');
  seedDesignContract(repo, { requiredChecks: ['test:a11y'] });
  writeFile(
    path.join(repo, 'scripts/print-secrets.mjs'),
    [
      'console.log("```");',
      'console.log("API_TOKEN=abc123");',
      'console.log("\\"API_TOKEN\\":\\"jsonsecret\\"");',
      'console.log("API_TOKEN: colonsecret");',
      'console.log(["ghp", "abcdefghijklmnopqrstuvwxyz1234567890ABCD"].join("_"));',
      'console.log("```");',
      '',
    ].join('\n')
  );
  writeJson(path.join(repo, 'package.json'), {
    scripts: {
      'test:a11y': 'node scripts/print-secrets.mjs',
    },
  });

  const result = runScript(
    'generate-compliance-report.mjs',
    ['--run-checks', '--require-token-source', '--require-token-artifacts'],
    repo
  );
  const report = fs.readFileSync(path.join(repo, 'design-compliance-report.generated.md'), 'utf8');

  assert.equal(result.status, 0, combinedOutput(result));
  assert.doesNotMatch(report, /API_TOKEN=abc123/);
  assert.doesNotMatch(report, /jsonsecret/);
  assert.doesNotMatch(report, /colonsecret/);
  assert.doesNotMatch(report, new RegExp(["ghp", "abcdefghijklmnopqrstuvwxyz"].join("_")));
  assert.match(report, /API_TOKEN=\[REDACTED\]/);
  assert.match(report, /"API_TOKEN":\[REDACTED\]/);
  assert.match(report, /API_TOKEN: \[REDACTED\]/);
  assert.match(report, /\[REDACTED_TOKEN\]/);
  assert.match(report, /````txt/);
});

test('generate-compliance-report rejects output paths outside the repo', () => {
  const repo = makeTempRepo('dsp-report-out-boundary');
  seedDesignContract(repo);

  const result = runScript('generate-compliance-report.mjs', ['--out', '../report.md'], repo);

  assert.equal(result.status, 2);
  assert.match(combinedOutput(result), /--out must stay inside the repo/);
});

test('generate-compliance-report rejects changed roots outside the repo', () => {
  const repo = makeTempRepo('dsp-report-changed-root-boundary');
  seedDesignContract(repo);

  const result = runScript('generate-compliance-report.mjs', ['--changed-root', '..'], repo);

  assert.equal(result.status, 2);
  assert.match(combinedOutput(result), /--changed-root must stay inside the repo/);
});

test('generate-compliance-report rejects changed roots that symlink outside the repo', () => {
  const repo = makeTempRepo('dsp-report-changed-root-symlink');
  const outside = makeTempRepo('dsp-report-changed-root-outside');
  seedDesignContract(repo);
  writeFile(path.join(outside, 'Leaked.tsx'), 'export function Leaked(){ return <div />; }\n');
  fs.symlinkSync(outside, path.join(repo, 'linked'));

  const result = runScript('generate-compliance-report.mjs', ['--changed-root', 'linked'], repo);

  assert.equal(result.status, 2);
  assert.match(combinedOutput(result), /--changed-root must stay inside the repo after resolving symlinks/);
});

test('generate-compliance-report includes manual publishing brief review sections', () => {
  const repo = makeTempRepo('dsp-report-brief-sections');
  seedDesignContract(repo);

  const result = runScript('generate-compliance-report.mjs', [], repo);
  const report = fs.readFileSync(path.join(repo, 'design-compliance-report.generated.md'), 'utf8');

  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(report, /## Component Composition - Manual Completion Required/);
  assert.match(report, /## Transition Contract - Manual Completion Required/);
  assert.match(report, /## Visual Quality Review - Manual Completion Required/);
  assert.match(report, /## Design-System Gaps - Manual Completion Required/);
  assert.match(report, /## Independent Verdicts - Manual Completion Required/);
  assert.match(report, /Design-system compliance: not-reviewed/);
  assert.match(report, /Changed-scope current checks: NOT RUN/);
  assert.match(report, /Repository-wide checks: NOT RUN/);
});

test('generate-compliance-report separates changed-scope pass from repository-wide failure', () => {
  const repo = makeTempRepo('dsp-report-scoped-results');
  seedDesignContract(repo);
  writeFile(
    path.join(repo, 'src/changed/Good.tsx'),
    'export function Good(){ return <Stack gap="md" />; }\n'
  );
  writeFile(
    path.join(repo, 'src/legacy/Bad.tsx'),
    'export function Bad(){ return <div style={{ padding: 17 }}>Bad</div>; }\n'
  );

  const result = runScript(
    'generate-compliance-report.mjs',
    ['--run-checks', '--changed-root', 'src/changed', '--target-maturity', 'runtime-ready'],
    repo
  );
  const report = fs.readFileSync(path.join(repo, 'design-compliance-report.generated.md'), 'utf8');

  assert.equal(result.status, 1);
  assert.match(report, /Target maturity: runtime-ready/);
  assert.match(report, /Changed-scope current checks: PASS/);
  assert.match(report, /Repository-wide checks: FAIL/);
  assert.match(report, /### changed-scope design source scan/);
  assert.match(report, /Scope: changed-scope/);
  assert.match(report, /Roots: src\/changed/);
  assert.match(report, /Exit code: 0/);
  assert.match(report, /New-regression conclusion: not established without comparable baseline evidence/);
});

test('generate-compliance-report records git and per-command evidence without dirty paths', () => {
  const repo = makeTempRepo('dsp-report-provenance');
  seedDesignContract(repo, {
    requiredChecks: ['ds:validate-contract', 'ds:scan-raw-styles'],
  });
  assert.equal(runCommand('git', ['init'], repo).status, 0);
  assert.equal(runCommand('git', ['add', '.'], repo).status, 0);
  assert.equal(runCommand(
    'git',
    ['-c', 'user.name=Skill Test', '-c', 'user.email=skill@example.test', 'commit', '-m', 'seed'],
    repo
  ).status, 0);
  const commit = runCommand('git', ['rev-parse', 'HEAD'], repo).stdout.trim();

  const result = runScript('generate-compliance-report.mjs', ['--run-checks'], repo);
  const report = fs.readFileSync(path.join(repo, 'design-compliance-report.generated.md'), 'utf8');

  assert.equal(result.status, 0, combinedOutput(result));
  assert.match(report, new RegExp(`Commit: ${commit}`));
  assert.match(report, /Worktree dirty: no/);
  assert.match(report, /Dirty entry count: 0/);
  assert.match(report, /Executed at: \d{4}-\d{2}-\d{2}T/);
  assert.match(report, /Exit code: 0/);
  assert.match(report, /Tool version: v\d+/);
  assert.doesNotMatch(report, /tokens\/source\/tokens\.json.*dirty/i);
});

test('generate-compliance-report rejects symlinked output parents outside the repo', () => {
  const repo = makeTempRepo('dsp-report-out-symlink-boundary');
  const outside = makeTempRepo('dsp-report-outside');
  seedDesignContract(repo);
  fs.symlinkSync(outside, path.join(repo, 'reports'));

  const result = runScript('generate-compliance-report.mjs', ['--out', 'reports/report.md'], repo);

  assert.equal(result.status, 2);
  assert.match(combinedOutput(result), /--out parent must stay inside the repo after resolving symlinks/);
  assert.equal(fs.existsSync(path.join(outside, 'report.md')), false);
});
