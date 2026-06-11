# Compliance Gates

## Gate 1: Contract validation

Checks:

- token naming convention
- required modes exist
- no alias cycles
- no unknown token references
- component props match approved variants/sizes/states
- slots are mapped
- platform-incompatible values are identified

Command examples:

```bash
pnpm ds:validate-contract
node .agents/skills/design-system-publisher/scripts/validate-design-contract.mjs
```

## Gate 2: Static source scan

Checks:

- no raw colors
- no arbitrary spacing/font/radius values
- no direct DOM/RN primitives in product screens
- no inline styles in product screens
- no design-system lint suppression

Command examples:

```bash
pnpm ds:scan-raw-styles
node .agents/skills/design-system-publisher/scripts/scan-raw-styles.mjs .
```

## Gate 3: Type/lint/test

Run repo-standard checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Gate 4: Accessibility

Run whatever the repo supports:

```bash
pnpm test:a11y
pnpm test:e2e:a11y
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
pnpm test:visual
pnpm storybook:build
```

Visual diffs require review approval.

## Hard failures

- raw colors
- unknown tokens
- missing required states
- direct primitive use where forbidden
- accessibility label violations
- failed typecheck/build
- failed visual regression without approval

## Warnings

- too many nested layout wrappers
- repeated one-off wrapper components
- primitive token usage in product UI
- recipe deviation with justification
- untested optional states
