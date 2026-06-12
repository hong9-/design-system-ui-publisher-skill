# Style Dictionary Integration

Style Dictionary or an equivalent build step should transform committed token source JSON into platform-specific artifacts. This is the primary token pipeline for reproducible local and CI checks.

Figma MCP can enrich component contracts, but CI should not depend on live Figma access.

Recommended inputs:

```txt
tokens/source/tokens.json
style-dictionary.config.mjs
```

Recommended outputs:

```txt
packages/design-tokens/build/web/tokens.css
packages/design-tokens/build/web/tokens.stylex.ts
packages/design-tokens/build/native/tokens.ts
```

## Web output

```css
:root {
  --color-bg-surface: #ffffff;
  --color-text-primary: #111827;
  --space-md: 16px;
  --radius-md: 8px;
}
```

## React Native output

```ts
export const tokens = {
  color: {
    bg: { surface: '#ffffff' },
    text: { primary: '#111827' }
  },
  space: { md: 16 },
  radius: { md: 8 }
} as const;
```

## Principle

Keep the token identity consistent across platforms, but generate platform-appropriate values.

```txt
same source token
  color.bg.surface

web
  var(--color-bg-surface)

native
  tokens.color.bg.surface
```

Do not use web CSS variables directly in React Native.

## Relationship to Figma

When a Figma URL is available, use Figma MCP to inspect variables and component metadata, then commit the normalized contract and token source. After that, Style Dictionary should be able to rebuild token artifacts without Figma access.
