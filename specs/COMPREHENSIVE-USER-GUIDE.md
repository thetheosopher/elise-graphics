# Elise Graphics Library Comprehensive User Guide

## Purpose

This guide is the practical companion to the existing API specification. It is written for product engineers, application developers, design-tool integrators, and website authors who need one document that explains what Elise is, how the library is organized, how to use each primitive, how the runtime and design controllers work, and how to position Elise on a public-facing website.

Use this document for:

- onboarding to the library
- selecting the right feature family for a task
- understanding the supported primitive types and their options
- building interactive runtime scenes with canvas or SVG targets
- embedding the design controller in editor-style applications
- planning marketing copy and homepage structure

For exhaustive member signatures, see `specs/API-SPEC.md`. This guide focuses on usage, organization, and the parts of the API surface that matter most when building an application.

## Major Feature Families

Elise is not only a drawing library. It is a retained-mode 2D scene system with editing, animation, resources, runtime controllers, design-time tooling, SVG interop, and a higher-level surface framework.

### 1. Core Scene Graph

- `Model` is the scene container.
- `ElementBase` is the shared base for renderable elements.
- geometry primitives such as `Point`, `Size`, `Region`, and `Matrix2D` support layout and transforms.
- scene content is retained, so you mutate elements and redraw instead of issuing one-off immediate-mode commands.

### 2. Primitive Elements

- standard shapes: rectangle, ellipse, line, polygon, polyline, path
- higher-level shape primitives: arc, arrow, regular polygon, ring, wedge
- content primitives: text, image, sprite, embedded model
- elements support styling, transforms, interactivity, serialization, and animation.

### 3. Styling And Fill System

- solid color fill and stroke support
- linear and radial gradients
- image-backed fills and model-backed fills
- dash patterns, line caps, line joins, miter limits, opacity, shadows, blend modes, filters, and clip paths

### 4. Resource System

- shared bitmap, model, and text resources
- locale-aware lookup and fallback behavior
- asynchronous loading through `ResourceManager`
- indirect references let multiple elements share the same resource key

### 5. Runtime View Controllers

- `ViewController` renders to canvas and supports mouse, touch, timer, command dispatch, bubbling, and keyboard focus-path routing
- `SVGViewController` renders the same retained model to a live SVG target for view-mode runtime use

### 6. Design System

- `DesignController` turns the model into a full editing surface
- selection, drag/resize/rotate, grid snapping, smart alignment, clipboard, undo/redo, drag and drop, rich-text editing, and creation tools are built in
- design tools cover drawing, text, image placement, embedded model placement, and freeform point creation

### 7. Animation And Transitions

- property tweens on elements through `animate(...)`
- 31 easing functions in `AnimationEasing`
- sprite frame timelines with transitions
- pane transitions for the surface framework

### 8. SVG Import And Export

- import common SVG content into the Elise model graph
- export models back to SVG markup
- preserve grouping through nested `ModelElement` hierarchies instead of flattening everything

### 9. Surface Framework

- `Surface` provides a layered application container
- supports canvas-rendered content plus HTML, image, video, hidden interactive zones, panes, buttons, radio strips, and animated image layers
- suitable for kiosk, signage, UI overlay, or multimedia presentations

### 10. Components, Commands, And Sketcher

- component registry for reusable higher-order design content
- command tags on elements for declarative event handling
- `Sketcher` for progressive reveal / hand-drawn animation effects

## Installation And Entry Points

### NPM

```bash
npm i elise-graphics
```

### CommonJS / Bundler Usage

```javascript
var elise = require('elise-graphics');
```

### Browser UMD Usage

```html
<div id="elise-host"></div>
<script src="elise/_bundles/elise-graphics.js"></script>
```

### Most Important Convenience Factories

These aliases are the fastest way to get started:

- `elise.model(...)`
- `elise.rectangle(...)`
- `elise.ellipse(...)`
- `elise.line(...)`
- `elise.path(...)`
- `elise.polygon(...)`
- `elise.polyline(...)`
- `elise.arc(...)`
- `elise.arrow(...)`
- `elise.regularPolygon(...)`
- `elise.ring(...)`
- `elise.wedge(...)`
- `elise.image(...)`
- `elise.text(...)`
- `elise.sprite(...)`
- `elise.innerModel(...)`
- `elise.view(hostDiv, model)`
- `elise.svgView(hostDiv, model)`
- `elise.design(hostDiv, model)`

## Core Mental Model

### Model

`Model` is both a container and an element-like root. It stores:

- ordered `elements`
- shared `resources`
- a `resourceManager`
- optional controller linkage
- export helpers such as `toSVG()` and raster export helpers such as `toCanvas()` / `toBlob()`

Typical workflow:

1. create a model
2. add resources if needed
3. create and add elements
4. attach a runtime or design controller

```javascript
var model = elise.model(640, 360).setFill('#0f172a');
model.add(elise.rectangle(20, 20, 200, 100).setFill('#1e293b'));
```

### Elements

Elements are retained objects. You change properties on the element and let the controller redraw.

```javascript
var card = elise.rectangle(32, 32, 180, 96)
    .setFill('#ffffff')
    .setStroke('#0f172a,2')
    .setInteractive(true);

card.setOpacity(0.9);
card.setRotation(8);
```

