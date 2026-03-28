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

- **No automatic HiDPI/Retina rendering** — All competitors auto-detect `devicePixelRatio`; Elise requires manual scale
- **No system clipboard** — Copy/cut/paste missing from the otherwise-complete design surface
- No convenience shapes (star, regular polygon, arrow)
- No WebGL/WebGPU renderer or GPU acceleration path
- No accessibility layer

---

## 2. Library Overview

### Architecture

| Layer | Purpose | Key Classes |
| ----- | ------- | ----------- |
| **Core** | Model, elements, color, transforms, serialization | `Model`, `ElementBase`, `Color`, `Matrix2D`, `Point`, `Region` |
| **Elements** | Drawing primitives | `RectangleElement`, `EllipseElement`, `LineElement`, `PathElement`, `PolygonElement`, `PolylineElement`, `TextElement`, `ImageElement`, `SpriteElement`, `ModelElement` |
| **Fill** | Fill/stroke system with gradients and patterns | `LinearGradientFill`, `RadialGradientFill`, `FillFactory` |
| **View** | Read-only model rendering | `ViewController`, `ViewRenderer` |
| **Design** | Interactive editing surface | `DesignController`, `DesignRenderer`, 9 design tools, `HandleFactory` |
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
| HiDPI/Retina | Via scale | ✅ | ✅ | ✅ | ✅ | ✅ |

**Analysis:** Elise's Canvas 2D renderer is functional with basic bounds culling (though culling is incomplete for transformed elements). The lack of a WebGL renderer puts it behind PixiJS and Two.js for performance-intensive applications. PixiJS v8 is now the first library in this class to ship a WebGPU rendering backend alongside WebGL. No library in this class supports Web Workers well.

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
| Path (arc) | ⚠️ (normalized import/export) | ✅ | ✅ | ✅ | ✅ |
| Star/Regular polygon | ❌ | ✅ | ✅ | ✅ | ✅ |
| Arrow | ❌ | ❌ | ✅ | ❌ | ❌ |
| Wedge/Sector | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ring/Annulus | ❌ | ❌ | ✅ | ❌ | ❌ |
| Rounded rectangle | ✅ | ✅ | ✅ | ✅ | ✅ |
| Text | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rich/multi-style text | ✅ | ✅ | ❌ | ❌ | ❌ |
| Image | ✅ | ✅ | ✅ | ✅ (raster) | ✅ |
| Sprite | ✅ | ✅ | ✅ | ❌ | ✅ |
| Group/Container | ✅ (Model) | ✅ | ✅ | ✅ | ✅ |

**Analysis:** Elise covers the essential primitives well. The main remaining path-related gaps are **first-class persisted arc editing commands** and exact SVG path round-trip fidelity, alongside remaining **convenience shapes** (star, wedge, ring). Fabric.js still leads in primitive variety.

### 3.3 Path System

| Feature | **Elise** | **Fabric.js** | **Paper.js** | **Two.js** |
| ------- | --------- | ------------- | ------------ | ---------- |
| Move to (`M`) | ✅ | ✅ | ✅ | ✅ |
| Line to (`L`) | ✅ | ✅ | ✅ | ✅ |
| Cubic Bézier (`C`) | ✅ | ✅ | ✅ | ✅ |
| Quadratic Bézier (`Q`) | ✅ | ✅ | ✅ | ✅ |
| Arc (`A`) | ⚠️ (normalized import/export) | ✅ | ✅ | ✅ |
| Smooth cubic (`S`) | ⚠️ (normalized import/export) | ✅ | ✅ | ❌ |
| Smooth quadratic (`T`) | ⚠️ (normalized import/export) | ✅ | ✅ | ❌ |
| Horizontal line (`H`) | ⚠️ (normalized import/export) | ✅ | ✅ | ❌ |
| Vertical line (`V`) | ⚠️ (normalized import/export) | ✅ | ✅ | ❌ |
| Close (`Z`) | ✅ | ✅ | ✅ | ✅ |
| SVG path string parsing | ✅ | ✅ | ✅ | ✅ |
| Boolean operations (union/intersect) | ❌ | ❌ | ✅ | ❌ |
| Path simplification | ❌ | ✅ | ✅ | ❌ |
| Path offsetting | ❌ | ❌ | ✅ | ❌ |
| Winding rules | ✅ | ✅ | ✅ | ✅ |

