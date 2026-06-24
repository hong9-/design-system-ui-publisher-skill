# Figma to Design Contract

## Variables to tokens

Figma Variables can inform the token source, but product code should consume artifacts generated from committed token JSON. A token build step, commonly Style Dictionary, converts that source into platform-specific artifacts.

Recommended token layers:

```txt
primitive
  color.blue.500
  color.gray.900
  space.4
  radius.md
  font.size.body.md

semantic
  color.bg.surface
  color.bg.elevated
  color.text.primary
  color.text.secondary
  color.action.primary
  color.border.default

component
  button.primary.bg.default
  button.primary.bg.pressed
  button.primary.text.default
  button.md.height
  button.md.paddingX
  input.error.border
```

Product code should use semantic/component tokens, not primitive tokens.

## Modes

Use modes for themes and context:

```txt
color semantic collection
  modes: light, dark

brand collection
  modes: default, brand-a, brand-b

density collection
  modes: comfortable, compact
```

Avoid exploding combined modes such as `dark-brand-a-mobile-compact` unless the product explicitly needs them.

## Component properties to props

Map Figma component properties to TypeScript props.

```txt
Figma property             Code prop
------------------------------------------------
Variant = Primary          variant="primary"
Size = Medium              size="md"
State = Disabled           disabled={true}
Show leading icon = true   leadingIcon
Text content               children or label
```

## Layers to slots

Use meaningful Figma layer names as slot hints, not implementation trees.

```txt
Button
  Root
  LeadingIcon
  Label
  TrailingIcon

↓

<Button leadingIcon={...} trailingIcon={...}>Label</Button>
```

Do not copy arbitrary Figma layer trees into DOM/View trees.