### Resources

Resources decouple content from usage:

- `BitmapResource` for images
- `ModelResource` for reusable nested models
- `TextResource` for externalized or localized text

### Controllers

Controllers attach the retained model to an HTML target:

- `ViewController` for runtime canvas
- `SVGViewController` for runtime live SVG
- `DesignController` for editor-style manipulation

## Common Element Options

All primitives inherit shared behavior from `ElementBase`. This section covers the options you can expect across almost every visual type.

### Identity And Editing State

| Option | Meaning |
| --- | --- |
| `type` | stable serialized element type tag |
| `id` | optional application-defined identifier |
| `locked` | prevents movement/sizing in design scenarios |
| `aspectLocked` | preserves aspect ratio during resize operations |
| `editPoints` | enables point-edit mode for point-backed primitives |
| `tag` | arbitrary application metadata |

### Visual Styling

| Option | Meaning |
| --- | --- |
| `fill` | solid color, image/model fill string, or gradient object |
| `fillScale` | scales image/model fills |
| `fillOffsetX`, `fillOffsetY` | offsets image/model fills |
| `stroke` | stroke color, or `color,width` string such as `'#334155,2'` |
| `strokeDash` | dash pattern array |
| `lineCap` | `butt`, `round`, or `square` |
| `lineJoin` | `miter`, `round`, or `bevel` |
| `miterLimit` | miter cutoff when using `lineJoin='miter'` |
| `opacity` | element alpha in the range `0` to `1` |
| `shadow` | `{ color, blur, offsetX, offsetY }` |
| `blendMode` | canvas compositing mode |
| `filter` | canvas filter string such as `blur(4px)` |
| `visible` | removes element from rendering and hit testing when false |
| `transform` | serialized transform string |
| `clipPath` | explicit clip path geometry with winding and transform metadata |

### Interaction And Commands

| Option | Meaning |
| --- | --- |
| `interactive` | opt in to hit testing and runtime events |
| `mouseDown`, `mouseUp`, `mouseEnter`, `mouseLeave`, `click` | command handler tags |
| `timer` | command tag fired during controller timer ticks |

### Shared Fluent Methods

The most commonly used inherited methods are:

- `setLocation(point)`
- `setSize(size)`
- `setFill(fill)`
- `setStroke(stroke)`
- `setStrokeDash(pattern)`
- `setLineCap(value)`
- `setLineJoin(value)`
- `setMiterLimit(value)`
- `setFillScale(value)`
- `setFillOffsetX(value)`
- `setFillOffsetY(value)`
- `setInteractive(value)`
- `setOpacity(value)`
- `setShadow(value)`
- `setBlendMode(value)`
- `setFilter(value)`
- `setTransform(value)`
- `setVisible(value)`
- `setRotation(degrees, cx?, cy?)`
- `animate(targets, options?)`
- `cancelAnimations(propertyNames?)`
- `addTo(model)`

### Fill Conventions

Elise supports several practical fill formats:

- solid color: `'#2563eb'`, `'red'`, `'rgba(37,99,235,0.8)'`
- image fill: `'image(heroTexture)'`
- image fill with opacity: `'image(0.5;heroTexture)'`
- model fill: `'model(gridPattern)'`
- model fill with opacity: `'model(0.6;gridPattern)'`
- `LinearGradientFill` object
- `RadialGradientFill` object

### Stroke Convention

The stroke string can be either a color by itself or a `color,width` pair.

```javascript
rect.setStroke('#0f172a');
rect.setStroke('#0f172a,3');
rect.setStroke('rgba(15,23,42,0.7),1.5');
```

## Primitive Reference

Each primitive section below includes:

- when to use it
- type-specific options
- a code example
- a serialized element example

All primitives inherit the common element options described above.

### RectangleElement

Use rectangle for panels, cards, hit targets, image frames, overlays, and rounded UI blocks.

Type-specific options:

- `cornerRadii?: [topLeft, topRight, bottomRight, bottomLeft]`
- `setCornerRadius(radius)` for uniform rounding
- `setCornerRadii(tl, tr, br, bl)` for independent corners

```javascript
var rect = elise.rectangle(24, 24, 220, 120)
    .setFill('#ffffff')
    .setStroke('#0f172a,2')
    .setCornerRadii(20, 20, 8, 8)
    .setShadow({ color: 'rgba(15,23,42,0.18)', blur: 18, offsetX: 0, offsetY: 8 });
```

```json
{
  "type": "rectangle",
  "location": "24,24",
  "size": "220x120",
  "fill": "#ffffff",
  "stroke": "#0f172a,2",
  "cornerRadii": [20, 20, 8, 8]
}
```

### EllipseElement

Use ellipse for circles, pills, spotlights, orbital graphics, nodes, and soft decoration.

Type-specific options:

- factory uses center/radius form: `create(cx, cy, rx, ry)`
- omitting `ry` effectively gives a circle-style shape

```javascript
var orb = elise.ellipse(180, 120, 64, 48)
    .setFill('#38bdf8')
    .setStroke('#0f172a,2')
    .setOpacity(0.85);
```

```json
{
  "type": "ellipse",
  "location": "116,72",
  "size": "128x96",
  "fill": "#38bdf8",
  "stroke": "#0f172a,2"
}
```

