# Design System Publisher Skill

This zip contains a repo-scoped Codex skill for publishing React and React Native UI without page-level design files.

The skill assumes the team receives a Figma design system guide, not per-page designs. Figma Variables are converted into design tokens through Style Dictionary or an equivalent token build step. Figma component properties and selected layer names are converted into component contracts, slots, variants, states, and layout recipes. Codex or another coding agent then assembles screens/components inside those rules and runs deterministic compliance checks.

## Install

Copy the `.agents` directory from this package into the root of your repository:

```bash
cp -R .agents /path/to/your/repo/
```

Recommended repo additions:

```txt
.design-system/
  design-system-manifest.json
  component-spec.json
  layout-recipes.json
  token-policy.json
  allowed-imports.json
  forbidden-patterns.json
```

You can start by copying the examples from:

```txt
.agents/skills/design-system-publisher/assets/
```

## Recommended package scripts

Add equivalents of these commands to your repo when ready:

```json
{
  "scripts": {
    "ds:validate-contract": "node .agents/skills/design-system-publisher/scripts/validate-design-contract.mjs",
    "ds:scan-raw-styles": "node .agents/skills/design-system-publisher/scripts/scan-raw-styles.mjs .",
    "ds:compliance-report": "node .agents/skills/design-system-publisher/scripts/generate-compliance-report.mjs",
    "ds:check": "pnpm ds:validate-contract && pnpm ds:scan-raw-styles && pnpm ds:compliance-report"
  }
}
```

## How to use with Codex

Ask Codex to use the `design-system-publisher` skill for UI work such as:

```txt
Use the design-system-publisher skill. Create OrderHistoryScreen for web and native using the list-screen recipe. Implement loading, empty, error, and success states. Use only @my/ui components and existing design tokens. Add stories/tests and produce a design compliance report.
```

The most important file is:

```txt
.agents/skills/design-system-publisher/SKILL.md
```

The detailed rules live under:

```txt
.agents/skills/design-system-publisher/references/
```

Templates and example contracts live under:

```txt
.agents/skills/design-system-publisher/assets/
```
