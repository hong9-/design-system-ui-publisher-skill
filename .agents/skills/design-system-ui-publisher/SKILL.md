---
name: design-system-ui-publisher
description: Use this skill when publishing React or React Native screens/components without page-level designs, using a Figma-derived design system contract, Style Dictionary-generated tokens, @my/ui components, layout recipes, accessibility rules, and design compliance checks. Do not use for backend-only work, non-UI refactors, or freeform visual design.
---

# Design System UI Publisher Skill

You publish UI without page-level design files.

Your job is **not** to invent visual design. Your job is to assemble screens and components using the Figma-derived design system contract.

## Source of truth

Treat these as the source of truth, in this order:

1. `.design-system/design-system-manifest.json`, if present
2. `.design-system/component-spec.json`, if present
3. `.design-system/layout-recipes.json`, if present
4. `.design-system/token-policy.json`, if present
5. generated design token packages, for example `packages/design-tokens`
6. shared UI package, for example `packages/ui` or `@my/ui`
7. starter examples in this skill's `assets/` directory, for initialization only

Committed token source becomes generated design token artifacts. Figma Variables may be imported during explicit sync tasks, then committed as raw/normalized token source. Figma component properties become TypeScript props. Meaningful Figma layer names become slots. Figma usage rules become lint/test/compliance gates.

For `sync-design-contract` tasks, use Figma MCP when available to import Variables and enrich component contracts, then use Style Dictionary or an equivalent token build as the reproducible code pipeline. Figma MCP is not required for CI.

## Core rules

Always follow these rules for product UI:

- Use approved design system components, preferably from `@my/ui` or the local UI package.
- Use semantic or component tokens. Do not use raw visual values.
- Do not create new colors, spacing, font sizes, radii, shadows, or visual variants unless the task explicitly asks for design-system evolution.
- If a task needs visual design that the contract does not cover, do not invent it in product UI. Create a design-system extension proposal YAML and block the publishing task until explicit approval.
- Do not use direct DOM/RN primitives in product screens unless the design-system rules allow it.
- Implement all states required by the selected layout recipe.
- Add stories, examples, or fixtures for every required state.
- Add accessibility labels, roles, and relationships where required.
- Run the available design-system checks before finishing.
- Produce a Design Compliance Report.
- Record composition, transition coverage, visual quality status, and DS gaps in the report.

Forbidden in product screens unless explicitly allowed:

- raw hex/rgb/hsl colors
- arbitrary numeric spacing or sizes
- arbitrary font sizes
- arbitrary border radius
- inline style objects that bypass design-system props
- direct `div`, `span`, `button`, `View`, `Text`, `Pressable`, `TouchableOpacity` usage
- absolute positioning unless a recipe allows it
- suppressing design-system lint rules

## Workflow

### 1. Classify the task

Choose one task type:

- `create-screen`
- `create-component`
- `update-screen`
- `update-component`
- `audit-design-compliance`
- `sync-design-contract`

If the task is not UI-related, do not use this skill.

For screen/component tasks, treat the structured task template as the Publishing Brief. If required fields are missing, record missing input instead of inventing it.

### 2. Read contracts and rules

Read the relevant files from `.design-system/`. If they are absent, use the examples under `assets/` only to initialize or orient the repo; do not treat starter examples as CI proof for product UI.

Do not preload every reference file. Load only the references that match the classified task, target platform, and current blocker.

Useful references:

- `references/figma-to-contract.md`
- `references/figma-import.md`, for `sync-design-contract` tasks
- `references/style-dictionary-integration.md`, for token build setup
- `references/publishing-rules.md`
- `references/component-contract.md`
- `references/layout-recipes.md`
- `references/design-system-extension-proposals.md`, when the UI needs tokens, components, variants, states, or recipes that are missing from the contract
- `references/compliance-gates.md`
- `references/review-checklist.md`
- `references/visual-quality-review-gate.md`, when visual quality review or a project profile is involved
- `references/platform-common.md`
- `references/platform-react-web.md`, when target includes web
- `references/platform-react-native.md`, when target includes native

### 3. Select a recipe

For `sync-design-contract`, skip recipe selection and follow `references/figma-import.md`.

For screens, pick the closest recipe:

- `list-screen`
- `form-screen`
- `detail-screen`
- `auth-screen`
- `settings-screen`
- `dashboard-screen`

Do not invent a new page pattern by default. If no recipe fits, use the closest recipe and document the deviation.

If the closest recipe still requires new visual grammar, stop product implementation and create `.design-system/proposals/<slug>.yaml` from `assets/design-system-extension-proposal.template.yaml`. Continue only after explicit approval or after the user explicitly changes the task into a design-system evolution task.

