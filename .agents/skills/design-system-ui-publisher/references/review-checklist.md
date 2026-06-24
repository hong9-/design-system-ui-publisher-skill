# Review Checklist

## Designer review

- Does the screen use existing design-system patterns?
- Does the selected layout recipe fit the information architecture?
- Are hierarchy, density, and spacing consistent with the guide?
- Are empty/error/loading states appropriate?
- Are any new visual patterns introduced without approval?

## Developer review

- Are only approved UI components used in product screens?
- Are semantic/component tokens used instead of raw values?
- Are required states implemented and tested?
- Are web/native differences handled in adapters rather than hidden with brittle abstractions?
- Are generated files maintainable?
- Did the compliance report match actual command output?

## Hard stop

Do not merge if hard failures remain:

- build/typecheck failure
- design-system lint failure
- raw styles
- missing accessibility labels
- missing required states
- unapproved new tokens or variants