### LineElement

Use line for connectors, rulers, dividers, chart axes, and geometric constructions.

Type-specific options:

- editable endpoints `p1` and `p2`
- point count is always 2
- `canFill()` is false

```javascript
var divider = elise.line(40, 40, 280, 140)
    .setStroke('#475569,3')
    .setStrokeDash([10, 6])
    .setLineCap('round');
```

```json
{
  "type": "line",
  "p1": "40,40",
  "p2": "280,140",
  "stroke": "#475569,3",
  "strokeDash": [10, 6],
  "lineCap": "round"
}
```

### PathElement

Use path when you need custom vector geometry, imported SVG-style curves, or direct point editing of arbitrary shapes.

Type-specific options:

- command list with `m`, `l`, `H`, `V`, `c`, `S`, `Q`, `T`, `A`, `z`
- `add(command)` appends one command token
- `setCommands(...)` replaces the command stream
- full-depth point editing includes native arc endpoint and radius handles for `A` commands
- supports both stroke and fill

```javascript
var path = elise.path()
    .setCommands('m40,40 c90,0,120,120,180,80 S260,20,320,80 z')
    .setFill('#fde68a')
    .setStroke('#92400e,2');
```

```json
{
  "type": "path",
  "commands": [
    "m40,40",
    "c90,0,120,120,180,80",
    "S260,20,320,80",
    "z"
  ],
  "fill": "#fde68a",
  "stroke": "#92400e,2"
}
```

### ArcElement

Use arc for gauges, progress rings, dial graphics, sweep indicators, and curved annotations.

Type-specific options:

- `startAngle`
- `endAngle`
- not fillable by default
- point editing exposes start, end, and radius-size handles

```javascript
var gaugeArc = elise.arc(40, 40, 180, 180)
    .setStroke('#22c55e,10');
gaugeArc.startAngle = 210;
gaugeArc.endAngle = 40;
```

```json
{
  "type": "arc",
  "location": "40,40",
  "size": "180x180",
  "stroke": "#22c55e,10",
  "startAngle": 210,
  "endAngle": 40
}
```

### ArrowElement

Use arrow when you need directional callouts, flow-chart connectors, or instructional overlays.

Type-specific options:

- `headLengthScale`
- `headWidthScale`
- `shaftWidthScale`

```javascript
var arrow = elise.arrow(40, 120, 220, 50)
    .setFill('#f97316')
    .setStroke('#7c2d12,2');
arrow.headLengthScale = 0.4;
arrow.headWidthScale = 0.8;
arrow.shaftWidthScale = 0.28;
```

```json
{
  "type": "arrow",
  "location": "40,120",
  "size": "220x50",
  "fill": "#f97316",
  "stroke": "#7c2d12,2",
  "headLengthScale": 0.4,
  "headWidthScale": 0.8,
  "shaftWidthScale": 0.28
}
```

### RegularPolygonElement

Use regular polygon for badges, stars, hex grids, markers, and abstract emblem shapes.

Type-specific options:

- `sides`
- `innerRadiusScale`
- `rotation`

```javascript
var badge = elise.regularPolygon(80, 80, 140, 140)
    .setFill('#a78bfa')
    .setStroke('#4c1d95,2');
badge.sides = 6;
badge.rotation = -30;
```

```json
{
  "type": "regularPolygon",
  "location": "80,80",
  "size": "140x140",
  "fill": "#a78bfa",
  "stroke": "#4c1d95,2",
  "sides": 6,
  "rotation": -30,
  "innerRadiusScale": 1
}
```

### RingElement

Use ring for donut charts, radar markers, target graphics, and circular framing.

Type-specific options:

- `innerRadiusScale`

```javascript
var ring = elise.ring(60, 60, 180, 180)
    .setFill('#0ea5e9')
    .setStroke('#082f49,2');
ring.innerRadiusScale = 0.62;
```

```json
{
  "type": "ring",
  "location": "60,60",
  "size": "180x180",
  "fill": "#0ea5e9",
  "stroke": "#082f49,2",
  "innerRadiusScale": 0.62
}
```

### WedgeElement

Use wedge for pie slices, sector highlights, angular annotations, and sweep visualizations.

Type-specific options:

- `startAngle`
- `endAngle`

```javascript
var wedge = elise.wedge(120, 80, 180, 180)
    .setFill('#fb7185')
    .setStroke('#881337,2');
wedge.startAngle = 300;
wedge.endAngle = 40;
```

```json
{
  "type": "wedge",
  "location": "120,80",
  "size": "180x180",
  "fill": "#fb7185",
  "stroke": "#881337,2",
  "startAngle": 300,
  "endAngle": 40
}
```

### PolygonElement

Use polygon for closed custom shapes where each point matters and the path should automatically close.

Type-specific options:

- editable `Point[]` list
- `setPoints(...)`
- `addPoint(point)`
- fill and stroke are both supported

```javascript
var polygon = elise.polygon()
    .addPoint(elise.point(40, 40))
    .addPoint(elise.point(180, 20))
    .addPoint(elise.point(240, 100))
    .addPoint(elise.point(90, 160))
    .setFill('#86efac')
    .setStroke('#14532d,2');
```