**Analysis:** Elise now supports standard SVG path parsing with persisted quadratic commands, which closes a significant portion of the earlier path gap. The main remaining weaknesses are native persisted arc semantics, exact preservation of shorthand SVG command structure, and higher-level path tooling such as Boolean operations, simplification, and offsetting. Paper.js is still the clear leader with full Boolean path operations and first-class path manipulation.

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
| Easing functions | ✅ (13) | ✅ (31) | ✅ (31) | ❌ | ❌ |
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
| Copy/paste | ❌ | ✅ | ❌ | ❌ |
| Alignment/distribute | ⚠️ (alignment only) | ❌ | ❌ | ❌ |
| Z-order controls | ✅ | ✅ | ✅ | ❌ |
| Text edit mode | ✅ | ✅ | ❌ | ❌ |

**Analysis:** Elise has the **most comprehensive built-in design surface** of any library in this comparison. The combination of 9 creation tools, component registry, rubber-band selection, grid snapping, dirty tracking, undo/redo, z-order controls, alignment helpers, resize-to-match helpers, duplication workflows, and inline text editing with rich formatting is unmatched. The main remaining workflow gaps are broader clipboard support and distribute tools.

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
- ✅ SVG export supports the base `Model`, `PathElement`, `RectangleElement`, `EllipseElement`, `LineElement`, `PolygonElement`, `PolylineElement`, `TextElement`, `ImageElement`, and `ModelElement`, with nested group export for embedded models and `<symbol>`/`<use>` export for reusable `ModelResource`-backed elements
- ⚠️ Standard SVG path strings are supported at import time with persisted quadratic segments, while arc, shorthand, and axis-aligned commands are still normalized during import/export rather than preserved exactly as authored
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
- Parsed SVG commands preserve quadratic segments where possible, while arc, shorthand, and axis-aligned commands are normalized into Elise's editable internal command representation so design-time editing continues to operate on explicit segments rather than native SVG shorthand or arc command storage

#### Phase 2 — SVG Export

- Status: Completed
- `Model.toSVG()` is implemented
- Export currently maps these element types to SVG equivalents:
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
- Export prefers human-readable path output by preserving simpler SVG commands such as `L`, `H`, `V`, and `Z` where normalized geometry allows, while falling back to `C` for exported curve segments
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
| No automatic HiDPI/Retina | All competitors auto-detect `devicePixelRatio`; Elise canvases appear blurry on modern displays by default | Low | All competitors |
| No system clipboard copy/paste | `Ctrl+C`/`Ctrl+V`/`Ctrl+X` are a universal design-tool expectation; Elise only has duplication | Medium | Fabric.js |

### 5.2 Important Gaps (Limit functionality)

| Gap | Impact | Difficulty | Competitors with feature |
| --- | ------ | ---------- | ------------------------ |
| No convenience shapes (star, regular polygon, arrow) | Common primitives developers expect alongside rectangles and circles | Low-Medium | Konva.js, Fabric.js, Paper.js, Two.js |
| No mask/clipping composition beyond clip paths | Cannot apply alpha masks or shape-based masking | Medium | PixiJS, Konva.js, Paper.js |
| No distribute/smart-alignment tools | Alignment exists, but equal-spacing distribution and snap-to-object guides are missing | Low | Fabric.js (v7 aligning guidelines), Konva.js (snapping plugin) |
| Limited easing library (13 vs 31+) | Missing elastic, bounce, back, expo, circ easings that are standard in motion design | Low | Fabric.js (31), Konva.js (31) |
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
| No first-class arc path editing | Imported arcs still normalized to cubics | Medium |
| No exact SVG path round-trip fidelity | Shorthand/arc semantics normalized during import | Medium |
| Advanced SVG features (patterns, masks, filters) | SVG import/export incomplete for advanced constructs | Medium-High |
| No WebGL/WebGPU renderer | Performance ceiling for complex scenes | High |
| No motion path animation | Cannot animate elements along path geometries | Medium |

---

## 6. Prioritized Recommendations

### Completed Milestones

The following 17 recommendations from the original analysis have been fully delivered:

