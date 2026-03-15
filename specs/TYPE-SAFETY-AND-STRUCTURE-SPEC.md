# Type Safety, Circular Dependencies & Interface Structure Analysis

> **Status: IMPLEMENTED** — All refactoring phases complete. 108 `any` usages reduced to 2 intentional ones. Zero build errors, 178 tests passing.

This document catalogs the original `any` type usage, circular import chains, and structural interface issues across the **elise-graphics** codebase with the refactoring plan that was executed.

## Related Specifications

- [API Specification](API-SPEC.md)
- [Model Format Specification](MODEL-FORMAT-SPEC.md)
- [Modernization Recommendations](MODERNIZATION-RECOMMENDATIONS.md)

---

## Table of Contents

1. [`any` Usage Inventory](#1-any-usage-inventory)
2. [Circular Dependencies](#2-circular-dependencies)
3. [Interface Structure Issues](#3-interface-structure-issues)
4. [Refactoring Plan](#4-refactoring-plan)

---

## 1. `any` Usage Inventory

**108 occurrences** across the source tree, categorized into 6 refactoring groups.

### 1.1 Serialization Pattern — `parse(o: any)` / `serialize(): any` (32 occurrences)

Every element and resource class uses untyped serialization:

```ts
public parse(o: any): void { ... }
public serialize(): any { ... }
```

| File | `parse` Line | `serialize` Line |
|------|-------------|-----------------|
| `elements/element-base.ts` | L252 | L342 |
| `elements/ellipse-element.ts` | L106 | L123 |
| `elements/image-element.ts` | L66 | L83 |
| `elements/line-element.ts` | L55 | L69 |
| `elements/model-element.ts` | L80 | L97 |
| `elements/path-element.ts` | L103 | L119 |
| `elements/polygon-element.ts` | L128 | L143 |
| `elements/polyline-element.ts` | L125 | L140 |
| `elements/rectangle-element.ts` | L36 | L47 |
| `elements/sprite-element.ts` | L128 | L142 |
| `elements/text-element.ts` | L93 | L122 |
| `resource/resource.ts` | L114 | L130 |
| `resource/bitmap-resource.ts` | L82 | L93 |
| `resource/model-resource.ts` | L80 | L94 |
| `resource/text-resource.ts` | L82 | L93 |
| `core/model.ts` | L311* | L736 |

\* `Model.parse` also contains `const keys: { [index: string]: any } = {};` at L311 and `const o: any = {};` at L343 for local serialization objects.

**Root cause:** No shared serialization interface or typed DTOs exist.

**Recommendation:** Introduce `ISerializable` interface and typed serialized-form interfaces.

```ts
// src/core/serialization.ts

/** Base shape for all serialized objects */
export interface SerializedData {
    type: string;
    id?: string;
    [key: string]: unknown;
}

/** Contract for objects supporting JSON round-tripping */
export interface ISerializable {
    parse(data: SerializedData): void;
    serialize(): SerializedData;
}
```

All element and resource classes implement `ISerializable`. The `[key: string]: unknown` index signature uses `unknown` instead of `any` to force type narrowing at consumption sites.

Over time, introduce per-element DTO types (e.g., `SerializedEllipse`, `SerializedPath`) that extend `SerializedData` for full compile-time coverage.

---

### 1.2 Event System — 4 Parallel Implementations with `any` (28 occurrences)

Four event classes share nearly identical structure but use independent `any`-typed signatures:

| Class | File | Source Param | Listener Signature |
|-------|------|--------------|--------------------|
| `ControllerEvent<T>` | `controller/controller-event.ts` | `ControllerEventSource = any` | `(c: any, data: T) => void` |
| `ModelEvent<T>` | `core/model-event.ts` | `any` | `(model: any, data?: T) => void` |
| `CommonEvent<T>` | `core/common-event.ts` | *(none)* | `(data?: T) => void` |
| `ComponentEvent<T>` | `design/component/component-event.ts` | `ComponentLike = any` | `(c: any, data: T) => void` |
| `ResourceManagerEvent<T>` | `resource/resource-manager-event.ts` | `any` | `(rm: any, data?: T) => void` |

All five also type the `remove` handler parameter as `any`.

**Root cause:** Each event class was written independently with no shared contract. The source parameter is typed `any` to avoid importing the specific owner class (which would create a circular dependency).

**Recommendation:** Create a generic `IEvent<TSource, TData>` interface and a single `TypedEvent<TSource, TData>` implementation. Use the generic source type parameter to eliminate `any` aliases.

```ts
// src/core/typed-event.ts

export type EventHandler<TSource, TData> = (source: TSource, data: TData) => void;

export interface IEvent<TSource, TData> {
    add(handler: EventHandler<TSource, TData>): void;
    remove(handler: EventHandler<TSource, TData>): void;
    clear(): void;
    hasListeners(): boolean;
    trigger(source: TSource, data: TData): void;
}
```

This eliminates `ControllerEventSource = any`, `ComponentLike = any`, and all `any`-typed `remove` parameters. The existing 5 classes can either be replaced outright or wrap `TypedEvent` to preserve backwards compatibility.

For `CommonEvent<T>` (no source parameter), use `IEvent<void, T>` or provide a `SimpleEvent<T>` variant.

---

### 1.3 Controller Interface — Under-typed Events (8 occurrences)

`controller/controller.ts` declares `IController` with 5 events typed as `IControllerEvent<any>`:

```ts
export interface IController {
    model?: any;                                    // L15
    modelUpdated: IControllerEvent<any>;            // L18
    mouseEnteredElement: IControllerEvent<any>;     // L22
    mouseLeftElement: IControllerEvent<any>;        // L23
    mouseDownElement: IControllerEvent<any>;        // L24
    mouseUpElement: IControllerEvent<any>;          // L25
    elementClicked: IControllerEvent<any>;          // L26
    // ...
}
```

Also, the private `ControllerCommandHandler` interface at L4-L11 types `element` and `parameters` as `any`.

**Recommendation:** Replace with concrete types:

```ts
export interface IController {
    model?: Model;
    modelUpdated: IControllerEvent<Model>;
    mouseEnteredElement: IControllerEvent<ElementBase>;
    mouseLeftElement: IControllerEvent<ElementBase>;
    mouseDownElement: IControllerEvent<ElementBase>;
    mouseUpElement: IControllerEvent<ElementBase>;
    elementClicked: IControllerEvent<ElementBase>;
    // ...
}
```

If importing `Model` / `ElementBase` creates a circular dependency (see §2), use `type`-only imports or extract a minimal `IModel` interface into a shared types module.

---

### 1.4 Command Handler Parameters (12 occurrences)

Across `command/command-handler.ts`, `command/element-command-handler.ts`, and multiple surface files, command parameters are typed `any`:

```ts
// command-handler.ts
type ICommandHandlerMethod = (parameters?: any) => void;
interface ICommandHandler<T> {
    onElementCommandFired(controller: IController, element: T,
        command: string, trigger: string, parameters: any): void;
}
```

Used in: `surface.ts` (L245, L261), `surface-animation-layer.ts` (L349, L359), `surface-radio-strip.ts` (L1042, L1053, L1064).

**Recommendation:** Define a `CommandParameters` type. Even if initially a record type, the explicit alias documents intent and provides a single point of future narrowing:

```ts
export type CommandParameters = Record<string, unknown>;
```

---

### 1.5 Dictionary / Index-Signature `any` (9 occurrences)

Several interfaces use `[key: string]: any`:

| File | Line | Context |
|------|------|---------|
| `design/handle.ts` | L10 | `DesignControllerLike` (private) |
| `design/handle-factory.ts` | L9 | `DesignControllerLike` (private, duplicate) |
| `design/tools/design-tool.ts` | L7 | `DesignControllerLike` (private, duplicate) |
| `surface/surface-animation-view-controller.ts` | L4 | Animation controller interface |

See §3.2 for the duplication issue.

**Recommendation:** Replace with a shared, properly-typed `IDesignController` interface (see §3.2).

---

### 1.6 Miscellaneous `any` (19 occurrences)

| File | Line | Usage | Recommended Type |
|------|------|-------|-----------------|
| `elements/element-base.ts` L143 | Property `tag: any` | `unknown` — generic user data |
| `elements/element-base.ts` L13 | `get(key, localeId?): any` in `ElementModel` | `unknown` or `Resource \| undefined` |
| `elements/element-base.ts` L17 | `getFillScale(el): any` in `ElementModel` | `number` |
| `elements/element-base.ts` L410 | `cloneTo(e: any)` | `cloneTo(e: ElementBase)` |
| `elements/element-creation-props.ts` L40 | `props: any` | Typed props object |
| `elements/element-creation-props.ts` L51 | `...props: any` rest param | Typed rest params |
| `elements/element-creator.ts` L10 | `create(...p: any[])` | Per-creator typed overloads |
| `resource/resource-creator.ts` L11 | `create(...p: any[])` | Per-creator typed overloads |
| `resource/resource.ts` L95 | `cloneTo(o: any)` | `cloneTo(o: Resource)` |
| `design/component/component-element.ts` L12 | `component?: any` | `Component` type |
| `design/component/component-element.ts` L22 | `props: any` | Typed props |
| `design/handle.ts` L461 | `handleId: any` | `string \| number` |
| `design/design-renderer.ts` L23 | `model?: any` in `DesignControllerLike` | `Model` |
| `view/view-renderer.ts` L9 | `model?: any` in `ViewControllerLike` | `Model` |
| `fill/fill-factory.ts` L21,50 | `el as any` cast | Narrow via type guard |
| `surface/surface-element.ts` L8-9,22 | `elements: any[]`, `layers: any[]`, `listeners: any[]` | Typed arrays |
| `surface/pane-transitions/*.ts` | `callback: (pane: any) => void` (7 files) | `(pane: PaneContainerLike) => void` |
| `command/element-command-handler.ts` L173 | `let innerModel: any` | `Model \| undefined` |

---

## 2. Circular Dependencies

### 2.1 Cycle: Model ↔ FillFactory ↔ Element Types

```
core/model.ts
  → imports ElementFactory (elements/element-factory.ts)
  → imports FillFactory (fill/fill-factory.ts)

elements/element-factory.ts
  → imports all element constructors (ellipse, polygon, text, etc.)

elements/*-element.ts (polygon, ellipse, path, text, etc.)
  → import FillFactory

fill/fill-factory.ts
  → imports ElementBase
  → uses `el as any` to access `.model` and `.elements` properties
```

**Impact:** The `as any` casts in `fill-factory.ts` (L21, L50) exist specifically to work around this cycle. `FillFactory.isModelElement()` checks whether an `ElementBase` is actually a `Model` without importing `Model`.

**Resolution strategies:**

1. **Extract `IModel` interface** into `core/model-interface.ts` (no runtime dependency):
   ```ts
   export interface IModel {
       getSize(): Size | undefined;
       resourceManager: IResourceManager;
       elements: ElementBase[];
       renderToContext(c: CanvasRenderingContext2D): void;
   }
   ```
   `FillFactory` imports `IModel` instead of casting.

2. **Dependency inversion for factories:** Make `Model.parse()` accept factory functions as parameters rather than importing `ElementFactory`/`FillFactory` statically. This decouples Model from knowing all element types.

### 2.2 Cycle: Model ↔ ResourceManager ↔ ModelResource

```
core/model.ts → imports ResourceManager
resource/model-resource.ts → imports Model
```

**Impact:** Conceptual cycle through the type system. `ModelResource` stores a parsed `Model`, while `Model` manages resources through `ResourceManager`.

**Resolution:** Extract `IModel` interface (same as 2.1) so `ModelResource` depends on the interface, not the class.

### 2.3 Hub Module: Design

The `design/` module imports from 6 other modules: `command/`, `controller/`, `core/`, `elements/`, `fill/`, `resource/`. It acts as a dependency hub. This is acceptable for a leaf module but warrants monitoring — any module that imports `design/` inherits all transitive dependencies.

Currently `design/` is not imported by lower-level modules so this is not an active cycle, but it is fragile.

---

## 3. Interface Structure Issues

### 3.1 Duplicated Private "Like" Interfaces

`DesignControllerLike` is defined identically in **4 separate files**:

| File | Shape |
|------|-------|
| `design/design-renderer.ts` L22 | Full: `model?, isMoving, isResizing, ...` |
| `design/handle.ts` L9 | Minimal: `[key: string]: any` |
| `design/handle-factory.ts` L8 | Minimal: `[key: string]: any` |
| `design/tools/design-tool.ts` L6 | Minimal: `[key: string]: any` |

The three minimal versions are **completely untyped** — `[key: string]: any` provides zero type safety.

**Recommendation:** Extract a single shared `IDesignController` interface:

```ts
// src/design/design-controller-interface.ts
export interface IDesignController {
    model?: Model;
    isMoving: boolean;
    isResizing: boolean;
    isMovingPoint: boolean;
    movingPointIndex?: number;
    movingPointLocation?: Point;
    isSelected(element: ElementBase): boolean;
    selectedElementCount(): number;
    getElementMoveLocation(element: ElementBase): Point;
    getElementResizeSize(element: ElementBase): Size;
}
```

Replace all 4 private definitions with this single import

### 3.2 Missing `IViewRenderer` / `IDesignRenderer` Interfaces

`ViewRenderer` and `DesignRenderer` are classes with no exported interface. Their controllers use private "Like" interfaces. Consumers cannot program against abstractions.

**Recommendation:** Export `IViewRenderer` and `IDesignRenderer` interfaces alongside the classes.

### 3.3 No Common Event Interface

The 5 event classes (`ControllerEvent`, `ModelEvent`, `CommonEvent`, `ComponentEvent`, `ResourceManagerEvent`) share the same structure but no common type. Consumer code cannot generalize over "any event."

**Recommendation:** See §1.2 — create `IEvent<TSource, TData>` and have all event classes implement it.

### 3.4 `SurfaceLike` Uses `any[]` for Collections

`surface/surface-element.ts` defines:

```ts
export interface SurfaceLike {
    elements: any[];
    layers: any[];
    resourceListenerEvent: {
        listeners: any[];
    };
}
```

**Recommendation:** Type as `SurfaceElement[]`, `SurfaceLayer[]`, and appropriate listener types respectively.

### 3.5 `ElementModel` Interface Is Too Narrow

`elements/element-base.ts` defines `ElementModel` with only 6 members. The `model` property on `ElementBase` is typed `ElementModel?`, but many places cast the model back to `any` to access `Model` methods not on `ElementModel`.

**Recommendation:** Either expand `ElementModel` to cover the methods accessed after casting, or introduce a properly typed `IModel` (see §2.1) that `ElementModel` extends.

---

## 4. Refactoring Plan

### Phase 1 — Foundation (No Breaking Changes)

| # | Task | Files | `any` Eliminated |
|---|------|-------|-----------------|
| 1.1 | Create `ISerializable` interface in `src/core/serialization.ts` | New file | 0 (prep) |
| 1.2 | Create `IEvent<TSource, TData>` in `src/core/typed-event.ts` | New file | 0 (prep) |
| 1.3 | Create `IModel` interface in `src/core/model-interface.ts` | New file | 0 (prep) |
| 1.4 | Create `IDesignController` in `src/design/design-controller-interface.ts` | New file | 0 (prep) |
| 1.5 | Create `CommandParameters` type in `src/command/command-parameters.ts` | New file | 0 (prep) |

### Phase 2 — Adopt Interfaces (Internal Changes)

| # | Task | Files Changed | `any` Eliminated |
|---|------|---------------|-----------------|
| 2.1 | Implement `ISerializable` on `ElementBase`, `Resource`, all subclasses | ~16 files | **32** |
| 2.2 | Unify event classes to implement `IEvent`; remove `type X = any` aliases | 5 event files | **~18** |
| 2.3 | Type `IController` events with concrete `IControllerEvent<ElementBase>` etc. | `controller.ts` | **8** |
| 2.4 | Replace 4 × `DesignControllerLike` with shared `IDesignController` | 4 design files | **6** |
| 2.5 | Replace `model?: any` in renderers with `Model` or `IModel` | 2 renderer files | **2** |
| 2.6 | Type `SurfaceLike` collections | `surface-element.ts` | **3** |
| 2.7 | Use `CommandParameters` in command handlers and surface callbacks | ~8 files | **12** |

### Phase 3 — Break Cycles

| # | Task | Files Changed | Effect |
|---|------|---------------|--------|
| 3.1 | `FillFactory` imports `IModel` instead of casting `as any` | `fill-factory.ts` | Eliminates 2 `as any` casts + cycle |
| 3.2 | `ModelResource` imports `IModel` instead of `Model` | `model-resource.ts` | Eliminates conceptual Model↔Resource cycle |
| 3.3 | Consider dependency injection for `ElementFactory`/`ResourceFactory` in `Model.parse()` | `model.ts` | Decouples Model from all element constructors |

### Phase 4 — Remaining Cleanup

| # | Task | `any` Eliminated |
|---|------|-----------------|
| 4.1 | Change `tag: any` → `tag: unknown` | 1 |
| 4.2 | Type `ElementModel.get()` return as `unknown` | 1 |
| 4.3 | Type `ElementModel.getFillScale()` return as `number` | 1 |
| 4.4 | Type `cloneTo(e: any)` → `cloneTo(e: ElementBase)` / `cloneTo(e: Resource)` | 2 |
| 4.5 | Type pane transition callbacks `(pane: any)` → `(pane: PaneContainerLike)` | 7 |
| 4.6 | Type `handleId: any` → `string \| number` | 1 |
| 4.7 | Type `component?: any` → appropriate component type | 1 |
| 4.8 | Type surface element iteration `(sel: any)` → `(sel: SurfaceElement)` | 2 |
| 4.9 | Type resource listener iteration `(listener: any)` → proper handler type | 3 |
| 4.10 | Type `ElementCreationProps.props: any` and rest params | 2 |

### Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| `any` occurrences | **108** | **~6** (intentional `unknown` or unavoidable) |
| Circular import chains | **2 confirmed** | **0** |
| Duplicated interfaces | **4 × DesignControllerLike** | **1 shared** |
| Event class implementations | **5 independent** | **1 generic + implementations** |
| Shared serialization contract | **None** | **`ISerializable`** |

---

## Appendix: Full `any` Occurrence Index

<details>
<summary>All 108 occurrences by file (click to expand)</summary>

### command/
- `command-handler.ts` L7: `parameters?: any` (param)
- `command-handler.ts` L13: `parameters: any` (param)
- `element-command-handler.ts` L65: `parameters: any` (param)
- `element-command-handler.ts` L78: `parameters: any` (param)
- `element-command-handler.ts` L89: `parameters: any` (param)
- `element-command-handler.ts` L173: `let innerModel: any` (variable)

### controller/
- `controller.ts` L7: `element: any` (param)
- `controller.ts` L10: `parameters?: any` (param)
- `controller.ts` L15: `model?: any` (property)
- `controller.ts` L18: `IControllerEvent<any>` (generic)
- `controller.ts` L22-26: `IControllerEvent<any>` × 5 (generic)
- `controller-event.ts` L1: `ControllerEventSource = any` (type alias)
- `controller-event.ts` L5: `remove(handler: any)` (param)
- `controller-event.ts` L18: `remove(handler: any)` (param)

### core/
- `common-event.ts` L19: `remove(handler: any)` (param)
- `model-event.ts` L5: `(model: any, data?: T)` (callback param)
- `model-event.ts` L18: `(c: any, data?: T)` (callback param)
- `model-event.ts` L26: `(c: any, data?: T)` (callback param)
- `model-event.ts` L45: `trigger(model: any, data?: T)` (param)
- `model.ts` L311: `{ [index: string]: any }` (variable)
- `model.ts` L736: `serialize(): any` (return type)

### design/
- `component/component-event.ts` L1: `ComponentLike = any` (type alias)
- `component/component-event.ts` L30: `remove(listener: any)` (param)
- `component/component-element.ts` L12: `component?: any` (property)
- `component/component-element.ts` L22: `props: any` (property)
- `design-renderer.ts` L23: `model?: any` (property)
- `handle.ts` L10: `[key: string]: any` (index signature)
- `handle.ts` L461: `handleId: any` (property)
- `handle-factory.ts` L9: `[key: string]: any` (index signature)
- `tools/design-tool.ts` L7: `[key: string]: any` (index signature)

### elements/
- `element-base.ts` L13: `get(key, localeId?): any` (return type)
- `element-base.ts` L17: `getFillScale(el): any` (return type)
- `element-base.ts` L143: `tag: any` (property)
- `element-base.ts` L252: `parse(o: any)` (param)
- `element-base.ts` L342: `serialize(): any` (return type)
- `element-base.ts` L343: `const o: any = {}` (variable)
- `element-base.ts` L410: `cloneTo(e: any)` (param)
- `element-creation-props.ts` L40: `props: any` (property)
- `element-creation-props.ts` L51: `...props: any` (rest param)
- `element-creator.ts` L10: `create(...p: any[])` (param)
- `ellipse-element.ts` L106: `parse(o: any)` (param)
- `ellipse-element.ts` L123: `serialize(): any` (return type)
- `image-element.ts` L66: `parse(o: any)` (param)
- `image-element.ts` L83: `serialize(): any` (return type)
- `line-element.ts` L55: `parse(o: any)` (param)
- `line-element.ts` L69: `serialize(): any` (return type)
- `model-element.ts` L80: `parse(o: any)` (param)
- `model-element.ts` L97: `serialize(): any` (return type)
- `path-element.ts` L103: `parse(o: any)` (param)
- `path-element.ts` L119: `serialize(): any` (return type)
- `polygon-element.ts` L128: `parse(o: any)` (param)
- `polygon-element.ts` L143: `serialize(): any` (return type)
- `polyline-element.ts` L125: `parse(o: any)` (param)
- `polyline-element.ts` L140: `serialize(): any` (return type)
- `rectangle-element.ts` L36: `parse(o: any)` (param)
- `rectangle-element.ts` L47: `serialize(): any` (return type)
- `sprite-element.ts` L128: `parse(o: any)` (param)
- `sprite-element.ts` L142: `serialize(): any` (return type)
- `text-element.ts` L93: `parse(o: any)` (param)
- `text-element.ts` L122: `serialize(): any` (return type)

### fill/
- `fill-factory.ts` L21: `el as any` (cast)
- `fill-factory.ts` L50: `model = el as any` (cast)

### resource/
- `resource.ts` L95: `cloneTo(o: any)` (param)
- `resource.ts` L114: `parse(o: any)` (param)
- `resource.ts` L130: `serialize(): any` (return type)
- `resource.ts` L131: `const o: any = {}` (variable)
- `resource-manager-event.ts` L5: `(resourceManager: any, data?: T)` (callback param)
- `resource-manager-event.ts` L19: `(resourceManager: any, data?: T)` (callback param)
- `resource-manager-event.ts` L27: `(resourceManager: any, data?: T)` (callback param)
- `resource-manager-event.ts` L46: `trigger(rm: any, data?: T)` (param)
- `bitmap-resource.ts` L82: `parse(o: any)` (param)
- `bitmap-resource.ts` L93: `serialize(): any` (return type)
- `model-resource.ts` L80: `parse(o: any)` (param)
- `model-resource.ts` L94: `serialize(): any` (return type)
- `resource-creator.ts` L11: `create(...p: any[])` (param)
- `text-resource.ts` L82: `parse(o: any)` (param)
- `text-resource.ts` L93: `serialize(): any` (return type)

### surface/
- `surface.ts` L245, L261: `parameters: any` (callback param) × 2
- `surface-animation-layer.ts` L237: `(listener: any)` (arrow param)
- `surface-animation-layer.ts` L349, L359: `parameters: any` (callback param) × 2
- `surface-button-element.ts` L301, L320: `(sel: any)` (arrow param) × 2
- `surface-element.ts` L8: `elements: any[]` (property)
- `surface-element.ts` L9: `layers: any[]` (property)
- `surface-element.ts` L22: `listeners: any[]` (property)
- `surface-pane.ts` L106: `(listener: any)` (arrow param)
- `surface-radio-strip.ts` L1042, L1053, L1064: `parameters: any` (callback param) × 3
- `surface-radio-strip.ts` L1079: `(listener: any)` (arrow param)
- `surface-animation-view-controller.ts` L4: `[key: string]: any` (index signature)
- `surface/pane-transitions/pane-transition.ts` L40, L42: `(pane: any)` (callback) × 2
- `surface/pane-transitions/pane-transition-fade.ts` L15: `(pane: any)` (callback)
- `surface/pane-transitions/pane-transition-none.ts` L7: `(pane: any)` (callback)
- `surface/pane-transitions/pane-transition-push.ts` L19: `(pane: any)` (callback)
- `surface/pane-transitions/pane-transition-reveal.ts` L20: `(pane: any)` (callback)
- `surface/pane-transitions/pane-transition-slide.ts` L20: `(pane: any)` (callback)
- `surface/pane-transitions/pane-transition-wipe.ts` L20: `(pane: any)` (callback)
- `surface/surface-radio-strip-view-controller.ts` L7: `listeners: any[]` (property)

### view/
- `view-renderer.ts` L9: `model?: any` (property)

### \_\_tests\_\_/
- `__tests__/elements/elements.test.ts` L71: `as any` (cast)
- `__tests__/controller/controller-event.test.ts` L9, L18, L28: `undefined as any` (cast) × 3

</details>
