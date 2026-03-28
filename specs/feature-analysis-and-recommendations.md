# Elise Graphics Library — Deep Feature Analysis & Recommendations

Analysis Date: March 2026 | Library Version: 1.1.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Library Overview](#2-library-overview)
3. [Feature-by-Feature Comparison with Competing Libraries](#3-feature-by-feature-comparison)
4. [SVG Support Analysis](#4-svg-support-analysis)
5. [Detailed Gap Analysis](#5-detailed-gap-analysis)
6. [Prioritized Recommendations](#6-prioritized-recommendations)
7. [Appendix: Competitor Reference](#appendix-competitor-reference)

---

## 1. Executive Summary

Elise is a **retained-mode 2D graphics library** built on HTML5 Canvas with a rich feature set that includes a full design surface, sprite animation with 40+ transitions, a composable model hierarchy, JSON serialization, resource management with localization, and a higher-level Surface system integrating video/HTML/panes. Its closest competitors are **Fabric.js**, **Konva.js**, **Paper.js**, **Two.js**, and **PixiJS**.

**Key Strengths:**

- Unique combination of retained-mode rendering, interactive design surface, AND application-level surface/pane system
- Rich sprite transition library (40+ effects with easing)
- Composable model architecture with nested model elements
- Localization-aware resource management (locale-based resource resolution)
- Component registration system for extensible design tools
- Sketcher visualization system (progressive draw/fill reveal animation)
- Robust serialization with JSON round-trip fidelity

**Key Gaps:**

- No advanced/custom filter pipeline beyond CSS-style canvas filters
- No WebGL/WebGPU renderer or GPU acceleration path
- No accessibility layer

---

## 2. Library Overview

### Architecture

| Layer | Purpose | Key Classes |
| ----- | ------- | ----------- |
| **Core** | Model, elements, color, transforms, serialization | `Model`, `ElementBase`, `Color`, `Matrix2D`, `Point`, `Region` |
| **Elements** | Drawing primitives | `RectangleElement`, `EllipseElement`, `LineElement`, `PathElement`, `ArcElement`, `RegularPolygonElement`, `ArrowElement`, `WedgeElement`, `RingElement`, `PolygonElement`, `PolylineElement`, `TextElement`, `ImageElement`, `SpriteElement`, `ModelElement` |
| **Fill** | Fill/stroke system with gradients and patterns | `LinearGradientFill`, `RadialGradientFill`, `FillFactory` |
| **View** | Read-only model rendering | `ViewController`, `ViewRenderer` |
| **Design** | Interactive editing surface | `DesignController`, `DesignRenderer`, creation/edit tools for rectangles, ellipses, lines, paths, polygons, polylines, arc, regular polygon, arrow, wedge, ring, text, image, and model elements, `HandleFactory` |
| **Command** | Element-level command/event dispatch | `ElementCommand`, `ElementCommandHandler` |
| **Resource** | Bitmap/text/model resource management | `ResourceManager`, `BitmapResource`, `TextResource`, `ModelResource` |
| **Surface** | Application framework with panes, layers, video, HTML | `Surface`, `SurfacePane`, `SurfaceVideoLayer`, `SurfaceHtmlLayer`, `SurfaceAnimationLayer` |
| **Transitions** | Sprite frame & pane transitions | `TransitionRenderer` (40+ types), `PaneTransition` (6 types) |
| **Sketcher** | Progressive draw/fill animation | `Sketcher` |

### Element Capabilities Matrix

| Element | Stroke | Fill | Move | Resize | Rotate | Point Edit | Hit Test |
| ------- | ------ | ---- | ---- | ------ | ------ | ---------- | -------- |
| Rectangle | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Ellipse | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Line | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Path | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Arc | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Regular polygon / Star | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Arrow | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Wedge / Sector | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ring / Annulus | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polygon | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polyline | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Text | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Image | ❌ | N/A | ✅ | ✅ | ✅ | ❌ | ✅ |
| Sprite | ❌ | N/A | ✅ | ✅ | ❌ | ❌ | ✅ |
| Model | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## 3. Feature-by-Feature Comparison

### 3.1 Rendering Engine

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** | **PixiJS** |
| ------- | --------- | ------------- | ------------ | ------------ | ---------- | ---------- |
| Canvas 2D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WebGL | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| WebGPU | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| SVG Renderer | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Retained Mode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bounds Culling | ✅ (partial) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Offscreen Rendering | ✅ (manual) | ❌ | ✅ | ❌ | ❌ | ✅ |
| Web Worker | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| HiDPI/Retina | ✅ (auto + opt-out API) | ✅ | ✅ | ✅ | ✅ | ✅ |

**Analysis:** Elise's Canvas 2D renderer is functional with basic bounds culling (though culling is incomplete for transformed elements). Automatic HiDPI/backing-store scaling in both view and design controllers closes one of the most visible quality gaps with competitors. The lack of a WebGL renderer still puts it behind PixiJS and Two.js for performance-intensive applications. PixiJS v8 is now the first library in this class to ship a WebGPU rendering backend alongside WebGL. No library in this class supports Web Workers well.

### 3.2 Drawing Primitives

| Primitive | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** |
| --------- | --------- | ------------- | ------------ | ------------ | ---------- |
| Rectangle | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ellipse/Circle | ✅ | ✅ (separate) | ✅ (separate) | ✅ | ✅ |
| Line | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polyline | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polygon | ✅ | ✅ | ✅ | ✅ | ✅ |
| Path (cubic Bézier) | ✅ | ✅ | ❌ (custom) | ✅ | ✅ |
| Path (quadratic Bézier) | ✅ | ✅ | ❌ | ✅ | ✅ |
| Path (arc) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Star/Regular polygon | ✅ | ✅ | ✅ | ✅ | ✅ |
| Arrow | ✅ | ❌ | ✅ | ❌ | ❌ |
| Wedge/Sector | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ring/Annulus | ✅ | ❌ | ✅ | ❌ | ❌ |
| Rounded rectangle | ✅ | ✅ | ✅ | ✅ | ✅ |
| Text | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rich/multi-style text | ✅ | ✅ | ❌ | ❌ | ❌ |
| Image | ✅ | ✅ | ✅ | ✅ (raster) | ✅ |
| Sprite | ✅ | ✅ | ✅ | ❌ | ✅ |
| Group/Container | ✅ (Model) | ✅ | ✅ | ✅ | ✅ |

**Analysis:** Elise now covers the common primitive set well, including first-class arc, regular polygon/star, arrow, wedge/sector, and ring/annulus shapes with design-surface editing handles and SVG export support. The remaining geometry gaps are mostly higher-level operations such as Boolean path tooling, simplification, and exact fidelity under transforms that cannot preserve native SVG arc parameters.

### 3.3 Path System

| Feature | **Elise** | **Fabric.js** | **Paper.js** | **Two.js** |
| ------- | --------- | ------------- | ------------ | ---------- |
| Move to (`M`) | ✅ | ✅ | ✅ | ✅ |
| Line to (`L`) | ✅ | ✅ | ✅ | ✅ |
| Cubic Bézier (`C`) | ✅ | ✅ | ✅ | ✅ |
| Quadratic Bézier (`Q`) | ✅ | ✅ | ✅ | ✅ |
| Arc (`A`) | ✅ | ✅ | ✅ | ✅ |
| Smooth cubic (`S`) | ✅ | ✅ | ✅ | ❌ |
| Smooth quadratic (`T`) | ✅ | ✅ | ✅ | ❌ |
| Horizontal line (`H`) | ✅ | ✅ | ✅ | ❌ |
| Vertical line (`V`) | ✅ | ✅ | ✅ | ❌ |
| Close (`Z`) | ✅ | ✅ | ✅ | ✅ |
| SVG path string parsing | ✅ | ✅ | ✅ | ✅ |
| Boolean operations (union/intersect) | ❌ | ❌ | ✅ | ❌ |
| Path simplification | ❌ | ✅ | ✅ | ❌ |
| Path offsetting | ❌ | ❌ | ✅ | ❌ |
| Winding rules | ✅ | ✅ | ✅ | ✅ |

**Analysis:** Elise now supports standard SVG path parsing with native persisted support for arc, shorthand, and axis-aligned commands alongside cubic and quadratic segments. The main remaining weaknesses are higher-level path tooling such as Boolean operations, simplification, and offsetting. Paper.js is still the clear leader with full Boolean path operations and first-class path manipulation.

### 3.4 Transform System

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** |
| ------- | --------- | ------------- | ------------ | ------------ | ---------- |
| Translate | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scale | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rotate | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skew | ✅ | ✅ | ✅ | ✅ | ❌ |
| Custom matrix | ✅ | ✅ | ❌ | ✅ | ✅ |
| Transform origin | ✅ (via string) | ✅ | ✅ | ✅ | ✅ |
| Per-element transform | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transform stacking | Via model nesting | ✅ | ✅ | ✅ | ✅ |
| 3D perspective | ❌ | ❌ | ❌ | ❌ | ❌ |

**Analysis:** Elise's transform system is competitive. The string-based transform parsing (`"rotate(45(50,50))"`) is unique but non-standard compared to CSS/SVG syntax. Transform stacking requires model nesting rather than explicit parent-child chaining.

### 3.5 Fill & Stroke System

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** |
| ------- | --------- | ------------- | ------------ | ------------ | ---------- |
| Solid color | ✅ | ✅ | ✅ | ✅ | ✅ |
| Linear gradient | ✅ | ✅ | ✅ | ✅ | ✅ |
| Radial gradient | ✅ | ✅ | ✅ | ✅ | ✅ |
| Image/pattern fill | ✅ | ✅ | ✅ | ❌ | ✅ |
| Model fill (nested) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fill inheritance | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fill offset/scale | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dash pattern | ✅ | ✅ | ✅ | ✅ | ✅ |
| Stroke width | ✅ | ✅ | ✅ | ✅ | ✅ |
| Line cap/join | ✅ | ✅ | ✅ | ✅ | ✅ |
| Miter limit | ❌ | ✅ | ✅ | ✅ | ❌ |
| Blend modes | ✅ | ❌ | ✅ | ✅ | ❌ |
| Opacity (element) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shadow | ✅ | ✅ | ✅ | ✅ | ❌ |

**Analysis:** Elise has unique strengths in **model fills** (using a nested model as a pattern source) and **fill inheritance** (parent fills cascade to children). With dash patterns, line cap/join styles, element opacity, blend modes, and drop shadows now implemented, the main remaining paint-style gaps in this area are **miter limit**, filters, and mask-style composition features.

### 3.6 Text Rendering

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
| ------- | --------- | ------------- | ------------ | ------------ |
| Single-line text | ✅ | ✅ | ✅ | ✅ |
| Multi-line wrapping | ✅ | ✅ | ✅ | ❌ |
| Font family | ✅ | ✅ | ✅ | ✅ |
| Font size | ✅ | ✅ | ✅ | ✅ |
| Bold/italic | ✅ | ✅ | ✅ | ❌ |
| Horizontal alignment | ✅ | ✅ | ✅ | ✅ |
| Vertical alignment | ✅ | ✅ | ✅ | ❌ |
| Line height | ✅ (auto) | ✅ | ✅ | ✅ |
| Letter spacing | ✅ | ✅ | ✅ | ❌ |
| Text decoration | ✅ | ✅ | ✅ | ❌ |
| Rich text (mixed styles) | ✅ | ✅ | ❌ | ❌ |
| Text on path | ❌ | ❌ | ✅ (plugin) | ✅ |
| Text resource (localization) | ✅ | ❌ | ❌ | ❌ |
| Text from URL | ✅ | ❌ | ❌ | ❌ |
| RTL/Bidi | ❌ | ❌ | ❌ | ❌ |

**Status:** Completed

**Delivered scope:** `TextElement` now supports persisted `letterSpacing`, `textDecoration`, and run-based `richText` content. Text layout/rendering is shared between runtime and design rendering, and SVG import/export now preserves `letter-spacing`, `text-decoration`, and styled `<tspan>` runs. Serialization and clone round-trips cover the new text model. A full rich-text authoring mode is available on the design surface with inline editing, selection, caret navigation, formatting shortcuts, double-click word selection, and line-aware vertical arrow navigation.

**Analysis:** Elise now has a unique advantage in **text resource management** with locale-aware resolution, and it closes the most obvious typography gaps by supporting letter spacing, text decoration, mixed-style rich text at the model/render/SVG levels, and a complete **design-surface text editing UX** with keyboard entry, selection, inline formatting (`Ctrl+B`/`Ctrl+I`/`Ctrl+U`), double-click word selection, and vertical arrow line navigation. The main remaining text gaps are **text on path**, explicit **line spacing control**, and **RTL/Bidi** support.

#### Rich Text Authoring And Design UX

**Status:** Completed

All five planned steps have been delivered:

1. ✅ Public `TextElement` editing helpers: `getTextLength()`, `getTextStyleAt()`, `replaceTextRange()`, `applyTextStyle()`, `getTextIndexAtPoint()`, `getCaretRegion()`, `getSelectionRegions()`, `getVerticalTextIndex()`, `getWordRangeAt()`.
2. ✅ `DesignController` tracks caret position (`textSelectionStart`/`textSelectionEnd`), selection anchor, active text style (`pendingTextStyle`), and preferred column for vertical movement.
3. ✅ Design-surface text edit mode: `beginTextEdit()`/`endTextEdit()` with keyboard entry, caret movement (left/right/up/down/home/end), selection expansion via Shift, delete/backspace, Enter for newline, Escape to exit, and a visual overlay with selection highlight and caret rendering.
4. ✅ Formatting commands: `Ctrl+B` (bold), `Ctrl+I` (italic), `Ctrl+U` (underline) apply to selected ranges or set pending style for subsequent typing, integrated with the existing undo pipeline.
5. ✅ Double-click word selection and line-aware vertical caret navigation.

### 3.7 Animation

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** |
| ------- | --------- | ------------- | ------------ | ------------ | ---------- |
| Sprite animation | ✅ (excellent) | ❌ | ✅ | ❌ | ✅ |
| Spritesheet support | ✅ | ❌ | ✅ | ❌ | ✅ |
| Frame transitions | ✅ (40+ types) | ❌ | ❌ | ❌ | ❌ |
| Property tweening | ✅ | ✅ | ✅ (Tween) | ✅ | ✅ |
| Keyframe animation | ❌ | ❌ | ❌ | ❌ | ❌ |
| Motion paths | ❌ | ❌ | ❌ | ❌ | ❌ |
| Easing functions | ✅ (31) | ✅ (31) | ✅ (31) | ❌ | ❌ |
| Pane transitions | ✅ (6 types) | ❌ | ❌ | ❌ | ❌ |
| Sketch animation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Timer events | ✅ | ❌ | ❌ | ✅ | ✅ |
| RAF loop | ✅ | ✅ | ✅ | ✅ | ✅ |
| Custom animation duration | ✅ | ✅ | ✅ | N/A | ✅ |

**Analysis:** Elise now combines its strong sprite and transition system with a shipped property tweening API for animating geometry, color, opacity, fill transforms, and text properties. Configurable transition duration closes another important gap. The main remaining animation weakness is the lack of a higher-level keyframe or timeline composition API rather than low-level tween or transition duration control.

### 3.8 Interactivity & Events

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
| ------- | --------- | ------------- | ------------ | ------------ |
| Click | ✅ | ✅ | ✅ | ✅ |
| Mouse down/up | ✅ | ✅ | ✅ | ✅ |
| Mouse enter/leave | ✅ | ✅ | ✅ | ✅ |
| Mouse move (element) | ✅ | ✅ | ✅ | ✅ |
| Drag & drop | ✅ | ✅ | ✅ | ❌ |
| Touch events | ✅ | ✅ | ✅ | ✅ |
| Multi-touch/pinch | ✅ (design) | ✅ | ✅ | ❌ |
| Keyboard events | ⚠️ (design surface only) | ✅ | ✅ | ✅ |
| Cursor management | ✅ (design) | ✅ | ✅ | ✅ |
| Hit regions | ✅ | ✅ | ✅ | ✅ |
| Custom hit areas | ❌ | ❌ | ✅ | ❌ |
| Event bubbling | ✅ | ✅ | ✅ | ✅ |
| Command dispatch | ✅ | ❌ | ❌ | ❌ |
| File drop | ✅ (design) | ❌ | ❌ | ❌ |

**Analysis:** Elise now covers the core mobile interaction gap with single-touch routing in runtime and design controllers plus pinch support on the design surface. Design mode includes practical keyboard handling for undo/redo, select-all, delete/backspace, escape-to-deselect, and arrow-key nudge operations. Event bubbling is now implemented through the model hierarchy using recursive path-based dispatch in `ViewController`, so events propagate from the deepest nested element outward through `ModelElement` containers. Runtime keyboard events remain a gap. The command dispatch pattern is unique and powerful for building interactive applications.

### 3.9 Design Surface (Interactive Editing)

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
| ------- | --------- | ------------- | ------------ | ------------ |
| Select/multi-select | ✅ | ✅ | ✅ (plugin) | ❌ |
| Rubber-band selection | ✅ | ❌ | ❌ | ❌ |
| Resize handles | ✅ (8-point) | ✅ (8-point) | ✅ (Transformer) | ❌ |
| Rotation handle | ✅ | ✅ | ✅ | ❌ |
| Point editing | ✅ | ❌ | ❌ | ✅ |
| Grid snapping | ✅ | ✅ | ❌ | ❌ |
| Constraints to bounds | ✅ | ❌ | ✅ | ❌ |
| Minimum size enforcement | ✅ | ✅ | ❌ | ❌ |
| Aspect ratio lock | ✅ | ✅ | ✅ | ❌ |
| 9 creation tools | ✅ | ❌ | ❌ | ❌ |
| Component registry | ✅ | ❌ | ❌ | ❌ |
| Dirty tracking | ✅ | ✅ | ❌ | ❌ |
| Undo/redo | ✅ | ❌ | ❌ | ❌ |
| Copy/paste | ✅ | ✅ | ❌ | ❌ |
| Alignment/distribute | ✅ | ❌ | ❌ | ❌ |
| Z-order controls | ✅ | ✅ | ✅ | ❌ |
| Text edit mode | ✅ | ✅ | ❌ | ❌ |

**Analysis:** Elise has the **most comprehensive built-in design surface** of any library in this comparison. The combination of 9 creation tools, component registry, rubber-band selection, grid snapping, dirty tracking, undo/redo, z-order controls, alignment and distribution helpers, smart drag guides, resize-to-match helpers, duplication workflows, clipboard workflows, and inline text editing with rich formatting is unmatched. The remaining gaps now sit outside core editing ergonomics, especially masking, SVG DOM rendering, and runtime keyboard APIs.

### 3.10 Serialization & Persistence

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
| ------- | --------- | ------------- | ------------ | ------------ |
| JSON serialize | ✅ | ✅ | ✅ | ✅ |
| JSON deserialize | ✅ | ✅ | ✅ | ✅ |
| Load from URL | ✅ | ✅ | ❌ | ❌ |
| SVG export | ✅ | ✅ | ❌ | ✅ |
| SVG import | ✅ | ✅ | ❌ | ✅ |
| PNG export | ✅ | ✅ | ✅ | ✅ |
| PDF export | ❌ | ❌ | ❌ | ✅ |
| Schema versioning | ❌ | ❌ | ❌ | ❌ |
| Resource embedding | ✅ (refs) | ✅ (data URIs) | ❌ | ❌ |
| Localization-aware | ✅ | ❌ | ❌ | ❌ |
| Pretty/compact modes | ✅ | ✅ | ❌ | ❌ |

**Analysis:** Elise's JSON serialization is solid with unique localization-aware resource management, and the shipped raster export APIs close the PNG gap. SVG import and export now cover all major element types, container hierarchies, and reusable symbol/use constructs. The remaining interchange/export gap is PDF export, which limits some print workflows.

### 3.11 Application Framework

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** |
| ------- | --------- | ------------- | ------------ | ------------ | ---------- |
| Multi-pane surfaces | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pane transitions | ✅ (6 types) | ❌ | ❌ | ❌ | ❌ |
| Video layer | ✅ | ❌ | ❌ | ❌ | ❌ |
| HTML/iframe layer | ✅ | ❌ | ❌ | ❌ | ❌ |
| Animation layer | ✅ | ❌ | ❌ | ❌ | ❌ |
| Button elements | ✅ | ❌ | ❌ | ❌ | ❌ |
| Radio strip | ✅ | ❌ | ❌ | ❌ | ❌ |
| Multi-state elements | ✅ | ❌ | ❌ | ❌ | ❌ |
| Scale synchronization | ✅ | ❌ | ❌ | ❌ | ❌ |

**Analysis:** The Surface system is **entirely unique to Elise** — no competitor offers anything comparable. This positions Elise well for building complete graphical applications (presentations, kiosks, interactive content), not just drawing canvases.

---

## 4. SVG Support Analysis

### Current State: Expanded SVG Support

Elise now has **substantial SVG capability**:

- ❌ No SVG rendering backend (canvas-only)
- ✅ SVG import covers `<path>`, `<rect>`, `<ellipse>`, `<circle>`, `<line>`, `<polygon>`, `<polyline>`, `<text>`, `<image>`, `<g>`, `<symbol>`, and `<use>`, including hierarchy-preserving container import, `use` reference resolution, inherited basic styles, gradient fills and clip paths from `<defs>`, `viewBox` origin offset handling, and SVG transform import via normalized matrix transforms
- ✅ SVG export supports the base `Model`, `PathElement`, `ArcElement`, `RegularPolygonElement`, `ArrowElement`, `WedgeElement`, `RingElement`, `RectangleElement`, `EllipseElement`, `LineElement`, `PolygonElement`, `PolylineElement`, `TextElement`, `ImageElement`, and `ModelElement`, with nested group export for embedded models and `<symbol>`/`<use>` export for reusable `ModelResource`-backed elements
- ✅ Standard SVG path strings are supported with native persisted arc, shorthand, axis-aligned, cubic, and quadratic commands, while runtime rendering still expands those commands internally where canvas requires explicit segments
- ⚠️ Elise transform strings are converted to valid SVG matrix transforms during export, but Elise still does not use native SVG transform syntax as its internal authoring format

### Why SVG Support Matters

1. **Interoperability** — SVG is the universal vector exchange format. Design tools (Figma, Illustrator, Inkscape) export SVG. Icon libraries ship SVG. Elise’s expanded import/export now covers the most common element types and grouping constructs, though advanced features like patterns, masks, and filters remain unsupported.

2. **Resolution independence** — While Elise's canvas renderer scales well, SVG enables crisp rendering at any zoom and is natively supported by browsers without JavaScript.

3. **Accessibility** — SVG supports ARIA attributes, `<title>`, `<desc>`, and keyboard focus. Canvas is opaque to screen readers.

4. **SEO & Print** — SVG is indexable by search engines and renders cleanly in print.

5. **Developer expectations** — Developers expect path strings to follow SVG syntax. Elise's custom `m`, `l`, `c`, `z` format, while conceptually similar, is non-standard and requires learning.

### SVG Support Roadmap (Recommended)

#### Phase 1 — Path Command Parity

- Status: Completed
- Elise now parses standard SVG path `d` attribute strings, including quadratic, arc, shorthand, horizontal/vertical, relative, and absolute commands
- Parsed SVG commands now persist native absolute `A`, `S`, `T`, `H`, and `V` command forms alongside Elise's existing move, line, cubic, quadratic, and close commands

#### Phase 2 — SVG Export

- Status: Completed
- `Model.toSVG()` is implemented
- Export currently maps these element types to SVG equivalents:
  - `ArcElement` → `<path>`
  - `RegularPolygonElement` → `<path>`
  - `ArrowElement` → `<path>`
  - `WedgeElement` → `<path>`
  - `RingElement` → `<path>`
  - `RectangleElement` → `<rect>`
  - `EllipseElement` → `<ellipse>`
  - `LineElement` → `<line>`
  - `PathElement` → `<path>`
  - `PolygonElement` → `<polygon>`
  - `PolylineElement` → `<polyline>`
  - `TextElement` → `<text>`
  - `ImageElement` → `<image>` (with base64 or URL)
  - `ModelElement` → `<g>` (nested group), or `<symbol>` + `<use>` (reusable resource-backed models)
- Export maps fills/strokes to SVG `fill`/`stroke` and emits `<linearGradient>`/`<radialGradient>` defs for supported gradient fills
- Export maps transforms to SVG `transform` attributes using matrix output
- Export preserves persisted native `A`, `S`, `T`, `H`, `V`, `Q`, and `Z` commands, while still emitting readable `H` and `V` output for stored straight line segments when possible
- Reusable `ModelResource`-backed `ModelElement`s are exported as deduplicated `<symbol>` definitions with `<use>` references; embedded source models export as nested `<g>` groups
- Remaining work is richer SVG features such as patterns, masks, and filters

#### Phase 3 — SVG Import

- Status: Completed
- SVG DOM parsing is implemented through `SVGImporter`
- Import maps supported SVG elements to Elise equivalents
- Import handles `viewBox` origin offsets, inherited styles, gradients and clip paths from `<defs>`, and normalized transform import
- Container elements (`<g>`, nested `<svg>`, `<symbol>`) are preserved as nested `ModelElement` hierarchies with inner `Model` instances, maintaining the source document’s grouping structure
- `<use>` references are resolved against named elements collected during import, with offset transforms applied
- Remaining work includes patterns, masks, richer text semantics, and additional SVG-specific layout features

#### Phase 4 — SVG Rendering Backend (Optional)

- Alternative renderer that outputs to SVG DOM instead of Canvas
- Would enable SVG advantages (accessibility, print) with Elise's retained-mode API

---

## 5. Detailed Gap Analysis

### 5.1 Critical Gaps (Standard expectations unmet)

| Gap | Impact | Difficulty | Competitors with feature |
| --- | ------ | ---------- | ------------------------ |
| No advanced/custom filter pipeline | Basic CSS-style canvas filters are now supported, but pixel-level custom effects and authored SVG `<filter>` defs are still missing | Medium | Fabric.js, Konva.js, PixiJS |

### 5.2 Important Gaps (Limit functionality)

| Gap | Impact | Difficulty | Competitors with feature |
| --- | ------ | ---------- | ------------------------ |
| No mask/clipping composition beyond clip paths | Cannot apply alpha masks or shape-based masking | Medium | PixiJS, Konva.js, Paper.js |
| No SVG rendering backend | Cannot render to SVG DOM for accessibility, print, or SEO | High | Fabric.js, Paper.js, Two.js |
| Runtime keyboard events not exposed | `ViewController` has no keyboard API; applications must wire DOM events manually | Medium | Fabric.js, Konva.js, Paper.js |

### 5.3 Nice-to-Have Gaps (Would enhance competitive position)

| Gap | Impact | Difficulty |
| --- | ------ | ---------- |
| No text on path | Missing creative text capability | Medium |
| No explicit line spacing control | Typography limited to automatic line height | Low |
| No PDF export | Cannot produce print-oriented vector output | Medium |
| No accessibility layer (ARIA) | Not usable for accessible applications | Medium |
| No miter limit | Minor stroke property gap | Low |
| No schema versioning | Forward/backward compatibility risk | Low |
| No boolean path operations | Cannot union/intersect/subtract paths | High |
| Limited first-class arc editing controls | Arcs are persisted natively but point editing still exposes endpoint-only control for arc segments | Medium |
| Partial SVG path editing fidelity under non-uniform transforms | Native arc commands may be expanded to cubics during affine edits that cannot preserve exact SVG arc parameters | Medium |
| Advanced SVG features (patterns, masks, filters) | SVG import/export incomplete for advanced constructs | Medium-High |
| No WebGL/WebGPU renderer | Performance ceiling for complex scenes | High |
| No motion path animation | Cannot animate elements along path geometries | Medium |

---

## 6. Prioritized Recommendations

This section lists only open recommendations. Completed roadmap items have been removed for clarity so the remaining work reads as an active queue rather than a mixed history.

The largest remaining rendering gap is a deeper custom effects pipeline beyond the completed CSS-style filter foundation. That follow-up is treated as a continuous extension of the existing filters work rather than as a separate numbered recommendation here.

---

### Tier 1: High Impact — Close Standard Gaps

#### R1. Mask & Clipping Composition

**Priority:** High | **Difficulty:** Medium | **Competitors:** PixiJS, Konva.js, Paper.js

Elise supports clip paths from SVG import, but lacks a general-purpose masking system. PixiJS supports alpha masks and stencil masks. Konva.js supports clipping via shape functions. Paper.js supports clip masks natively.

**Recommended scope:**

- Alpha mask support (use element opacity as mask source)
- Shape-based clipping with arbitrary element as clip source
- Group-level mask application
- Mask editing in design mode (select mask source, apply to target)
- SVG `<mask>` and `<clipPath>` import/export

#### R2. Text on Path

**Priority:** Medium | **Difficulty:** Medium | **Competitors:** Konva.js (plugin), Paper.js

Render text along an arbitrary path shape. Frequently needed for logo design, badges, and decorative text.

**Recommended scope:**

- Attach `TextElement` to a `PathElement` as a text path
- Start offset and alignment along path
- SVG `<textPath>` import/export
- Design surface integration for path text editing

#### R3. Explicit Line Spacing Control

**Priority:** Medium | **Difficulty:** Low | **Competitors:** Fabric.js, Konva.js

Elise computes line height automatically from font metrics. An explicit `lineHeight` multiplier would provide typographic control matching competitors.

**Recommended scope:**

- `TextElement.setLineHeight(multiplier)` (e.g. 1.0, 1.2, 1.5, 2.0)
- Persisted, serialized, and round-tripped
- SVG interop via inherited font-size / line-height

#### R4. Runtime Keyboard Event API

**Priority:** Medium | **Difficulty:** Low | **Competitors:** Fabric.js, Konva.js, Paper.js

Design mode has comprehensive keyboard handling, but `ViewController` does not expose keyboard events. Applications using the view controller for interactive (non-editing) scenarios cannot respond to keyboard input without manual DOM wiring.

**Recommended scope:**

- Expose `keyDown`, `keyUp`, `keyPress` callbacks on `ViewController`
- Element-level keyboard focus tracking
- Propagation through model hierarchy consistent with mouse event bubbling

#### R5. Keyframe / Timeline Animation API

**Priority:** Medium | **Difficulty:** High | **Competitors:** None (partial in Konva.js Tween chaining)

Elise already ships property tweening. A higher-level timeline API would allow composing sequences, parallel tracks, staggered groups, and repeating/reversing without manual callback chaining.

**Recommended scope:**

- `Timeline` class with add/parallel/stagger/sequence composition
- Named keyframe stops with easing between them
- Timeline scrubbing, pause, resume, reverse, speed control
- Integration with the existing `ElementAnimator` infrastructure

**Why differentiating:** No competitor has a built-in timeline API. This would be a genuine differentiator for Elise in the animation space, complementing the already-unique transition system.

---

### Tier 2: Strategic — Build Competitive Advantage

#### R6. Accessibility Layer (ARIA)

**Priority:** Medium | **Difficulty:** Medium-High

Add an invisible DOM overlay synchronized with canvas elements, providing ARIA roles, labels, and keyboard focus navigation for screen readers. Currently Elise only sets `tabindex="0"` on the canvas.

#### R7. Miter Limit Support

**Priority:** Low | **Difficulty:** Low | **Competitors:** Fabric.js, Konva.js, Paper.js

Standard stroke property for controlling sharp corner behavior. Trivial to add — maps directly to `ctx.miterLimit`.

#### R8. Schema Versioning

**Priority:** Low | **Difficulty:** Low-Medium

Version stamp in serialized JSON for forward/backward compatibility. Enables migration logic when model structure evolves.

#### R9. Boolean Path Operations

**Priority:** Low | **Difficulty:** High | **Competitors:** Paper.js

Union, intersect, subtract, and exclude operations on paths. Paper.js is the only competitor with this built-in. High complexity (requires Weiler-Atherton or Greiner-Hormann polygon clipping plus curve intersection).

#### R10. Advanced SVG Feature Coverage

**Priority:** Low | **Difficulty:** Medium-High

Expand SVG import/export to cover patterns, masks, filters, markers, and additional layout features. Incremental work building on the solid SVG foundation already in place.

#### R11. Native Arc Path Editing

**Priority:** Low | **Difficulty:** Medium

First-class persisted arc command with dedicated design-surface control handles, replacing the current cubic-approximation approach for imported arcs.

#### R12. PDF Export

**Priority:** Low | **Difficulty:** Medium | **Competitors:** Paper.js

Vector PDF output for print workflows. Paper.js is the only competing library with built-in PDF export (via Cairo on Node). Could leverage a browser-side library like jsPDF or pdf-lib.

---

### Aspirational / Long-Term

#### R13. WebGL Rendering Backend

GPU-accelerated rendering path for scenes with many elements or complex effects. Would require a parallel renderer implementation behind the existing model API.

#### R14. WebGPU Rendering Backend

PixiJS v8 is the first library in this class to ship WebGPU support. A WebGPU backend would future-proof Elise for next-generation browser rendering.

#### R15. Motion Path Animation

Animate elements along arbitrary path geometries. Combines the existing tweening API with path traversal for parametric motion.

---

## Appendix: Competitor Reference

### Fabric.js (v7.x)

- **Focus:** Interactive canvas with rich object model
- **Strengths:** SVG import/export, rich text with Intl.Segmenter, extensive object types, clipboard, WebGL image filters, aligning guidelines, multi-touch gestures, cropping controls
- **Weaknesses:** Canvas-only rendering, no application framework, heavy bundle
- **NPM:** ~697K weekly downloads
- **Notable in v7:** Multi-touch gesture support via westures, Intl.Segmenter-based text shaping, cropping controls extension, center/center default origin, aligning guidelines

### Konva.js (v10.x)

- **Focus:** High-performance 2D canvas framework with framework integrations
- **Strengths:** Stage/layer architecture, built-in tweening (31 easings), transformer tool, 14+ filters, touch support, React/Vue/Svelte/Angular integrations, NodeJS rendering via canvas/skia-canvas
- **Weaknesses:** No SVG support, limited path system, no design tools
- **NPM:** ~1,131K weekly downloads (largest in class)

### Paper.js (v0.12.x)

- **Focus:** Vector graphics scripting framework
- **Strengths:** Full SVG import/export, boolean path operations, path manipulation, PDF export (via Cairo)
- **Weaknesses:** No built-in interactivity framework, older API style, no sprites, development appears stalled (last npm publish 2+ years ago)
- **NPM:** ~106K weekly downloads

### Two.js (v0.8.x)

- **Focus:** Renderer-agnostic 2D drawing
- **Strengths:** SVG/Canvas/WebGL renderers, scene graph, property animation, headless rendering
- **Weaknesses:** Limited interactivity, no design surface, smallest community
- **NPM:** ~11K weekly downloads

### PixiJS (v8.x)

- **Focus:** High-performance WebGL/WebGPU 2D renderer
- **Strengths:** WebGL + WebGPU rendering, unmatched performance, sprite system, powerful filters, advanced blend modes, masking, large ecosystem (Disney, Google, BBC, Ubisoft)
- **Weaknesses:** Not a vector graphics library, no SVG editing, no design tools, not retained-mode in the editing sense
- **NPM:** ~478K weekly downloads

### Where Elise Fits

Elise occupies a **unique niche** that no single competitor fills: a retained-mode graphics library with a **built-in design surface**, **application framework** (Surface/Pane system with video/HTML integration), and **sprite animation with 40+ transitions**. The closest competitor combining editing + rendering is Fabric.js, but Fabric lacks Elise's Surface system, component registry, undo/redo, rubber-band selection, and transition effects.

With the completion of 21 major feature milestones (animation system, touch support, SVG import/export, undo/redo, rich text editing, blend modes, filters, event bubbling, clipboard support, automatic HiDPI rendering, expanded easing coverage, and more), Elise now competes on **core capability** rather than playing catch-up on basics. The design surface is the most comprehensive in its class.

**Competitive landscape shift:** Konva.js has grown to the largest library in this class by npm downloads (~1.1M/week), driven by React/Vue/Svelte/Angular framework integrations. Fabric.js v7 added multi-touch gestures, aligning guidelines, and improved text handling. PixiJS v8 shipped WebGPU as the first library in this class. Paper.js development has stalled. The market is bifurcating between high-performance renderers (PixiJS) and interactive editing libraries (Fabric.js, Konva.js, Elise).

**Elise's primary competitive gaps** are now:

1. **Advanced filters/effects pipeline** — CSS-style filters now exist, but pixel-level effect pipelines and authored SVG filter graphs still lag richer competitors
2. **Advanced vector tooling** — Boolean path ops, richer arc manipulation, and exact non-uniform SVG path fidelity remain behind Paper.js-class tooling
3. **GPU rendering path** — No WebGL/WebGPU backend for high-complexity scenes
4. **Accessibility layer** — Canvas content still lacks a first-class ARIA/focus model

**The recommended path forward:**

1. **Deepen effects work:** richer filter/effect pipelines and masking remain the most visible motion-and-rendering shortcoming
2. **Build strategic advantage** (R1-R5): Masking, text on path, runtime keyboard APIs, and timeline animation extend Elise's unique design surface and animation strengths
3. **Polish and differentiate** (R6-R15): Accessibility, boolean operations, advanced SVG, PDF export, and future renderer backends round out the platform for specialized use cases

This strategy leverages Elise's unique Surface/Pane architecture and comprehensive design surface as differentiators while closing the feature gaps that matter most in competitive evaluations.
