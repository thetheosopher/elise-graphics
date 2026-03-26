# Elise Graphics Library — Deep Feature Analysis & Recommendations

*Analysis Date: March 2026 | Library Version: 1.1.0*

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
- **Partial SVG interop** — no SVG rendering backend, SVG import/export still omit some SVG features and element/resource cases, and full round-trip fidelity is not yet available
- No property-level keyframe animation or tweening
- No WebGL renderer or GPU acceleration path
- No first-class persisted arc/quadratic path editing commands or exact SVG path round-trip fidelity
- No blend modes, filters, or post-processing effects
- No accessibility features
- Missing HSL/HSV color models and color interpolation

---

## 2. Library Overview

### Architecture

| Layer | Purpose | Key Classes |
|-------|---------|-------------|
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
|---------|--------|------|------|--------|--------|------------|----------|
| Rectangle | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Ellipse | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Line | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Path | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polygon | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polyline | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Text | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Image | ❌ | N/A | ✅ | ✅ | ✅ | ❌ | ✅ |
| Sprite | ❌ | N/A | ✅ | ✅ | ❌ | ❌ | ✅ |
| Model | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## 3. Feature-by-Feature Comparison

### 3.1 Rendering Engine

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** | **PixiJS** |
|---------|-----------|---------------|--------------|--------------|------------|------------|
| Canvas 2D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| WebGL | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| SVG Renderer | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Retained Mode | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bounds Culling | ✅ (partial) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Offscreen Rendering | ✅ (manual) | ❌ | ✅ | ❌ | ❌ | ✅ |
| Web Worker | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| HiDPI/Retina | Via scale | ✅ | ✅ | ✅ | ✅ | ✅ |

**Analysis:** Elise's Canvas 2D renderer is functional with basic bounds culling (though culling is incomplete for transformed elements). The lack of a WebGL renderer puts it behind PixiJS and Two.js for performance-intensive applications. No library in this class supports Web Workers well.

### 3.2 Drawing Primitives

| Primitive | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** |
|-----------|-----------|---------------|--------------|--------------|------------|
| Rectangle | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ellipse/Circle | ✅ | ✅ (separate) | ✅ (separate) | ✅ | ✅ |
| Line | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polyline | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polygon | ✅ | ✅ | ✅ | ✅ | ✅ |
| Path (cubic Bézier) | ✅ | ✅ | ❌ (custom) | ✅ | ✅ |
| Path (quadratic Bézier) | ⚠️ (normalized import/export) | ✅ | ❌ | ✅ | ✅ |
| Path (arc) | ⚠️ (normalized import/export) | ✅ | ✅ | ✅ | ✅ |
| Star/Regular polygon | ❌ | ✅ | ✅ | ✅ | ✅ |
| Arrow | ❌ | ❌ | ✅ | ❌ | ❌ |
| Wedge/Sector | ❌ | ❌ | ✅ | ❌ | ❌ |
| Ring/Annulus | ❌ | ❌ | ✅ | ❌ | ❌ |
| Rounded rectangle | ❌ | ✅ | ✅ | ✅ | ✅ |
| Text | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rich/multi-style text | ❌ | ✅ | ❌ | ❌ | ❌ |
| Image | ✅ | ✅ | ✅ | ✅ (raster) | ✅ |
| Sprite | ✅ | ✅ | ✅ | ❌ | ✅ |
| Group/Container | ✅ (Model) | ✅ | ✅ | ✅ | ✅ |

**Analysis:** Elise covers the essential primitives well. The main remaining path-related gaps are **first-class persisted arc/quadratic editing commands** and exact SVG path round-trip fidelity, alongside **rounded rectangles** and **convenience shapes** (star, wedge, ring). Fabric.js still leads in primitive variety.

### 3.3 Path System

