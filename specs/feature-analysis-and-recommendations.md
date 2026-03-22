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
- **Zero SVG support** — no import, export, or rendering
- No property-level keyframe animation or tweening
- No WebGL renderer or GPU acceleration path
- Limited path commands (no arcs, no quadratic Bézier)
- No blend modes, filters, or post-processing effects
- No accessibility features
- No built-in undo/redo system
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
| Path (quadratic Bézier) | ❌ | ✅ | ❌ | ✅ | ✅ |
| Path (arc) | ❌ | ✅ | ✅ | ✅ | ✅ |
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

**Analysis:** Elise covers the essential primitives well. The main gaps are **rounded rectangles**, **arc path commands**, **quadratic Bézier**, and **convenience shapes** (star, wedge, ring). Fabric.js leads in primitive variety.

### 3.3 Path System

| Feature | **Elise** | **Fabric.js** | **Paper.js** | **Two.js** |
|---------|-----------|---------------|--------------|------------|
| Move to (`M`) | ✅ | ✅ | ✅ | ✅ |
| Line to (`L`) | ✅ | ✅ | ✅ | ✅ |
| Cubic Bézier (`C`) | ✅ | ✅ | ✅ | ✅ |
| Quadratic Bézier (`Q`) | ❌ | ✅ | ✅ | ✅ |
| Arc (`A`) | ❌ | ✅ | ✅ | ✅ |
| Smooth cubic (`S`) | ❌ | ✅ | ✅ | ❌ |
| Smooth quadratic (`T`) | ❌ | ✅ | ✅ | ❌ |
| Horizontal line (`H`) | ❌ | ✅ | ✅ | ❌ |
| Vertical line (`V`) | ❌ | ✅ | ✅ | ❌ |
| Close (`Z`) | ✅ | ✅ | ✅ | ✅ |
| SVG path string parsing | ❌ | ✅ | ✅ | ✅ |
| Boolean operations (union/intersect) | ❌ | ❌ | ✅ | ❌ |
| Path simplification | ❌ | ✅ | ✅ | ❌ |
| Path offsetting | ❌ | ❌ | ✅ | ❌ |
| Winding rules | ✅ | ✅ | ✅ | ✅ |

**Analysis:** This is a significant gap. Elise supports only the 4 most basic path commands (`m`, `l`, `c`, `z`). Missing SVG-compatible arc/quadratic/smooth commands blocks SVG import/export and limits path expressiveness. Paper.js is the clear leader with full Boolean path operations.

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
| Property tweening | ❌ | ✅ | ✅ (Tween) | ✅ | ✅ |
| Keyframe animation | ❌ | ❌ | ❌ | ❌ | ❌ |
| Motion paths | ❌ | ❌ | ❌ | ❌ | ❌ |
| Easing functions | ✅ (13) | ✅ (31) | ✅ (31) | ❌ | ❌ |
| Pane transitions | ✅ (6 types) | ❌ | ❌ | ❌ | ❌ |
| Sketch animation | ✅ | ❌ | ❌ | ❌ | ❌ |
| Timer events | ✅ | ❌ | ❌ | ✅ | ✅ |
| RAF loop | ✅ | ✅ | ✅ | ✅ | ✅ |
| Custom animation duration | ❌ (hardcoded 200ms) | ✅ | ✅ | N/A | ✅ |

**Analysis:** Elise has the **strongest sprite/transition animation system** of any library in this class — 40+ frame transitions with easing are unmatched. However, it completely lacks **property tweening** (animating position, opacity, color over time), which is table-stakes for all competitors. The hardcoded 200ms transition duration is a significant limitation.