```json
{
  "type": "polygon",
  "points": "40,40 180,20 240,100 90,160",
  "fill": "#86efac",
  "stroke": "#14532d,2"
}
```

### PolylineElement

Use polyline for routes, waveforms, traces, strokes, or editable open path sequences.

Type-specific options:

- editable `Point[]` list
- `smoothPoints` for Catmull-Rom interpolation
- no fill by default

```javascript
var route = elise.polyline()
    .addPoint(elise.point(20, 120))
    .addPoint(elise.point(80, 60))
    .addPoint(elise.point(150, 140))
    .addPoint(elise.point(240, 70))
    .setStroke('#2563eb,4');
route.smoothPoints = true;
```

```json
{
  "type": "polyline",
  "points": "20,120 80,60 150,140 240,70",
  "stroke": "#2563eb,4",
  "smoothPoints": true
}
```

### TextElement

Use text for labels, paragraphs, captions, UI copy, callouts, and rich text blocks.

Type-specific options:

- `text` for inline string content
- `source` for `TextResource` lookup
- `typeface`
- `typesize`
- `typestyle`
- `alignment`
- `letterSpacing`
- `textDecoration`
- `lineHeight`
- `richText: TextRun[]`

Important capabilities:

- automatic word wrapping inside bounds
- rich-text run editing
- caret/selection geometry helpers
- line-aware arrow navigation and word selection on design surface

```javascript
var title = elise.text('Elise makes retained graphics editable.', 32, 32, 280, 80)
    .setFill('#e2e8f0')
    .setTypeface('Georgia, serif')
    .setTypesize(24)
    .setTypestyle('bold')
    .setAlignment('left,top')
    .setLineHeight(1.35)
    .setLetterSpacing(0.5);
```

```json
{
  "type": "text",
  "location": "32,32",
  "size": "280x80",
  "text": "Elise makes retained graphics editable.",
  "fill": "#e2e8f0",
  "typeface": "Georgia, serif",
  "typesize": 24,
  "typestyle": "bold",
  "alignment": "left,top",
  "lineHeight": 1.35,
  "letterSpacing": 0.5
}
```

### ImageElement

Use image for photo placement, icons, posters, card art, and imported raster content.

Type-specific options:

- `source` references a `BitmapResource`
- size controls scaling of the source image
- `canStroke()` is true, so images can have borders

```javascript
var heroBitmap = elise.bitmapResource('hero', '/images/hero.png');
heroBitmap.addTo(model);

var poster = elise.image('hero', 40, 40, 240, 160)
    .setStroke('#0f172a,2')
    .setOpacity(0.95);
```

```json
{
  "type": "image",
  "source": "hero",
  "location": "40,40",
  "size": "240x160",
  "stroke": "#0f172a,2",
  "opacity": 0.95
}
```

### SpriteElement

Use sprite for stateful animation, frame strips, button-like image state changes, and presentation sequences.

Type-specific options:

- `frames: SpriteFrame[]`
- `frameIndex`
- `loop`
- `onAdvance` command tag
- transition support between frames
- timeline helpers such as `getStateForTime(...)` and `getTimeForFrame(...)`

```javascript
var sheet = elise.bitmapResource('sheet', '/images/spritesheet.png');
sheet.addTo(model);

var sprite = elise.sprite(40, 40, 96, 96);
sprite.addFrame(elise.spriteFrame('sheet', 0, 0, 96, 96, 0.15, 'fade', 0.1, 1));
sprite.addFrame(elise.spriteFrame('sheet', 96, 0, 96, 96, 0.15, 'fade', 0.1, 1));
sprite.addFrame(elise.spriteFrame('sheet', 192, 0, 96, 96, 0.15, 'fade', 0.1, 1));
sprite.loop = true;
model.add(sprite);
```

```json
{
  "type": "sprite",
  "location": "40,40",
  "size": "96x96",
  "frames": [
    { "source": "sheet", "x": 0, "y": 0, "width": 96, "height": 96, "duration": 0.15, "transition": "fade", "transitionDuration": 0.1, "opacity": 1 },
    { "source": "sheet", "x": 96, "y": 0, "width": 96, "height": 96, "duration": 0.15, "transition": "fade", "transitionDuration": 0.1, "opacity": 1 }
  ],
  "loop": true
}
```

### ModelElement

Use model element for reusable symbols, nested scenes, prefabs, and composition of complex models inside a larger model.

Type-specific options:

- `source` references a `ModelResource`
- `sourceModel` may embed a model directly
- scales the inner model into the outer bounds

```javascript
var iconModel = elise.model(64, 64);
iconModel.add(elise.ring(4, 4, 56, 56).setFill('#38bdf8'));
iconModel.add(elise.wedge(10, 10, 44, 44).setFill('#082f49'));

var iconResource = elise.modelResource('iconChip', iconModel);
iconResource.addTo(model);

var chip = elise.innerModel('iconChip', 280, 40, 96, 96)
    .setOpacity(0.9)
    .setInteractive(true);
```

```json
{
  "type": "model",
  "source": "iconChip",
  "location": "280,40",
  "size": "96x96",
  "opacity": 0.9,
  "interactive": true
}
```

## Resources And Shared Assets

### BitmapResource

Use for images referenced by `ImageElement`, sprites, or image fills.