| Feature | **Elise** | **Fabric.js** | **Paper.js** | **Two.js** |
|---------|-----------|---------------|--------------|------------|
| Move to (`M`) | ✅ | ✅ | ✅ | ✅ |
| Line to (`L`) | ✅ | ✅ | ✅ | ✅ |
| Cubic Bézier (`C`) | ✅ | ✅ | ✅ | ✅ |
| Quadratic Bézier (`Q`) | ⚠️ (normalized import/export) | ✅ | ✅ | ✅ |
| Arc (`A`) | ⚠️ (normalized import/export) | ✅ | ✅ | ✅ |
| Smooth cubic (`S`) | ⚠️ (normalized import/export) | ✅ | ✅ | ❌ |
| Smooth quadratic (`T`) | ⚠️ (normalized import/export) | ✅ | ✅ | ❌ |
| Horizontal line (`H`) | ⚠️ (normalized import/export) | ✅ | ✅ | ❌ |
| Vertical line (`V`) | ⚠️ (normalized import/export) | ✅ | ✅ | ❌ |
| Close (`Z`) | ✅ | ✅ | ✅ | ✅ |
| SVG path string parsing | ⚠️ (normalized import) | ✅ | ✅ | ✅ |
| Boolean operations (union/intersect) | ❌ | ❌ | ✅ | ❌ |
| Path simplification | ❌ | ✅ | ✅ | ❌ |
| Path offsetting | ❌ | ❌ | ✅ | ❌ |
| Winding rules | ✅ | ✅ | ✅ | ✅ |

**Analysis:** This remains a meaningful gap, but Elise is no longer at zero. Internally, editable persisted paths still use the 4-command `m`/`l`/`c`/`z` model, while SVG path parsing now accepts standard SVG path strings and normalizes quadratic, shorthand, horizontal/vertical, and arc commands into explicit line and cubic segments. Paper.js is still the clear leader with full Boolean path operations and first-class path manipulation.

### 3.4 Transform System

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** |
|---------|-----------|---------------|--------------|--------------|------------|
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
|---------|-----------|---------------|--------------|--------------|------------|
| Solid color | ✅ | ✅ | ✅ | ✅ | ✅ |
| Linear gradient | ✅ | ✅ | ✅ | ✅ | ✅ |
| Radial gradient | ✅ | ✅ | ✅ | ✅ | ✅ |
| Image/pattern fill | ✅ | ✅ | ✅ | ❌ | ✅ |
| Model fill (nested) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fill inheritance | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fill offset/scale | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dash pattern | ❌ | ✅ | ✅ | ✅ | ✅ |
| Stroke width | ✅ | ✅ | ✅ | ✅ | ✅ |
| Line cap/join | ❌ | ✅ | ✅ | ✅ | ✅ |
| Miter limit | ❌ | ✅ | ✅ | ✅ | ❌ |
| Blend modes | ❌ | ❌ | ✅ | ✅ | ❌ |
| Opacity (element) | Via fill modifier | ✅ | ✅ | ✅ | ✅ |
| Shadow | ❌ | ✅ | ✅ | ✅ | ❌ |

**Analysis:** Elise has unique strengths in **model fills** (using a nested model as a pattern source) and **fill inheritance** (parent fills cascade to children). However, it's missing basic stroke properties that are standard: **dash patterns**, **line cap/join styles**, and **shadows**.

### 3.6 Text Rendering

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
|---------|-----------|---------------|--------------|--------------|
| Single-line text | ✅ | ✅ | ✅ | ✅ |
| Multi-line wrapping | ✅ | ✅ | ✅ | ❌ |
| Font family | ✅ | ✅ | ✅ | ✅ |
| Font size | ✅ | ✅ | ✅ | ✅ |
| Bold/italic | ✅ | ✅ | ✅ | ❌ |
| Horizontal alignment | ✅ | ✅ | ✅ | ✅ |
| Vertical alignment | ✅ | ✅ | ✅ | ❌ |
| Line height | ✅ (auto) | ✅ | ✅ | ✅ |
| Letter spacing | ❌ | ✅ | ✅ | ❌ |
| Text decoration | ❌ | ✅ | ✅ | ❌ |
| Rich text (mixed styles) | ❌ | ✅ | ❌ | ❌ |
| Text on path | ❌ | ❌ | ✅ (plugin) | ✅ |
| Text resource (localization) | ✅ | ❌ | ❌ | ❌ |
| Text from URL | ✅ | ❌ | ❌ | ❌ |
| RTL/Bidi | ❌ | ❌ | ❌ | ❌ |

**Analysis:** Elise has a unique advantage in **text resource management** with locale-aware resolution — no competitor matches this. However, it lacks text decoration, letter spacing, and text-on-path features that are common elsewhere.

### 3.7 Animation

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** |
|---------|-----------|---------------|--------------|--------------|------------|
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
| Custom animation duration | ✅ (property tweens) / ❌ (hardcoded transitions) | ✅ | ✅ | N/A | ✅ |

