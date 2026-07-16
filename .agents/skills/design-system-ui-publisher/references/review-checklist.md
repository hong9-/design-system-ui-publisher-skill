# Review Checklist

## Designer review

- Does the screen use existing design-system patterns?
- Does the selected layout recipe fit the information architecture?
- Are hierarchy, density, and spacing consistent with the guide?
- Are empty/error/loading states appropriate?
- Are any new visual patterns introduced without approval?
- Is visual quality review recorded as project profile, generic review only, or not reviewed?
- Do critical flows satisfy the project's visual quality profile, if one exists?

## Developer review

- Are only approved UI components used in product screens?
- Are semantic/component tokens used instead of raw values?
- Are required states implemented and tested?
- Are transition contract fields covered or explicitly marked missing?
- Is the screen composition split into reusable candidates and screen-only layout?
- Are web/native differences handled in adapters rather than hidden with brittle abstractions?
- Are generated files maintainable?
- Did the compliance report match actual command output?
- Are authority conflicts resolved by concern rather than by a global source assumption?
- Does the evidence record each command's scope, execution time, and exit code?
- Are changed-scope and repository-wide results reported independently?

## Delivery review

- Is the target maturity explicit?
- Are applicable verdicts `pass` or `pass-with-notes` for that maturity?
- Is `fail` reserved for completed checks that did not meet requirements, and `blocked` for checks that could not complete?
- Is any no-regression claim backed by comparable baseline evidence?

## Hard stop

Do not merge if hard failures remain:

- build/typecheck failure
- design-system lint failure
- raw styles
- missing accessibility labels
- missing required states
- missing required transition coverage
- release-ready screen with required visual review marked `not reviewed`
- unapproved new tokens or variants
