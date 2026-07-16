# Layout Recipes

Use recipes to keep AI-generated screens consistent when page designs are absent.

Prefer a repo-native named recipe when one exists. If no named recipe fits, use `delivery-contract.md` to decompose the screen by content pattern, presentation, and risk profile. Do not force irrelevant sections or states merely to match the closest recipe; record a justified deviation or design-system recipe gap.

## list-screen

Use for item collections such as orders, notifications, files, messages, products, members, or audit logs.

Required sections:

```txt
Header
Optional FilterBar
ContentList
EmptyState
ErrorState
LoadingState
```

Required states:

```txt
loading
empty
error
success
```

Rules:

- The title appears in the Header.
- Search/filter controls appear before the list.
- Empty and error states use approved components.
- Retry action appears in the error state when data fetching can be retried.

## form-screen

Use for create/edit workflows.

Required sections:

```txt
Header
Description, when helpful
FormGroup
ActionBar
```

Required states:

```txt
default
dirty
submitting
success
error
disabled, when applicable
```

Rules:

- Each field has a visible label.
- Field errors appear below the field.
- Primary action is placed in the ActionBar.
- Submitting state disables duplicate submission.

## detail-screen

Use for a single entity detail view.

Required sections:

```txt
Header
Metadata
Content
ActionGroup, when actions exist
```

States:

```txt
loading
error
success
```

## auth-screen

Use for login, signup, password reset, and verification flows.

Rules:

- Use form-screen rules.
- Do not hide critical errors.
- Provide clear recovery actions.

## settings-screen

Use for preferences and account configuration.

Rules:

- Group related settings into sections.
- Avoid destructive actions near non-destructive actions unless the recipe explicitly permits it.

## dashboard-screen

Use for summary pages.

Rules:

- Use Cards or approved summary components.
- Provide loading/error/empty states for each data region or for the whole page based on repo conventions.