**Analysis:** Elise now combines its strong sprite and transition system with a shipped property tweening API for animating geometry, color, opacity, fill transforms, and text properties. That closes one of the most important competitive gaps identified in this analysis. The remaining animation weakness is that transition renderer durations are still effectively fixed, so sprite and pane transitions remain less configurable than the new tween API.

### 3.8 Interactivity & Events

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
|---------|-----------|---------------|--------------|--------------|
| Click | ✅ | ✅ | ✅ | ✅ |
| Mouse down/up | ✅ | ✅ | ✅ | ✅ |
| Mouse enter/leave | ✅ | ✅ | ✅ | ✅ |
| Mouse move (element) | ✅ | ✅ | ✅ | ✅ |
| Drag & drop | ✅ | ✅ | ✅ | ❌ |
| Touch events | ✅ | ✅ | ✅ | ✅ |
| Multi-touch/pinch | ✅ (design) | ✅ | ✅ | ❌ |
| Keyboard events | ❌ | ✅ | ✅ | ✅ |
| Cursor management | ✅ (design) | ✅ | ✅ | ✅ |
| Hit regions | ✅ | ✅ | ✅ | ✅ |
| Custom hit areas | ❌ | ❌ | ✅ | ❌ |
| Event bubbling | ❌ | ✅ | ✅ | ✅ |
| Command dispatch | ✅ | ❌ | ❌ | ❌ |
| File drop | ✅ (design) | ❌ | ❌ | ❌ |

**Analysis:** Elise now covers the core mobile interaction gap with single-touch routing in runtime and design controllers plus pinch support on the design surface. Keyboard events and event bubbling through the model hierarchy remain notable gaps. The command dispatch pattern is unique and powerful for building interactive applications.

### 3.9 Design Surface (Interactive Editing)

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
|---------|-----------|---------------|--------------|--------------|
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
| Alignment/distribute | ❌ | ❌ | ❌ | ❌ |
| Z-order controls | ❌ | ✅ | ✅ | ❌ |

**Analysis:** Elise has the **most comprehensive built-in design surface** of any library in this comparison. The combination of 9 creation tools, component registry, rubber-band selection, grid snapping, dirty tracking, and now built-in undo/redo is unmatched. The main remaining workflow gaps are **z-order controls** (bring to front/send to back), plus broader clipboard and layout tooling.

### 3.10 Serialization & Persistence

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
|---------|-----------|---------------|--------------|--------------|
| JSON serialize | ✅ | ✅ | ✅ | ✅ |
| JSON deserialize | ✅ | ✅ | ✅ | ✅ |
| Load from URL | ✅ | ✅ | ❌ | ❌ |
| SVG export | ⚠️ (partial) | ✅ | ❌ | ✅ |
| SVG import | ⚠️ (partial) | ✅ | ❌ | ✅ |
| PNG export | ✅ | ✅ | ✅ | ✅ |
| PDF export | ❌ | ❌ | ❌ | ✅ |
| Schema versioning | ❌ | ❌ | ❌ | ❌ |
| Resource embedding | ✅ (refs) | ✅ (data URIs) | ❌ | ❌ |
| Localization-aware | ✅ | ❌ | ❌ | ❌ |
| Pretty/compact modes | ✅ | ✅ | ❌ | ❌ |

**Analysis:** Elise's JSON serialization is solid with unique localization-aware resource management, and the shipped raster export APIs close the PNG gap. The remaining interchange/export weakness is that SVG import/export is only partial and PDF export is still absent, which limits some design-tool and print workflows.

### 3.11 Application Framework

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** | **Two.js** |
|---------|-----------|---------------|--------------|--------------|------------|
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

### Current State: Partial SVG Support

Elise now has **partial SVG capability**:

- ❌ No SVG rendering backend (canvas-only)
- ⚠️ SVG import now covers `<path>`, `<rect>`, `<ellipse>`, `<circle>`, `<line>`, `<polygon>`, `<polyline>`, `<text>`, and `<image>`, including recursive group traversal, inherited basic styles, gradient fills and clip paths from `<defs>`, `viewBox` origin offset handling, and SVG transform import via normalized matrix transforms
- ⚠️ SVG export supports the base `Model`, `PathElement`, `RectangleElement`, `EllipseElement`, `LineElement`, `PolygonElement`, `PolylineElement`, `TextElement`, `ImageElement`, and `ModelElement`, but broader element/resource coverage is still incomplete
- ⚠️ Standard SVG path strings are supported at import time and normalized into Elise's internal line/cubic command representation rather than stored as first-class SVG commands
- ⚠️ Elise transform strings are converted to valid SVG matrix transforms during export, but Elise still does not use native SVG transform syntax as its internal authoring format

