# Text on Path — Design Specification

## Overview

Add support for rendering text characters positioned and rotated along an arbitrary SVG path curve. This follows the SVG `<textPath>` conceptual model while integrating naturally into Elise's element architecture.

## Status

Implemented in the library as:

- `TextPathElement` in `src/elements/text-path-element.ts`
- `TextPathTool` in `src/design/tools/text-path-tool.ts`
- Path geometry helpers in `src/elements/path-geometry.ts`
- Public exports from `src/index.ts`
- SVG `<textPath>` import/export support
- Tween animation support for `startOffset`
- Design-surface creation, selection-handle editing, undo, and grid-snapped tool input

The remaining gap is not rendering or authoring support, but parity with `TextElement`'s inline caret editor. The current design-time editing workflow for `TextPathElement` uses the regular selection/move/resize path rather than the rich-text caret editor.

---

## Design Approach: New `TextPathElement`

A dedicated element type is the cleanest integration point. It avoids overloading `TextElement` with conditional rendering logic and keeps responsibilities clear: `TextElement` handles rectangular text layout, `TextPathElement` handles path-following text.

### Why Not Extend TextElement?

- TextElement's layout system (line wrapping, vertical alignment, rich text runs across lines) is inherently rectangular. Mixing in path-following logic would create a branching `draw()` path that shares almost no code.
- A separate element type makes the model self-describing: if `type === 'textPath'`, it follows a path — no ambiguity at parse time.
- SVG itself treats `<text>` and `<textPath>` as distinct constructs.

---

## Architecture

### 1. Path Geometry Utilities (New Module)

**File:** `src/elements/path-geometry.ts`

The library's `path-command-utils.ts` provides parsing, iteration, normalization, and transformation — but not geometric analysis. A new module adds the missing primitives.

```ts
/** Total arc length of a parsed path command array. */
export function getPathLength(commands: string[]): number;

/** Point and tangent angle at a given distance along the path. */
export function getPointAtLength(
    commands: string[],
    distance: number,
): { point: Point; angle: number };
```

**Implementation strategy:**

- Normalize all commands to `m`, `l`, `c`, `z` (quadratics → cubics) using existing `normalizePathCommands()`, then compute lengths on the simplified set.
- **Line segments:** Euclidean distance.
- **Cubic Béziers:** Adaptive subdivision with a configurable flatness tolerance (`≤ 0.5px` default). This avoids expensive numerical integration while staying accurate for rendering.
- **Caching:** Build a cumulative-length lookup table on first call per command set; subsequent `getPointAtLength()` calls binary-search the table for O(log n) lookup.

These utilities are general-purpose and useful beyond text-on-path (e.g., future motion-path animation, dash-pattern computation, path trimming).

### 2. TextPathElement

**File:** `src/elements/text-path-element.ts`
**Type tag:** `'textPath'`

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | `string` | `undefined` | Plain text content |
| `source` | `string` | `undefined` | Text resource key (same pattern as TextElement) |
| `typeface` | `string` | `undefined` | Font family |
| `typesize` | `number` | `12` | Font size in pixels |
| `typestyle` | `string` | `undefined` | CSS font style/weight string |
| `letterSpacing` | `number` | `0` | Extra spacing between characters |
| `pathCommands` | `string` | `undefined` | SVG path data for the guide path |
| `startOffset` | `number` | `0` | Distance along path where first character begins (px or %) |
| `startOffsetPercent` | `boolean` | `false` | Whether `startOffset` is a percentage of total path length |
| `alignment` | `'left' \| 'center' \| 'right'` | `'left'` | Text alignment along path |
| `showPath` | `boolean` | `false` | Whether to render the guide path itself |
| `side` | `'left' \| 'right'` | `'left'` | Which side of the path text flows on (SVG `side` attribute) |
| `richText` | `TextRun[]` | `undefined` | Mixed-typography runs (reuses existing `TextRun` type) |

**Inherited from ElementBase:** `fill`, `stroke`, `opacity`, `transform`, `clipPath`, `shadow`, `blendMode`, `filter`, `visible`, `locked`, `interactive`, event handlers.

#### Public API Surface

`TextPathElement` is exported from `src/index.ts` as both:

- `TextPathElement`
- `textPath(...)` fluent factory alias

Related geometry helpers are also exported:

- `getPathLength(commands)`
- `getPointAtLength(commands, distance)`

#### Rendering Pipeline