| # | Feature | Summary |
|---|---------|---------|
| R1 | Property Tweening / Animation | `ElementBase.animate(...)` with 13 easings, color interpolation, geometry/fill/stroke tweening |
| R2 | Touch Event Support | Single-touch routing in both controllers; two-finger pinch zoom on design surface |
| R3 | PNG/Canvas Export | `Model.toCanvas()`, `toDataURL()`, `toBlob()`, `downloadAs()` with PNG/JPEG/WebP; Surface export |
| R4 | SVG Path Compatibility | `PathElement.fromSVGPath(d)` with full SVG command parsing; normalized internal model |
| R5 | Dash Pattern & Line Cap/Join | `strokeDash`, `lineCap`, `lineJoin` on all elements with SVG interop |
| R6 | SVG Export | `Model.toSVG()` covering all element types, gradients, clip paths, `<symbol>`/`<use>` |
| R7 | SVG Import | `SVGImporter` handling 12+ element types, containers, gradients, clip paths, `<use>` resolution |
| R8 | Undo/Redo System | `UndoManager` with Ctrl+Z/Y keyboard integration and snapshot restoration |
| R9 | Element Visibility | `element.setVisible(false)` with render/hit-test skip and SVG interop |
| R10 | Rounded Rectangle | Uniform and per-corner radii with design-surface drag handles |
| R11 | Shadow/Drop Shadow | `element.setShadow(...)` across all render paths |
| R12 | Z-Order Controls | `bringToFront`/`sendToBack`/`bringForward`/`sendBackward` in design mode |
| R13 | HSL Color Support | `Color.fromHSL(...)`, `toHSL()`, `Color.lerp(...)` interpolation |
| R14 | Blend Modes | `element.setBlendMode(...)` mapped to `globalCompositeOperation` |
| R15 | Configurable Transition Duration | Frame transition duration now configurable per-sprite |
| R16 | Event Bubbling | Recursive path-based dispatch through model hierarchy in ViewController |
| R17 | Keyboard Support for Design Surface | Delete, select-all, undo/redo, arrow nudge, escape, rich text shortcuts |

These milestones have transformed Elise from a rendering-focused library into a full-featured design platform with animation, SVG interop, rich text editing, and a production-ready design surface.

### New Recommendations

The following recommendations are prioritized based on competitive positioning, developer expectations, and leverage of Elise's unique architectural strengths.

---

### Tier 1: High Impact — Close Standard Gaps

#### R18. Canvas Filters & Effects System

**Status:** Completed

**Priority:** Critical | **Difficulty:** Medium | **Competitors:** Fabric.js, Konva.js, PixiJS

Canvas image filters are a standard capability in modern graphics libraries. Fabric.js offers both WebGL and Canvas2D filter pipelines. Konva.js provides 14+ built-in filters (Blur, Brighten, Contrast, Emboss, Enhance, Grayscale, HSL, Invert, Kaleidoscope, Noise, Pixelate, Posterize, Sepia, Threshold). PixiJS has a powerful GPU-accelerated filter system.

**Delivered scope:**

- Element-level `setFilter(...)` API for CSS-style canvas filter strings
- Shared render-state integration through `ElementBase.applyRenderOpacity(...)`, so filters apply in model, view, and design rendering paths
- Design-surface image and sprite preview support
- Serialization, parse, and clone round-tripping for element filters
- SVG import/export mapping for direct element `filter` attributes where string transport is feasible

**Remaining optional scope:**

- Pixel-level `ImageData` custom effect pipeline (emboss, edge-detect, noise)
- Authored SVG `<defs><filter>` generation and richer `url(#...)` interop

**Recommended scope:**

- Element-level `setFilter(...)` API applying CSS-style canvas filter strings (`blur()`, `brightness()`, `contrast()`, `grayscale()`, `hue-rotate()`, `invert()`, `saturate()`, `sepia()`)
- Optional pixel-level `ImageData` filter pipeline for custom effects (emboss, edge-detect, noise)
- SVG `<filter>` import/export mapping where feasible
- Design surface integration for previewing filter effects

**Why now:** This is the single most conspicuous gap in any feature comparison. Every major competitor ships canvas filters.

#### R19. System Clipboard Support (Copy/Cut/Paste)

**Priority:** Critical | **Difficulty:** Medium | **Competitors:** Fabric.js

Standard `Ctrl+C` / `Ctrl+X` / `Ctrl+V` clipboard operations are a core expectation for any interactive design tool. Elise already supports element duplication, undo/redo, and selection management, so clipboard is the last missing piece of the standard editing workflow.

**Recommended scope:**

- Internal clipboard buffer for copy, cut, paste of selected elements
- Paste offset to avoid stacking on the original position
- Multi-element clipboard with preserved relative positioning
- Optional: system clipboard integration for cross-tab paste via serialized JSON

**Why now:** The design surface is architecturally complete except for clipboard. This gap is immediately visible to any user accustomed to standard design tool workflows.

#### R20. Automatic HiDPI/Retina Rendering

**Priority:** High | **Difficulty:** Low | **Competitors:** All (Fabric.js, Konva.js, Paper.js, Two.js, PixiJS)

All five competitors automatically detect `window.devicePixelRatio` and scale the canvas backing store accordingly. Elise requires manual scale configuration, producing blurry output on Retina and 4K displays by default.

**Recommended scope:**