### Why SVG Support Matters

1. **Interoperability** — SVG is the universal vector exchange format. Design tools (Figma, Illustrator, Inkscape) export SVG. Icon libraries ship SVG. Without broader SVG import/export coverage, Elise remains more isolated than competing design-oriented libraries.

2. **Resolution independence** — While Elise's canvas renderer scales well, SVG enables crisp rendering at any zoom and is natively supported by browsers without JavaScript.

3. **Accessibility** — SVG supports ARIA attributes, `<title>`, `<desc>`, and keyboard focus. Canvas is opaque to screen readers.

4. **SEO & Print** — SVG is indexable by search engines and renders cleanly in print.

5. **Developer expectations** — Developers expect path strings to follow SVG syntax. Elise's custom `m`, `l`, `c`, `z` format, while conceptually similar, is non-standard and requires learning.

### SVG Support Roadmap (Recommended)

**Phase 1 — Path Command Parity**
- Status: Completed
- Elise now parses standard SVG path `d` attribute strings, including quadratic, arc, shorthand, horizontal/vertical, relative, and absolute commands
- Parsed SVG commands are normalized into Elise's internal line and cubic command representation so design-time editing continues to operate on explicit segments rather than native SVG shorthand or arc command storage

**Phase 2 — SVG Export**
- Status: Partially completed
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
- Export maps fills/strokes to SVG `fill`/`stroke` and emits `<linearGradient>`/`<radialGradient>` defs for supported gradient fills
- Export maps transforms to SVG `transform` attributes using matrix output
- Export prefers human-readable path output by preserving simpler SVG commands such as `L`, `H`, `V`, and `Z` where normalized geometry allows, while falling back to `C` for exported curve segments
- Remaining work is broader element/resource coverage plus richer SVG features such as patterns and masks

**Phase 3 — SVG Import**
- Status: Partially completed
- SVG DOM parsing is implemented through `SVGImporter`
- Import maps supported SVG elements to Elise equivalents
- Import handles `viewBox` origin offsets, inherited styles, gradients and clip paths from `<defs>`, and normalized transform import
- Remaining work includes `use`/symbol references, patterns, masks, richer text semantics, and additional SVG-specific layout features

**Phase 4 — SVG Rendering Backend (Optional)**
- Alternative renderer that outputs to SVG DOM instead of Canvas
- Would enable SVG advantages (accessibility, print) with Elise's retained-mode API

---

## 5. Detailed Gap Analysis

### 5.1 Critical Gaps (Block common use cases)

| Gap | Impact | Difficulty | Competitors with feature |
|-----|--------|------------|--------------------------|
| Partial SVG interop | Still blocks some integration and round-trip scenarios because import/export coverage is incomplete | High | Fabric.js, Paper.js, Two.js |
| No PDF export | Cannot produce print-oriented vector output directly | Medium | Paper.js |
| No first-class arc path editing command | Imported arcs are normalized, but Elise still lacks native persisted arc editing semantics | Medium | All competitors |
| No dash pattern | Cannot draw dashed/dotted lines | Low | All competitors |

### 5.2 Important Gaps (Limit functionality)

| Gap | Impact | Difficulty |
|-----|--------|------------|
| No rounded rectangles | Common UI element missing | Low |
| No line cap/join styles | Stroke rendering lacks polish | Low |
| No shadow/drop shadow | Missing common visual effect | Low |
| No blend modes | Cannot achieve overlay/multiply effects | Low |
| No z-order controls (bring to front/back) | Design surface limited | Low |
| Keyboard shortcut coverage is still partial | Design mode now supports undo/redo, select-all, delete, and nudge shortcuts, but broader editing shortcuts are still missing | Medium |
| No HSL/HSV color model | Limits color manipulation use cases | Low |
| No element visibility flag | Hidden-but-retained elements require removal or custom handling | Low |
| No event bubbling | Events don't propagate up model hierarchy | Medium |
| Hardcoded 200ms transition duration | Cannot customize animation timing | Low |
| No first-class persisted quadratic Bézier command | Quadratic segments import/export, but normalize to cubic segments internally | Low |

### 5.3 Nice-to-Have Gaps (Would enhance competitive position)

