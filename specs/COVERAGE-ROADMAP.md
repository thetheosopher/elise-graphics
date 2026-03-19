# Test Coverage Roadmap

Last updated: 2026-03-18

## Baseline

Current full-suite coverage (`npm test -- --coverage`):

- Statements: 31.72%
- Branches: 16.86%
- Functions: 30.43%
- Lines: 31.00%

## Recent Additions Covered

These newly implemented features now have focused tests:

- Promise wrappers:
  - `Model.loadAsync`
  - `Model.prepareResourcesAsync`
  - `ResourceManager.loadAsync`
  - `Utility.getRemoteTextAsync/getRemoteBytesAsync/getRemoteBlobAsync`
- View timer error boundary:
  - `ViewController.tick()` stops timer on thrown handler error
- Surface lifecycle cleanup:
  - `Surface.unbind()` clears `loaded` and `initialized`
- Pane transition lifecycle:
  - `SurfacePane.destroy()` cancels active transition
  - `SurfacePane.startTransition()` cancels previous transition
  - `SurfacePane.replaceSurface()` rollback on transition start failure
  - `PaneTransitionFade/Push/Reveal/Slide/Wipe` lifecycle tests for start/tick/complete/cancel paths
  - `SurfacePane.replaceSurface()` transition route mapping and completion-state cleanup
- Resource loading pipelines:
  - `ResourceManager.findBestResource()` fallback order (exact locale, language, generic, key-only)
  - `ResourceManager.register/unregister/load/loadNext` success/failure and loader state transitions
  - `Model.prepareResources()` model-fill and element resource registration paths
- Design renderer behavior:
  - `DesignRenderer.renderElement()` type-dispatch switch across major element types
  - `DesignRenderer.renderRectangleElement()` fill-offset translation and stroke path
  - `DesignRenderer.renderPathElement()` command branches (`m/l/c/z`) and moving-point full-depth control point updates
- API surface contracts:
  - `index.ts` default export `requestAnimationFrame` compatibility behavior
  - `index.ts` `log()` helper routing through `Logging.log`
  - `Utility.startsWith/endsWith` helper behavior checks
- View rendering pipeline:
  - `ViewRenderer.renderToContext()` model/size guards and render filtering
  - `ViewRenderer.beginRender()` scale/transform/fill branches
  - `ViewRenderer.endRender()` stroke branch and `shouldRender()` transform/intersection decisions
- Element command handler pipeline:
  - static `push/pop` handlers for fill, stroke, and frame stack transitions
  - registration lifecycle (`addHandler/getRegistration/removeHandler/clearHandlers`)
  - timer recursion through nested model elements and model resources

## Priority Plan

### Priority 1: Transition and Surface Lifecycle (High Risk)

Goal: Raise coverage for `src/surface/pane-transitions/**`, `src/surface/surface-pane.ts`, and transition entry points.

Target tests:

- Fade/Push/Slide/Reveal/Wipe:
  - start path schedules animation frame
  - completion path unbinds source and marks pane prepared
  - cancel path clears RAF and resets transforms/opacity
- `SurfacePane.replaceSurface`:
  - each transition route instantiates correct transition type
  - completion callback clears active transition
  - replace while active transition exists cancels previous one

Success criteria:

- Pane-transition directory from 0% to >= 60% statements
- `surface-pane.ts` from 0% to >= 55% statements

Current status:

- `src/surface/pane-transitions/**`: 82.01% statements (up from ~11.33%)
- `src/surface/surface-pane.ts`: 72.76% statements
- Priority 1 success criteria achieved (both pane transitions and surface pane exceeded targets).

### Priority 2: View Controller Interaction Loop (High Risk)

Goal: Improve confidence in event routing and redraw behavior.

Target tests:

- `windowToCanvasWithOutput` coordinate conversion with scale/offset
- `onCanvasMouseDown/Move/Up` state transitions and event firing
- `detach` removes window listeners and clears pending timer
- `startTimer/pauseTimer/resumeTimer/stopTimer` handle lifecycle

Success criteria:

- `src/view/view-controller.ts` from 18.61% to >= 45% statements

Current status:

- `src/view/view-controller.ts`: 49.32% statements (up from 18.61%)
- Added coverage for timer lifecycle (`startTimer/pauseTimer/resumeTimer/stopTimer`), `detach()` cleanup, `windowToCanvasWithOutput()` scaling/clamp behavior, and `onCanvasMouseDown/Move/Up` interaction-flow routing.
- Priority 2 success criteria achieved.

### Priority 3: Resource Loading Pipelines (Medium-High Risk)

Goal: Cover critical branches in resource loading and failure handling.

Target tests:

- `ResourceManager.register/unregister/loadNext` success/failure branches
- listener event state transitions (`ResourceStart`, `ResourceComplete`, `ResourceFailed`, `Idle`)
- model-level resource registration via `Model.prepareResources`

Success criteria:

- `src/resource/resource-manager.ts` from 45.39% to >= 70% statements
- `src/core/model.ts` resource-prep branches materially increased

Current status:

- `src/resource/resource-manager.ts`: 79.60% statements (up from 45.39%)
- `src/core/model.ts`: 39.77% statements (up from 33.42%)
- Added coverage for resource fallback selection, register/unregister success/failure state transitions, and `Model.prepareResources()` registration flow.
- Priority 3 success criteria achieved.

### Priority 4: Renderer Behavior and Dispatch (Medium Risk)

Goal: Validate render dispatch and path handling where regressions are visual.

Target tests:

- `DesignRenderer.renderElement` dispatch switch coverage for all major element types
- path command branches (`m`, `l`, `c`, `z`) including transformed coordinates
- rectangle fill offset and stroke behavior

Success criteria:

- `src/design/design-renderer.ts` from 0% to >= 35% statements

Current status:

- `src/design/design-renderer.ts`: 36.30% statements (up from 0%)
- Added coverage for render dispatch, model-level `renderToContext` branches, rectangle fill/stroke offsets, image/sprite branches, model-element scaling, and path command/moving-point branches.
- Priority 4 success criteria achieved.

### Priority 5: API Surface Contracts (Medium Risk)

Goal: Ensure public API wrappers and defaults remain stable.

Target tests:

- default export contract in `index.ts` (`requestAnimationFrame` compatibility value)
- `log()` helper routing through `Logging`
- utility string helper behavior (`startsWith/endsWith`)

Success criteria:

- `src/index.ts` from 0% to >= 25% statements

Current status:

- `src/index.ts`: 100.00% statements (up from 0%)
- Added tests for default export `requestAnimationFrame` compatibility behavior, `log()` routing, and utility string helper contracts.
- Priority 5 success criteria achieved.

## Execution Notes

- Use focused `--runTestsByPath` runs while iterating.
- Keep mocks lightweight and avoid broad DOM dependencies where possible.
- Prefer branch-focused tests over line-count-only tests.
- After each priority block, run full suite and rebuild baseline coverage.

## Suggested Milestone Targets

- Milestone A (Priority 1-2 complete):
  - Statements >= 25%
  - Branches >= 15%
- Milestone B (Priority 1-4 complete):
  - Statements >= 35%
  - Branches >= 22%
- Milestone C (Priority 1-5 complete):
  - Statements >= 40%
  - Branches >= 28%
