# Modernization & Improvement Recommendations

This document outlines actionable recommendations for modernizing the **elise-graphics** library, organized by priority and impact. These build on the dependency updates, ESLint migration, and test expansion already completed.

## Related Specifications

- [API Specification](API-SPEC.md)
- [Model Format Specification](MODEL-FORMAT-SPEC.md)

---

## 1. Replace Callbacks with Promises / async-await

**Priority:** High | **Impact:** High | **Effort:** Medium

The entire async surface area—resource loading, remote data fetching, and model initialization—uses raw callbacks. This makes error propagation fragile and composition difficult.

**Current state:**

```ts
// utility.ts
static getRemoteText(url: string, callback: (result?: string) => void) {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => callback(xhr.responseText);
    xhr.onerror = () => { console.log('Error'); callback(undefined); };
    xhr.open('GET', url);
    xhr.send();
}

// resource-manager.ts
load(callback: () => void) { ... this.loadNext(callback); }
```

**Recommended:**

```ts
// utility.ts
static async getRemoteText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.text();
}

// resource-manager.ts
async load(): Promise<void> {
    for (const resource of this.resources) {
        await resource.load();
    }
}
```

This also replaces `XMLHttpRequest` with `fetch`, eliminating a legacy browser API. The three XHR helpers in `Utility` (`getRemoteText`, `getRemoteBytes`, `getRemoteBlob`) become thin `fetch` wrappers.

Maintain backward compatibility by offering a callback overload during a transition period if consumers rely on it.

---

## 2. Replace `var` in webpack.config.js and Modernize Build Config

**Priority:** Medium | **Impact:** Low | **Effort:** Low

`webpack.config.js` uses `var` throughout. Update to `const`/`let` and modernize the configuration:

```js
// Before
var path = require('path');
var webpack = require('webpack');
var PATHS = { entryPoint: ... };

// After
const path = require('path');
const PATHS = { entryPoint: ... };
```

Also:
- The `optimization.minimizer` is set to `[]` (empty), which disables minification for the `.min.js` bundle. Either remove the `.min` entry point or add `terser-webpack-plugin`.
- Consider adding `mode: 'production'` explicitly.
- The `ts-loader` transpiles to the `tsconfig.json` target. Now that the target is ES2020, the UMD bundle ships modern syntax—verify this is acceptable for your browser support matrix or add a separate webpack tsconfig targeting ES5.

---

## 3. Refactor Barrel Exports for Tree-Shaking

**Priority:** Medium | **Impact:** High | **Effort:** Medium

`src/index.ts` contains ~140 import+export pairs. Every import is eager, defeating tree-shaking for any consumer using the ESM build (`lib-esm/`).

**Recommended approach:**

1. Add per-module barrel files (`src/core/index.ts`, `src/elements/index.ts`, etc.) using `export { X } from './file'` syntax.
2. Simplify the root `src/index.ts` to re-export from sub-barrels:

```ts
export * from './core';
export * from './elements';
export * from './fill';
// ...
```

3. Set `"sideEffects": false` in `package.json` so bundlers can tree-shake unused modules.

---

## 4. Strengthen the Type System

**Priority:** High | **Impact:** High | **Effort:** Medium

Several patterns undermine TypeScript's type safety:

### 4a. Replace `any` in serialization

`serialize()` methods return `any` and `parse()` accepts `any`. Define explicit interfaces:

```ts
interface SerializedRectangle {
    type: 'rectangle';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string | SerializedFill;
    stroke?: string;
    // ...
}
```

This enables compile-time validation of serialized shapes and makes the JSON format self-documenting.

### 4b. Narrow return types

Methods like `getLocation()`, `getCenter()`, `getP1()`, `getP2()`, `getBounds()` return `T | undefined` even though they always have a value after construction. Consider:
- Making the underlying properties non-optional with default values, or
- Adding a definite-assignment assertion in the constructor and narrowing the return type to `T`.

### 4c. Replace string-encoded types with structured types

Several properties use encoded strings:
- `stroke: "Black,2"` → `StrokeInfo { color: string; width: number }`
- `alignment: "center,middle"` → `{ horizontal: HAlign; vertical: VAlign }`
- `transform: "translate(10,20) rotate(45)"` → `Transform[]`

Provide both the string setter (for convenience/serialization) and a typed getter/setter pair.

---

## 5. Add Custom Error Classes

**Priority:** Medium | **Impact:** Medium | **Effort:** Low

All errors are `throw new Error(ErrorMessages.SomeString)`. This makes programmatic error handling impossible—callers can only catch all `Error` instances and match on message text.

```ts
export class EliseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'EliseError';
    }
}

export class ResourceLoadError extends EliseError {
    constructor(public readonly resourceKey: string, cause?: Error) {
        super(`Failed to load resource: ${resourceKey}`);
        this.name = 'ResourceLoadError';
    }
}

export class ParseError extends EliseError {
    constructor(message: string, public readonly source?: string) {
        super(message);
        this.name = 'ParseError';
    }
}
```

The XHR error handlers in `Utility` currently swallow errors with `console.log` and return `undefined`. These should throw or reject with typed errors instead.

---

## 6. Abstract Browser APIs for Testability and SSR

**Priority:** Medium | **Impact:** High | **Effort:** Medium

The library directly calls `document.createElement`, `window.requestAnimationFrame`, `new Image()`, and `XMLHttpRequest`. This prevents:
- Running in Node.js (for server-side rendering or testing)
- Mocking browser APIs in unit tests
- Using Web Workers or OffscreenCanvas

Introduce an abstraction layer:

