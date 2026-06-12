# React Web Publishing Rules

Use these rules only when the target includes React Web.

## Primitives

Product screens must not render direct DOM primitives:

```txt
div
span
button
input
textarea
select
```

Use `@my/ui` or the local design-system package instead.

## Styling

Allowed styling surfaces:

- design-system component props
- generated CSS variables from design tokens
- approved CSS-in-JS adapters inside the UI package
- approved route shell CSS only when listed in the manifest

Forbidden in product screens:

- `style={{ ... }}`
- arbitrary Tailwind values such as `px-[17px]` or `text-[#111827]`
- raw CSS files with design values
- local button/input/card wrappers that bypass `@my/ui`

## Accessibility

Web UI must preserve:

- visible focus states
- keyboard-reachable interactive controls
- accessible names for icon-only controls
- label and error relationships for form fields
- dialog title and close behavior
- valid `aria-*` usage only when native semantics are insufficient

## Preferred Checks

```bash
<pm> run test:a11y
<pm> run test:visual
node .agents/skills/design-system-publisher/scripts/scan-raw-styles.mjs . --platform web
```
