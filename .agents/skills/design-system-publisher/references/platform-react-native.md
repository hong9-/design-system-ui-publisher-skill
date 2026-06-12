# React Native Publishing Rules

Use these rules only when the target includes React Native.

## Primitives

Product screens must not import visual primitives directly from `react-native`:

```txt
View
Text
Pressable
TouchableOpacity
StyleSheet
```

These are allowed inside the UI package implementation layer, not product screens.

## Styling

Allowed styling surfaces:

- design-system component props
- generated native token objects
- `StyleSheet.create` inside UI package internals
- platform adapters such as `.native.tsx` and `.styles.native.ts`

Forbidden in product screens:

- direct `StyleSheet.create`
- web CSS variables such as `var(--color-bg-surface)`
- `className`
- DOM-only `aria-*` props as the primary accessibility API
- raw numeric style objects

## Accessibility

Native UI must preserve:

- `accessibilityRole` for interactive controls
- `accessibilityLabel` for icon-only controls
- `accessibilityState` for disabled/loading/selected states
- disabled/loading behavior that prevents duplicate actions
- minimum touch target policy from the repo or design system

## Preferred Checks

```bash
<pm> run test:a11y:native
<pm> run test:visual:native
node .agents/skills/design-system-publisher/scripts/scan-raw-styles.mjs . --platform native
```
