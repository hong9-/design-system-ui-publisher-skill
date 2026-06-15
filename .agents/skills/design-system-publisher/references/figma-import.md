# Figma Import and Contract Sync

Use this workflow for `sync-design-contract` tasks.

## Import policy

Use a two-phase model:

- `sync-design-contract`: Figma MCP may import Variables and enrich component contracts.
- `create-screen` / `update-screen`: use committed `.design-system/` files and generated token artifacts; do not call Figma for every publishing task.

Token import can start from Figma, but token build is primary for reproducible code and CI.

1. If a Figma URL is provided, use Figma MCP to read Variables when token sync is requested.
2. Save a raw Figma Variables snapshot when the repo has a place for it, for example `packages/design-tokens/src/figma.variables.raw.json`.
3. Normalize the snapshot into committed token source JSON, for example `tokens/source/tokens.json` or `packages/design-tokens/src/tokens.normalized.json`.
4. Build or verify tokens through Style Dictionary or an equivalent token pipeline.
5. Use Figma MCP to enrich component and layout contracts when component metadata is available.
6. If Figma MCP is unavailable or unauthenticated, ask the user to connect or authorize Figma MCP.
7. If the user cannot authorize Figma MCP, continue from committed token source in tokens-only mode and record the limitation in the compliance report.
8. Do not require Figma MCP in CI. CI should validate committed `.design-system/` files, token source, and generated token artifacts.

## Inputs

Prefer these inputs, in order:

- Figma design-system URL, when variable import or component enrichment is requested
- committed token source JSON, for example `tokens/source/tokens.json`
- Style Dictionary config, for example `style-dictionary.config.mjs`
- `.design-system/design-system-manifest.json`

## Outputs

Update or create:

- `.design-system/design-system-manifest.json`
- `.design-system/component-spec.json`
- `.design-system/layout-recipes.json`
- `.design-system/token-policy.json`
- raw Figma Variables snapshot, when imported
- normalized token source JSON
- generated token artifacts for web and native

## Token sync

For Figma-backed sync, first import Variables through Figma MCP and commit the raw or normalized token source. Then run the repo token build when available:

```bash
<pm> run build:tokens
```

If no repo script exists, inspect the Style Dictionary config and run the closest equivalent. Generated outputs should include platform-specific artifacts such as:

```txt
packages/design-tokens/build/web/tokens.css
packages/design-tokens/build/native/tokens.ts
```

Do not invent token names from Figma layer styling. Product code should use semantic and component tokens that exist in the token source.

During ordinary screen/component publishing, do not fetch live Figma tokens. Treat the committed token source and generated artifacts as the source of truth. If they appear stale, switch to a `sync-design-contract` task or record a follow-up.

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

- whether Figma Variables were imported or committed token source was reused
- token source and token build command
- whether Figma MCP enrichment ran
- files changed under `.design-system/`
- generated token artifacts
- any tokens-only limitations or follow-up items