### 3.8 Interactivity & Events

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
|---------|-----------|---------------|--------------|--------------|
| Click | ✅ | ✅ | ✅ | ✅ |
| Mouse down/up | ✅ | ✅ | ✅ | ✅ |
| Mouse enter/leave | ✅ | ✅ | ✅ | ✅ |
| Mouse move (element) | ✅ | ✅ | ✅ | ✅ |
| Drag & drop | ✅ | ✅ | ✅ | ❌ |
| Touch events | ❌ | ✅ | ✅ | ✅ |
| Multi-touch/pinch | ❌ | ✅ | ✅ | ❌ |
| Keyboard events | ❌ | ✅ | ✅ | ✅ |
| Cursor management | ✅ (design) | ✅ | ✅ | ✅ |
| Hit regions | ✅ | ✅ | ✅ | ✅ |
| Custom hit areas | ❌ | ❌ | ✅ | ❌ |
| Event bubbling | ❌ | ✅ | ✅ | ✅ |
| Command dispatch | ✅ | ❌ | ❌ | ❌ |
| File drop | ✅ (design) | ❌ | ❌ | ❌ |

**Analysis:** Elise has solid mouse interaction but is **missing touch support entirely**, which is critical for mobile/tablet. No keyboard events and no event bubbling through the model hierarchy are also notable gaps. The command dispatch pattern is unique and powerful for building interactive applications.

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
| Undo/redo | ❌ | ❌ | ❌ | ❌ |
| Copy/paste | ❌ | ✅ | ❌ | ❌ |
| Alignment/distribute | ❌ | ❌ | ❌ | ❌ |
| Z-order controls | ❌ | ✅ | ✅ | ❌ |

**Analysis:** Elise has the **most comprehensive built-in design surface** of any library in this comparison. The combination of 9 creation tools, component registry, rubber-band selection, grid snapping, and dirty tracking is unmatched. However, **undo/redo** and **z-order controls** (bring to front/send to back) are critical missing features.

### 3.10 Serialization & Persistence

| Feature | **Elise** | **Fabric.js** | **Konva.js** | **Paper.js** |
|---------|-----------|---------------|--------------|--------------|
| JSON serialize | ✅ | ✅ | ✅ | ✅ |
| JSON deserialize | ✅ | ✅ | ✅ | ✅ |
| Load from URL | ✅ | ✅ | ❌ | ❌ |
| SVG export | ❌ | ✅ | ❌ | ✅ |
| SVG import | ❌ | ✅ | ❌ | ✅ |
| PNG export | ❌ | ✅ | ✅ | ✅ |
| PDF export | ❌ | ❌ | ❌ | ✅ |
| Schema versioning | ❌ | ❌ | ❌ | ❌ |
| Resource embedding | ✅ (refs) | ✅ (data URIs) | ❌ | ❌ |
| Localization-aware | ✅ | ❌ | ❌ | ❌ |
| Pretty/compact modes | ✅ | ✅ | ❌ | ❌ |

**Analysis:** Elise's JSON serialization is solid with unique localization-aware resource management. The biggest gap is **no export to SVG/PNG/PDF**, which limits practical utility for design tools, print workflows, and sharing.

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

### Current State: No SVG Support

Elise has **zero SVG capability** in any form:

- ❌ No SVG rendering backend (canvas-only)
- ❌ No SVG import (cannot parse SVG documents)
- ❌ No SVG export (cannot generate SVG output)
- ❌ No SVG path command compatibility (missing `Q`, `A`, `S`, `T`, `H`, `V`)
- ❌ No SVG-compatible transform syntax

### Why SVG Support Matters

1. **Interoperability** — SVG is the universal vector exchange format. Design tools (Figma, Illustrator, Inkscape) export SVG. Icon libraries ship SVG. Without SVG import/export, Elise exists in an isolated ecosystem.

2. **Resolution independence** — While Elise's canvas renderer scales well, SVG enables crisp rendering at any zoom and is natively supported by browsers without JavaScript.

3. **Accessibility** — SVG supports ARIA attributes, `<title>`, `<desc>`, and keyboard focus. Canvas is opaque to screen readers.

4. **SEO & Print** — SVG is indexable by search engines and renders cleanly in print.

5. **Developer expectations** — Developers expect path strings to follow SVG syntax. Elise's custom `m`, `l`, `c`, `z` format, while conceptually similar, is non-standard and requires learning.

### SVG Support Roadmap (Recommended)

