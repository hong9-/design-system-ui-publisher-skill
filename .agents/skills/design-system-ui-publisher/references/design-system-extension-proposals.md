# Design System Extension Proposals

Use this when a publishing task needs visual design that is not covered by the committed design-system contract.

## Policy

- Do not invent missing visual decisions directly in product UI.
- Do not add provisional colors, spacing, typography, radius, shadows, variants, slots, or recipes to product code.
- Create `.design-system/proposals/<slug>.yaml` from `assets/design-system-extension-proposal.template.yaml`.
- Mark the publishing task as blocked or partially blocked in the compliance report.
- Continue implementation only after explicit approval, or when the user explicitly asks for design-system evolution.

## When to write a proposal

Write a proposal when the task needs any of these and the contract does not define them:

- semantic or component tokens
- component variants, sizes, states, props, or slots
- a layout recipe or required state set
- accessibility behavior that requires a product/design decision
- platform-specific visual treatment

Do not write a proposal for ordinary content choices, data plumbing, or behavior that can be implemented with existing components and recipes.

## YAML requirements

The proposal must include:

- `type: design-system-extension-proposal`
- `status: needs-design-review`
- `reason.missing_contract`
- `reason.why_existing_contract_is_insufficient`
- `proposed_changes` for tokens, components, and/or layout recipes
- `impact.platforms`
- `impact.accessibility`
- `blocked_tasks`
- `approval.required: true`

Keep proposed names semantic and contract-shaped. Avoid one-off product names unless the component or recipe is truly product-specific.

## After approval

When approval is explicit:

1. Update `.design-system/component-spec.json`, `.design-system/layout-recipes.json`, `.design-system/token-policy.json`, or token source files as needed.
2. Rebuild generated token artifacts when token source changes.
3. Run contract validation, raw style scan, and repo tests.
4. Reference the approved proposal in the Design Compliance Report.
