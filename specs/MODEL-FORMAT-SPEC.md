# Elise Graphics Model Format Specification

**Version:** 1.0
**Format:** JSON
**File Extension:** `.json`

## Overview

The Elise model format is a JSON-based document format that describes a 2D retained-mode graphics scene. A model is a hierarchical container of **elements** (visual primitives) and **resources** (shared assets like bitmaps, text, and embedded sub-models). Models can be nested within other models for compositional scene graphs.

All rendering is performed onto an HTML5 Canvas 2D context using a painter's algorithm (back-to-front element ordering).

## Related Specifications

- [API Specification](API-SPEC.md)
- [Modernization Recommendations](MODERNIZATION-RECOMMENDATIONS.md)

---

## Top-Level Model Object

The root model object extends the common element properties and adds resource and element collections.

```json
{
  "type": "model",
  "id": "optional-model-id",
  "size": "800x600",
  "fill": "#FFFFFF",
  "stroke": "Black,1",
  "transform": "rotate(45)(400,300)",
  "resources": [ ... ],
  "elements": [ ... ]
}
```

### Model-Specific Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `string` | `"model"` | Always `"model"` for the root object |
| `resources` | `Resource[]` | `[]` | Array of shared resource definitions |
| `elements` | `Element[]` | `[]` | Ordered array of visual elements (painter's model, back-to-front) |

### Inherited Common Properties

All element types, including the model itself, share these base properties:

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | — | Yes | Element type discriminator |
| `id` | `string` | — | No | Optional unique identifier |
| `size` | `string` | — | No | Dimensions as `"widthxheight"` (e.g., `"800x600"`) |
| `location` | `string` | — | No | Position as `"x,y"` (e.g., `"10,20"`) |
| `locked` | `boolean` | `false` | No | Prevents moving/resizing in design mode |
| `aspectLocked` | `boolean` | `false` | No | Maintains aspect ratio during resize |
| `fill` | `string \| FillObject` | — | No | Fill specification (see [Fill Formats](#fill-formats)) |
| `fillScale` | `number` | `1` | No | Scale factor for image/model fill patterns |
| `fillOffsetX` | `number` | `0` | No | Horizontal fill pattern offset |
| `fillOffsetY` | `number` | `0` | No | Vertical fill pattern offset |
| `stroke` | `string` | — | No | Stroke specification (see [Stroke Format](#stroke-format)) |
| `transform` | `string` | — | No | Affine transform (see [Transform Format](#transform-format)) |
| `mouseDown` | `string` | — | No | Command tag for mouse down events |
| `mouseUp` | `string` | — | No | Command tag for mouse up events |
| `mouseEnter` | `string` | — | No | Command tag for mouse enter events |
| `mouseLeave` | `string` | — | No | Command tag for mouse leave events |
| `click` | `string` | — | No | Command tag for click events |
| `timer` | `string` | — | No | Command tag for timer events |

> **Note:** Properties with default/falsy values are omitted from serialized output to minimize file size. The presence of any mouse/click/timer handler automatically makes the element interactive (hit-testable).
>
> **Point precision note:** Point-like values serialize through `Point.toString()` with decimal precision preserved in JSON output.

---

## Element Types

### Rectangle

A filled/stroked axis-aligned rectangle.

```json
{
  "type": "rectangle",
  "location": "10,20",
  "size": "200x100",
  "fill": "Blue",
  "stroke": "Black,2"
}
```

**Type string:** `"rectangle"`
**Capabilities:** fill, stroke, move, resize
**Unique properties:** None — uses `location` and `size` from base.

---

### Ellipse

A filled/stroked ellipse defined by center point and radii.

```json
{
  "type": "ellipse",
  "center": "150,100",
  "radiusX": 80,
  "radiusY": 50,
  "fill": "Red",
  "stroke": "Black"
}
```

**Type string:** `"ellipse"`
**Capabilities:** fill, stroke, move, resize

| Property | Type | Description |
|----------|------|-------------|
| `center` | `string` | Center point as `"x,y"` |
| `radiusX` | `number` | Horizontal radius |
| `radiusY` | `number` | Vertical radius |

> **Note:** `location` and `size` are not serialized for ellipses; they are computed from center and radii.

---

### Line

A stroked line segment between two points.

```json
{
  "type": "line",
  "p1": "10,20",
  "p2": "200,150",
  "stroke": "Black,2"
}
```

**Type string:** `"line"`
**Capabilities:** stroke, move, point editing
**Cannot:** fill, resize (points are edited directly)

| Property | Type | Description |
|----------|------|-------------|
| `p1` | `string` | Start point as `"x,y"` |
| `p2` | `string` | End point as `"x,y"` |

---

### Path

An arbitrary shape defined by drawing commands.

```json
{
  "type": "path",
  "commands": "m(10,20) l(100,20) l(100,100) c(80,120,20,120,10,100) z",
  "fill": "Green",
  "stroke": "Black",
  "winding": 2
}
```

**Type string:** `"path"`
**Capabilities:** fill, stroke, move, resize, point editing

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `commands` | `string` | — | Space-separated drawing commands |
| `winding` | `number` | `1` (NonZero) | Fill winding rule: `1` = NonZero, `2` = EvenOdd |

#### Path Command Reference

| Command | Format | Description |
|---------|--------|-------------|
| Move | `m(x,y)` | Move pen to point |
| Line | `l(x,y)` | Draw line to point |
| Horizontal line | `H(x)` | Draw absolute horizontal line to `x` |
| Vertical line | `V(y)` | Draw absolute vertical line to `y` |
| Bezier | `c(cx1,cy1,cx2,cy2,x,y)` | Cubic bezier curve with two control points |
| Smooth bezier | `S(cx2,cy2,x,y)` | Smooth cubic bezier using reflected prior control point |
| Quadratic | `Q(cx,cy,x,y)` | Quadratic bezier curve |
| Smooth quadratic | `T(x,y)` | Smooth quadratic using reflected prior control point |
| Arc | `A(rx,ry,rot,large,sweep,x,y)` | Elliptical arc segment |
| Close | `z` | Close path back to last move point |

> **Note:** `location` and `size` are not serialized; bounds are computed from the commands.

---

### Arc

An open elliptical arc primitive defined by bounding box and sweep angles.

```json
{
  "type": "arc",
  "location": "10,20",
  "size": "160x100",
  "startAngle": 30,
  "endAngle": 240,
  "stroke": "Black,2"
}
```

**Type string:** `"arc"`
**Capabilities:** stroke, move, resize, rotate, point editing
**Cannot:** fill

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `location` | `string` | — | Upper-left bounds origin as `"x,y"` |
| `size` | `string` | — | Bounding size as `"widthxheight"` |
| `startAngle` | `number` | `0` | Arc start angle in degrees |
| `endAngle` | `number` | `90` | Arc end angle in degrees |

---

### Regular Polygon / Star

A regular polygon primitive that becomes a star when `innerRadiusScale` is less than `1`.

```json
{
  "type": "regularPolygon",
  "location": "20,20",
  "size": "120x120",
  "sides": 5,
  "innerRadiusScale": 0.5,
  "rotation": -90,
  "fill": "Gold",
  "stroke": "Black,2"
}
```

**Type string:** `"regularPolygon"`
**Capabilities:** fill, stroke, move, resize, rotate, point editing

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `location` | `string` | — | Upper-left bounds origin as `"x,y"` |
| `size` | `string` | — | Bounding size as `"widthxheight"` |
| `sides` | `number` | `5` | Number of outer vertices |
| `innerRadiusScale` | `number` | `1` | Ratio of inner radius to outer radius; values below `1` produce a star |
| `rotation` | `number` | `-90` | Outer-vertex rotation in degrees |

---

### Arrow

A filled/stroked arrow primitive parameterized by head and shaft proportions.

```json
{
  "type": "arrow",
  "location": "10,60",
  "size": "140x40",
  "headLengthScale": 0.35,
  "headWidthScale": 0.7,
  "shaftWidthScale": 0.3,
  "fill": "Orange",
  "stroke": "Black,2"
}
```

**Type string:** `"arrow"`
**Capabilities:** fill, stroke, move, resize, rotate, point editing

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `location` | `string` | — | Upper-left bounds origin as `"x,y"` |
| `size` | `string` | — | Bounding size as `"widthxheight"` |
| `headLengthScale` | `number` | `0.35` | Fraction of total width used by the arrow head |
| `headWidthScale` | `number` | `0.7` | Fraction of total height used by the arrow head |
| `shaftWidthScale` | `number` | `0.3` | Fraction of total height used by the shaft |

---

### Wedge / Sector

A filled/stroked sector primitive defined by an elliptical bounding box and angular sweep.

```json
{
  "type": "wedge",
  "location": "140,20",
  "size": "120x120",
  "startAngle": 270,
  "endAngle": 45,
  "fill": "Teal",
  "stroke": "Black,2"
}
```

**Type string:** `"wedge"`
**Capabilities:** fill, stroke, move, resize, rotate, point editing

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `location` | `string` | — | Upper-left bounds origin as `"x,y"` |
| `size` | `string` | — | Bounding size as `"widthxheight"` |
| `startAngle` | `number` | `270` | Sector start angle in degrees |
| `endAngle` | `number` | `90` | Sector end angle in degrees |

---

### Ring / Annulus

A filled/stroked annular shape defined by outer bounds and an inner radius scale.

```json
{
  "type": "ring",
  "location": "200,20",
  "size": "120x120",
  "innerRadiusScale": 0.55,
  "fill": "Purple",
  "stroke": "Black,1"
}
```

**Type string:** `"ring"`
**Capabilities:** fill, stroke, move, resize, rotate, point editing

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `location` | `string` | — | Upper-left bounds origin as `"x,y"` |
| `size` | `string` | — | Bounding size as `"widthxheight"` |
| `innerRadiusScale` | `number` | `0.55` | Ratio of inner radius to outer radius |

---

### Polygon

A closed filled/stroked shape defined by an array of vertices.

```json
{
  "type": "polygon",
  "points": "10,10 100,10 100,100 10,100",
  "fill": "Yellow",
  "stroke": "Black",
  "winding": 2
}
```

**Type string:** `"polygon"`
**Capabilities:** fill, stroke, move, resize, point editing

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `points` | `string` | — | Space-separated point list as `"x,y x,y ..."` |
| `winding` | `number` | `1` (NonZero) | Fill winding rule: `1` = NonZero, `2` = EvenOdd |

> **Note:** The path is automatically closed during rendering.

---

### Polyline

An open line strip connecting multiple points, optionally smoothed.

```json
{
  "type": "polyline",
  "points": "10,10 50,80 100,20 150,90",
  "stroke": "Blue,3",
  "smoothPoints": true
}
```

**Type string:** `"polyline"`
**Capabilities:** stroke, move, resize, point editing
**Cannot:** fill

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `points` | `string` | — | Space-separated point list as `"x,y x,y ..."` |
| `smoothPoints` | `boolean` | `false` | When `true`, uses quadratic curve interpolation between points |

---

### Text

Renders single or multi-line text with font styling, alignment, and word wrapping.

```json
{
  "type": "text",
  "text": "Hello, World!",
  "location": "10,20",
  "size": "200x100",
  "typeface": "Arial, sans-serif",
  "typesize": 16,
  "typestyle": "bold,italic",
  "alignment": "center,middle",
  "fill": "Black"
}
```

**Type string:** `"text"`
**Capabilities:** fill, stroke, move, resize

| Property | Type | Description |
|----------|------|-------------|
| `text` | `string` | Text content (supports `\n` for line breaks). Mutually exclusive with `source`. |
| `source` | `string` | Text resource key (fetches text from ResourceManager). Mutually exclusive with `text`. |
| `typeface` | `string` | Comma-separated font family names (e.g., `"Arial, sans-serif"`) |
| `typesize` | `number` | Font size in pixels |
| `typestyle` | `string` | Comma-separated font styles: `"bold"`, `"italic"`, `"bold,italic"` |
| `alignment` | `string` | Comma-separated alignment directives |

#### Alignment Values

| Horizontal | Vertical |
|-----------|----------|
| `start` | `top` |
| `end` | `bottom` |
| `left` | `middle` |
| `right` | |
| `center` | |

Example: `"center,middle"` centers text both horizontally and vertically within its bounds.

> Text is automatically word-wrapped to fit within the element's `size` width.

---

### Image

Renders a bitmap image from a resource reference.

```json
{
  "type": "image",
  "source": "my-bitmap-key",
  "location": "10,20",
  "size": "200x150",
  "opacity": 0.8
}
```

**Type string:** `"image"`
**Capabilities:** stroke (outline only), move, resize
**Cannot:** fill

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `source` | `string` | — | Bitmap resource key |
| `opacity` | `number` | `1` | Opacity from `0` (transparent) to `1` (opaque). Omitted if `1`. |

---

### Model Element (Nested Model)

Renders an embedded or externally referenced model within the parent model.

```json
{
  "type": "model",
  "source": "my-model-key",
  "location": "10,20",
  "size": "400x300",
  "opacity": 0.9
}
```

**Type string:** `"model"` (same as root; distinguished by context as a child element)
**Capabilities:** move, resize

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `source` | `string` | — | Model resource key |
| `opacity` | `number` | `1` | Opacity from `0` to `1`. Omitted if `1`. |

> When the inner model has a different size than the element, it is scaled to fit.

---

### Sprite

Renders animated frames from bitmap resources with transition effects between frames.

```json
{
  "type": "sprite",
  "location": "10,20",
  "size": "64x64",
  "frames": [
    {
      "source": "spritesheet",
      "x": 0,
      "y": 0,
      "width": 64,
      "height": 64,
      "duration": 0.5,
      "transition": "fade",
      "transitionDuration": 0.2
    },
    {
      "source": "spritesheet",
      "x": 64,
      "y": 0,
      "width": 64,
      "height": 64,
      "duration": 0.5,
      "transition": "",
      "transitionDuration": 0
    }
  ]
}
```

**Type string:** `"sprite"`
**Capabilities:** move, resize

| Property | Type | Description |
|----------|------|-------------|
| `frames` | `SpriteFrame[]` | Array of animation frames |

#### SpriteFrame Object

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `source` | `string` | — | Bitmap resource key |
| `x` | `number` | — | Source X coordinate within bitmap |
| `y` | `number` | — | Source Y coordinate within bitmap |
| `width` | `number` | — | Source region width |
| `height` | `number` | — | Source region height |
| `duration` | `number` | — | Frame display duration in seconds |
| `transition` | `string` | `""` | Transition effect name (see [Transitions](#transitions)) |
| `transitionDuration` | `number` | `0` | Transition duration in seconds |
| `opacity` | `number` | `1` | Frame opacity 0–1 |

---

## Resource Types

Resources are shared assets referenced by elements via string keys. Resources support locale-based variants for internationalization.

### Bitmap Resource

```json
{
  "type": "bitmap",
  "key": "my-image",
  "uri": "/images/photo.png",
  "locale": "en-US",
  "size": "200x150"
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `string` | Yes | Always `"bitmap"` |
| `key` | `string` | No* | Unique resource identifier |
| `uri` | `string` | Yes | Image source URI |
| `locale` | `string` | No | Locale identifier (e.g., `"en-US"`) |
| `size` | `string` | No | Image dimensions as `"widthxheight"` |

#### URI Resolution

| URI Format | Resolution |
|------------|------------|
| `:path` | Relative to model's local resource path |
| `/path` | Relative to model's base path |
| `http://` or `https://` | Absolute remote URL |
| Other | Treated as embedded reference |

### Model Resource

```json
{
  "type": "model",
  "key": "sub-model",
  "uri": "/models/widget",
  "locale": "en-US",
  "size": "400x300"
}
```

Or with an embedded model:

```json
{
  "type": "model",
  "key": "inline-model",
  "model": {
    "type": "model",
    "size": "200x100",
    "elements": [ ... ]
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `string` | Yes | Always `"model"` |
| `key` | `string` | No* | Unique resource identifier |
| `uri` | `string` | No | Model JSON source path |
| `model` | `object` | No | Inline embedded model JSON (mutually exclusive with `uri`) |
| `locale` | `string` | No | Locale identifier |
| `size` | `string` | No | Model dimensions as `"widthxheight"` |

### Text Resource

```json
{
  "type": "text",
  "key": "greeting",
  "text": "Hello, World!",
  "locale": "en-US"
}
```

Or URI-based:

```json
{
  "type": "text",
  "key": "article",
  "uri": "/text/article-en.txt",
  "locale": "en-US"
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `type` | `string` | Yes | Always `"text"` |
| `key` | `string` | No* | Unique resource identifier |

> **Resource key note:** `key` is strongly recommended and required for resource lookup by elements, but parser logic does not hard-fail when missing.
| `text` | `string` | No | Inline text content (mutually exclusive with `uri`) |
| `uri` | `string` | No | Text file source path |
| `locale` | `string` | No | Locale identifier |

### Resource Locale Resolution

When a resource is requested with a locale, the manager uses the following fallback chain:

1. **Exact match:** key + full locale (e.g., `"en-US"`)
2. **Language match:** key + language part (e.g., `"en"`)
3. **Generic match:** key with no locale
4. **Key-only match:** any resource with matching key

---

## Fill Formats

Element fills support multiple formats:

### Solid Color

A named color or hex string:

```json
"fill": "Red"
"fill": "#FF0000"
"fill": "#FF000080"
"fill": "rgb(255,0,0)"
"fill": "rgba(255,0,0,0.5)"
```

| Format | Description |
|--------|-------------|
| Named color | Any of 150+ CSS named colors (e.g., `"AliceBlue"`, `"Red"`) |
| `#rrggbb` | 6-digit hex RGB |
| `#rrggbbaa` | 8-digit hex with alpha (web/CSS order) |
| `#rgb` | 3-digit shorthand hex RGB |
| `#rgba` | 4-digit shorthand hex RGBA (web/CSS order) |
| `rgb(r,g,b)` | CSS rgb string |
| `rgba(r,g,b,a)` | CSS rgba string (`a` in range 0..1) |

### Image Fill (Tiled Pattern)

Reference a bitmap resource as a repeating tile fill:

```json
"fill": "image(my-bitmap-key)"
"fill": "image(0.5;my-bitmap-key)"
```

Format: `image(resourceKey)` or `image(opacity;resourceKey)`

### Model Fill (Tiled Pattern)

Reference a model resource as a repeating tile fill:

```json
"fill": "model(my-model-key)"
"fill": "model(0.8;my-model-key)"
```

Format: `model(resourceKey)` or `model(opacity;resourceKey)`

### Linear Gradient Fill

```json
"fill": {
  "type": "linearGradient",
  "start": "0,0",
  "end": "200,0",
  "stops": [
    { "color": "Red", "offset": 0 },
    { "color": "Blue", "offset": 1 }
  ]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Always `"linearGradient"` |
| `start` | `string` | Gradient start point as `"x,y"` |
| `end` | `string` | Gradient end point as `"x,y"` |
| `stops` | `GradientStop[]` | Array of color stops |

### Radial Gradient Fill

```json
"fill": {
  "type": "radialGradient",
  "center": "100,100",
  "focus": "80,80",
  "radiusX": 100,
  "radiusY": 100,
  "stops": [
    { "color": "White", "offset": 0 },
    { "color": "Black", "offset": 1 }
  ]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Always `"radialGradient"` |
| `center` | `string` | Center point as `"x,y"` |
| `focus` | `string` | Focal point as `"x,y"` |
| `radiusX` | `number` | Horizontal radius |
| `radiusY` | `number` | Vertical radius |
| `stops` | `GradientStop[]` | Array of color stops |

### Gradient Stop Object

```json
{ "color": "Red", "offset": 0.5 }
```

| Property | Type | Description |
|----------|------|-------------|
| `color` | `string` | Color value (named or hex) |
| `offset` | `number` | Position along gradient (0.0 to 1.0) |

Validation rules:
- `color` must parse as a valid Elise/CSS color string.
- `offset` must be a finite number in the inclusive range `[0, 1]`.

---

## Stroke Format

Strokes are specified as strings with optional width:

| Format | Example | Description |
|--------|---------|-------------|
| `"color"` | `"Black"` | Color only, default width 1 |
| `"color,width"` | `"Red,2"` | Color with explicit width |

Color values follow the same formats as solid fills (named colors, hex).

---

## Transform Format

Transforms are specified as strings with the following syntax:

```
transformType(parameters)[(centerX,centerY)]
```

The optional center point `(cx,cy)` specifies the origin for the transform. When provided, the engine translates to the center, applies the transform, then translates back.

### Supported Transforms

| Transform | Syntax | Example |
|-----------|--------|---------|
| Translate | `translate(dx,dy)` | `translate(10,20)` |
| Scale (uniform) | `scale(s)` | `scale(2)` |
| Scale (non-uniform) | `scale(sx,sy)` | `scale(2,3)` |
| Scale (with center) | `scale(sx,sy)(cx,cy)` | `scale(2)(100,100)` |
| Rotate | `rotate(degrees)` | `rotate(45)` |
| Rotate (with center) | `rotate(degrees)(cx,cy)` | `rotate(90)(50,50)` |
| Skew | `skew(sx,sy)` | `skew(10,5)` |
| Skew (with center) | `skew(sx,sy)(cx,cy)` | `skew(15,10)(30,30)` |
| Matrix | `matrix(a,b,c,d,e,f)` | `matrix(1,0,0,1,5,10)` |
| Matrix (with center) | `matrix(a,b,c,d,e,f)(cx,cy)` | `matrix(1,0,0,1,5,10)(25,25)` |

> Rotation angles are specified in **degrees** (converted to radians internally).

---

## Transitions

Transition effects used in sprite frame changes and surface pane swaps:

| Name | Description |
|------|-------------|
| `fade` | Cross-fade between frames |
| `pushLeft`, `pushRight`, `pushUp`, `pushDown` | Push incoming frame from direction |
| `wipeLeft`, `wipeRight`, `wipeUp`, `wipeDown` | Directional wipe reveal |
| `slideLeft`, `slideRight`, `slideUp`, `slideDown` | Slide variants (8 diagonal + cardinal) |
| `slideLeftUp`, `slideLeftDown`, `slideRightUp`, `slideRightDown` | Diagonal slide |
| `revealLeft`, `revealRight`, `revealUp`, `revealDown` | Reveal variants |
| `revealLeftUp`, `revealLeftDown`, `revealRightUp`, `revealRightDown` | Diagonal reveal |
| `ellipticalIn`, `ellipticalOut` | Elliptical iris transitions |
| `rectangularIn`, `rectangularOut` | Rectangular iris transitions |
| `grid` | Grid pattern transition |
| `expandHorizontal`, `expandVertical` | Expanding bar transitions |
| `zoomIn`, `zoomOut` | Zoom transitions |
| `zoomRotateIn`, `zoomRotateOut` | Zoom with rotation |
| `radar` | Radar sweep transition |

---

## Winding Mode

Used by `path` and `polygon` elements for fill rules:

| Value | Name | Description |
|-------|------|-------------|
| `1` | NonZero | Non-zero winding rule (default) |
| `2` | EvenOdd | Even-odd (alternate) winding rule |

---

## Command System

Elements can declare command handler tags for mouse and timer events. These tags are strings that reference registered command handlers.

### Built-in Commands

| Command | Parameter | Description |
|---------|-----------|-------------|
| `pushFill(color)` | Color value | Push current fill and set new fill |
| `popFill` | — | Restore previous fill |
| `pushStroke(color)` | Color value | Push current stroke and set new stroke |
| `popStroke` | — | Restore previous stroke |
| `pushFrame(index)` | Frame index | Push sprite frame and jump to index |
| `popFrame` | — | Restore previous sprite frame |

### Command String Format

```
commandName(parameter)
```

Example usage in an element:
```json
{
  "type": "rectangle",
  "mouseEnter": "pushFill(Yellow)",
  "mouseLeave": "popFill",
  "click": "myCustomCommand(someParam)"
}
```

---

## Complete Example

```json
{
  "type": "model",
  "size": "800x600",
  "fill": "White",
  "resources": [
    {
      "type": "bitmap",
      "key": "logo",
      "uri": "/images/logo.png",
      "size": "200x100"
    },
    {
      "type": "text",
      "key": "greeting",
      "text": "Welcome!",
      "locale": "en-US"
    }
  ],
  "elements": [
    {
      "type": "rectangle",
      "location": "0,0",
      "size": "800x600",
      "fill": {
        "type": "linearGradient",
        "start": "0,0",
        "end": "0,600",
        "stops": [
          { "color": "LightBlue", "offset": 0 },
          { "color": "White", "offset": 1 }
        ]
      }
    },
    {
      "type": "image",
      "source": "logo",
      "location": "300,50",
      "size": "200x100"
    },
    {
      "type": "text",
      "source": "greeting",
      "location": "200,200",
      "size": "400x50",
      "typeface": "Arial, sans-serif",
      "typesize": 24,
      "typestyle": "bold",
      "alignment": "center,middle",
      "fill": "DarkBlue"
    },
    {
      "type": "ellipse",
      "center": "400,400",
      "radiusX": 100,
      "radiusY": 60,
      "fill": "Gold",
      "stroke": "DarkGoldenRod,2",
      "mouseEnter": "pushFill(Yellow)",
      "mouseLeave": "popFill"
    }
  ]
}
```
