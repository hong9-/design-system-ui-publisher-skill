# Visual Quality Review Gate

Use this reference when a publishing task asks for visual quality review, when a project has a visual quality profile, or when a finished screen looks compliant but visually weak.

This gate does not invent product aesthetics and does not replace design review. It helps the agent collect the same evidence, classify the same risks, and route visual issues back into design-system inputs.

## Inputs

- Screen task, component task, Publishing Brief, or Screen Contract
- Selected layout recipe
- Component composition summary
- Required state coverage
- Transition contract coverage
- Design compliance output
- Screenshot, story, preview, or fixture summary, if available
- Project visual quality profile, if present

Do not include secrets, credentials, private keys, PINs, tokens, session payloads, transaction payloads, or user-specific private data in review inputs. Use synthetic fixtures, masked values, or redacted screenshots.

## Decisions

| Decision | Meaning | Action |
| --- | --- | --- |
| `pass` | Stable within the design system and project profile. | Merge/release may proceed. |
| `pass with notes` | Usable with minor polish follow-up. | Record follow-up. |
| `review required` | Implemented, but design or PM review is needed before product use. | Assign reviewer. |
| `block` | Structure, hierarchy, state, accessibility, or critical-flow judgment information is insufficient. | Fix and re-review. |
| `not reviewed` | Visual quality review was not performed. | Allowed for drafts only. |
| `generic review only` | Generic dimensions were checked without a project profile. | Record whether a profile is needed. |

## Generic Dimensions

Review each dimension as `pass`, `notes`, `risk`, or `blocker`.

| Dimension | Review question | Blocker signals |
| --- | --- | --- |
| Task clarity and action priority | Can users understand the screen goal and next action quickly? | Multiple strong primary actions; destructive and safe actions have unclear hierarchy. |
| Information hierarchy | Are key data, state, and secondary information read in the right order? | Critical judgment information is hidden, folded away, or visually weaker than decoration. |
| Layout rhythm and density | Are spacing, grouping, alignment, and density stable? | Excessive nested cards, scattered groups, cramped controls, or overly sparse screens. |
| Token and component harmony | Do DS components, variants, and tokens feel like one product language? | Raw styles, one-off variants, or inconsistent variants for the same role. |
| Responsive fit and overflow | Does the UI survive small screens and long text? | Critical text/action clipping, overlap, or broken wrapping. |
| State polish | Do loading, empty, error, success, disabled, and submitting states preserve the screen purpose? | Missing required state, missing recovery action, or duplicate action possible while submitting. |
| Accessibility-visible quality | Do accessible states also look and behave clearly? | Missing icon-only labels, unclear focus/disabled states, failed contrast or touch target checks. |
| Flow and risk cues | Are important judgment information and cancel/recovery paths visible before consequential actions? | A project critical flow lacks required judgment information, safe exit, or recovery path. |

## Project Profile

Generic review does not define a product's tone or critical flows. If needed, store a project profile at one of:

- `.design-system/visual-quality-profile.md`
- `.design-system/visual-quality-profile.yaml`
- `.design-system/visual-quality-profile.json`

Use `assets/visual-quality-profile.template.md` when creating one.

## Gap Classification

Classify visual quality issues as:

- `token gap`
- `component gap`
- `variant gap`
- `recipe gap`
- `content gap`
- `flow gap`
- `implementation defect`

Do not add raw product styles to patch a gap. Create or reference a design-system extension proposal when the gap blocks product quality or completion.

## Report Template

```md
## Visual Quality Review

- Review basis: project profile / generic review only / not reviewed
- Profile path:
- Final decision:
- Reviewer:

| Dimension | Status | Evidence | Required fix or note |
| --- | --- | --- | --- |
| Task clarity and action priority |  |  |  |
| Information hierarchy |  |  |  |
| Layout rhythm and density |  |  |  |
| Token and component harmony |  |  |  |
| Responsive fit and overflow |  |  |  |
| State polish |  |  |  |
| Accessibility-visible quality |  |  |  |
| Flow and risk cues |  |  |  |

### Hard Stops

- none / list

### DS Gaps

- none / list gap type, affected screen, proposal path or owner
```