```ts
interface RenderingContext {
    createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas;
    requestFrame(callback: FrameRequestCallback): number;
    loadImage(url: string): Promise<ImageBitmap | HTMLImageElement>;
}
```

Provide a default `BrowserRenderingContext` implementation and allow consumers to supply alternatives. This also opens the door to OffscreenCanvas rendering in a Web Worker for complex scenes.

---

## 7. Resolve Circular Dependencies

**Priority:** High | **Impact:** Medium | **Effort:** Medium

There is a confirmed circular dependency between `core/model.ts` and `resource/resource-manager.ts`. Other likely cycles exist between `elements/element-base.ts` ↔ `core/model.ts`.

Circular dependencies cause:
- Initialization order bugs (undefined imports at runtime)
- Bundle size increases (prevents code splitting)
- Maintenance confusion

**Recommended fixes:**
1. Install `eslint-plugin-import` and enable `import/no-cycle` rule
2. Extract shared interfaces into a `types/` module that both sides depend on
3. Use dependency injection—pass `Model` to `ResourceManager` rather than importing it
4. Consider extracting element-model cross-references into a mediator pattern

---

## 8. Improve Test Coverage and Infrastructure

**Priority:** Medium | **Impact:** High | **Effort:** Medium

Testing expanded from 53 to 178 tests across 16 suites, but significant gaps remain:

### Missing test coverage:
- **View rendering** (`ViewController`, `DesignController`, `ViewRenderer`) — these are the core visual output. Consider using a canvas mock (`jest-canvas-mock`) or snapshot-based image comparison.
- **Surface system** (`SurfaceLayer`, `SurfacePane`, `SurfaceViewController`) — layered composition logic
- **Transitions** — timer-based animations need clock-controlled tests (`jest.useFakeTimers()`)
- **Sketcher** — drawing tool behaviors
- **Resource loading** — HTTP mocking for `getRemoteText`/`getRemoteBytes` (use `msw` or `jest.fn()`)
- **Transform parsing** — the string-based transform format
- **FillFactory** — parsing of all fill format strings

### Infrastructure improvements:
- Add code coverage reporting: `jest --coverage` with coverage thresholds in `jest.config.js`
- Add `jest-canvas-mock` for testing rendering code paths
- Consider integration tests that render a known model and compare output

---

## 9. Add Proper Event Typing

**Priority:** Low | **Impact:** Medium | **Effort:** Low

`CommonEvent<T>` uses `any` for handler signatures in practice. The event system could benefit from stronger typing:

```ts
// Instead of CommonEvent<Function>
type ModelEventHandler = (model: Model, element: ElementBase) => void;
const elementAdded = new CommonEvent<ModelEventHandler>();
```

This provides autocomplete and type checking at event subscription sites.

---

## 10. Consider ESM-Only Distribution

**Priority:** Low | **Impact:** Medium | **Effort:** Low

The library currently ships three builds:
- `lib/` — CommonJS
- `lib-esm/` — ESM
- `_bundles/` — UMD (webpack)

Modern bundlers (Vite, esbuild, webpack 5, Rollup) all consume ESM natively. If no consumers require the UMD bundle for `<script>` tag inclusion, consider:
1. Dropping the UMD build to simplify the build pipeline
2. Setting `"type": "module"` in `package.json`
3. Using the `"exports"` field for proper conditional exports:

```json
{
    "exports": {
        ".": {
            "import": "./lib-esm/index.js",
            "require": "./lib/index.js",
            "types": "./lib/index.d.ts"
        }
    }
}
```

---

## 11. Cleanup Obsolete Files

**Priority:** Low | **Impact:** Low | **Effort:** Trivial

- **Delete `tslint.json`** — linting has migrated to ESLint via `eslint.config.mjs`
- **Update `.prettierrc`** — it contains non-standard keys (`breakBeforeElse`, `bracesSpacing`) from the deprecated `prettier-miscellaneous` fork. These are silently ignored by standard Prettier.
- **Add `.editorconfig`** — standardizes formatting across editors for contributors

---

## 12. Documentation Improvements

**Priority:** Low | **Impact:** Medium | **Effort:** Medium

- **Fix TypeDoc build** — the `typedoc` command was removed from the `build` script due to errors. Investigate and fix the TypeDoc configuration to regenerate docs from source.
- **Add `CONTRIBUTING.md`** — document build, test, and lint commands.
- **Add JSDoc to public API methods** — TypeDoc generates better output when methods have `@param`, `@returns`, and `@example` tags.
- **Publish the JSON format spec** — the newly created `MODEL-FORMAT-SPEC.md` could be exposed on the project website for consumers building tooling.

---

## Summary Matrix

| # | Recommendation | Priority | Impact | Effort |
|---|----------------|----------|--------|--------|
| 1 | Replace callbacks with async/await + fetch | High | High | Medium |
| 2 | Modernize webpack.config.js | Medium | Low | Low |
| 3 | Refactor barrel exports for tree-shaking | Medium | High | Medium |
| 4 | Strengthen the type system | High | High | Medium |
| 5 | Add custom error classes | Medium | Medium | Low |
| 6 | Abstract browser APIs | Medium | High | Medium |
| 7 | Resolve circular dependencies | High | Medium | Medium |
| 8 | Improve test coverage & infrastructure | Medium | High | Medium |
| 9 | Add proper event typing | Low | Medium | Low |
| 10 | Consider ESM-only distribution | Low | Medium | Low |
| 11 | Cleanup obsolete files | Low | Low | Trivial |
| 12 | Documentation improvements | Low | Medium | Medium |

**Recommended implementation order:** 7 → 1 → 4 → 3 → 6 → 5 → 8 → 2 → 11 → 9 → 10 → 12
