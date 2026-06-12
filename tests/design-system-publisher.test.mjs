import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = path.join(packageRoot, '.agents/skills/design-system-publisher');
const scriptsDir = path.join(skillRoot, 'scripts');
const assetsDir = path.join(skillRoot, 'assets');

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

test('scan-raw-styles rejects scan roots outside the repo', () => {
  const repo = makeTempRepo('dsp-scan-root-boundary');
  const result = runScript('scan-raw-styles.mjs', ['..', '--platform', 'web'], repo);

  assert.equal(result.status, 2);
  assert.match(combinedOutput(result), /scan root must stay inside the repo/);
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

test('generate-compliance-report rejects output paths outside the repo', () => {
  const repo = makeTempRepo('dsp-report-out-boundary');
  seedDesignContract(repo);

  const result = runScript('generate-compliance-report.mjs', ['--out', '../report.md'], repo);

  assert.equal(result.status, 2);
  assert.match(combinedOutput(result), /--out must stay inside the repo/);
});