```javascript
elise.bitmapResource('hero', '/images/hero.png').addTo(model);
```

### ModelResource

Use for reusable nested models that can be instanced through `ModelElement`.

```javascript
var badgeModel = elise.model(100, 100);
badgeModel.add(elise.regularPolygon(10, 10, 80, 80).setFill('#f59e0b'));
elise.modelResource('badge', badgeModel).addTo(model);
```

### TextResource

Use for localization or externalized copy.

```javascript
elise.embeddedTextResource('headline', 'Localizable heading').addTo(model);
model.resourceManager.currentLocaleId = 'en-US';

var label = elise.text(undefined, 20, 20, 220, 40).setSource('headline');
```

### ResourceManager Practices

- set `currentLocaleId` before resolving text or locale-specific assets
- call `model.prepareResources(...)` before first draw when you depend on external resources
- use shared keys for reuse rather than duplicating assets on many elements

## Fills, Gradients, And Paint Effects

### Linear Gradient

```javascript
var gradient = elise.linearGradientFill('0,0', '240,0');
gradient.addFillStop('#38bdf8', 0);
gradient.addFillStop('#1d4ed8', 1);

var bar = elise.rectangle(20, 20, 240, 40).setFill(gradient);
```

### Radial Gradient

```javascript
var radial = elise.radialGradientFill('120,120', '120,120', 90, 90);
radial.addFillStop('rgba(255,255,255,1)', 0);
radial.addFillStop('rgba(255,255,255,0)', 1);
```

### Image Fill

```javascript
rect.setFill('image(heroTexture)');
rect.setFillScale(0.75);
rect.setFillOffsetX(12);
rect.setFillOffsetY(8);
```

### Model Fill

```javascript
rect.setFill('model(tilePattern)');
```

### Advanced Visual Effects

Useful shared paint controls:

- `setShadow(...)` for depth
- `setBlendMode(...)` for compositing
- `setFilter(...)` for CSS-style canvas filtering
- `setClipPath(...)` for clipping imported or custom geometry

## Animation, Easing, Sprites, And Transitions

### Property Tweening

Supported tween targets include:

- `x`, `y`, `width`, `height`
- `centerX`, `centerY`, `radiusX`, `radiusY`
- `x1`, `y1`, `x2`, `y2`
- `fillScale`, `fillOffsetX`, `fillOffsetY`
- `rotation`, `opacity`, `typesize`
- `fill`, `stroke`

```javascript
panel.animate({ x: 180, opacity: 0.7, fill: '#f97316' }, {
    duration: 700,
    easing: 'easeInOutCubic'
});
```

### Easing Families

`AnimationEasing` includes linear, quad, cubic, quart, quint, sine, expo, circ, back, elastic, and bounce families in `in`, `out`, and `inOut` forms.

### Sprite Transitions

`TransitionRenderer` ships many built-in transition names such as:

- `none`
- `fade`
- `pushLeft`, `pushRight`, `pushUp`, `pushDown`
- `wipeLeft`, `wipeRight`, `wipeUp`, `wipeDown`
- `slideLeft`, `slideRight`, `slideUp`, `slideDown`
- `revealLeft`, `revealRight`, `revealUp`, `revealDown`
- `ellipticalIn`, `ellipticalOut`
- `rectangularIn`, `rectangularOut`
- `grid`
- `expandHorizontal`, `expandVertical`
- `zoomIn`, `zoomOut`, `zoomRotateIn`, `zoomRotateOut`
- `radar`

## SVG Import And Export

### Import

```javascript
var model = elise.model(400, 300);
elise.SVGImporter.import(svgMarkup, model);
```

Imported SVG coverage includes:

- `path`, `rect`, `ellipse`, `circle`, `line`, `polygon`, `polyline`, `text`, `image`
- `g`, nested `svg`, `symbol`, and `use`
- inherited paint, transform, and typography settings
- gradients and clip paths

### Export

```javascript
var svgMarkup = model.toSVG();
```

Export coverage includes:

- all major primitive types
- model resources exported as reusable `symbol` / `use` where appropriate
- text line height, letter spacing, decoration, and rich text tspans
- stroke dash, line cap, line join, and miter limit

### When To Prefer SVGViewController

Choose `SVGViewController` when you want:

- SVG DOM output instead of canvas pixels
- easier browser inspection of the rendered output
- view-mode runtime rendering backed by the same retained scene model

Choose `ViewController` when you want:

- the most mature runtime interaction path
- canvas rendering behavior for filters, compositing, and performance characteristics aligned with canvas

## Runtime Controller User Guide

### ViewController At A Glance

Best for:

- runtime scenes on canvas
- dashboards, graphics, editors with custom interaction overlays
- animation and timer-driven experiences

Core lifecycle:

1. create or load a model
2. attach to a host div with `elise.view(...)`
3. subscribe to controller and element events
4. mutate elements and call `invalidate()` when needed
5. optionally start the timer loop

