# Publishing Rules

## Use approved components

Product screens should use the design-system API.

Allowed examples:

```txt
Screen
Page
Box
Stack
Inline
Grid
Text
Heading
Button
IconButton
TextField
Select
Checkbox
Radio
Switch
Card
List
EmptyState
ErrorState
LoadingState
Modal
BottomSheet
Toast
```

Direct DOM/RN primitives are allowed inside the UI package but not in product screens unless the repo rules explicitly allow them.

## No raw visual values

Forbidden in product UI:

```txt
#FFFFFF
#fff
rgb(...)
rgba(...)
hsl(...)
13px
17px
padding: 19
borderRadius: 7
fontSize: 15
zIndex: 9999
```

Use design-system props or tokens:

```tsx
<Box backgroundColor="surface" padding="lg" radius="md">
  <Text variant="body.md" color="primary">Content</Text>
</Box>
```

## No unapproved variants

Do not add variants such as `superPrimary`, `tertiary2`, `brandGradient`, or arbitrary sizes unless the task is explicitly to evolve the design system contract.

## Required states

Screens must include all states required by their layout recipe. When in doubt, implement loading, empty, error, and success.

## Accessibility is part of publishing

Required examples:

- Icon-only controls must have labels.
- Form fields must have visible labels or approved accessible labels.
- Error text must be associated with the field where the platform supports it.
- Modals/dialogs must have titles and close behavior.
- Disabled/loading states must prevent invalid duplicate interactions.
- Touch targets must meet the repo's minimum size policy.

## No design-system bypasses

Do not suppress design-system lint rules. Do not add local wrapper components that recreate design-system components with custom styling.