- Auto-detect `devicePixelRatio` in `ViewController` and `DesignController` during initialization
- Scale canvas backing store (width/height attributes) while preserving CSS display size
- Expose opt-out API for manual control
- Handle ratio changes (e.g. window moved between displays)

**Why now:** Low effort, high visibility. Every Elise canvas on a modern display currently looks worse than any competitor by default.

#### R21. Convenience Shape Primitives

**Priority:** High | **Difficulty:** Low-Medium | **Competitors:** Konva.js, Fabric.js, Paper.js, Two.js

Konva.js provides Star, Arrow, Wedge, Ring, Arc, and RegularPolygon as built-in shapes. Fabric.js and Paper.js offer star and regular polygon. These are common enough that their absence is a friction point.

**Recommended scope:**

- `StarElement` with configurable points, inner/outer radius
- `RegularPolygonElement` with configurable sides
- `ArrowElement` (line with arrowhead, configurable head style)
- Design tool integration for interactive creation
- SVG and serialization round-trip

**Why now:** Low implementation cost relative to competitive perception. These are frequently the first shapes developers look for after rectangles and circles.

#### R22. Expanded Easing Library

**Priority:** Medium | **Difficulty:** Low | **Competitors:** Fabric.js (31 easings), Konva.js (31 easings)

Elise ships 13 easing functions (quad/cubic/quart/quint in/out/inOut). Fabric.js and Konva.js both ship 31+, including elastic, bounce, back, and spring variants that are staples of motion design.

**Recommended scope:**

- Elastic, bounce, back, expo, and circ easing families (in/out/inOut variants)
- Optional spring/physics-based easing with configurable mass/tension/friction
- Custom easing function support via user-supplied callback

**Why now:** Minimal effort for a significant animation expressiveness gain. The animation system is already built; this just adds curves.

---

### Tier 2: Strategic — Build Competitive Advantage

#### R23. Mask & Clipping Composition

**Priority:** High | **Difficulty:** Medium | **Competitors:** PixiJS, Konva.js, Paper.js

Elise supports clip paths from SVG import, but lacks a general-purpose masking system. PixiJS supports alpha masks and stencil masks. Konva.js supports clipping via shape functions. Paper.js supports clip masks natively.

**Recommended scope:**

- Alpha mask support (use element opacity as mask source)
- Shape-based clipping with arbitrary element as clip source
- Group-level mask application
- Mask editing in design mode (select mask source, apply to target)
- SVG `<mask>` and `<clipPath>` import/export

#### R24. Distribute & Smart Alignment Tools

**Priority:** Medium | **Difficulty:** Low | **Competitors:** Fabric.js (v7 aligning guidelines), Konva.js (snapping plugin)

Elise has basic alignment (left, center, right, top, middle, bottom) but lacks equal-spacing distribution and smart alignment guides. Both Fabric.js v7 and Konva.js now offer alignment guide extensions, making this an emerging baseline expectation.

**Recommended scope:**

- Distribute selected elements horizontally/vertically with equal spacing
- Smart alignment guides: temporary guide lines shown when dragging near another element's edge or center
- Snap-to-object edges during drag (configurable threshold)
- Visual guide line rendering during drag operations

#### R25. Text on Path

**Priority:** Medium | **Difficulty:** Medium | **Competitors:** Konva.js (plugin), Paper.js

Render text along an arbitrary path shape. Frequently needed for logo design, badges, and decorative text.

**Recommended scope:**

- Attach `TextElement` to a `PathElement` as a text path
- Start offset and alignment along path
- SVG `<textPath>` import/export
- Design surface integration for path text editing

#### R26. Explicit Line Spacing Control

**Priority:** Medium | **Difficulty:** Low | **Competitors:** Fabric.js, Konva.js

Elise computes line height automatically from font metrics. An explicit `lineHeight` multiplier would provide typographic control matching competitors.

**Recommended scope:**

- `TextElement.setLineHeight(multiplier)` (e.g. 1.0, 1.2, 1.5, 2.0)
- Persisted, serialized, and round-tripped
- SVG interop via inherited font-size / line-height

#### R27. Runtime Keyboard Event API

**Priority:** Medium | **Difficulty:** Low | **Competitors:** Fabric.js, Konva.js, Paper.js

Design mode has comprehensive keyboard handling, but `ViewController` does not expose keyboard events. Applications using the view controller for interactive (non-editing) scenarios cannot respond to keyboard input without manual DOM wiring.

**Recommended scope:**

- Expose `keyDown`, `keyUp`, `keyPress` callbacks on `ViewController`
- Element-level keyboard focus tracking
- Propagation through model hierarchy consistent with mouse event bubbling

#### R28. Keyframe / Timeline Animation API

