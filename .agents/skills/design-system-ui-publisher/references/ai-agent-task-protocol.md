# AI Agent Task Protocol

Prefer structured tasks over freeform requests.

## Screen task shape

```yaml
task:
  type: create-screen
  target:
    - web
    - native
  deliveryMode: greenfield
  contractLevel: structured
  targetMaturity: fixture-ready

authority:
  behavior:
    sources: []
  visual:
    sources: []
  content:
    sources: []
  components:
    sources: []
  tokens:
    sources: []
  runtime:
    sources: []
  dataSafety:
    sources: []

screen:
  name: ExampleScreen
  recipe: list-screen
  route: /example

screenModel:
  contentPattern: list
  presentation: pushed-route
  riskProfile: normal

transitionContract:
  entryRoute: /example
  primaryActionDestination:
  secondaryActionDestination:
  backCancelBehavior:
  successDestination:
  errorRecovery:

composition:
  screen: ExampleScreen
  sections:
    - list
  reusableComponents: []
  screenOnlyLayout: []
  requiredTestIDs: []

intent:
  primaryGoal: 사용자가 항목 목록을 확인한다

data:
  entity: Example
  itemFields:
    - id
    - title
    - status

dataPolicy:
  sensitivity: public
  projectionBoundary:

states:
  required:
    - loading
    - empty
    - error
    - success

designSystemInputs:
  components: []
  tokens: []
  variants: []
  missing: []

behaviorAssertions: []

validationScope:
  changedRoots: []
  repositoryWideRequired: false
  comparableBaselineEvidence:

visualQualityReview:
  basis: not reviewed
  profilePath:
  criticalFlowRequirement:
  knownRisks: []

constraints:
  useOnlyDesignSystemComponents: true
  noRawStyles: true
  noNewTokens: true
  requireStories: true
  requireComplianceReport: true
```

## Agent output requirements

- implementation files
- component composition summary
- transition contract coverage
- state stories/fixtures
- tests or test notes
- compliance report
- visual quality review status
- design-system gap list
- list of commands run
- authority, target maturity, independent verdicts, and validation scope
- per-command evidence with scope, execution time, and exit code
- list of deviations

## Agent behavior

The agent should prefer existing components and patterns in the repo. When a needed component is missing, it should choose the closest approved component rather than inventing a new visual pattern. If no approved component works, it should document a design-system gap instead of implementing a one-off custom style. Follow `delivery-contract.md` when authorities conflict or validation scope must be interpreted.
