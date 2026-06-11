# Overview

This skill supports UI publishing when the team has a Figma design system guide but no page-level designs.

The workflow is:

```txt
Figma design system guide
  ├─ Variables
  ├─ component properties
  ├─ meaningful layers / slots
  └─ usage rules
        ↓
Design system contract
  ├─ tokens
  ├─ component specs
  ├─ slot specs
  ├─ layout recipes
  └─ compliance gates
        ↓
AI publishing agent
  ├─ assembles screens/components
  ├─ uses only approved UI primitives/components
  ├─ implements required states
  └─ runs checks and reports compliance
```

The goal is to make the AI a controlled assembler, not a freeform visual designer.