**Priority:** Medium | **Difficulty:** High | **Competitors:** None (partial in Konva.js Tween chaining)

Elise already ships property tweening. A higher-level timeline API would allow composing sequences, parallel tracks, staggered groups, and repeating/reversing without manual callback chaining.

**Recommended scope:**

- `Timeline` class with add/parallel/stagger/sequence composition
- Named keyframe stops with easing between them
- Timeline scrubbing, pause, resume, reverse, speed control
- Integration with the existing `ElementAnimator` infrastructure

**Why differentiating:** No competitor has a built-in timeline API. This would be a genuine differentiator for Elise in the animation space, complementing the already-unique transition system.

---

### Tier 3: Enhancement — Polish & Differentiation

#### R29. Accessibility Layer (ARIA)

**Priority:** Medium | **Difficulty:** Medium-High

Add an invisible DOM overlay synchronized with canvas elements, providing ARIA roles, labels, and keyboard focus navigation for screen readers. Currently Elise only sets `tabindex="0"` on the canvas.

#### R30. Miter Limit Support

**Priority:** Low | **Difficulty:** Low | **Competitors:** Fabric.js, Konva.js, Paper.js

Standard stroke property for controlling sharp corner behavior. Trivial to add — maps directly to `ctx.miterLimit`.

#### R31. Schema Versioning

**Priority:** Low | **Difficulty:** Low-Medium

Version stamp in serialized JSON for forward/backward compatibility. Enables migration logic when model structure evolves.

#### R32. Boolean Path Operations

**Priority:** Low | **Difficulty:** High | **Competitors:** Paper.js

Union, intersect, subtract, and exclude operations on paths. Paper.js is the only competitor with this built-in. High complexity (requires Weiler-Atherton or Greiner-Hormann polygon clipping plus curve intersection).

#### R33. Advanced SVG Feature Coverage

**Priority:** Low | **Difficulty:** Medium-High

Expand SVG import/export to cover patterns, masks, filters, markers, and additional layout features. Incremental work building on the solid SVG foundation already in place.

#### R34. Native Arc Path Editing

**Priority:** Low | **Difficulty:** Medium

First-class persisted arc command with dedicated design-surface control handles, replacing the current cubic-approximation approach for imported arcs.

#### R35. PDF Export

**Priority:** Low | **Difficulty:** Medium | **Competitors:** Paper.js

Vector PDF output for print workflows. Paper.js is the only competing library with built-in PDF export (via Cairo on Node). Could leverage a browser-side library like jsPDF or pdf-lib.

---

### Aspirational / Long-Term

#### R36. WebGL Rendering Backend

GPU-accelerated rendering path for scenes with many elements or complex effects. Would require a parallel renderer implementation behind the existing model API.

#### R37. WebGPU Rendering Backend

PixiJS v8 is the first library in this class to ship WebGPU support. A WebGPU backend would future-proof Elise for next-generation browser rendering.

#### R38. Motion Path Animation

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

With the completion of 17 major feature milestones (animation system, touch support, SVG import/export, undo/redo, rich text editing, blend modes, event bubbling, and more), Elise now competes on **core capability** rather than playing catch-up on basics. The design surface is the most comprehensive in its class.

**Competitive landscape shift:** Konva.js has grown to the largest library in this class by npm downloads (~1.1M/week), driven by React/Vue/Svelte/Angular framework integrations. Fabric.js v7 added multi-touch gestures, aligning guidelines, and improved text handling. PixiJS v8 shipped WebGPU as the first library in this class. Paper.js development has stalled. The market is bifurcating between high-performance renderers (PixiJS) and interactive editing libraries (Fabric.js, Konva.js, Elise).

**Elise's primary competitive gaps** are now:

1. **Canvas filters/effects** — Every major competitor has them; Elise does not
2. **Auto HiDPI** — All competitors handle this automatically; Elise requires manual configuration
3. **System clipboard** — Standard design tool expectation missing from the otherwise-complete design surface
4. **Convenience shapes** — Stars, polygons, arrows that users expect as built-in primitives

**The recommended path forward:**

1. **Close standard gaps** (R18-R22): Filters, clipboard, HiDPI, convenience shapes, and expanded easings to eliminate the most visible competitive shortcomings
2. **Build strategic advantage** (R23-R28): Masking, smart alignment, text on path, timeline animation to extend Elise's unique design surface and animation strengths
3. **Polish and differentiate** (R29-R38): Accessibility, boolean operations, advanced SVG, PDF export to round out the platform for specialized use cases

This strategy leverages Elise's unique Surface/Pane architecture and comprehensive design surface as differentiators while closing the feature gaps that matter most in competitive evaluations.