```
draw(c)
  ├─ save context
  ├─ apply transform, opacity, shadow, blend mode
  ├─ withClipPath(c, () => {
  │     ├─ resolve text (plain or from resource)
  │     ├─ build font string
  │     ├─ compute path length (cached)
  │     ├─ compute effective startOffset
  │     │     └─ for 'center': offset = (pathLength - totalTextWidth) / 2
  │     │     └─ for 'right': offset = pathLength - totalTextWidth
  │     ├─ for each character (or rich text run segment):
  │     │     ├─ measure character width
  │     │     ├─ getPointAtLength(offset + charWidth/2)  → {point, angle}
  │     │     ├─ save context
  │     │     ├─ translate to point
  │     │     ├─ rotate by angle (+ π if side === 'right')
  │     │     ├─ fillText / strokeText at (0, 0)
  │     │     ├─ restore context
  │     │     └─ advance offset by charWidth + letterSpacing
  │     ├─ optionally stroke the guide path (if showPath)
  │  })
  └─ restore context
```

The character-by-character approach is necessary because each glyph has a unique position and rotation. This matches how SVG engines render `<textPath>`.

#### Character Measurement Caching

Reuse TextElement's proven caching pattern: a `Map<string, number>` keyed by `font|char`. Since text-on-path always renders character-by-character, per-character width caching is critical.

#### Bounds Computation

Computing tight axis-aligned bounds for rotated glyphs along a curve is non-trivial. Practical approach:

1. Sample a set of character positions along the path.
2. For each character, compute the four corners of its rotated bounding box.
3. Take the AABB of all corner points.
4. Pad by `typesize / 2` to account for descenders and ascenders.

This is adequate for culling and hit-testing. Exact bounds are not critical since the element is inherently non-rectangular.

### 3. Element Factory Registration

```ts
ElementFactory.registerCreator('textPath', TextPathElement);
```

Added alongside existing registrations in `element-factory.ts`.

### 4. Serialization

Follows the established pattern — only non-default values are serialized:

```json
{
    "type": "textPath",
    "text": "Hello curved world",
    "typeface": "Georgia",
    "typesize": 24,
    "pathCommands": "M 50,200 C 150,50 350,50 450,200",
    "startOffset": 10,
    "fill": "Navy",
    "opacity": 0.9
}
```

`parse()` and `serialize()` follow the same guard pattern as TextElement.

### 5. SVG Import

In `svg-importer.ts`, add handling for `<textPath>`:

```xml
<text>
  <textPath href="#curve1" startOffset="50%">
    Curved text
  </textPath>
</text>
```

**Import logic:**
1. When processing a `<text>` element, check for child `<textPath>` elements.
2. Resolve the `href`/`xlink:href` to find the referenced `<path>` element.
3. Create a `TextPathElement` instead of a `TextElement`.
4. Copy the referenced path's `d` attribute to `pathCommands`.
5. Parse `startOffset`, font properties, fill/stroke from SVG attributes.
6. Handle `<tspan>` children within `<textPath>` as rich text runs.

### 6. SVG Export

In `svg-exporter.ts`, emit:

```xml
<defs>
  <path id="textPath_0" d="M 50,200 C 150,50 350,50 450,200" />
</defs>
<text>
  <textPath href="#textPath_0" startOffset="10">
    <tspan font-family="Georgia" font-size="24" fill="Navy">Hello curved world</tspan>
  </textPath>
</text>
```

The guide path goes into `<defs>` since it's a reference, not a rendered shape (unless `showPath` is true, in which case it's also emitted as a standalone `<path>`).

### 7. Animation Support

Add `startOffset` and `typesize` to the animatable property set in `element-tween.ts`. This enables:

- **Scrolling text along a path** by animating `startOffset` from 0 to path length.
- **Growing/shrinking text** along the path by animating `typesize`.

```ts
textPathEl.animate({ startOffset: pathLength }, { duration: 5000, easing: 'linear' });
```

### 8. Hit Testing

For `hitTest()`:
1. Trace the text bounding regions along the path (same positions/rotations computed during rendering).
2. For each character, test whether the point falls within the character's rotated bounding box.
3. Early-exit on first hit.

A simpler approximation: inflate the path stroke by `typesize` and hit-test against that region. This is less precise but significantly cheaper.

### 9. Design-Time Creation Workflow

The design surface integrates text-on-path authoring through a dedicated `TextPathTool`.

**File:** `src/design/tools/text-path-tool.ts`

#### Tool behavior

1. On mouse down, the tool creates an interactive `TextPathElement` with a degenerate line path.
2. On mouse move, the guide path updates to a straight `M ... L ...` segment from the drag origin to the current pointer location.
3. On mouse up, the element commits if the drag exceeds the tool minimum size threshold; otherwise it cancels.
4. The committed element participates in the standard design-controller undo flow.
5. When grid snapping is enabled, the tool receives snapped pointer coordinates through the shared design mouse interaction pipeline, so text-path endpoints align to the current grid.