**Phase 1 — Path Command Parity**
- Add quadratic Bézier (`q`/`Q`) command
- Add arc (`a`/`A`) command
- Add shorthand commands (`s`/`S`, `t`/`T`, `h`/`H`, `v`/`V`)
- Support both relative (lowercase) and absolute (uppercase) commands
- Parse standard SVG path `d` attribute strings

**Phase 2 — SVG Export**
- Implement `model.toSVG()` method
- Map each element type to SVG equivalent:
  - `RectangleElement` → `<rect>`
  - `EllipseElement` → `<ellipse>`
  - `LineElement` → `<line>`
  - `PathElement` → `<path>`
  - `PolygonElement` → `<polygon>`
  - `PolylineElement` → `<polyline>`
  - `TextElement` → `<text>`
  - `ImageElement` → `<image>` (with base64 or URL)
- Map fills/strokes to SVG `fill`/`stroke`/`<linearGradient>`/`<radialGradient>`
- Map transforms to SVG `transform` attribute

**Phase 3 — SVG Import**
- Parse SVG DOM with `DOMParser`
- Map SVG elements to Elise equivalents
- Handle SVG-specific features (viewBox, preserveAspectRatio, use/defs)
- Provide graceful degradation for unsupported SVG features

**Phase 4 — SVG Rendering Backend (Optional)**
- Alternative renderer that outputs to SVG DOM instead of Canvas
- Would enable SVG advantages (accessibility, print) with Elise's retained-mode API

---

## 5. Detailed Gap Analysis

### 5.1 Critical Gaps (Block common use cases)

| Gap | Impact | Difficulty | Competitors with feature |
|-----|--------|------------|--------------------------|
| No SVG import/export | Blocks integration with design tools and icon libraries | High | Fabric.js, Paper.js, Two.js |
| No property tweening | Cannot animate position, color, opacity over time — the #1 animation use case | Medium | Fabric.js, Konva.js, Paper.js, Two.js |
| No touch events | Library unusable on mobile/tablet | Medium | Fabric.js, Konva.js, Paper.js |
| No undo/redo | Design surface unusable for production | Medium | (few have built-in, but expected) |
| No PNG/image export | Cannot save render output | Low | Fabric.js, Konva.js, Paper.js |
| No arc path command | Cannot represent circles/arcs in paths | Medium | All competitors |
| No dash pattern | Cannot draw dashed/dotted lines | Low | All competitors |

### 5.2 Important Gaps (Limit functionality)

| Gap | Impact | Difficulty |
|-----|--------|------------|
| No rounded rectangles | Common UI element missing | Low |
| No line cap/join styles | Stroke rendering lacks polish | Low |
| No shadow/drop shadow | Missing common visual effect | Low |
| No blend modes | Cannot achieve overlay/multiply effects | Low |
| No z-order controls (bring to front/back) | Design surface limited | Low |
| No keyboard shortcuts in design mode | Slower editing workflow | Medium |
| No HSL/HSV color model | Limits color manipulation use cases | Low |
| No element-level opacity | Must use fill string hack (`"0.5;red"`) | Low |
| No event bubbling | Events don't propagate up model hierarchy | Medium |
| Hardcoded 200ms transition duration | Cannot customize animation timing | Low |
| No quadratic Bézier | Path expressiveness limited | Low |

### 5.3 Nice-to-Have Gaps (Would enhance competitive position)

| Gap | Impact | Difficulty |
|-----|--------|------------|
| No WebGL renderer | Performance ceiling for complex scenes | High |
| No accessibility (ARIA) | Not usable for accessible applications | Medium |
| No filters (blur, brightness, etc.) | Cannot apply Canvas filter effects | Medium |
| No clipping masks | Cannot clip elements to shapes | Medium |
| No boolean path operations | Cannot union/intersect/subtract paths | High |
| No text decoration (underline, etc.) | Text styling limited | Low |
| No letter/line spacing control | Typography limited | Low |
| No text on path | Missing creative text capability | Medium |
| No color interpolation | Cannot lerp between colors | Low |
| No schema versioning | forward/backward compat risk | Low |
| No copy/paste in design mode | Missing standard editing feature | Medium |
| No alignment/distribute tools | Design surface less capable | Medium |

