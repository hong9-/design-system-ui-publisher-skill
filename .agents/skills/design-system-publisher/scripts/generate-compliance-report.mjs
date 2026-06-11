#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'design-compliance-report.generated.md';
const cwd = process.cwd();
const now = new Date().toISOString();

function exists(p) {
  return fs.existsSync(path.join(cwd, p));
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
pnpm typecheck
pnpm lint
pnpm ds:validate-contract
pnpm ds:scan-raw-styles
pnpm test
\`\`\`

## Results

- Typecheck: TODO
- Lint: TODO
- Design contract validation: TODO
- Raw style scan: TODO
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
