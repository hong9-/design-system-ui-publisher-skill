# Design System UI Publisher Skill

This package contains a repo-scoped Codex skill for publishing and auditing React and React Native UI when page-level designs are absent, partial, stale, or non-authoritative.

The skill assumes the team receives a Figma design system guide, not per-page designs. Token source JSON is built through Style Dictionary or an equivalent token build step. When a Figma URL and MCP connection are available, Figma component properties and selected layer names enrich component contracts, slots, variants, states, and layout recipes. Codex or another coding agent then assembles screens/components inside those rules and runs deterministic compliance checks.

## Install

Copy the `.agents` directory from this package into the root of your repository:

```bash
cp -R .agents /path/to/your/repo/
```

Recommended repo additions:

```txt
.design-system/
  design-system-manifest.json
  design-system-manifest.schema.json
  component-spec.json
  component-spec.schema.json
  layout-recipes.json
  token-policy.json
  visual-quality-profile.md # optional
tokens/
  source/
    tokens.json
style-dictionary.config.mjs
```

You can start by copying the examples from:

```txt
.agents/skills/design-system-ui-publisher/assets/
```

Static scan rules are bundled under `.agents/skills/design-system-ui-publisher/assets/platform-rules.*.json`.

## Recommended package scripts

Add equivalents of these package-manager-agnostic scripts to your repo when ready. Invoke them with the repo's native runner, for example `pnpm run`, `yarn run`, or `npm run`.

```json
{
  "scripts": {
    "ds:validate-contract": "node .agents/skills/design-system-ui-publisher/scripts/validate-design-contract.mjs",
    "ds:validate-contract:init": "node .agents/skills/design-system-ui-publisher/scripts/validate-design-contract.mjs --allow-fallback",
    "ds:scan-raw-styles": "node .agents/skills/design-system-ui-publisher/scripts/scan-raw-styles.mjs . --platform all",
    "ds:compliance-report": "node .agents/skills/design-system-ui-publisher/scripts/generate-compliance-report.mjs",
    "ds:compliance-report:run-checks": "node .agents/skills/design-system-ui-publisher/scripts/generate-compliance-report.mjs --run-checks",
    "ds:check": "node .agents/skills/design-system-ui-publisher/scripts/generate-compliance-report.mjs --run-checks --require-token-source --require-token-artifacts"
  }
}
```

`ds:validate-contract` is strict by default. Use `ds:validate-contract:init` only while bootstrapping starter assets. `ds:compliance-report` is report-only by default; use `ds:check` when CI should execute checks, enforce custom `manifest.requiredChecks`, and hard-fail on missing token source/config/artifacts. In run-checks mode, repo-native `ds:validate-contract` and `ds:scan-raw-styles` scripts are used when defined, and the bundled validators still run as built-in design gates so generator flags such as `--require-token-source` cannot be bypassed. Use `ds:compliance-report:run-checks` for local orchestration before token artifacts are committed. For mixed monorepos, keep Rust, native, or workspace-level checks in the repo's own CI/scripts and let this skill run the design-system gates.

`--platform all` auto-routes platform-specific scan rules by file path, extension, and React Native imports. Ambiguous JSX files are scanned with both web and native rules to avoid false-green mixed repos. Use `--platform web` or `--platform native` when scanning a known single-platform root.

For brownfield work, pass one or more `--changed-root <path>` arguments to add focused raw-style scans while retaining repository-wide checks. The generated report separates those results and records Git provenance plus command-level scope, execution time, exit code, and tool version. A focused PASS is intentionally not reported as proof of no regression without comparable baseline evidence.

## How to use with Codex

Ask Codex to use the `design-system-ui-publisher` skill for UI work such as:

```txt
Use the design-system-ui-publisher skill. Create OrderHistoryScreen for web and native using the list-screen recipe. Treat the screen task as the Publishing Brief, cover loading/empty/error/success states, record component composition and transition coverage, use only @my/ui components and existing design tokens, add stories/tests, and produce a design compliance report.
```

The most important file is:

```txt
.agents/skills/design-system-ui-publisher/SKILL.md
```

The detailed rules live under:

```txt
.agents/skills/design-system-ui-publisher/references/
```

Templates and example contracts live under:

```txt
.agents/skills/design-system-ui-publisher/assets/
```

Use `assets/visual-quality-profile.template.md` if a project needs product-specific visual quality review rules.
