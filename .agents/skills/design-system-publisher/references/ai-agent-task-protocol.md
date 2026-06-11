# AI Agent Task Protocol

Prefer structured tasks over freeform requests.

## Screen task shape

```yaml
task:
  type: create-screen
  target:
    - web
    - native

screen:
  name: ExampleScreen
  recipe: list-screen
  route: /example

intent:
  primaryGoal: 사용자가 항목 목록을 확인한다

data:
  entity: Example
  itemFields:
    - id
    - title
    - status

states:
  required:
    - loading
    - empty
    - error
    - success

constraints:
  useOnlyDesignSystemComponents: true
  noRawStyles: true
  noNewTokens: true
  requireStories: true
  requireComplianceReport: true
```

## Agent output requirements

- implementation files
- state stories/fixtures
- tests or test notes
- compliance report
- list of commands run
- list of deviations

## Agent behavior

The agent should prefer existing components and patterns in the repo. When a needed component is missing, it should choose the closest approved component rather than inventing a new visual pattern. If no approved component works, it should document a design-system gap instead of implementing a one-off custom style.