---

## 6. Prioritized Recommendations

### Tier 1: High Impact, Achievable — Do First

#### R1. Add Property Tweening / Animation System
**Why:** Every competitor offers this. Without it, dynamic apps require manual requestAnimationFrame loops.

```typescript
// Proposed API
element.animate({
    x: 200, y: 100, opacity: 0.5, fill: '#FF0000'
}, {
    duration: 1000,
    easing: 'easeInOutCubic',
    onComplete: () => { /* done */ }
});

// Or timeline-based
const timeline = elise.Timeline.create();
timeline.add(rect, { x: 200 }, { duration: 500, delay: 0 });
timeline.add(circle, { opacity: 0 }, { duration: 300, delay: 200 });
timeline.play();
```

**Scope:** New `animation/` module. ~500-800 lines. Leverage existing easing functions and timer system.

#### R2. Add Touch Event Support
**Why:** Mobile/tablet is non-negotiable. Touch event mapping is straightforward since the hit-testing infrastructure exists.

**Scope:** Extend `ViewController` and `DesignController` to handle `touchstart`, `touchmove`, `touchend`, `touchcancel`. Map single-touch to mouse equivalents. Add pinch-to-zoom and two-finger pan for `DesignController`.

#### R3. Add PNG/Canvas Export
**Why:** Quick win — `canvas.toDataURL()` and `canvas.toBlob()` are trivial to implement and immediately useful.

```typescript
// Proposed API
model.toDataURL('image/png');           // returns base64 string
model.toBlob('image/png', callback);    // returns Blob
model.downloadAs('output.png');         // triggers browser download
```

**Scope:** ~50 lines in `Model` or new `export/` module.

#### R4. Expand Path Commands (SVG Compatibility)
**Why:** Prerequisite for SVG import/export. Enables standard SVG path strings.

**Scope:** Extend `PathElement` command parser to support `q`, `a`, `s`, `t`, `h`, `v` (and uppercase absolute variants). Add `PathElement.fromSVGPath(d)` static method.

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
**Why:** Enables sharing, printing, and integration with design ecosystems.

**Scope:** New `svg/svg-exporter.ts` module. Map each element type to SVG equivalent. Handle gradients via `<defs>`. Medium complexity (~800-1200 lines).

#### R7. SVG Import
**Why:** Enables loading SVG files, icons, and designs from external tools.

**Scope:** New `svg/svg-importer.ts` module. Parse SVG DOM, map elements to Elise types. Handle viewBox, transforms, styles. High complexity (~1500-2000 lines).

#### R8. Undo/Redo System
**Why:** Design surface is incomplete without it. Standard command pattern.

```typescript
// Proposed API
designController.undo();
designController.redo();
designController.canUndo;  // boolean
designController.canRedo;  // boolean
designController.undoChanged;  // event
```

**Scope:** New `command/undo-manager.ts`. Capture element state before/after operations. ~400-600 lines.

#### R9. Add Element-Level Opacity and Visibility

**Why:** Current opacity requires string-encoded fill modifier (`"0.5;red"`) — non-intuitive and doesn't affect stroke. A proper `opacity` property and `visible` boolean are expected.

```typescript
element.setOpacity(0.5);    // 0.0 to 1.0
element.setVisible(false);  // skip rendering and hit testing
```

**Scope:** ~50 lines. Add properties to `ElementBase`, apply `globalAlpha` in draw methods.

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

Elise's primary competitive weakness is **ecosystem isolation** — the lack of SVG import/export, property animation, and touch support means that for many common use cases, developers will choose a more mature alternative despite Elise's unique strengths.

The recommended path forward is:
1. **Close critical gaps** (Tier 1) to make Elise viable for common use cases
2. **Add SVG interop** (Tier 2) to break ecosystem isolation
3. **Polish and differentiate** (Tier 3) to leverage unique strengths

This strategy preserves Elise's architectural advantages while making it competitive on the features developers expect as baseline.