#### Why a dedicated tool

- It matches the library's existing design-tool architecture, where authoring workflows are separate tool classes.
- It avoids coupling path creation to `TextTool`, whose behavior is rectangle-based.
- It gives the design surface an immediate, predictable creation story without requiring broad changes to the inline text-editing subsystem.

#### Current editing model

After creation, a `TextPathElement` is edited through standard design-surface selection handles and transform/move behavior. Inline caret editing is intentionally out of scope for this phase because the design text-editing services are strongly typed to `TextElement` APIs.

---

## Public API Design

Following the library's fluent factory pattern:

```ts
// Minimal
TextPathElement.create('textPath')
    .setText('Hello curved world')
    .setPathCommands('M 50,200 C 150,50 350,50 450,200')
    .setTypeface('Georgia')
    .setTypesize(24)
    .setFill('Navy');

// With offset and alignment
TextPathElement.create('textPath')
    .setText('Centered on arc')
    .setPathCommands('M 0,100 A 100,100 0 0,1 200,100')
    .setAlignment('center')
    .setStartOffset(0);

// From an existing PathElement's commands
const guidePath = model.findElement('myArc') as PathElement;
TextPathElement.create('textPath')
    .setText('Following existing path')
    .setPathCommands(guidePath.commands)
    .setTypesize(18);

// Scrolling animation
const tp = TextPathElement.create('textPath')
    .setText('Scrolling text...')
    .setPathCommands(circularPath)
    .setTypesize(16);
model.add(tp);
tp.animate({ startOffset: tp.getPathLength() }, { duration: 8000, easing: 'linear' });

// Fluent helper alias
const caption = textPath('Route label', 'M 0 30 C 40 0 80 0 120 30')
  .setAlignment('center')
  .setFill('#1d3557');

// Design-surface authoring
const tool = new TextPathTool();
tool.text = 'Draft label';
tool.typesize = 16;
tool.alignment = 'center';
controller.setActiveTool(tool);
```

---

## Implementation Order

| Phase | Deliverable | Depends On |
|-------|-------------|------------|
| **1** | `path-geometry.ts` — `getPathLength`, `getPointAtLength` | `path-command-utils.ts` (existing) |
| **2** | `TextPathElement` — core class, `draw()`, `serialize()`/`parse()` | Phase 1 |
| **3** | Factory registration + basic fluent API | Phase 2 |
| **4** | SVG import/export for `<textPath>` | Phase 2 |
| **5** | Animation integration (`startOffset`, `typesize`) | Phase 2 |
| **6** | Rich text run support on path | Phase 2 |
| **7** | Hit testing | Phase 1, 2 |
| **8** | Design-time creation workflow via `TextPathTool` | Phase 2 |

Phases 1–8 are now implemented. Future work can focus on deeper design-surface text editing parity rather than core rendering or interchange support.

---

## Documentation Requirements

To keep the checked-in documentation aligned with this feature, the following sources need to move together when the API changes:

- `README.md` for user-facing capability and usage guidance
- `specs/TEXT-ON-PATH-SPEC.md` for architecture and scope notes
- `src/index.ts` export comments so TypeDoc picks up the public factory alias and helper functions
- `src/elements/text-path-element.ts` and `src/design/tools/text-path-tool.ts` class comments for generated API docs
- `docs/` regenerated via `npm run doc`

---

## Edge Cases

- **Text longer than path:** Characters beyond the path end are not rendered (SVG behavior). Optionally clamp to path end.
- **Zero-length path segments:** Skip degenerate segments during length computation.
- **Empty text / empty path:** `draw()` returns early, no rendering.
- **Closed paths:** Text wraps around if it exceeds path length and a `repeat` option is set (future enhancement).
- **Very small typesize / very tight curves:** Characters may overlap. This is expected and matches SVG behavior.
- **RTL text:** Future consideration. Initial implementation assumes LTR.

---

## Alternatives Considered

### A. Optional `textPath` property on TextElement
Adds a conditional branch to TextElement's `draw()` and `renderText()`, sharing almost no code between the two paths. Muddies the serialization format — a TextElement with `textPath` set is semantically a different thing. Rejected in favor of a clean separate type.

### B. Path reference by element ID
Like SVG's `<textPath href="#pathId">`, the text element would reference another PathElement in the model. This creates cross-element dependencies that complicate serialization (ordering, missing references) and model manipulation (deleting the referenced path). The inline `pathCommands` approach is self-contained and simpler. An ID-based reference can be layered on later as an optional convenience if needed.

### C. Off-screen canvas for text measurement
Pre-render text to a hidden canvas, then map the bitmap onto the path as a texture. This loses font crispness and doesn't allow per-character rotation. Rejected.