| Gap | Impact | Difficulty |
|-----|--------|------------|
| No WebGL renderer | Performance ceiling for complex scenes | High |
| No accessibility (ARIA) | Not usable for accessible applications | Medium |
| No filters (blur, brightness, etc.) | Cannot apply Canvas filter effects | Medium |
| No mask support | Cannot apply luminance/alpha masking effects from SVG or runtime composition | Medium |
| No boolean path operations | Cannot union/intersect/subtract paths | High |
| No text decoration (underline, etc.) | Text styling limited | Low |
| No letter/line spacing control | Typography limited | Low |
| No text on path | Missing creative text capability | Medium |
| No schema versioning | forward/backward compat risk | Low |
| No copy/paste in design mode | Missing standard editing feature | Medium |
| No alignment/distribute tools | Design surface less capable | Medium |

---

## 6. Prioritized Recommendations

### Tier 1: High Impact, Achievable — Do First

#### R1. Add Property Tweening / Animation System
**Status:** Completed

Elise now ships a property tweening API through `ElementBase.animate(...)`, `ElementBase.cancelAnimations(...)`, `ElementAnimator`, `ElementTween`, and `AnimationEasing`.

```typescript
element.animate(
  {
    x: 200,
    y: 100,
    opacity: 0.5,
    fill: '#FF0000'
  },
  {
    duration: 1000,
    easing: 'easeInOutCubic',
    onComplete: () => {
      element.animate({ x: 80, y: 80, opacity: 1, fill: '#6F8FB8' }, { duration: 700 });
    }
  }
);
```

**Delivered scope:** New `animation/` module, built-in easing catalog, controller-driven redraw during tweens, color interpolation for fill and stroke, support for bounds, center, radius, endpoint, fill transform, opacity, rotation, and text property animation, element-level opacity support, and a complete example in `examples/animation-system-showcase.*`.

**Follow-on work:** A higher-level timeline or keyframe composition API is still optional future work, but the core competitor gap is closed.

#### R2. Add Touch Event Support
**Status:** Completed

Elise now supports `touchstart`, `touchmove`, `touchend`, and `touchcancel` in both `ViewController` and `DesignController`.

**Delivered scope:** Single-touch input is mapped into the existing mouse interaction path so existing hit-testing, hover, click, drag, selection, and tool flows continue to work without duplicate controller logic. `DesignController` also supports two-finger pinch zoom and pans the nearest scroll container during two-finger gestures.

**Notes:** This closes the core mobile/tablet usability gap. Future work can refine gesture ergonomics further, but the base touch feature set is now present.

#### R3. Add PNG/Canvas Export
**Status:** Completed

Elise now supports model-level raster export through `Model.toCanvas(...)`, `Model.toDataURL(...)`, `Model.toBlob(...)`, `Model.toBlobAsync(...)`, and `Model.downloadAs(...)`, along with MIME-specific convenience helpers for PNG, JPEG, and WebP.

```typescript
const canvas = model.toCanvas(2);                 // detached export canvas at 2x scale
const pngUrl = model.toDataURL('image/png');      // returns base64 string
model.toBlob(blob => save(blob), 'image/png');    // returns Blob via callback
const jpegBlob = await model.toJPEGBlobAsync(0.9, 2);
const webpUrl = model.toWebPDataURL(0.85, 2);
model.downloadAs('output.png');                   // triggers browser download
```

**Delivered scope:** Model-scoped export methods render into a detached offscreen canvas so export works without an attached controller or live design/view canvas. Export supports optional render scaling, callback-based and Promise-based Blob generation, direct browser download initiation, and MIME-specific helpers for the most common raster formats.

**Format notes:** PNG is the default lossless export path. JPEG and WebP helper APIs accept an optional quality value from `0.0` to `1.0`; browser support for WebP encoding still depends on the runtime canvas implementation.

**Surface export:** `Surface` now mirrors the export API for composed surface capture, rasterizing the base model plus supported layered media (`SurfaceImageLayer`, `SurfaceVideoLayer`, `SurfaceAnimationLayer`). DOM-only layers such as hidden overlays and HTML iframes are intentionally skipped during export.

#### R4. Expand Path Commands (SVG Compatibility)
**Status:** Completed

**Why:** Prerequisite for SVG import/export. Enables standard SVG path strings.

Elise now supports `PathElement.fromSVGPath(d)` for standard SVG path strings, including `q`, `a`, `s`, `t`, `h`, `v` and uppercase absolute variants, normalizing them into Elise's existing editable internal command set based on explicit line and cubic segments.