```javascript
var host = document.getElementById('runtime-host');
var model = elise.model(480, 240).setFill('#0f172a');

var button = elise.rectangle(40, 40, 160, 56)
    .setFill('#2563eb')
    .setStroke('#dbeafe,2')
    .setInteractive(true);
button.id = 'button';
model.add(button);

var view = elise.view(host, model);

view.elementClicked.add(function (_controller, element) {
    if (element.id === 'button') {
        button.animate({ x: 60, fill: '#1d4ed8' }, { duration: 250, easing: 'easeOutCubic' });
    }
});

view.keyDownElement.add(function (_controller, args) {
    if (args.element.id === 'button' && args.event.key === 'Enter') {
        button.setFill('#0ea5e9');
        view.invalidate();
    }
});
```

### ViewController Technical Reference

High-value methods:

- `setModel(model)`
- `setEnabled(enabled, disabledFill?)`
- `getCanvas()`
- `setScale(scale)`
- `draw()`
- `drawIfNeeded()`
- `invalidate()`
- `startTimer(offset?)`
- `pauseTimer()`
- `resumeTimer()`
- `stopTimer()`
- `setFocusedElement(el)`
- `setFocusedPath(path)`
- `bindTarget(hostDiv)`
- `setAutoPixelRatio(enabled, pixelRatio?)`
- `setPixelRatio(pixelRatio)`

Key runtime events:

- view-level pointer: `mouseEnteredView`, `mouseLeftView`, `mouseDownView`, `mouseUpView`, `mouseMovedView`
- element-level pointer: `mouseEnteredElement`, `mouseLeftElement`, `mouseDownElement`, `mouseUpElement`, `elementClicked`
- keyboard: `keyDown`, `keyUp`, `keyPress`
- focused path keyboard: `keyDownElement`, `keyUpElement`, `keyPressElement`
- focus routing: `elementFocused`, `elementBlurred`
- rendering loop: `timer`

Behavior notes:

- focus-path keyboard routing follows the deepest interactive path under the last pointer-down target unless you set focus explicitly
- `mouseOverPath` and `pressedPath` expose retained hierarchy ancestry
- timers are controller-managed and integrated with redraw flow

### SVGViewController User Guide

Best for:

- view-only live SVG output
- applications that want DOM-backed SVG markup from the retained model
- side-by-side comparison with canvas rendering

```javascript
var host = document.getElementById('svg-host');
var model = elise.model(360, 180).setFill('#ffffff');

var chip = elise.rectangle(24, 24, 120, 56)
    .setFill('#111827')
    .setStroke('#38bdf8,2')
    .setInteractive(true);
chip.id = 'chip';
model.add(chip);

var svgView = elise.svgView(host, model);
svgView.setFocusedElement(chip);

svgView.keyPressElement.add(function (_controller, args) {
    if (args.element.id === 'chip') {
        chip.setOpacity(chip.opacity === 1 ? 0.75 : 1);
        svgView.invalidate();
    }
});
```

### SVGViewController Technical Reference

High-value methods:

- `setModel(model)`
- `setEnabled(enabled)`
- `getSVG()`
- `setScale(scale)`
- `draw()`
- `drawIfNeeded()`
- `invalidate()`
- `startTimer(offset?)`
- `pauseTimer()`
- `resumeTimer()`
- `stopTimer()`
- `bindTarget(hostDiv)`
- `setFocusedElement(el)`
- `setFocusedPath(path)`
- `onSVGKeyDown(e)`
- `onSVGKeyUp(e)`
- `onSVGKeyPress(e)`

Important differences from `ViewController`:

- no canvas target; output is a live `<svg>` element
- current scope is runtime view mode rather than design parity
- keyboard support exists and bubbles through the focused path just like the canvas view controller

## Design Controller User Guide

### What DesignController Is For

`DesignController` is Elise's editor framework. It is appropriate when you want the browser to host an actual authoring surface rather than only a runtime view.

Built-in capabilities include:

- element creation tools
- selection and marquee selection
- drag, resize, rotate, pivot adjustment, and point editing
- grid rendering and snap-to-grid
- smart alignment guides
- copy, cut, paste, duplicate-like paste offset behavior
- undo and redo
- z-order management
- design-time keyboard shortcuts
- drag-and-drop entry points
- inline text editing with rich formatting
- component insertion

### Typical Setup

```javascript
var host = document.getElementById('designer-host');
var model = elise.model(960, 540).setFill('#f8fafc');
var designer = elise.design(host, model);

designer.snapToGrid = true;
designer.setGridType(elise.GridType.Lines);
designer.setGridSpacing(20);
designer.setGridColor('rgba(15,23,42,0.12)');
designer.smartAlignmentEnabled = true;

designer.setActiveTool(new elise.RectangleTool());

designer.elementAdded.add(function (_controller, element) {
    console.log('Added:', element.type, element.id);
});

designer.selectionChanged.add(function (_controller, count) {
    console.log('Selection count:', count);
});
```

### Common End-User Editing Workflows

Creation:

- select a tool such as `RectangleTool`, `EllipseTool`, `TextTool`, or `LineTool`
- drag on the canvas to create
- if `snapToGrid` is enabled, tool creation coordinates snap to the current grid

Selection:

- click to select
- shift-click to extend selection or enter some edit flows
- drag empty space for rubber-band selection

Transform:

- drag to move
- use handles to resize or rotate
- use point editing for primitives that expose editable points

Text:

- start editing an existing text element
- type directly into the design surface
- use `Ctrl+B`, `Ctrl+I`, `Ctrl+U`
- use word selection, vertical navigation, and selection extension

Clipboard And Undo:

- `copySelectedToClipboard()`
- `cutSelectedToClipboard()`
- `pasteClipboardData(...)`
- `undo()` / `redo()`

### DesignController Technical Reference

High-value methods:

- `setModel(model)`
- `setEnabled(enabled, disabledFill?)`
- `setActiveTool(tool)`
- `clearActiveTool()`
- `addElement(el)`
- `removeElement(el)`
- `removeSelected()`
- `selectElement(el)`
- `toggleSelected(el)`
- `clearSelections()`
- `selectAll()`
- `copySelectedToClipboard()`
- `cutSelectedToClipboard()`
- `pasteClipboardData(data, offsetX?, offsetY?)`
- `undo()` / `redo()`
- `getElementHandles(el)`
- `setSelectedRectangleCornerRadius(radius)`
- `setSelectedRectangleCornerRadii(tl, tr, br, bl)`
- `setGridType(value)`
- `setGridSpacing(value)`
- `setGridColor(value)`
- `draw()`
- `drawIfNeeded()`
- `invalidate()`
- `setScale(scale, force?)`
- `setAutoPixelRatio(enabled, pixelRatio?)`
- `setPixelRatio(pixelRatio)`

Important state properties:

- `selectedElements`
- `activeTool`
- `snapToGrid`
- `gridSpacing`
- `gridType`
- `gridColor`
- `lockAspect`
- `constrainToBounds`
- `minElementSize`
- `smartAlignmentEnabled`
- `smartAlignmentThreshold`
- `editingTextElement`
- `canUndo`
- `canRedo`
- `isDirty`

Important events:

- inherited pointer events from controller surface
- `selectionChanged`
- `elementCreated`
- `elementAdded`
- `elementRemoved`
- `elementMoving` / `elementMoved`
- `elementSizing` / `elementSized`
- `elementsReordered`
- `isDirtyChanged`
- `undoChanged`
- drag and drop events for view and element targets
- `contextMenuRequested`

### Design Tools Reference

The built-in tools are:

- `RectangleTool`
- `EllipseTool`
- `LineTool`
- `PolylineTool`
- `PolygonTool`
- `PenTool`
- `ArcTool`
- `ArrowTool`
- `RegularPolygonTool`
- `RingTool`
- `WedgeTool`
- `TextTool`
- `ImageElementTool`
- `ModelElementTool`

Choose tools according to creation style:

- bounds-driven: rectangle, arc, arrow, regular polygon, ring, wedge
- point-driven: line, polyline, polygon, pen
- content placement: text, image, embedded model

## Command System

Elise supports declarative command routing by storing command tags on elements and resolving those tags through command handlers.

Practical uses:

- button-like element behavior without embedding all logic into event subscriptions
- sprite frame push/pop actions
- timer-driven command execution
- editor-authored interaction in a design-created scene

Main types:

- `ElementCommand`
- `ElementCommandHandler`
- `ElementCommandHandlerRegistration`
- `CommandEventTrigger`

## Component System

The component system lets you register higher-order reusable content for design workflows.

Key parts:

- `ComponentRegistry`
- `Component`
- `ComponentElement`
- `ComponentProps` and specialized prop types such as `HtmlComponentProps`, `ImageBasedComponentProps`, `NavigateComponentProps`, and `UploadComponentProps`

Use components when you want reusable authored content that behaves like a richer prefab than a single primitive.

## Surface Framework User Guide

Use `Surface` when your application needs more than a single retained graphics canvas. Surface is the multimedia application layer of Elise.

Best for:

- interactive presentations
- kiosk interfaces
- layered media experiences
- mixed graphics + HTML + video pages

Main concepts:

- `Surface` is the root container
- `SurfaceLayer` is the base for positioned content layers
- specialized layer types include image, HTML, video, hidden hit zones, animation layers, and panes
- panes can replace child surfaces with built-in transitions

Useful classes:

- `Surface`
- `SurfacePane`
- `SurfaceImageLayer`
- `SurfaceHtmlLayer`
- `SurfaceVideoLayer`
- `SurfaceAnimationLayer`
- `SurfaceButtonElement`
- `SurfaceTextElement`
- `SurfaceRadioStrip`

```javascript
var surface = elise.Surface.create(1280, 720, 'home', 1);
var promo = elise.SurfaceImageLayer.create('hero', 0, 0, 1280, 720, '/media/hero.jpg');
surface.layers.push(promo);
surface.bind(document.getElementById('surface-host'));
```

## Sketcher User Guide

`Sketcher` progressively reveals a model in stages, making it useful for illustration playback, educational demos, and animated line-drawing effects.

Use cases:

- "draw itself" onboarding animations
- explainer visuals
- sequential reveal of polygon-heavy artwork

## Recommended Usage Patterns

### When To Use Canvas View

Choose `ViewController` when you want the default runtime path, immediate redraw control, animation, and rich pointer handling.

### When To Use SVG View

Choose `SVGViewController` when you want live SVG output from the same retained scene in runtime view mode.

### When To Use DesignController

Choose `DesignController` when your users need to create, edit, arrange, and author graphics in-browser.

### When To Use Surface

Choose `Surface` when the experience is a full application shell rather than one scene.

### When To Use ModelElement And ModelResource

