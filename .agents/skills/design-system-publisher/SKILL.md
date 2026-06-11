---
name: design-system-publisher
description: Use this skill when publishing React or React Native screens/components without page-level designs, using a Figma-derived design system contract, Style Dictionary-generated tokens, @my/ui components, layout recipes, accessibility rules, and design compliance checks. Do not use for backend-only work, non-UI refactors, or freeform visual design.
---

# Design System Publisher Skill

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
7. fallback examples in this skill's `assets/` directory

Figma Variables become tokens. Figma component properties become TypeScript props. Meaningful Figma layer names become slots. Figma usage rules become lint/test/compliance gates.

## Core rules

Always follow these rules for product UI:

- Use approved design system components, preferably from `@my/ui` or the local UI package.
- Use semantic or component tokens. Do not use raw visual values.
- Do not create new colors, spacing, font sizes, radii, shadows, or visual variants unless the task explicitly asks for design-system evolution.
- Do not use direct DOM/RN primitives in product screens unless the design-system rules allow it.
- Implement all states required by the selected layout recipe.
- Add stories, examples, or fixtures for every required state.
- Add accessibility labels, roles, and relationships where required.
- Run the available design-system checks before finishing.
- Produce a Design Compliance Report.

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

### 2. Read contracts and rules

Read the relevant files from `.design-system/`. If they are absent, use the examples under `assets/` as a fallback and note the fallback in the report.

Useful references:

- `references/figma-to-contract.md`
- `references/publishing-rules.md`
- `references/component-contract.md`
- `references/layout-recipes.md`
- `references/compliance-gates.md`
- `references/review-checklist.md`

### 3. Select a recipe

For screens, pick the closest recipe:

- `list-screen`
- `form-screen`
- `detail-screen`
- `auth-screen`
- `settings-screen`
- `dashboard-screen`

Do not invent a new page pattern by default. If no recipe fits, use the closest recipe and document the deviation.

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

Prefer repo scripts first:

```bash
pnpm typecheck
pnpm lint
pnpm ds:validate-contract
pnpm ds:scan-raw-styles
pnpm test
pnpm test:a11y
pnpm test:visual
pnpm ds:compliance-report
```

If those scripts do not exist, run this skill's fallback scripts when possible:

```bash
node .agents/skills/design-system-publisher/scripts/validate-design-contract.mjs
node .agents/skills/design-system-publisher/scripts/scan-raw-styles.mjs .
node .agents/skills/design-system-publisher/scripts/generate-compliance-report.mjs
```

### 8. Report compliance

End UI tasks with a concise Design Compliance Report containing:

- task scope
- recipe used
- components used
- token compliance
- forbidden pattern scan
- required state coverage
- accessibility coverage
- tests/checks run
- deviations and follow-up items

Use `assets/compliance-report.template.md` as the report shape.

## Hard failures

Do not consider the task complete if any hard failure remains:

- TypeScript/build errors
- raw color usage in product UI
- unknown tokens
- direct primitive usage where forbidden
- missing required states
- missing icon-only labels
- failed contrast or touch target checks, when a checker exists
- visual regressions without explicit approval
- suppressed design-system lint rules
- new visual token or variant introduced without explicit design-system task

## Expected final response

For implementation tasks, summarize:

1. what was created/changed
2. which recipe and components were used
3. which checks passed or could not be run
4. where the compliance report is located
5. remaining deviations, if any