**Delivered scope:** Elise uses a normalized internal model rather than storing SVG commands as first-class persisted path commands. Horizontal/vertical segments are converted to line commands, quadratic and shorthand curve commands are converted to explicit cubic segments, and arc commands are approximated as one or more cubic segments. This preserves the current point-editing architecture in `DesignController`, `HandleFactory`, and `DesignRenderer` while unlocking SVG-compatible import.

**Tradeoff:** This choice favors lower implementation risk and stable design-surface editing over exact SVG path round-trip fidelity. If exact preservation of original SVG path command structure becomes a requirement later, Elise can revisit a native SVG command model after import/export support is established.

#### R5. Add Dash Pattern and Line Cap/Join
**Why:** Standard stroke features, trivially maps to `ctx.setLineDash()`, `ctx.lineCap`, `ctx.lineJoin`.

```typescript
// Proposed additions to StrokeInfo or ElementBase
element.setStrokeDash([5, 3]);           // 5px dash, 3px gap
element.setLineCap('round');             // 'butt' | 'round' | 'square'
element.setLineJoin('round');            // 'miter' | 'round' | 'bevel'
```

**Scope:** ~100 lines across `ElementBase`, `StrokeInfo`, and renderer.

### Tier 2: Strategic — Build Competitive Advantage

#### R6. SVG Export
**Status:** Partially Completed

**Why:** Enables sharing, printing, and integration with design ecosystems.

**Delivered so far:** `svg/svg-exporter.ts` now exports the base `Model`, `PathElement`, `RectangleElement`, `EllipseElement`, `LineElement`, `PolygonElement`, `PolylineElement`, `TextElement`, `ImageElement`, and `ModelElement`. It handles gradients via `<defs>`, emits valid SVG matrix transforms, preserves simpler normalized path commands where possible (`L`, `H`, `V`, `Z`), and falls back to `C` for explicit curve segments.

**Remaining scope:** Full element/resource coverage is still incomplete, particularly for broader runtime-specific elements and richer SVG features such as patterns, masks, and other advanced export scenarios. Medium complexity (~800-1200 lines total for fuller support).

#### R7. SVG Import
**Status:** Partially Completed

**Why:** Enables loading SVG files, icons, and designs from external tools.

**Delivered so far:** `svg/svg-importer.ts` now imports `path`, `rect`, `ellipse`, `circle`, `line`, `polygon`, `polyline`, `text`, and `image`, with recursive group traversal plus basic inherited style, opacity, `viewBox`, transform handling, gradients from `<defs>`, and clip-path references backed by supported `<clipPath>` geometry.

**Remaining scope:** Broader SVG feature coverage is still needed for defs/use references, patterns, masks, richer text semantics, grouping preservation, and less common element types. High complexity (~1500-2000 lines total for fuller support).

#### R8. Undo/Redo System
**Status:** Completed

**Why:** Design surface production readiness depended on reversible editing operations and visible history availability.

```typescript
designController.undo();
designController.redo();
designController.canUndo;  // boolean
designController.canRedo;  // boolean
designController.undoChanged;  // event
```

**Delivered scope:** Elise now ships a reusable `UndoManager` in `command/undo-manager.ts` plus `DesignController.undo()` / `redo()` integration with `canUndo`, `canRedo`, and `undoChanged` state reporting. Snapshot restoration covers model content, selection state, and dirty tracking so add/remove, nudge, tool-created edits, and other committed design operations can be reversed and replayed consistently.

