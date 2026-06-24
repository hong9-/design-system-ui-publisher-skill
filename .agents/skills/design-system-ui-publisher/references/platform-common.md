# Common Platform Rules

Use these rules for both React Web and React Native publishing.

## Product UI

- Use approved design-system components.
- Use semantic or component tokens instead of raw visual values.
- Do not introduce new tokens, variants, sizes, or visual states unless the task is explicitly a design-system evolution task.
- Implement every state required by the selected layout recipe.
- Add stories, fixtures, or examples for every required state.
- Add accessibility labels, roles, and relationships where the platform supports them.
- Produce a compliance report with commands run and deviations.

## Forbidden Patterns

- raw hex/rgb/hsl colors
- arbitrary numeric spacing, font sizes, radii, shadows, or z-index values
- inline style bypasses in product screen code
- suppressing design-system lint rules
- one-off local wrappers that recreate design-system components with custom styling