Before implementation, decompose screens as `Screen > Section > Component > Slot` and verify entry route, action destinations, cancel/back behavior, success path, and error recovery when provided.

### 4. Implement within the design grammar

Use design-system primitives and components.

Prefer this:

```tsx
<Screen>
  <Stack gap="lg" padding="screen">
    <Heading level={1}>Title</Heading>
    <Text variant="body.md" color="secondary">Description</Text>
    <Button variant="primary" size="md">Continue</Button>
  </Stack>
</Screen>
```

Avoid this:

```tsx
<div style={{ padding: 17, color: '#111827' }}>
  <button>Continue</button>
</div>
```

### 5. Cover required states

At minimum, list-like screens must cover:

- `loading`
- `empty`
- `error`
- `success`

Form-like screens must cover:

- `default`
- `dirty`
- `submitting`
- `success`
- `error`
- `disabled`, when applicable

### 6. Add stories/tests

Add the best available coverage for the repo:

- Storybook/Ladle stories for web
- RN fixture stories or example states
- unit/component tests where available
- accessibility tests where available
- visual snapshot targets where available

### 7. Run checks

Prefer repo-native scripts first. Detect the JavaScript package manager from `package.json#packageManager` or lockfiles, then use the matching package manager:

- `pnpm-lock.yaml` or `packageManager: "pnpm@..."`: `pnpm run <script>`
- `yarn.lock` or `packageManager: "yarn@..."`: `yarn run <script>`
- `package-lock.json`, `npm-shrinkwrap.json`, or npm package metadata: `npm run <script>`

Run the equivalents of these scripts when they exist:

```bash
<pm> run typecheck
<pm> run lint
<pm> run ds:validate-contract
<pm> run ds:scan-raw-styles
<pm> run test
<pm> run test:a11y
<pm> run test:visual
<pm> run ds:compliance-report
```

If package scripts do not exist, run this skill's fallback scripts directly when possible:

```bash
node .agents/skills/design-system-ui-publisher/scripts/validate-design-contract.mjs
node .agents/skills/design-system-ui-publisher/scripts/scan-raw-styles.mjs . --platform all
node .agents/skills/design-system-ui-publisher/scripts/generate-compliance-report.mjs
```

`generate-compliance-report.mjs` is report-only by default. Use `--run-checks` only when you want it to execute `typecheck`, `lint`, `test`, contract validation, and source scan as an orchestrator. In run-checks mode, repo-native `ds:validate-contract` and `ds:scan-raw-styles` scripts run when present, and the bundled validators still run as built-in design gates so generator flags cannot be bypassed. Custom scripts listed in `manifest.requiredChecks` are hard failures when missing. CI-style `ds:check` scripts should pass `--require-token-source --require-token-artifacts` so missing token source, config, or generated artifacts are hard failures.

`scan-raw-styles.mjs --platform all` auto-routes web/native-specific scan rules per file. Ambiguous JSX files are scanned with both web and native rules to avoid false-green mixed repos. Use `--platform web` or `--platform native` when a scan root is known to be single-platform.

For mixed monorepos, do not assume a JavaScript package manager covers the whole repo. Also run any Rust, native, workspace-level, or manifest-required checks that the repository defines.

`validate-design-contract.mjs` is strict by default. Use `--allow-fallback` only while initializing starter assets or smoke-testing the skill itself.
Use `--require-token-source` and `--require-token-artifacts` when a repo should fail on missing Style Dictionary inputs or generated token outputs.

### 8. Report compliance

End UI tasks with a concise Design Compliance Report containing:

- task scope
- recipe used
- components used
- token compliance
- forbidden pattern scan
- required state coverage
- accessibility coverage
- component composition and transition contract coverage
- visual quality review status and review basis
- DS gaps and proposal links
- tests/checks run
- deviations and follow-up items

Use `assets/compliance-report.template.md` as the report shape.

## Automated hard failures

Do not consider the task complete if any automated hard failure remains:

- TypeScript/build errors
- raw color usage in product UI
- unknown tokens
- direct primitive usage where forbidden
- suppressed design-system lint rules
- new visual token or variant introduced without explicit design-system task

## Manual review hard stops

The bundled scripts cannot prove every design requirement. Do not consider the task complete until manual review or repo-specific tests also cover:

- missing required states
- missing icon-only labels
- failed contrast or touch target checks, when a checker exists
- missing transition contract coverage for required actions
- `not reviewed` visual quality status on release-ready screens that require review
- visual regressions without explicit approval

## Expected final response

For implementation tasks, summarize:

1. what was created/changed
2. which recipe and components were used
3. which checks passed or could not be run
4. where the compliance report is located
5. remaining deviations, if any
