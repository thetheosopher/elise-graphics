# Elise-Graphics Library Analysis

Comprehensive analysis of API inconsistencies, performance concerns, functionality gaps, and implementation issues across the elise-graphics library. Companion to [MODERNIZATION-RECOMMENDATIONS.md](MODERNIZATION-RECOMMENDATIONS.md) which covers high-level architectural direction.

---

## 1. Bugs

### 1.1 — CRITICAL: Logical Operator Bug in Sprite Transition (transitions.ts:138) — RESOLVED 2026-03-18

```ts
if (sprite.c2index !== undefined || sprite.c2index !== targetFrame) {
```

The condition used the wrong operator. The check should redraw only when the cached frame index is missing or stale:

- If `c2index` is `undefined` → redraw is required
- If `c2index` differs from `targetFrame` → redraw is required
- If `c2index` equals `targetFrame` → redraw should be skipped

The previous condition did not match that intent, causing unnecessary frame redraws.

**Applied fix:** Changed `sprite.c2index !== undefined || sprite.c2index !== targetFrame` to `sprite.c2index === undefined || sprite.c2index !== targetFrame` in [src/transitions/transitions.ts](src/transitions/transitions.ts#L138).

### 1.2 — HIGH: eventTimer Not Cleared on Detach (view-controller.ts:469) — RESOLVED 2026-03-18

`onCanvasMouseDown()` creates a `setTimeout` stored in `this.eventTimer` (line ~655). If the controller is detached while this timer is pending, `detach()` does not call `clearTimeout(this.eventTimer)`. The timeout callback references `self` (the controller) and can fire after detach, accessing stale `model`/`canvas` references.

**Applied fix:** Added timeout cleanup at the start of [ViewController.detach](src/view/view-controller.ts#L469).

### 1.3 — MEDIUM: Pane Transition Surface Leak on Error — RESOLVED 2026-03-18

In `SurfacePane.replaceSurface()`, `PaneTransition.onStart()` (pane-transition.ts:57-65) overwrites `this.source` with the old surface reference. If the transition's `start()` method throws after `onStart()` has run, the old `childSurface` reference has already been overwritten on the pane, but `unbind()` never runs on the old surface because the error escapes. No try/catch protects this path.

**Applied fix:** Wrapped transition startup in try/catch in [SurfacePane.replaceSurface](src/surface/surface-pane.ts#L149). On synchronous transition-start failure, the code now unbinds the replacement surface if needed, restores the previous child surface, and rethrows.

### 1.4 — LOW: Duplicate Listener Accumulation (surface-pane.ts:105) — RESOLVED 2026-03-18

Every call to `SurfacePane.prepare()` forwards parent listeners to the child surface's `resourceListenerEvent` with `.add()`, but there is no deduplication. Repeated `prepare()` calls accumulate duplicate listeners, causing the same callback to fire multiple times per event.

**Applied fix:** Added listener deduplication before forwarding in [SurfacePane.prepare](src/surface/surface-pane.ts#L106).

---

## 2. API Inconsistencies

### 2.1 — Core Type Mutability Inconsistency — PARTIALLY RESOLVED 2026-03-18

| Type | Fields | Mutability |
|------|--------|------------|
| `Point` | `x`, `y` public | Fully mutable |
| `Size` | private `_width`/`_height`, getters only | Pseudo-immutable |
| `Region` | `readonly` properties | Fully immutable |

These three closely-related geometry types have three different mutability strategies. Consumers cannot reason consistently about whether it's safe to share instances.

**Implemented (non-breaking):** Added immutable-style `with...` helpers across all three types to standardize update ergonomics while preserving backward compatibility:

- [src/core/point.ts](src/core/point.ts): `withX(x)`, `withY(y)`
- [src/core/size.ts](src/core/size.ts): `withWidth(width)`, `withHeight(height)`
- [src/core/region.ts](src/core/region.ts): `withX`, `withY`, `withWidth`, `withHeight`, `withLocation`, `withSize`

This provides a consistent value-object workflow today without a breaking change to mutable `Point.x`/`Point.y`.

**Remaining recommendation:** Standardize on immutable (readonly properties) for all value types in a future major release.

### 2.2 — parse() Method Signature Inconsistency — PARTIALLY RESOLVED 2026-03-18

| Type | Signature | Clone behavior |
|------|-----------|----------------|
| `Point.parse()` | `string \| Point` | Accepts instance (clones) |
| `Size.parse()` | `string \| Size` | Accepts instance (clones) |
| `Color.parse()` | `string \| Color` | Accepts instance (clones) |
| `Model.parse()` | `SerializedData` (static), instance hydrates from JSON | Different semantics entirely |
| `ElementBase.parse()` | `SerializedData` (instance, mutates) | Not a factory |

`parse()` means different things in different classes — sometimes a factory, sometimes instance mutation, sometimes accepts the type itself for cloning.

**Implemented (non-breaking):** [Color.parse](src/core/color.ts) now accepts `string | Color`, so the core value types (`Point`, `Size`, `Color`) share consistent clone-via-parse behavior.

**Remaining inconsistency:** `Model.parse()` and `ElementBase.parse()` still use hydration/mutation semantics and are intentionally not interchangeable with value-type parsing.

### 2.3 — String-Encoded Type Properties in ElementBase — PARTIALLY RESOLVED 2026-03-18

`size` and `location` are declared as `string | undefined` getters/setters on ElementBase, but internally stored as `Size` and `Point` objects. Every `get` serializes (`toString()`), every `set` deserializes (`parse()`). This forces unnecessary parse/serialize round-trips throughout the codebase.

Internal methods (`getSize()`, `getLocation()`) bypass the string accessors, creating two parallel access patterns for the same data.

**Implemented (non-breaking):** Added typed property accessors in [src/elements/element-base.ts](src/elements/element-base.ts):

- `sizeValue: Size | undefined`
- `locationValue: Point | undefined`

This provides a direct typed path without string parsing/serialization while keeping legacy `size`/`location` string properties for compatibility.

**Remaining recommendation:** migrate internal call sites to typed accessors by default and reserve string properties for serialization boundaries.

### 2.4 — Double Serialization in cloneTo() and serialize() — RESOLVED 2026-03-18

```ts
// element-base.ts cloneTo()
e.size = this.size.toString();  // this.size already returns string
```

`this.size` (the getter) already returns a string. Calling `.toString()` on that string is redundant. Same pattern in `serialize()`.

**Applied fix:** Removed redundant `.toString()` calls in [ElementBase.serialize](src/elements/element-base.ts#L394) and [ElementBase.cloneTo](src/elements/element-base.ts#L458); assignments now use `this.size` and `this.location` directly.

### 2.5 — toString() Precision Loss (point.ts) — RESOLVED 2026-03-18

`Point.toString()` uses `toFixed(0)`, which truncates fractional coordinates to integers. A Point at (10.7, 20.3) serializes to `"11,20"` and parses back to `(11, 20)`. This silently loses sub-pixel precision.

**Applied fix:** [Point.toString](src/core/point.ts#L124) now serializes raw numeric values (`this.x + ',' + this.y`) to preserve decimal precision.

### 2.6 — Five Parallel Event Implementations — RESOLVED 2026-03-18

`CommonEvent<T>`, `ModelEvent<T>`, `ControllerEvent<T>`, `ComponentEvent<T>`, and `ResourceManagerEvent<T>` all implement the same add/remove/clear/trigger/hasListeners pattern. The only difference is the source parameter type passed to `trigger()`. A single generic `TypedEvent<TSource, TData>` would replace all five.

**Applied fix:** Added shared generic implementations in [src/core/typed-event.ts](src/core/typed-event.ts):

- `SimpleEvent<TData>`
- `SourceEvent<TSource, TData>`

Then refactored the five event classes to extend these shared bases while preserving their existing public class names and behavior.

### 2.7 — Fluent API Incompleteness — PARTIALLY RESOLVED 2026-03-18

Most mutation methods on ElementBase return `this` for chaining (`setFill()`, `setStroke()`, `setLocation()`, `setSize()`, `nudgeSize()`, `translate()`, `scale()`), but `parse()` and `cloneTo()` return `void`. While reasonable, the inconsistency means you can chain `el.setFill('red').setStroke('black')` but not end a chain with `.parse(data)`.

**Implemented (non-breaking):** Added fluent wrappers in [src/elements/element-base.ts](src/elements/element-base.ts):

- `parseFluent(o): this`
- `cloneToFluent(e): e`

Legacy `parse()` / `cloneTo()` signatures are preserved for compatibility.

### 2.8 — Error Message Literal Inconsistency — RESOLVED 2026-03-18

The library defines 47 error message constants in `ErrorMessages`, but at least 13 throw sites use inline string literals instead:

- `model.ts` lines 629, 712: `'Size is undefined.'` (should be `ErrorMessages.SizeUndefined`)
- `surface.ts` line 196: `'Host div is undefined'` (should be `ErrorMessages.HostElementUndefined`)
- `bitmap-resource.ts` line 172: `'Image path is undefined.'`
- `upload-component-props.ts`: 8 instances of `'Model is undefined.'`

**Applied fix:** Replaced all inline `throw new Error('...')` literals in source with `ErrorMessages` constants. A repository-wide search now returns no inline throw-message string literals.

### 2.9 — Inconsistent Error Handling: Throw vs Silent Failure — PARTIALLY RESOLVED 2026-03-18

- **Color.parse():** Throws on invalid input (after our recent fix)
- **Image rendering** (image-element.ts:171): Catches errors and `console.log()`s them — silently swallows
- **XHR errors** (utility.ts:26-93): `console.log()` + return `undefined` — no error propagation
- **Resource loading** (model.ts:200): `console.log()` progress only — no error events for individual failures

The library has no consistent contract for whether operations throw, return error values, or silently fail.

**Implemented (safe first pass):**

- [ImageElement.draw](src/elements/image-element.ts) no longer swallows canvas draw exceptions; it now logs through `Logging` and throws `ErrorMessages.CanvasDrawImageError`.
- `Utility` XHR abort/error paths now route through centralized `Logging` instead of ad hoc `console.log`.
- [Model.listen](src/core/model.ts) now routes diagnostics through `Logging`.

**Remaining inconsistency:** callback-based fetch helpers still signal network failures with `undefined` results rather than typed error results/rejections.

---

## 3. Performance Concerns

### 3.1 — HIGH: .bind(this) Overhead in Constructors — PARTIALLY RESOLVED 2026-03-18

ElementBase binds ~40 methods in its constructor. DesignRenderer binds 11. Surface binds 16. Color binds 8. ViewController binds ~30. Every instance creates new function objects for all bound methods.

For a model with 100 elements, that's ~4,000 function allocations just from ElementBase. In hot paths like frame rendering where elements may be traversed, this contributes to GC pressure.

**Impact:** Increases per-instance memory ~2-3x. Moderate GC pressure for large models.

**Alternative:** Use arrow function class fields (`method = () => { ... }`) which bind once per class, or bind only methods that are actually used as detached callbacks.

**Implemented (safe pass):** Removed per-instance method-binding from the shared event infrastructure in [src/core/typed-event.ts](src/core/typed-event.ts), and removed now-redundant constructors from wrapper event classes.

**Remaining hotspot:** `ElementBase`, `ViewController`, `Surface`, and `DesignRenderer` still bind many methods per instance.

### 3.2 — HIGH: .apply(this, [...]) in Render Loop (design-renderer.ts:101) — RESOLVED 2026-03-18

`renderElement()` dispatches to typed render methods using:
```ts
this.renderImageElement.apply(this, [c, el as ImageElement]);
```

The `.apply()` creates a temporary array `[c, el]` on every call. This runs once per element per frame. With 50 elements at 60fps, that's 3,000 unnecessary array allocations per second. The methods are already `.bind(this)` in the constructor, so `.apply(this, ...)` is redundant — a direct call `this.renderImageElement(c, el as ImageElement)` is sufficient.

**Applied fix:** `renderElement()` in [src/design/design-renderer.ts](src/design/design-renderer.ts#L109) now uses direct method calls for all element types, eliminating per-dispatch array allocations.

### 3.3 — MEDIUM: setInterval(15) in All Pane Transitions — RESOLVED 2026-03-18

All five pane transitions (Fade, Push, Wipe, Reveal, Slide) use `setInterval(tick, 15)` instead of `requestAnimationFrame`. This:
- Doesn't sync with the browser's vsync, causing visual tearing
- Runs at ~66fps even when the tab is backgrounded (wastes CPU/battery)
- Fights with the main `requestAnimationFrame` loop in ViewController

`requestAnimationFrame` would be more efficient and produce smoother animations.

**Implemented:** Migrated all pane transition loops (`Fade`, `Push`, `Wipe`, `Reveal`, `Slide`) and sprite transition animation in [src/transitions/transitions.ts](src/transitions/transitions.ts) to `requestAnimationFrame`.

### 3.4 — MEDIUM: Point Allocation on Every Mouse Move (view-controller.ts:513) — PARTIALLY RESOLVED 2026-03-18

`windowToCanvas()` creates `new Point()` on every mouse event. During drag operations this runs on every `mousemove`. A pre-allocated reusable Point (similar to the existing `timerParameters` optimization at line 265) would eliminate this allocation in the hot path.

**Implemented:** Added `windowToCanvasWithOutput(x, y, out?)` and a reusable `pointerBuffer` in [src/view/view-controller.ts](src/view/view-controller.ts). Internal hot-path mouse handlers now reuse this buffer.

**Compatibility note:** Existing `windowToCanvas(x, y)` API behavior is unchanged and still returns a new `Point` when used directly.

### 3.5 — MEDIUM: Redundant getLocation() in Design Renderer (design-renderer.ts:246-262) — RESOLVED 2026-03-18

`renderRectangleElement()` calls `getLocation()` twice (stored in `location` at line 248 and again in `loc` at line 262). Each call parses the internal Point — the second call is pure waste.

**Applied fix:** [renderRectangleElement](src/design/design-renderer.ts) now reuses the first computed `location` value for fill translation work and no longer performs a second lookup.

### 3.6 — LOW: Linear Named Color Lookup (color.ts) — RESOLVED 2026-03-18

`Color.parse()` and `toString()` scan through named colors linearly. With 147+ named colors, this is O(n) on every parse/serialize of named colors. A `Map<string, Color>` lookup would make this O(1).

**Applied fix:** Added precomputed name and hue lookup maps in [src/core/color.ts](src/core/color.ts), and updated `parse()`, `toString()`, and `isNamedColor()` to use O(1) map lookups.

### 3.7 — LOW: Point Allocations in Path Rendering (design-renderer.ts:632+) — PARTIALLY RESOLVED 2026-03-18

Path command rendering creates `new Point(parseFloat(...), parseFloat(...))` for each coordinate pair per frame. For complex paths with hundreds of points, this produces significant GC pressure in the render loop.

**Implemented:** Removed temporary `Point` allocations in the cubic (`c`) command branch of [renderPathElement](src/design/design-renderer.ts) by using scalar coordinate transforms.

**Remaining:** `m`/`l` command branches still allocate through `Point.parse` + `Point.scale` + `Point.translate`.

---

## 4. Serious Implementation Concerns

### 4.1 — No Transition Cancellation API — RESOLVED 2026-03-18

Once a pane transition starts, there is no way to cancel it. `PaneTransition` has no `cancel()` or `dispose()` method. If the containing surface is destroyed mid-transition, the `setInterval` continues ticking on detached DOM elements, causing:
- Memory leaks (closure captures surface/canvas references)
- Potential errors from operating on removed DOM nodes
- Unnecessary CPU usage

**Applied fix:** Added cancellation lifecycle support to [src/surface/pane-transitions/pane-transition.ts](src/surface/pane-transitions/pane-transition.ts) with `cancel()` and disposal semantics, added cancellation-aware cleanup to all concrete pane transitions, and updated [SurfacePane](src/surface/surface-pane.ts) to track/cancel active transitions on replacement and teardown.

**Verification update (2026-03-18):** Added focused transition lifecycle and routing tests in [src/__tests__/surface/pane-transition-lifecycle.test.ts](src/__tests__/surface/pane-transition-lifecycle.test.ts) and [src/__tests__/surface/pane-transition.test.ts](src/__tests__/surface/pane-transition.test.ts). Latest full coverage run reports `src/surface/pane-transitions/**` at 82.01% statements and [src/surface/surface-pane.ts](src/surface/surface-pane.ts) at 72.76% statements.

### 4.2 — Static Mutable Capture State (view-controller.ts:27) — RESOLVED 2026-03-18

`ViewController.captured` is a static mutable field used for global mouse capture. This prevents having two independently interactive ViewControllers on the same page — only one can be "captured" at a time. Any multi-view scenario (split panes, picture-in-picture) will have broken mouse interaction.

**Applied fix:** Removed static capture routing from [src/view/view-controller.ts](src/view/view-controller.ts). Window mouse listeners are now instance-local and active only while that controller is in mouse-down state, so one controller's capture state no longer overwrites another's global singleton.

### 4.3 — No Error Boundary in Animation Loop (view-controller.ts:1049) — RESOLVED 2026-03-18

The `tick()` method re-schedules itself via `requestAnimationFrame` at the end of each frame. If `timer.trigger()` or `drawIfNeeded()` throws an unhandled error, `requestAnimationFrame` won't be re-scheduled but `timerEnabled` stays `true`. The controller enters a broken state where it believes animation is running but no frames are being produced. There's no try/catch around the critical tick path.

**Applied fix:** Wrapped the critical work in [ViewController.tick](src/view/view-controller.ts) with a try/catch. On error, the controller now disables the timer (`timerEnabled = false`), clears `timerHandle`, logs diagnostic context, and exits cleanly instead of remaining in a stale running state.

**Verification update (2026-03-18):** Added focused tests for timer and lifecycle behavior in [src/__tests__/view/view-controller.test.ts](src/__tests__/view/view-controller.test.ts), covering timer failure shutdown, `startTimer/pauseTimer/resumeTimer/stopTimer`, `detach()` cleanup, and `windowToCanvasWithOutput()` coordinate normalization.

**Verification update (2026-03-18, Priority 2 expansion):** Added mouse interaction-flow tests in [src/__tests__/view/view-controller.test.ts](src/__tests__/view/view-controller.test.ts) for `onCanvasMouseDown/Move/Up` state transitions, click-cancel distance behavior, and delayed press via `eventDelay`. Latest full coverage run reports [src/view/view-controller.ts](src/view/view-controller.ts) at 49.32% statements (target >= 45% achieved).

### 4.4 — String-Based Type Dispatch (element-base.ts, view-renderer, design-renderer) — PARTIALLY RESOLVED 2026-03-18

Element type dispatch throughout the library uses string comparisons:
```ts
if (el.type === 'image') { ... }
else if (el.type === 'rectangle') { ... }
```

This prevents TypeScript from enforcing completeness (no exhaustiveness checking), makes refactoring element types error-prone (rename a string and dispatches silently break), and adds runtime overhead compared to polymorphic dispatch or a discriminated union with switch/case.

**Implemented:** Replaced the long `if/else if` type-dispatch chain in [DesignRenderer.renderElement](src/design/design-renderer.ts) with a single switch-based dispatch block for clearer centralized handling.

**Verification update (2026-03-18, Priority 4):** Added focused renderer tests in [src/__tests__/design/design-renderer.test.ts](src/__tests__/design/design-renderer.test.ts) covering `renderElement` type dispatch, `renderToContext` model-level branches, rectangle fill-offset/stroke behavior, image/sprite branches, model-element scaling, and path command branches (`m/l/c/z`) including moving-point full-depth control point updates. Latest full coverage run reports [src/design/design-renderer.ts](src/design/design-renderer.ts) at 36.30% statements (target >= 35% achieved).

**Remaining recommendation:** move from string tags to a discriminated union or polymorphic rendering path to enable compile-time exhaustiveness.

### 4.5 — console.log in Production Code — RESOLVED 2026-03-18

11 `console.log` calls exist in production source:
- `utility.ts` (6): XHR error/abort handlers
- `model.ts` (1): Resource loading progress
- `image-element.ts` (1): Rendering error
- `logging.ts` (1): The logging system itself
- `index.ts` (1): Exported `log()` function wrapper

These should use the existing `Logging` class or be removed. The `log()` export in index.ts is particularly problematic — it exposes `console.log` as a public API of the graphics library.

**Applied fix:** Removed the remaining runtime `console.log` calls in [src/core/logging.ts](src/core/logging.ts) and [src/index.ts](src/index.ts). The exported `log()` helper now routes through `Logging.log()`.

### 4.6 — Utility Reimplements Built-in String Methods — RESOLVED 2026-03-18

`Utility.endsWith()` and `Utility.startsWith()` manually reimplement `String.prototype.endsWith/startsWith` which have been standard since ES2015. With the project targeting ES2020, these are dead weight that obscure intent.

**Applied fix:** Updated [src/core/utility.ts](src/core/utility.ts) so `Utility.endsWith()` and `Utility.startsWith()` delegate directly to native `String.prototype.endsWith` and `String.prototype.startsWith`.

### 4.7 — requestAnimationFrame: false in Default Export (index.ts:536) — RESOLVED 2026-03-18

The default export object includes `requestAnimationFrame: false` — a mysterious boolean flag with no documentation. It shadows the global `requestAnimationFrame` name, potentially confusing consumers who destructure the default export.

**Applied fix:** Replaced the hardcoded boolean with a runtime-compatible export in [src/index.ts](src/index.ts): `requestAnimationFrame` now resolves to `globalThis.requestAnimationFrame.bind(globalThis)` when available, otherwise `undefined`.

**Verification update (2026-03-18, Priority 5):** Added focused API-surface tests in [src/__tests__/index.test.ts](src/__tests__/index.test.ts) and [src/__tests__/core/utility.test.ts](src/__tests__/core/utility.test.ts) covering default export `requestAnimationFrame` compatibility behavior, `log()` helper routing to `Logging.log`, and `Utility.startsWith/endsWith` contracts. Latest full coverage run reports [src/index.ts](src/index.ts) at 100.00% statements (target >= 25% achieved).

### 4.8 — Surface.unbind() Incomplete Event Cleanup — RESOLVED 2026-03-18

`Surface.unbind()` clears 6 controller events but does not clear the `loaded` or `initialized` `CommonEvent` instances. External subscribers to these events retain references to the Surface object after it's been unbound, preventing garbage collection.

**Applied fix:** Added `loaded.clear()` and `initialized.clear()` in [Surface.unbind](src/surface/surface.ts) to ensure lifecycle event listeners are released during teardown.

---

## 5. Functionality Improvement Suggestions

### 5.1 — Promise-Based Resource Loading — PARTIALLY RESOLVED 2026-03-18

The entire resource loading pipeline (Model.load → ResourceManager.load → Resource.load → Utility.getRemote*) is callback-based. This makes composition difficult (loading multiple models, error handling, progress tracking). Promise/async-await would enable:

```ts
const model = await Model.load(basePath, uri);
await model.prepareResources();
```

See [MODERNIZATION-RECOMMENDATIONS.md §1](MODERNIZATION-RECOMMENDATIONS.md) for detailed migration plan.

**Implemented (non-breaking):** Added Promise-based wrappers while preserving callback APIs:

- [Model.loadAsync](src/core/model.ts) and [Model.prepareResourcesAsync](src/core/model.ts)
- [ResourceManager.loadAsync](src/resource/resource-manager.ts)
- [Utility.getRemoteTextAsync](src/core/utility.ts), [Utility.getRemoteBytesAsync](src/core/utility.ts), and [Utility.getRemoteBlobAsync](src/core/utility.ts)

**Verification update (2026-03-18, Priority 3 expansion):** Added focused tests in [src/__tests__/resource/resource-manager.test.ts](src/__tests__/resource/resource-manager.test.ts) and [src/__tests__/core/model.test.ts](src/__tests__/core/model.test.ts) covering resource fallback selection, register/unregister success/failure event states, and `Model.prepareResources()` registration paths. Latest full coverage run reports [src/resource/resource-manager.ts](src/resource/resource-manager.ts) at 79.60% statements and [src/core/model.ts](src/core/model.ts) at 39.77% statements.

**Remaining recommendation:** migrate internals from callback-first flow to Promise-first flow end-to-end and add typed error/rejection contracts.

### 5.2 — Typed Geometry Properties on ElementBase

Replace string-based `size`/`location` with typed accessors:

```ts
get sizeValue(): Size | undefined { return this._size; }
set sizeValue(size: Size | undefined) { this._size = size; }
```

Keep the string accessors for serialization backward compatibility, but prefer typed access internally. This eliminates the parse/serialize overhead on every property access.

### 5.3 — Element Type Discriminated Union

Replace string-based `type` field with a TypeScript discriminated union:

```ts
type Element =
    | { type: 'rectangle'; } & RectangleElement
    | { type: 'ellipse'; } & EllipseElement
    | { type: 'image'; } & ImageElement
    // ...
```

This enables exhaustiveness checking in switch/case dispatch and eliminates the possibility of typo-based dispatch failures.

### 5.4 — Gradient Validation — RESOLVED 2026-03-18

`LinearGradientFill.addFillStop()` and `RadialGradientFill.addFillStop()` accept any color string and offset number without validation. Invalid offsets (outside 0-1) or malformed color strings silently propagate to the Canvas API, producing unexpected rendering or silent failures.

**Applied fix:** Added validation in [GradientFillStop](src/fill/gradient-fill-stop.ts). Color values are now validated via `Color.parse`, and offsets must be finite values in the `[0, 1]` range (`ErrorMessages.InvalidGradientStopOffset` on failure). Added focused tests in [src/__tests__/fill/fill.test.ts](src/__tests__/fill/fill.test.ts).

### 5.5 — Unified Event System

Replace the five parallel event classes with a single generic implementation:

```ts
class TypedEvent<TSource, TData> {
    add(handler: (source: TSource, data: TData) => void): void { ... }
    remove(handler: (source: TSource, data: TData) => void): void { ... }
    trigger(source: TSource, data: TData): void { ... }
}
```

### 5.6 — IPointContainer as Abstract Methods

ElementBase implements `IPointContainer` with `pointCount()`, `getPointAt()`, `setPointAt()` that all `throw ErrorMessages.NotImplemented`. This is a runtime "abstract" pattern. TypeScript's `abstract` keyword would catch missing implementations at compile time. The blocker is that `ElementBase.clone()` instantiates `new ElementBase(this.type)` directly — this would need refactoring to use a factory or `Object.create()`.

---

## Summary

| # | Category | Severity | Description |
|---|----------|----------|-------------|
| 1.1 | Bug | Critical | `\|\|` should be `&&` in sprite transition condition |
| 1.2 | Bug | High | eventTimer not cleared on ViewController detach |
| 1.3 | Bug | Medium | Surface leaked on pane transition error |
| 1.4 | Bug | Low | Duplicate listener accumulation in SurfacePane.prepare |
| 2.1 | API | Medium | Point/Size/Region mutability inconsistency |
| 2.2 | API | Medium | parse() means different things in different classes |
| 2.3 | API | Medium | String-encoded types on ElementBase |
| 2.4 | API | Low | Double serialization in cloneTo/serialize |
| 2.5 | API | Low | Point.toString() truncates to integers |
| 2.6 | API | Low | Five duplicate event classes |
| 2.7 | API | Low | Fluent API partial coverage |
| 2.8 | API | Low | Inline error strings bypass ErrorMessages |
| 2.9 | API | Medium | Inconsistent throw vs silent failure |
| 3.1 | Perf | High | ~40 .bind(this) per ElementBase instance |
| 3.2 | Perf | High | .apply(this, [...]) array allocation in render loop |
| 3.3 | Perf | Medium | setInterval instead of requestAnimationFrame |
| 3.4 | Perf | Medium | Point allocation per mouse move |
| 3.5 | Perf | Medium | Redundant getLocation() call in rectangle render |
| 3.6 | Perf | Low | Linear named color lookup |
| 3.7 | Perf | Low | Point allocations in path render loop |
| 4.1 | Impl | High | No transition cancellation API |
| 4.2 | Impl | High | Static global capture prevents multi-view |
| 4.3 | Impl | High | No error boundary in animation loop |
| 4.4 | Impl | Medium | String-based type dispatch |
| 4.5 | Impl | Medium | console.log in production code |
| 4.6 | Impl | Low | Utility reimplements String builtins |
| 4.7 | Impl | Low | requestAnimationFrame: false in exports |
| 4.8 | Impl | Low | Incomplete event cleanup in Surface.unbind |