Choose these when you need reusable symbols, nested scenes, or composition-friendly prefabs.

## Website And Marketing Overview

This section is intended for whoever creates the public website, landing page, or product entry page.

### Product Positioning

Elise should be presented as:

- a retained-mode 2D graphics library for serious browser applications
- a graphics engine with a built-in design surface, not just a drawing helper
- a bridge between runtime rendering, authoring tools, SVG interop, and multimedia surfaces

### Strong Differentiators To Highlight

- retained graphics plus a built-in browser-based design surface
- canvas runtime and SVG runtime from the same model
- nested model composition with reusable resources
- rich primitive set including specialized vector shapes
- inline rich-text editing in the design surface
- runtime event bubbling and keyboard focus-path routing
- sprite transitions, pane transitions, and property tweening
- mixed-media surface framework with HTML and video layers

### Homepage Messaging Angles

Potential value propositions:

- "Design it, render it, animate it, and ship it from one retained graphics model."
- "A 2D graphics library with a real editing surface, not only a canvas wrapper."
- "Use the same model for runtime scenes, SVG output, and browser-based authoring."

### Suggested Homepage Information Architecture

1. Hero
2. Short proof bar
3. Interactive demo strip
4. Feature families grid
5. Primitive gallery
6. Design surface showcase
7. Runtime canvas vs SVG comparison
8. Surface framework section
9. Code example section
10. Documentation and examples CTA

### Hero Section Guidance

Include:

- a short positioning headline
- one sentence that explains retained graphics + design surface + runtime controllers
- two clear CTAs such as `Get Started` and `Open Live Demos`
- a visual showing both authored content and runtime output

Suggested hero copy:

> Elise is a retained-mode 2D graphics library for the web with built-in design tools, reusable scene models, runtime canvas and SVG rendering, and animation-ready primitives.

### Proof Bar Content

A compact proof bar below the hero should highlight concrete facts:

- retained scene graph
- design controller with undo/redo and snapping
- canvas and SVG runtime views
- sprites, transitions, and resource-backed composition

### Feature Grid Topics

Recommended cards:

- scene graph and resources
- vector primitives and text
- runtime controllers and events
- design surface and editing
- SVG import/export
- animation and transitions
- multimedia surfaces

### Primitive Gallery Design

Show a clean gallery of:

- rectangle with corner radii
- ellipse
- path with curves
- arrow and wedge
- text with rich styling
- sprite animation preview

Each card should show:

- rendered preview
- primitive name
- one-line use case
- tiny code sample

### Design Surface Showcase

Use a large, editorial-style section demonstrating:

- grid and snapping
- creation tools
- selection handles
- text editing
- alignment guides
- clipboard and undo/redo

The site should make it obvious that Elise includes a real in-browser authoring workflow.

### Runtime Comparison Section

Show one model rendered in:

- `ViewController` canvas output
- `SVGViewController` SVG output

This helps visitors understand that Elise separates scene definition from rendering target.

### Code Sample Section

The first code sample on the homepage should be short and visual. It should create a model, add 2 or 3 elements, and attach a runtime controller in under 15 lines.

### Design Direction For A Compelling Homepage

Recommended visual direction:

- light editorial layout rather than a generic dark developer landing page
- deep ink, slate, and cool sky accents instead of a default purple palette
- large preview canvases with soft borders and layered cards
- diagrammatic overlays that hint at handles, snapping, and nested model composition

Suggested palette:

- background: `#f8fafc`
- dark ink: `#0f172a`
- accent blue: `#2563eb`
- accent cyan: `#06b6d4`
- accent amber: `#f59e0b`
- muted copy: `#475569`

Suggested typography direction:

- headline face with character, such as `Space Grotesk`, `Sora`, or `Plus Jakarta Sans`
- body face with strong readability, such as `Instrument Sans`, `Manrope`, or `IBM Plex Sans`

Suggested motion:

- subtle scroll reveals of primitive cards
- hover transitions that morph a code card into a rendered preview
- animated split-screen showing design-to-runtime flow

### Homepage Section Blueprint

Hero:

- left side: headline, subhead, CTAs
- right side: animated composed scene preview with handles and runtime counterpart

Section two:

- compact proof metrics or capability bullets

Section three:

- feature-family cards in a strong asymmetric grid

Section four:

- primitive showcase with tiny code snippets

Section five:

- design controller workflow strip with numbered steps

Section six:

- runtime canvas / SVG comparison panel

Section seven:

- surface system examples with HTML, image, and video layers

Section eight:

- docs and examples CTA with direct links to demos and specs

### Website Copy Checklist

Make sure the entry page communicates:

- Elise is retained-mode, not immediate-mode drawing sugar
- Elise includes both rendering and authoring workflows
- Elise supports real applications, not just isolated charts or toy demos
- Elise works with reusable resources and nested models
- Elise supports animation, SVG, and multimedia presentation scenarios

## Final Recommendations For Documentation Consumers

- start with `ViewController` if you want the simplest runtime path
- move to `DesignController` when authoring or in-browser editing matters
- use `ModelResource` and `ModelElement` early if you expect reuse
- use gradients, image fills, and shadows sparingly at first, then expand after the scene structure is stable
- treat `specs/API-SPEC.md` as the companion signature reference once you know which subsystem you need