**Keyboard integration:** Design mode now routes `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, and `Ctrl/Cmd+Y` into the undo stack, alongside existing selection and nudge shortcuts.

**Validation:** Automated tests cover undo/redo of element creation, movement, tool-committed edits, and keyboard shortcut routing.

**Follow-on work:** A labeled history panel or transaction grouping system is still optional future work, but the core undo/redo blocker is closed.

#### R9. Add Element Visibility

**Status:** Partially Completed

**Why:** Element opacity now exists and affects both fill and stroke consistently. The remaining gap is a first-class `visible` boolean for temporarily hiding elements without removing them from the model.

```typescript
element.setVisible(false);  // skip rendering and hit testing
```

**Delivered scope:** `ElementBase` now supports `opacity`, and the tweening/export work already uses that property directly instead of string-encoded fill hacks.

**Remaining scope:** ~30-50 lines to add a `visible` property to `ElementBase` and honor it during rendering and hit testing.

#### R10. Add Rounded Rectangle Support
**Why:** Extremely common UI element. Canvas API now supports `roundRect()` natively.

```typescript
RectangleElement.create(0, 0, 100, 50).setCornerRadius(8);
// Or: RectangleElement.create(0, 0, 100, 50).setCornerRadii(8, 4, 8, 4);
```

**Scope:** ~30 lines added to `RectangleElement`.

### Tier 3: Enhancement — Polish & Differentiation

#### R11. Shadow/Drop Shadow Support
```typescript
element.setShadow({ color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 4, offsetY: 4 });
```
Maps directly to `ctx.shadowColor`, `ctx.shadowBlur`, `ctx.shadowOffsetX/Y`.

#### R12. Z-Order Controls in Design Mode
```typescript
designController.bringToFront(element);
designController.sendToBack(element);
designController.bringForward(element);
designController.sendBackward(element);
```

#### R13. HSL Color Support
```typescript
Color.fromHSL(240, 100, 50);  // returns Color
color.toHSL();                  // returns { h, s, l }
Color.lerp(colorA, colorB, t); // interpolation
```

#### R14. Blend Modes
```typescript
element.setBlendMode('multiply');  // maps to ctx.globalCompositeOperation
```
Canvas 2D supports 26 composite operations natively.

#### R15. Configurable Transition Duration
Remove the hardcoded 200ms transition duration. Allow per-transition and per-pane-transition duration configuration.

#### R16. Event Bubbling
Implement parent-aware event propagation so that `ModelElement` containers can catch events from their children.

#### R17. Keyboard Support for Design Surface
Add keyboard handlers for Delete (remove element), Ctrl+A (select all), arrow keys (nudge), Shift+resize (aspect lock toggle), Escape (deselect).

#### R18. Accessibility Layer
Add an invisible DOM overlay synchronized with canvas elements, providing ARIA roles, labels, and keyboard navigation for screen readers.

---

## Appendix: Competitor Reference

### Fabric.js (v6.x)
- **Focus:** Interactive canvas with rich object model
- **Strengths:** SVG import/export, rich text, extensive object types, clipboard, serialization
- **Weaknesses:** Canvas-only rendering, no application framework, heavy bundle
- **NPM:** ~350K weekly downloads

### Konva.js (v9.x)
- **Focus:** High-performance 2D canvas framework
- **Strengths:** Stage/layer architecture, built-in tweening, transformer tool, filters, touch support
- **Weaknesses:** No SVG support, limited path system, no design tools
- **NPM:** ~280K weekly downloads

### Paper.js (v0.12.x)
- **Focus:** Vector graphics scripting framework
- **Strengths:** Full SVG import/export, boolean path operations, path manipulation, PDF export
- **Weaknesses:** No built-in interactivity framework, older API style, no sprites
- **NPM:** ~55K weekly downloads

### Two.js (v0.8.x)
- **Focus:** Renderer-agnostic 2D drawing
- **Strengths:** SVG/Canvas/WebGL renderers, scene graph, property animation
- **Weaknesses:** Limited interactivity, no design surface, smaller community
- **NPM:** ~12K weekly downloads

### PixiJS (v8.x)
- **Focus:** High-performance WebGL 2D renderer
- **Strengths:** Blazing WebGL performance, sprite system, filters, large ecosystem
- **Weaknesses:** Not a vector graphics library, no SVG, no design tools
- **NPM:** ~180K weekly downloads

### Where Elise Fits

Elise occupies a **unique niche** that no single competitor fills: a retained-mode graphics library with a **built-in design surface**, **application framework** (Surface/Pane system with video/HTML integration), and **sprite animation with transitions**. The closest competitor combining editing + rendering is Fabric.js, but Fabric lacks Elise's Surface system, component registry, and transition effects.

Elise's primary competitive weakness is now **ecosystem isolation** around interchange and export rather than runtime interactivity. SVG import/export remains the largest missing capability for many common use cases despite Elise's unique strengths in design-time editing, surfaces, animation, and touch support.

The recommended path forward is:
1. **Close critical gaps** (Tier 1) to make Elise viable for common use cases
2. **Add SVG interop** (Tier 2) to break ecosystem isolation
3. **Polish and differentiate** (Tier 3) to leverage unique strengths

This strategy preserves Elise's architectural advantages while making it competitive on the features developers expect as baseline.
