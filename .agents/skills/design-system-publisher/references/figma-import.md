# Figma Import and Contract Sync

Use this workflow for `sync-design-contract` tasks.

## Import policy

Token build is primary. Figma MCP is enrichment.

1. Build or verify tokens through Style Dictionary or an equivalent token pipeline.
2. If a Figma URL is provided, use Figma MCP to enrich component and layout contracts.
3. If Figma MCP is unavailable or unauthenticated, ask the user to connect or authorize Figma MCP.
4. If the user cannot authorize Figma MCP, continue in tokens-only mode and record the limitation in the compliance report.
5. Do not require Figma MCP in CI. CI should validate committed `.design-system/` files and generated token artifacts.

## Inputs

Prefer these inputs, in order:

- committed token source JSON, for example `tokens/source/tokens.json`
- Style Dictionary config, for example `style-dictionary.config.mjs`
- `.design-system/design-system-manifest.json`
- Figma design-system URL, when component enrichment is requested

## Outputs

Update or create:

- `.design-system/design-system-manifest.json`
- `.design-system/component-spec.json`
- `.design-system/layout-recipes.json`
- `.design-system/token-policy.json`
- generated token artifacts for web and native

## Token sync

Run the repo token build when available:

```bash
<pm> run build:tokens
```

If no repo script exists, inspect the Style Dictionary config and run the closest equivalent. Generated outputs should include platform-specific artifacts such as:

```txt
packages/design-tokens/build/web/tokens.css
packages/design-tokens/build/native/tokens.ts
```

Do not invent token names from Figma layer styling. Product code should use semantic and component tokens that exist in the token source.

## Figma MCP enrichment

When Figma MCP is connected, read the design-system file and extract:

- component sets and component names
- variant properties, boolean properties, text properties, and instance-swap properties
- default variants and required states
- meaningful layer names that should become public slots
- usage notes, accessibility notes, and platform caveats when present

Normalize Figma component properties into code contracts:

```txt
Variant = Primary        -> variant: ["primary", ...]
Size = Medium            -> size: ["md", ...]
State = Disabled         -> disabled: boolean or state: "disabled"
Show leading icon = true -> leadingIcon slot
Text content             -> children or label
```

Do not mirror arbitrary Figma layer trees into DOM or React Native view trees.

## MCP unavailable

If a Figma URL is present but MCP is unavailable or unauthenticated:

1. Ask the user to connect or authorize Figma MCP.
2. Do not block token sync while waiting for MCP unless the user explicitly requires component enrichment.
3. Mark the sync result as `tokens-only`.
4. Add a follow-up item to enrich `component-spec.json` and `layout-recipes.json` once Figma MCP is available.

## Validation

After sync, run:

```bash
node .agents/skills/design-system-publisher/scripts/validate-design-contract.mjs --require-token-source
node .agents/skills/design-system-publisher/scripts/scan-raw-styles.mjs . --platform all
```

When generated token artifacts are expected to be present, add `--require-token-artifacts`. To generate a report and enforce the same token gates through one command, run `generate-compliance-report.mjs --run-checks --require-token-source --require-token-artifacts`.

The final report must state:

- token source and token build command
- whether Figma MCP enrichment ran
- files changed under `.design-system/`
- generated token artifacts
- any tokens-only limitations or follow-up items
