# Compliance Gates

## Gate 1: Contract validation

Baseline automated checks:

- required contract files exist in strict mode
- manifest has version, packages, platforms, and required checks
- manifest platforms use approved platform names
- manifest token pipeline metadata defines mode, source, config, and platform outputs
- component specs define status, purpose, props, and slots
- component status uses an approved lifecycle value
- component token references use allowed token prefixes
- layout recipes define purpose and required states
- recipe inheritance points to an existing recipe
- token policy defines allowed layers and token prefixes

Command examples:

```bash
<pm> run ds:validate-contract
node .agents/skills/design-system-ui-publisher/scripts/validate-design-contract.mjs
```

Token source and generated artifact file existence are warnings by default. Make them hard failures when the repo should be fully wired:

```bash
node .agents/skills/design-system-ui-publisher/scripts/validate-design-contract.mjs --require-token-source
node .agents/skills/design-system-ui-publisher/scripts/validate-design-contract.mjs --require-token-source --require-token-artifacts
```

Validation is strict by default. Starter assets are not accepted as CI proof. Use `--allow-fallback` only for initialization or skill smoke tests:

```bash
node .agents/skills/design-system-ui-publisher/scripts/validate-design-contract.mjs --allow-fallback
```

Advanced contract checks can be added later if the repo has richer token metadata:

- token naming convention
- required modes exist
- no alias cycles
- component props match approved variants/sizes/states
- slots are mapped to real implementation surfaces
- platform-incompatible values are identified from token transforms

## Gate 2: Static source scan

Checks:

- no raw colors
- no arbitrary spacing/font/radius values
- no direct DOM/RN primitives in product screens
- no inline styles in product screens
- no design-system lint suppression

Command examples:

```bash
<pm> run ds:scan-raw-styles
node .agents/skills/design-system-ui-publisher/scripts/scan-raw-styles.mjs . --platform all
node .agents/skills/design-system-ui-publisher/scripts/scan-raw-styles.mjs apps/web --platform web
node .agents/skills/design-system-ui-publisher/scripts/scan-raw-styles.mjs apps/mobile --platform native
```

Platform rule modules:

- common: raw visual values, inline style bypasses, design lint suppression
- web: direct DOM primitives and arbitrary class utilities
- native: direct `react-native` visual primitive imports, `className`, and web CSS variable usage

With `--platform all`, common rules run for every scanned product file and web/native-specific rules are auto-routed by path, extension, and React Native imports. Use explicit `--platform web` or `--platform native` for known single-platform roots.

## Gate 3: Type/lint/test

Run repo-standard checks:

```bash
<pm> run typecheck
<pm> run lint
<pm> run test
```

Choose `<pm>` from the repo's native package manager: `pnpm`, `yarn`, or `npm`. In mixed monorepos, also run non-JavaScript checks required by the repo or design-system manifest.

## Report generation

Generate the compliance report after checks have run:

```bash
node .agents/skills/design-system-ui-publisher/scripts/generate-compliance-report.mjs
```

The report generator is report-only by default. To use it as a single local orchestrator, opt in:

```bash
node .agents/skills/design-system-ui-publisher/scripts/generate-compliance-report.mjs --run-checks
```

In run-checks mode, repo-native `ds:validate-contract` and `ds:scan-raw-styles` scripts run when they are present, and the bundled validators still run as built-in design gates so generator flags cannot be bypassed. Custom scripts listed in `manifest.requiredChecks` fail when they are missing or cannot be executed.

Generated reports are draft scaffolds until the manual sections are completed. Automated check status alone is not proof that required states, component composition, transition coverage, accessibility behavior, visual quality review, or DS gap classification are complete.

For CI, make token source, token config, and generated token artifacts hard failures:

```bash
node .agents/skills/design-system-ui-publisher/scripts/generate-compliance-report.mjs --run-checks --require-token-source --require-token-artifacts
```

For pull request workflows, keep permissions read-only and do not move this job to `pull_request_target`; dependency installation and package scripts execute repository-controlled code.

## Gate 4: Accessibility

Run whatever the repo supports:

```bash
<pm> run test:a11y
<pm> run test:e2e:a11y
```

Minimum manual assertions when tooling is absent:

- icon-only buttons have labels
- form fields have labels
- dialogs have titles
- loading and disabled states block duplicate actions
- important controls are keyboard/screen-reader reachable where applicable

## Gate 5: Visual regression

Run when available:

```bash
<pm> run test:visual
<pm> run storybook:build
```

Visual diffs require review approval.

## Gate 6: Visual quality review

Use `references/visual-quality-review-gate.md` when a task includes visual quality review, when a project profile exists, or when a compliant screen still looks visually weak.

Manual assertions:

- review basis is `project profile`, `generic review only`, or `not reviewed`
- release-ready screens that require visual review are not left as `not reviewed`
- project critical flows satisfy their required judgment information and safe exit rules
- visual issues are classified as token, component, variant, recipe, content, flow, or implementation gaps
- blocking gaps are tracked through design-system proposals or explicit follow-up owners

## Hard failures

- raw colors
- unknown tokens
- direct primitive use where forbidden
- failed typecheck/build

Manual review hard stops unless covered by repo-specific tests:

- missing required states
- accessibility label violations
- missing required transition coverage
- release-ready screen with required visual review marked `not reviewed`
- failed visual regression without approval

## Warnings

- too many nested layout wrappers
- repeated one-off wrapper components
- primitive token usage in product UI
- recipe deviation with justification
- untested optional states
- generic visual quality review without a project profile
- non-blocking DS gaps with owners
