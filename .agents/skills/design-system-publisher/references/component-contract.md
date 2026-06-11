# Component Contract Rules

A component contract should define:

```txt
name
purpose
props
variants
sizes
states
slots
defaults
allowed tokens
accessibility requirements
platform notes
```

## Example Button contract

```ts
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  children: React.ReactNode;
};
```

## Slot naming

Use stable slot names:

```txt
leadingIcon
trailingIcon
label
helperText
errorText
media
header
title
description
actions
```

Do not expose decorative or implementation-only Figma layers as public props.

## Web/native split

Share the component API. Split rendering implementation by platform.

```txt
Button.types.ts       shared props
Button.web.tsx        web rendering
Button.native.tsx     native rendering
Button.styles.web.ts  StyleX/CSS-in-JS/CSS module
Button.styles.native.ts React Native StyleSheet
```

Share token names and variants. Do not force CSS and RN style APIs to be identical.
