# Delivery Contract

Use this reference when product sources disagree, a task has a defined delivery maturity, a named layout recipe is insufficient, or compliance evidence must distinguish changed scope from repository-wide state.

## Authority by concern

The design-system source order governs components, tokens, variants, and recipes. Resolve other concerns independently:

- `behavior`: state, action, route, and recovery contracts
- `visual`: authoritative design or approved visual reference
- `content`: product copy and information requirements
- `components`: approved component contract
- `tokens`: committed token source and generated artifacts
- `runtime`: service, controller, lifecycle, and side-effect ownership
- `dataSafety`: classification, projection, fixture, log, and screenshot policy

Use this shape when authority must be explicit:

```yaml
authority:
  behavior:
    sources:
      - ref: docs/screens/example.yaml
        priority: 1
        lastReviewedAt: 2026-07-16
```

Allow repository paths, URLs, package identifiers, and generated-source identifiers in `ref`. Lower `priority` wins. If the same concern has multiple sources, require unique priorities and review metadata. If conflicting sources have no declared authority, record blocking input or an explicitly approved deviation. Never assume that Figma or a screen contract wins for every concern.

## Screen model

When a repo-native recipe exists, use it. Otherwise reason about three independent axes:

```yaml
screenModel:
  contentPattern: list | form | detail | review | progress | dashboard
  presentation: shell-view | pushed-route | modal | bottom-sheet | full-screen-gate | toast
  riskProfile: normal | consequential | sensitive | external-request
```

Each axis adds coverage requirements. For example, a form requires dirty, validation, submitting, and duplicate-prevention behavior; a modal requires caller, dismiss, and result behavior; a consequential action requires review context, safe exit, and a duplicate guard. Use `dataPolicy.sensitivity`, not `riskProfile`, as the canonical data classification.

## Delivery maturity

- `contract-ready`: authority, states, actions, data, accessibility, and unresolved gaps are decided.
- `fixture-ready`: display-safe fixtures expose required states and intended flow for review.
- `runtime-ready`: real data, route, and action boundaries are connected and focused behavior tests pass.
- `release-ready`: applicable repository release gates, visual review, platform validation, and migration rollback/removal requirements pass.

Do not require brownfield rollback or removal evidence for greenfield work when it is not applicable. Do not claim a higher maturity using lower-maturity evidence.

## Independent verdicts

Report these concerns independently:

- design-system compliance
- behavior-contract coverage
- data safety
- visual-reference fidelity
- runtime parity
- release readiness

Use exactly: `pass`, `pass-with-notes`, `fail`, `blocked`, `not-reviewed`, or `not-applicable`.

- `fail`: review or execution completed and requirements were not met.
- `blocked`: review or execution could not complete because a required input, approval, environment, or dependency is unavailable.
- `not-reviewed`: no review evidence exists yet.

A PASS in one concern never implies a PASS in another. For the declared target maturity, every applicable required verdict must be `pass` or `pass-with-notes` before reporting completion.

## Validation scope and evidence

Separate current changed-scope checks from repository-wide checks. A changed-scope PASS does not prove that no regression was introduced. Make that claim only when the same check has comparable baseline evidence, such as a merge-base run or an approved baseline artifact.

Record repository provenance once and execution evidence per command:

```yaml
evidence:
  repository:
    commit:
    worktreeDirty:
    dirtyEntryCount:
  checks:
    - id:
      command:
      scope: changed-scope | repository-wide
      roots: []
      executedAt:
      exitCode:
      toolVersion:
```

Do not mark report-only scaffolding as executed PASS. Mark evidence stale when relevant sources changed after execution. Do not copy secrets, sensitive output, or an unrestricted dirty-file list into reports.
