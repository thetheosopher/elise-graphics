# Elise Graphics

A retained-mode 2D graphics library for the web for building interactive scenes, visual tooling, and canvas or SVG experiences from one model.

[![npm version](https://img.shields.io/npm/v/elise-graphics.svg)](https://www.npmjs.com/package/elise-graphics)
[![License: MIT](https://img.shields.io/badge/License-MIT-1f6feb.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-online-0a7ea4.svg)](https://elise.schematrix.com/#/docs)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=000000)](https://buymeacoffee.com/theosopher)

[Website](https://elise.schematrix.com) • [Docs](https://elise.schematrix.com/#/docs) • [npm](https://www.npmjs.com/package/elise-graphics) • [Buy Me a Coffee](https://buymeacoffee.com/theosopher)

Elise combines a retained scene graph, a browser-based design surface, dual canvas and SVG renderers, animation APIs, shared resources, and SVG interoperability in a single library. It is designed for everything from low-level vector composition to full interactive surfaces for kiosks, signage, and presentation-style applications.

## Why Elise

* Retained scene graph architecture instead of manual immediate-mode redraw code.
* One model can render to canvas for runtime performance or SVG for inspection and export.
* Built-in design tooling for selection, transforms, snapping, clipboard, undo/redo, and inline text editing.
* Nested models and reusable resources for scalable composition.
* Application surface APIs for layered HTML, image, video, and animated experiences.

## Feature Overview

| Area | Highlights |
| --- | --- |
| Drawing | Lines, rectangles, ellipses, polygons, paths, images, text, text-on-path, sprites, and nested models |
| Styling | Solid colors, gradients, image/model fills, transforms, opacity, and reusable resources |
| Runtime | Canvas and SVG view controllers, event bubbling, keyboard focus routing, and touch interaction |
| Authoring | Design surface editing, grid snapping, alignment aids, clipboard, undo/redo, and rich-text editing |
| Animation | Property tweens, easing functions, sprite and image transitions, and progressive drawing with Sketcher |
| Interop | SVG import/export with preserved hierarchy, `<symbol>` / `<use>` support, gradients, and clip-path handling |
| App surfaces | Layered panes, transitions, and mixed media workflows for interactive presentations and signage |

## Installation

Install the package from npm:

```bash
npm install elise-graphics
```

Elise ships as:

* a CommonJS package with TypeScript definitions
* an ES module build exposed through the package `exports`
* bundled UMD scripts in `_bundles/` for direct browser use

## Getting Started

### ES modules

```javascript
import * as elise from 'elise-graphics';
```

### CommonJS

```javascript
const elise = require('elise-graphics');
```

### Browser bundle

The bundled UMD files are available after installation:

* `elise-graphics.js` - expanded bundle with documentation comments
* `elise-graphics.min.js` - minified bundle

If you expose `node_modules/elise-graphics` through a static route, you can load Elise directly in the browser:

```javascript
app.use('/elise', express.static(`${__dirname}/node_modules/elise-graphics`));
```

```html
<div id="elise-host"></div>
<script src="elise/_bundles/elise-graphics.js"></script>
```

## Quick Start

Given a host element with an id of `elise-host`, create a model, add elements, and render it:

```javascript
const host = document.getElementById('elise-host');
const model = elise.model(240, 160).setFill('#0f172a');

const ellipse = elise.EllipseElement.create(120, 80, 84, 52)
    .setFill('#ef4444')
    .setStroke('#ffffff,2');

model.add(ellipse);
elise.view(host, model);
```

To render the same retained model as SVG, swap `elise.view(...)` for `elise.svgView(...)`.

![Blue model with red ellipse](images/blue_model_red_ellipse.png)

## Property Tween Animation

Elise includes a property tweening API for animating element bounds, centers, radii, endpoints, fill transforms, opacity, rotation, type size, fill color, and stroke color without writing a manual `requestAnimationFrame` loop.

```javascript
    var rect = elise.rectangle(40, 40, 120, 72)
        .setFill('#6f8fb8')
        .setStroke('#8caad0');

    model.add(rect);

    rect.animate({
        x: 96,
        y: 84,
        width: 180,
        opacity: 0.65,
        fill: '#d4875d'
    }, {
        duration: 900,
        easing: 'easeInOutCubic',
        onComplete: function () {
            rect.animate({
                x: 40,
                y: 40,
                width: 120,
                opacity: 1,
                fill: '#6f8fb8'
            }, {
                duration: 700,
                easing: 'easeInOutQuart'
            });
        }
    });
```

### Animation API

* `element.animate(targets, options)` starts a tween and returns an `ElementTween` instance.
* `element.cancelAnimations()` stops all active tweens for the element.
* `element.cancelAnimations(['x', 'opacity'])` stops only the listed properties.
* `AnimationEasing` exposes 31 built-in easing functions covering linear, quad/cubic/quart/quint, sine/expo/circ, and back/elastic/bounce families, plus the lookup helper.

Supported tween targets include:

* `x`, `y`, `width`, `height`
* `centerX`, `centerY`, `radiusX`, `radiusY`
* `x1`, `y1`, `x2`, `y2`
* `fillScale`, `fillOffsetX`, `fillOffsetY`
* `rotation`, `opacity`, `typesize`, `startOffset`
* `fill`, `stroke`

When a new tween starts on a property that is already animating on the same element, Elise cancels the older tween for that property and keeps the newer one. This makes replay and interruption predictable for interactive scenes.

See `examples/animation-system-showcase.html` and `examples/animation-system-showcase.js` for a complete browser example.

## Touch Interaction

Elise now routes single-touch input through the same interaction path as mouse input in both `ViewController` and `DesignController`, so existing click, drag, selection, and tool workflows work on touch devices without separate event wiring.

For design surfaces, two-finger gestures are also supported:

* Pinch to zoom the design canvas.
* Two-finger pan the nearest scroll container around the design surface.

Touch listeners are registered with `touchAction = 'none'` so the canvas can capture gesture intent directly instead of competing with browser scrolling.

## SVG Import and Export

Elise supports importing SVG content into a model and exporting models back to SVG markup.

### SVG Import

```javascript
var model = elise.Model.create(400, 300);
elise.SVGImporter.import(svgString, model);
```

The importer handles `<path>`, `<rect>`, `<ellipse>`, `<circle>`, `<line>`, `<polygon>`, `<polyline>`, `<text>`, `<image>`, `<g>`, `<symbol>`, and `<use>` elements. Container elements (`<g>`, nested `<svg>`, `<symbol>`) are preserved as nested `ModelElement` hierarchies rather than flattened, and `<use>` references are resolved against named elements. Inherited styles, gradients, clip paths, and transforms are imported.

### SVG Export

```javascript
var svgMarkup = model.toSVG();
```

All major element types export to their SVG equivalents. Reusable model-resource-backed elements export as `<symbol>` + `<use>` pairs, and embedded source models export as nested `<g>` groups.

Text-on-path content round-trips through SVG `<textPath>` markup, including guide-path references stored in `<defs>`, optional rendered guide paths, rich text `<tspan>` runs, `startOffset`, and `side="right"` placement.

## Text on Path

Elise exposes text-on-path as a dedicated `TextPathElement` rather than overloading `TextElement`. This keeps rectangular text layout and path-following text as separate element types with their own serialization, SVG, animation, and design-surface workflows.

```javascript
var banner = elise.TextPathElement.create('Curved label', 'M 20 80 C 80 10 160 10 220 80')
    .setTypeface('Georgia')
    .setTypesize(18)
    .setAlignment('center')
    .setStartOffset(50)
    .setStartOffsetPercent(true)
    .setFill('#16324f')
    .setStroke('#4f6d8c,1.5');

model.add(banner);
```

The same API is available through the fluent helper exported at `elise.textPath(...)`.

### TextPathElement capabilities

* Plain text, text-resource-backed content, or `richText` runs
* Per-element typography via `typeface`, `typesize`, `typestyle`, `letterSpacing`, and `textDecoration`
* Path-following layout via `pathCommands`, `alignment`, `startOffset`, `startOffsetPercent`, and `side`
* Optional guide-path rendering through `showPath`
* SVG import/export through `<textPath>`
* Tween animation of `startOffset` and `typesize`

## Design Surface Text-on-Path Tool

The design surface now includes `TextPathTool` for drag-based creation of a text-on-path element. The tool creates a straight guide path from the mouse-down point to the mouse-up point, then leaves the resulting `TextPathElement` selectable and editable through the normal design-surface selection workflow.

```javascript
var editor = new elise.DesignController();
editor.setModel(model);

var tool = new elise.TextPathTool();
tool.text = 'Route label';
tool.typeface = 'Arial';
tool.typesize = 16;
tool.alignment = 'center';
tool.showPath = true;

editor.setActiveTool(tool);
```

When grid snapping is enabled on the design surface, `TextPathTool` receives snapped pointer coordinates through the standard tool pipeline, so guide-path endpoints align to the active grid automatically.

## Event Bubbling

Events propagate through the model hierarchy from the deepest nested element outward through `ModelElement` containers. The `ViewController` exposes `mouseOverPath` and `pressedPath` arrays that contain the ordered element ancestry from deepest child to outermost container. Mouse enter/leave, down/up, and click events are dispatched to every element in the path.

```javascript
controller.elementClicked.add(function(source, element) {
    // Fires for each element in the ancestry path, deepest first
    console.log('Clicked:', element.id);
});
```

Runtime keyboard routing uses the same retained-mode ancestry idea. On the canvas view controller, clicking an interactive element focuses its ancestry path for subsequent keyboard input. Both runtime view controllers also expose `setFocusedElement(...)` and `setFocusedPath(...)` so applications can manage focus explicitly.

## Runtime Keyboard Events

Both `ViewController` and `SVGViewController` expose `keyDown`, `keyUp`, and `keyPress` events at the controller level, plus `keyDownElement`, `keyUpElement`, and `keyPressElement` events that bubble through the currently focused element path.

```javascript
var hostDiv = document.getElementById('elise-host');
var model = elise.model(240, 140).setFill('#0f172a');

var panel = elise.rectangle(20, 20, 200, 100)
    .setFill('#1e293b')
    .setStroke('#7dd3fc,2')
    .setInteractive(true);
panel.id = 'panel';
model.add(panel);

var controller = elise.view(hostDiv, model);

controller.keyDown.add(function (_source, args) {
    console.log('View key down:', args.event.key);
});

controller.keyDownElement.add(function (_source, args) {
    console.log('Focused element key down:', args.element.id, args.event.key);
});

// Optional explicit focus if your app manages focus outside pointer input.
controller.setFocusedElement(panel);
```

The same event surface is available on the SVG runtime path:

```javascript
var svgController = elise.svgView(hostDiv, model);
svgController.setFocusedElement(panel);
svgController.keyPressElement.add(function (_source, args) {
    console.log('SVG focused element key press:', args.element.id, args.event.key);
});
```

## Rich Text Editing

The design surface supports inline text editing with rich formatting. Double-click or type into a selected text element to enter edit mode:

* Keyboard entry, backspace, delete, and enter for newline
* Arrow key caret navigation (left, right, up, down across visual lines)
* Shift+arrow for selection extension
* Home/End for line/text boundary navigation
* Double-click to select a word
* **Ctrl+B** for bold, **Ctrl+I** for italic, **Ctrl+U** for underline
* Escape to exit text edit mode

## Design Surface Grouping API

`DesignController` exposes programmatic grouping helpers for editor toolbars and menus. Grouping is available when multiple host-model elements are selected; it replaces them with a single `ModelElement` backed by an embedded model resource sized to the selected bounds. Ungrouping is available for selected model elements and replaces each model element with clones of its contained elements in host-model coordinates.

```javascript
const editor = elise.design(hostDiv, model);

groupButton.disabled = !editor.canGroupSelectedElements();
ungroupButton.disabled = !editor.canUngroupSelectedElements();

groupButton.onclick = () => editor.groupSelectedElements();
ungroupButton.onclick = () => editor.ungroupSelectedElements();
```

Available editor grouping methods:

* `canGroupSelectedElements()` returns true when the current selection can be grouped.
* `groupSelectedElements()` groups the current selection and selects the created model element.
* `canUngroupSelectedElements()` returns true when selected model elements can be decomposed.
* `ungroupSelectedElements()` ungroups selected model elements and selects the decomposed elements.

## Design Surface Clipboard API

The design surface now exposes programmatic clipboard helpers directly on `DesignController`, so toolbar and menu commands do not need to synthesize keyboard events.

```javascript
const editor = elise.design(hostDiv, model);

copyButton.onclick = () => editor.copySelectedToClipboard();
cutButton.onclick = () => editor.cutSelectedToClipboard();
pasteButton.onclick = () => void editor.pasteFromClipboard();

// Custom application clipboard store
const clipboardText = editor.exportSelectionClipboardText();
if (clipboardText) {
    appClipboard = clipboardText;
}

if (appClipboard) {
    editor.pasteClipboardData(appClipboard, 8, 8);
}
```

Available editor clipboard methods:

* `copySelectedToClipboard()` copies the current selection to the internal clipboard and, when available, `navigator.clipboard`.
* `cutSelectedToClipboard()` copies then removes the current selection.
* `pasteFromClipboard()` pastes from the system clipboard or Elise's internal clipboard buffer and applies the standard incremental paste offset.
* `exportSelectionClipboardData()` returns a structured clipboard payload for app-managed clipboard integrations.
* `exportSelectionClipboardText()` returns the serialized clipboard JSON string.
* `pasteClipboardData(data, offsetX?, offsetY?)` pastes a structured payload or serialized payload directly.

## Examples and Resources

* [Product website](https://elise.schematrix.com) for live showcases, demos, and toolchain entry points.
* [Online docs](https://elise.schematrix.com/#/docs) for API and feature reference.
* [Animation system showcase](examples/animation-system-showcase.html) for property tweens and easing curves.
* [Metaballs](examples/metaballs.html) for fluid motion and blended forms.
* [Aurora Borealis](examples/aurora-borealis.html) for layered runtime animation.
* [DNA Helix](examples/dna-helix.html) for transforms and grouped composition.
* [Lorenz Attractor](examples/lorenz-attractor.html) for real-time mathematical visualization.
* [Simple example project](https://github.com/thetheosopher/elise-simple-demo)
* [Browserify example project](https://github.com/thetheosopher/elise-browserify-demo)

## Core Elements and Concepts

Graphics primitives include:

* **Line** - Stroked line segment
* **Rectangle** - Stroked and filled rectangle
* **Ellipse** - Stroked and filled ellipse
* **Polyline** - Stroked, multiple segment line
* **Polygon** - Stroked and filled multiple line segment shape
* **Path** - Stroked and filled shaped defined by line and curve segments
* **Image** - Bitmap image
* **Text** - Stroked and filled text
* **TextPath** - Stroked and filled text rendered along a guide path
* **Sprite** - Bitmap image segment
* **Model** - Collection of composed elements

### Strokes

Stroked elements require a stroke property to define the color and width of the stroke used to render them. Strokes may be defined using
either one of the named colors or a hex style color and may optionally specify a width other than the default of one drawing unit.

### Fills

Fillable elements may be filled with:

* **Solid Color** - Solid color with optional alpha transparency
* **Gradient** - Gradual color swath with arbitrary number of color stops
  * **Linear Gradient** - Linear gradient
  * **Radial Gradient** - Radial gradient
* **Image** - Tiled bitmap fill with configurable fill scale and opacity.
* **Model** - Tiled fill of external or embedded drawing model with configurable fill scale and opacity.

### Transforms

Elements may have affine transforms assigned to alter their visual representation

* **Translate** - Translate (reposition) element
* **Scale** - Scale (resize) element
* **Rotate** - Rotate element
* **Skew** - Skew element horizontally or vertically
* **Matrix** - Combination of transforms specified in matrix form

### Colors

Colors are specified with a text string using one of the following forms:

* **Named Color** - One of the known named colors (e.g. Red, Blue, Yellow)
* **#rrggbb** - Six digit hexadecimal RGB form with # prefix
* **#aarrggbb** - Eight digit hexadecimal ARGB form with # prefix
* **rgb(r,g,b)** / **rgba(r,g,b,a)** - CSS RGB and RGBA forms supported anywhere fill or stroke colors are parsed

## Building and Packaging

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed. After cloning the repository, install dependencies:

```bash
npm install
```

### Commands

| Command | Description |
| ------- | ----------- |
| `npm run build` | Clean output directories, compile TypeScript to CommonJS (`lib/`) and ES module (`lib-esm/`) targets, and bundle UMD packages (`_bundles/`) with webpack. |
| `npm run clean` | Remove the `_bundles`, `lib`, and `lib-esm` output directories. |
| `npm test` | Run the Jest test suite. |
| `npm run lint` | Run ESLint against the `src/` directory. |
| `npm run format` | Format source files in `src/` with Prettier. |
| `npm run doc` | Generate API documentation with TypeDoc into the `docs/` directory. |

### Publishing

The `prepare` lifecycle script runs the full build automatically before `npm pack` or `npm publish`. The `prepublishOnly` script ensures linting passes before a publish is allowed.

```bash
npm version patch   # bump version, lint, format, commit, and tag
npm publish         # build, lint, and publish to npm
```

## Support the Project

If Elise helps you build something useful, you can support ongoing work here:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=000000)](https://buymeacoffee.com/theosopher)

## License

Elise Graphics is released under the MIT License. See [LICENSE](LICENSE) for the full text.

Copyright (c) 2019 Michael A. McCloskey
