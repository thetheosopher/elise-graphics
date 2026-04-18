# Surface Persistence Specification

**Version:** 1.0
**Format:** JSON
**File Extension:** `.json`

## Overview

This specification defines a JSON-based persistence format for the Surface subsystem, enabling surfaces and their element trees to be serialized, stored, and reconstituted. The design mirrors the existing Model persistence pattern (`parse`/`serialize` with `SerializedData`, factory-based creation) while adding support for multi-surface navigation, enabling complex applications comprised of rich visual content.

A **surface application** is a graph of interconnected surfaces. Each surface contains elements (buttons, text) and layers (images, video, animation, HTML, panes) that together define a visual page. Panes host child surfaces, and **navigation actions** link elements to target surfaces, enabling screen-to-screen flow without imperative code.

## Related Specifications

- [Model Format Specification](MODEL-FORMAT-SPEC.md)
- [API Specification](API-SPEC.md)

---

## Design Principles

1. **Mirror model persistence patterns** — Use `SerializedData`, `parse()`/`serialize()` methods, and factory-based reconstitution identical to existing element and resource persistence.
2. **Optimize for size** — Only serialize non-default values (matching `ElementBase` convention).
3. **Support navigation as data** — Surface-to-surface navigation is expressed declaratively via navigation actions on elements, not via imperative code.
4. **Support embedded and referenced surfaces** — Surfaces may be inlined or referenced by URI, paralleling `ModelResource`'s embedded/external pattern.
5. **Designer-ready** — The format is purposefully structured for tooling: every serialized object has a `type` discriminator, a stable `id`, and a flat property layout suitable for property editors.
6. **Composable** — A `SurfaceResource` can be added to a model's resource collection alongside bitmap and model resources, enabling mixed model+surface applications.

---

## Top-Level Surface Object

```json
{
  "type": "surface",
  "id": "main-menu",
  "width": 1024,
  "height": 768,
  "scale": 1,
  "opacity": 1,
  "backgroundColor": "#1a1a2e",
  "normalImageSource": "images/bg-normal.png",
  "selectedImageSource": "images/bg-selected.png",
  "highlightedImageSource": "images/bg-highlight.png",
  "disabledImageSource": "images/bg-disabled.png",
  "elements": [ ... ],
  "layers": [ ... ]
}
```

### Surface Properties

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surface"` | Yes | Always `"surface"` |
| `id` | `string` | auto-generated | No | Unique surface identifier |
| `width` | `number` | — | Yes | Surface width in logical pixels |
| `height` | `number` | — | Yes | Surface height in logical pixels |
| `scale` | `number` | `1` | No | Rendering scale factor |
| `opacity` | `number` | `1` | No | Rendering opacity (0–1) |
| `backgroundColor` | `string` | — | No | Background fill color |
| `normalImageSource` | `string` | — | No | Normal state background image URL |
| `selectedImageSource` | `string` | — | No | Selected state background image URL |
| `highlightedImageSource` | `string` | — | No | Highlighted state background image URL |
| `disabledImageSource` | `string` | — | No | Disabled state background image URL |
| `translateX` | `number` | `0` | No | X translation offset |
| `translateY` | `number` | `0` | No | Y translation offset |
| `elements` | `SerializedData[]` | `[]` | No | Surface element array (buttons, text) |
| `layers` | `SerializedData[]` | `[]` | No | Surface layer array (image, video, pane, animation, etc.) |

---

## Surface Elements

### Surface Button Element

```json
{
  "type": "surfaceButton",
  "id": "btn-start",
  "left": 100,
  "top": 200,
  "width": 200,
  "height": 60,
  "normalIndex": 0,
  "selectedIndex": 1,
  "highlightedIndex": 2,
  "disabledIndex": 3,
  "isEnabled": true,
  "isSelected": false,
  "isToggle": false,
  "groupId": "nav-group",
  "click": "navigate(settings)"
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfaceButton"` | Yes | Type discriminator |
| `id` | `string` | auto-generated | No | Element identifier |
| `left` | `number` | `0` | No | X coordinate |
| `top` | `number` | `0` | No | Y coordinate |
| `width` | `number` | — | Yes | Element width |
| `height` | `number` | — | Yes | Element height |
| `normalIndex` | `number` | `0` | No | Sprite index for normal state |
| `selectedIndex` | `number` | `0` | No | Sprite index for selected state |
| `highlightedIndex` | `number` | `0` | No | Sprite index for highlighted state |
| `disabledIndex` | `number` | `0` | No | Sprite index for disabled state |
| `isEnabled` | `boolean` | `true` | No | Whether the button is enabled |
| `isSelected` | `boolean` | `false` | No | Whether the button is selected |
| `isToggle` | `boolean` | `false` | No | Toggle mode (checkbox/radio) |
| `groupId` | `string` | — | No | Radio group identifier |
| `click` | `string` | — | No | Click action (see [Navigation Actions](#navigation-actions)) |

---

### Surface Text Element

```json
{
  "type": "surfaceText",
  "id": "title-label",
  "left": 50,
  "top": 30,
  "width": 400,
  "height": 48,
  "content": "Welcome",
  "color": "White",
  "textAlignment": "center,middle",
  "typeFace": "Helvetica",
  "typeSize": 24,
  "typeStyle": "bold",
  "background": "#333333",
  "border": "White,1",
  "padding": 8,
  "click": "navigate(about)"
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfaceText"` | Yes | Type discriminator |
| `id` | `string` | auto-generated | No | Element identifier |
| `left` | `number` | `0` | No | X coordinate |
| `top` | `number` | `0` | No | Y coordinate |
| `width` | `number` | — | Yes | Element width |
| `height` | `number` | — | Yes | Element height |
| `content` | `string` | `""` | No | Text content |
| `color` | `string` | `"Black"` | No | Text color |
| `textAlignment` | `string` | `"left,top"` | No | Horizontal and vertical alignment |
| `typeFace` | `string` | `"sans-serif"` | No | Font family |
| `typeSize` | `number` | `10` | No | Font size |
| `typeStyle` | `string` | `""` | No | Font style (bold, italic, etc.) |
| `background` | `string` | — | No | Background fill color |
| `border` | `string` | — | No | Border stroke specification |
| `padding` | `number` | `0` | No | Content padding |
| `click` | `string` | — | No | Click action (see [Navigation Actions](#navigation-actions)) |

---

## Surface Layers

### Surface Image Layer

```json
{
  "type": "surfaceImage",
  "id": "logo",
  "left": 10,
  "top": 10,
  "width": 200,
  "height": 80,
  "source": "images/logo.png",
  "opacity": 0.9,
  "click": "navigate(home)"
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfaceImage"` | Yes | Type discriminator |
| `id` | `string` | auto-generated | No | Layer identifier |
| `left` | `number` | `0` | No | X coordinate |
| `top` | `number` | `0` | No | Y coordinate |
| `width` | `number` | — | Yes | Layer width |
| `height` | `number` | — | Yes | Layer height |
| `source` | `string` | — | Yes | Image source URL |
| `opacity` | `number` | `1` | No | Layer opacity (0–1) |
| `translateX` | `number` | `0` | No | X translation offset |
| `translateY` | `number` | `0` | No | Y translation offset |
| `click` | `string` | — | No | Click action |

---

### Surface Video Layer

```json
{
  "type": "surfaceVideo",
  "id": "intro-video",
  "left": 0,
  "top": 0,
  "width": 1024,
  "height": 576,
  "source": "media/intro.mp4",
  "loop": true,
  "autoPlay": true,
  "nativeControls": false
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfaceVideo"` | Yes | Type discriminator |
| `id` | `string` | auto-generated | No | Layer identifier |
| `left` | `number` | `0` | No | X coordinate |
| `top` | `number` | `0` | No | Y coordinate |
| `width` | `number` | — | Yes | Layer width |
| `height` | `number` | — | Yes | Layer height |
| `source` | `string` | — | Yes | Video source URL |
| `loop` | `boolean` | `false` | No | Loop playback |
| `autoPlay` | `boolean` | `false` | No | Auto-start playback |
| `nativeControls` | `boolean` | `true` | No | Show native browser controls |
| `opacity` | `number` | `1` | No | Layer opacity |
| `translateX` | `number` | `0` | No | X translation offset |
| `translateY` | `number` | `0` | No | Y translation offset |

---

### Surface HTML Layer

```json
{
  "type": "surfaceHtml",
  "id": "web-content",
  "left": 20,
  "top": 100,
  "width": 600,
  "height": 400,
  "source": "https://example.com/widget",
  "scrolling": "auto",
  "sandbox": true,
  "sandboxPermissions": ["allow-forms", "allow-popups", "allow-scripts"],
  "scaleContent": true
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfaceHtml"` | Yes | Type discriminator |
| `id` | `string` | auto-generated | No | Layer identifier |
| `left` | `number` | `0` | No | X coordinate |
| `top` | `number` | `0` | No | Y coordinate |
| `width` | `number` | — | Yes | Layer width |
| `height` | `number` | — | Yes | Layer height |
| `source` | `string` | — | Yes | HTML source URL |
| `scrolling` | `string` | `"auto"` | No | Scroll behavior |
| `sandbox` | `boolean` | `true` | No | Enable iframe sandbox |
| `sandboxPermissions` | `string[]` | `["allow-forms","allow-popups","allow-scripts"]` | No | Sandbox permissions |
| `scaleContent` | `boolean` | `true` | No | Scale iframe content |
| `opacity` | `number` | `1` | No | Layer opacity |
| `translateX` | `number` | `0` | No | X translation offset |
| `translateY` | `number` | `0` | No | Y translation offset |

---

### Surface Hidden Layer

```json
{
  "type": "surfaceHidden",
  "id": "hotspot-1",
  "left": 300,
  "top": 400,
  "width": 100,
  "height": 50,
  "click": "navigate(details)"
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfaceHidden"` | Yes | Type discriminator |
| `id` | `string` | auto-generated | No | Layer identifier |
| `left` | `number` | `0` | No | X coordinate |
| `top` | `number` | `0` | No | Y coordinate |
| `width` | `number` | — | Yes | Layer width |
| `height` | `number` | — | Yes | Layer height |
| `opacity` | `number` | `1` | No | Layer opacity (transparent click capture) |
| `translateX` | `number` | `0` | No | X translation offset |
| `translateY` | `number` | `0` | No | Y translation offset |
| `click` | `string` | — | No | Click action |

---

### Surface Animation Layer

```json
{
  "type": "surfaceAnimation",
  "id": "banner-anim",
  "left": 0,
  "top": 0,
  "width": 1024,
  "height": 200,
  "loop": true,
  "initialIndex": 0,
  "rememberFrame": false,
  "frames": [
    {
      "id": "frame-1",
      "source": "images/banner1.png",
      "left": 0,
      "top": 0,
      "width": 1024,
      "height": 200,
      "duration": 3,
      "transition": "fade",
      "transitionDuration": 0.5,
      "pauseFrame": false
    },
    {
      "id": "frame-2",
      "source": "images/banner2.png",
      "left": 0,
      "top": 0,
      "width": 1024,
      "height": 200,
      "duration": 3,
      "transition": "fade",
      "transitionDuration": 0.5,
      "pauseFrame": false
    }
  ],
  "click": "navigate(gallery)"
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfaceAnimation"` | Yes | Type discriminator |
| `id` | `string` | auto-generated | No | Layer identifier |
| `left` | `number` | `0` | No | X coordinate |
| `top` | `number` | `0` | No | Y coordinate |
| `width` | `number` | — | Yes | Layer width |
| `height` | `number` | — | Yes | Layer height |
| `loop` | `boolean` | `false` | No | Loop animation |
| `initialIndex` | `number` | `0` | No | Starting frame index |
| `rememberFrame` | `boolean` | `false` | No | Remember last frame when navigating away |
| `frames` | `SurfaceAnimationFrame[]` | `[]` | No | Animation frame definitions |
| `opacity` | `number` | `1` | No | Layer opacity |
| `translateX` | `number` | `0` | No | X translation offset |
| `translateY` | `number` | `0` | No | Y translation offset |
| `click` | `string` | — | No | Click action |

#### Surface Animation Frame

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `id` | `string` | auto-generated | No | Frame identifier |
| `source` | `string` | — | Yes | Frame image source URL |
| `left` | `number` | `0` | No | Crop region X |
| `top` | `number` | `0` | No | Crop region Y |
| `width` | `number` | — | Yes | Crop region width |
| `height` | `number` | — | Yes | Crop region height |
| `duration` | `number` | `1` | No | Frame duration in seconds |
| `transition` | `string` | `""` | No | Transition type name |
| `transitionDuration` | `number` | `0` | No | Transition duration in seconds |
| `pauseFrame` | `boolean` | `false` | No | Pause until user taps |

---

### Surface Pane

Panes are containers that host child surfaces. They are the primary mechanism for navigation and composition.

```json
{
  "type": "surfacePane",
  "id": "content-pane",
  "left": 0,
  "top": 80,
  "width": 1024,
  "height": 688,
  "childSurface": {
    "type": "surface",
    "id": "home-page",
    "width": 1024,
    "height": 688,
    "elements": [ ... ],
    "layers": [ ... ]
  },
  "transition": "fade",
  "transitionDuration": 0.3
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfacePane"` | Yes | Type discriminator |
| `id` | `string` | auto-generated | No | Pane identifier |
| `left` | `number` | `0` | No | X coordinate |
| `top` | `number` | `0` | No | Y coordinate |
| `width` | `number` | — | Yes | Pane width |
| `height` | `number` | — | Yes | Pane height |
| `childSurface` | `Surface` | — | No | Embedded child surface definition (inline) |
| `childSurfaceId` | `string` | — | No | Reference to child surface by ID (for referenced surfaces) |
| `transition` | `string` | — | No | Default transition for surface replacement |
| `transitionDuration` | `number` | `0.3` | No | Default transition duration in seconds |
| `opacity` | `number` | `1` | No | Pane opacity |
| `translateX` | `number` | `0` | No | X translation offset |
| `translateY` | `number` | `0` | No | Y translation offset |

> **Note:** A pane uses either `childSurface` (embedded) or `childSurfaceId` (referenced) to specify its initial content. When `childSurfaceId` is used, the surface is resolved from the containing `SurfaceApplication`'s surface collection.

---

### Surface Radio Strip

```json
{
  "type": "surfaceRadioStrip",
  "id": "tab-strip",
  "left": 0,
  "top": 0,
  "width": 1024,
  "height": 60,
  "orientation": "horizontal",
  "buttonLeft": 2,
  "buttonTop": 2,
  "buttonWidth": 150,
  "buttonHeight": 56,
  "normalIndex": 0,
  "selectedIndex": 1,
  "highlightedIndex": 2,
  "normalColor": "#CCCCCC",
  "selectedColor": "#FFFFFF",
  "highlightedColor": "#EEEEEE",
  "textAlignment": "center,middle",
  "typeFace": "Helvetica",
  "typeSize": 14,
  "typeStyle": "bold",
  "padding": 4,
  "items": [
    { "id": "tab-home", "text": "Home", "isSelected": true },
    { "id": "tab-gallery", "text": "Gallery" },
    { "id": "tab-settings", "text": "Settings" }
  ]
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfaceRadioStrip"` | Yes | Type discriminator |
| `id` | `string` | auto-generated | No | Strip identifier |
| `left` | `number` | `0` | No | X coordinate |
| `top` | `number` | `0` | No | Y coordinate |
| `width` | `number` | — | Yes | Strip total width |
| `height` | `number` | — | Yes | Strip total height |
| `orientation` | `string` | `"horizontal"` | No | `"horizontal"` or `"vertical"` |
| `buttonLeft` | `number` | `0` | No | Button template left offset |
| `buttonTop` | `number` | `0` | No | Button template top offset |
| `buttonWidth` | `number` | — | Yes | Individual button width |
| `buttonHeight` | `number` | — | Yes | Individual button height |
| `normalIndex` | `number` | `0` | No | Sprite index for normal state |
| `selectedIndex` | `number` | `0` | No | Sprite index for selected state |
| `highlightedIndex` | `number` | `0` | No | Sprite index for highlighted state |
| `normalColor` | `string` | `""` | No | Normal state text color |
| `selectedColor` | `string` | `""` | No | Selected state text color |
| `highlightedColor` | `string` | `""` | No | Highlighted state text color |
| `textAlignment` | `string` | `""` | No | Text alignment |
| `typeFace` | `string` | `""` | No | Font family |
| `typeSize` | `number` | `0` | No | Font size |
| `typeStyle` | `string` | `""` | No | Font style |
| `padding` | `number` | `0` | No | Item padding |
| `items` | `SurfaceRadioStripItem[]` | `[]` | No | Strip items |
| `opacity` | `number` | `1` | No | Strip opacity |
| `translateX` | `number` | `0` | No | X translation offset |
| `translateY` | `number` | `0` | No | Y translation offset |

#### Surface Radio Strip Item

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `id` | `string` | auto-generated | No | Item identifier |
| `text` | `string` | `""` | No | Display text |
| `isSelected` | `boolean` | `false` | No | Whether selected |

---

## Navigation Actions

Navigation actions are string expressions assigned to `click` properties on surface elements and layers. They provide declarative inter-surface linking, enabling complex application flows without imperative code.

### Action Format

```
action(target)
action(target,param1,param2,...)
```

### Supported Actions

| Action | Format | Description |
|--------|--------|-------------|
| `navigate` | `navigate(surfaceId)` | Replace the nearest ancestor pane's content with the referenced surface |
| `navigate` | `navigate(surfaceId,transition)` | Navigate with transition effect |
| `navigate` | `navigate(surfaceId,transition,duration)` | Navigate with transition and duration |
| `navigatePane` | `navigatePane(paneId,surfaceId)` | Replace a specific pane's content with the referenced surface |
| `navigatePane` | `navigatePane(paneId,surfaceId,transition,duration)` | Targeted pane navigation with transition |
| `navigateBack` | `navigateBack()` | Navigate to the previous surface in the pane's history |
| `navigateBack` | `navigateBack(transition,duration)` | Navigate back with transition |

### Transitions

All pane transitions from the existing `SurfacePane.replaceSurface` are supported:

`fade`, `pushleft`, `pushright`, `pushup`, `pushdown`, `wipeleft`, `wiperight`, `wipeup`, `wipedown`, `wipeleftup`, `wipeleftdown`, `wiperightup`, `wiperightdown`, `wipein`, `wipeinx`, `wipeiny`, `wipeoutx`, `wipeouty`, `revealleft`, `revealright`, `revealup`, `revealdown`, `revealleftup`, `revealleftdown`, `revealrightup`, `revealrightdown`, `slideleft`, `slideright`, `slideup`, `slidedown`, `slideleftup`, `slideleftdown`, `sliderightup`, `sliderightdown`

### Navigation Resolution

When a `navigate(surfaceId)` action fires:

1. The system finds the nearest ancestor `SurfacePane` containing the element that triggered the action.
2. The target surface is resolved from the `SurfaceApplication`'s `surfaces` collection by `id`.
3. The pane's `replaceSurface` method is called with the resolved surface and optional transition.

When a `navigatePane(paneId, surfaceId)` action fires:

1. The system finds the `SurfacePane` with the given `paneId` in the root surface tree.
2. The target surface is resolved from the `SurfaceApplication`'s `surfaces` collection.
3. The pane's `replaceSurface` method is called.

---

## Surface Application

A `SurfaceApplication` is the top-level container that defines a complete navigable application. It holds a collection of named surfaces and designates a root surface.

```json
{
  "type": "surfaceApplication",
  "id": "my-app",
  "version": "1.0",
  "title": "My Application",
  "width": 1024,
  "height": 768,
  "scale": 1,
  "rootSurfaceId": "main-menu",
  "surfaces": [
    {
      "type": "surface",
      "id": "main-menu",
      "width": 1024,
      "height": 768,
      "elements": [ ... ],
      "layers": [ ... ]
    },
    {
      "type": "surface",
      "id": "settings",
      "width": 1024,
      "height": 768,
      "elements": [ ... ],
      "layers": [ ... ]
    }
  ],
  "resources": [ ... ]
}
```

### Surface Application Properties

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surfaceApplication"` | Yes | Always `"surfaceApplication"` |
| `id` | `string` | auto-generated | No | Application identifier |
| `version` | `string` | — | No | Application version string |
| `title` | `string` | — | No | Application display title |
| `width` | `number` | — | Yes | Application viewport width |
| `height` | `number` | — | Yes | Application viewport height |
| `scale` | `number` | `1` | No | Rendering scale factor |
| `rootSurfaceId` | `string` | — | Yes | ID of the initial root surface |
| `surfaces` | `Surface[]` | `[]` | Yes | Collection of all navigable surfaces |
| `resources` | `SerializedData[]` | `[]` | No | Shared resource definitions (bitmaps, models, etc.) |

---

## SurfaceResource

A `SurfaceResource` is a new resource type that embeds or references a serialized surface within a model's resource collection. This parallels `ModelResource` and enables mixed model + surface content.

```json
{
  "type": "surface",
  "key": "settings-panel",
  "locale": "en-US",
  "surface": {
    "type": "surface",
    "id": "settings",
    ...
  }
}
```

Alternatively, referenced by URI:

```json
{
  "type": "surface",
  "key": "settings-panel",
  "uri": "surfaces/settings.json"
}
```

| Property | Type | Default | Required | Description |
|----------|------|---------|----------|-------------|
| `type` | `string` | `"surface"` | Yes | Resource type tag |
| `key` | `string` | — | Yes | Resource key |
| `locale` | `string` | — | No | Locale identifier |
| `uri` | `string` | — | No | External surface URI (mutually exclusive with `surface`) |
| `surface` | `Surface` | — | No | Embedded surface definition (mutually exclusive with `uri`) |

---

## Implementation Architecture

### New Classes

| Class | File | Extends | Description |
|-------|------|---------|-------------|
| `SurfaceElementFactory` | `surface/surface-element-factory.ts` | — | Registry-based factory for surface element/layer types |
| `SurfaceResource` | `resource/surface-resource.ts` | `Resource` | Embedded/referenced surface resource |
| `SurfaceApplication` | `surface/surface-application.ts` | — | Top-level navigable application container |
| `NavigationAction` | `surface/navigation-action.ts` | — | Parses and executes navigation action strings |

### Modified Classes (add `parse`/`serialize` methods)

| Class | Type Tag |
|-------|----------|
| `Surface` | `"surface"` |
| `SurfaceElement` | (base — shared parse/serialize) |
| `SurfaceButtonElement` | `"surfaceButton"` |
| `SurfaceTextElement` | `"surfaceText"` |
| `SurfaceLayer` | (base — shared parse/serialize) |
| `SurfaceImageLayer` | `"surfaceImage"` |
| `SurfaceVideoLayer` | `"surfaceVideo"` |
| `SurfaceHtmlLayer` | `"surfaceHtml"` |
| `SurfaceHiddenLayer` | `"surfaceHidden"` |
| `SurfaceAnimationLayer` | `"surfaceAnimation"` |
| `SurfaceAnimationFrame` | `"surfaceAnimationFrame"` |
| `SurfacePane` | `"surfacePane"` |
| `SurfaceRadioStrip` | `"surfaceRadioStrip"` |
| `SurfaceRadioStripItem` | `"surfaceRadioStripItem"` |

### SurfaceElementFactory Pattern

Mirrors `ElementFactory` and `ResourceFactory`:

```typescript
export class SurfaceElementFactory {
    public static ElementCreators: SurfaceElementCreatorRegistration[] = [];

    public static registerCreator(name: string, creator: ISurfaceElementCreator): void;
    public static create(name: string): SurfaceElement | undefined;
}
```

Each surface element/layer class registers itself at module load:

```typescript
SurfaceElementFactory.registerCreator('surfaceButton', {
    create: () => new SurfaceButtonElement('', 0, 0, 0, 0)
});
```

### Surface.parse / Surface.serialize Pattern

```typescript
// Static parse from JSON string
public static parse(json: string): Surface {
    const o = JSON.parse(json);
    const surface = new Surface(o.width, o.height, o.id, o.scale);
    surface.parseData(o);
    return surface;
}

// Instance parse from SerializedData
public parseData(o: SerializedData): void {
    // Parse scalar properties
    if (o.opacity !== undefined) this.opacity = o.opacity as number;
    if (o.backgroundColor) this.backgroundColor = o.backgroundColor as string;
    // ... etc for all properties

    // Parse elements via factory
    if (o.elements) {
        for (const elementData of o.elements as SerializedData[]) {
            const element = SurfaceElementFactory.create(elementData.type);
            if (element) {
                element.parse(elementData);
                this.elements.push(element);
            }
        }
    }

    // Parse layers via factory
    if (o.layers) {
        for (const layerData of o.layers as SerializedData[]) {
            const layer = SurfaceElementFactory.create(layerData.type);
            if (layer instanceof SurfaceLayer) {
                layer.parse(layerData);
                this.layers.push(layer);
            }
        }
    }
}

// Serialize to SerializedData
public serialize(): SerializedData {
    const o: SerializedData = {
        type: 'surface',
        width: this.width,
        height: this.height,
    };
    if (this.id) o.id = this.id;
    if (this.scale !== 1) o.scale = this.scale;
    if (this.opacity !== 1) o.opacity = this.opacity;
    // ... etc, only non-default values

    if (this.elements.length > 0) {
        o.elements = this.elements.map(e => e.serialize());
    }
    if (this.layers.length > 0) {
        o.layers = this.layers.map(l => l.serialize());
    }
    return o;
}

// Convenience methods
public formattedJSON(): string {
    return JSON.stringify(this.serialize(), null, ' ');
}

public rawJSON(): string {
    return JSON.stringify(this.serialize());
}
```

### SurfaceApplication.parse / SurfaceApplication.serialize

```typescript
public static parse(json: string): SurfaceApplication {
    const o = JSON.parse(json);
    const app = new SurfaceApplication(o.width, o.height);
    app.parseData(o);
    return app;
}

public parseData(o: SerializedData): void {
    if (o.id) this.id = o.id as string;
    if (o.version) this.version = o.version as string;
    if (o.title) this.title = o.title as string;
    if (o.scale !== undefined) this.scale = o.scale as number;
    if (o.rootSurfaceId) this.rootSurfaceId = o.rootSurfaceId as string;

    if (o.resources) {
        for (const resData of o.resources as SerializedData[]) {
            const res = ResourceFactory.create(resData.type);
            if (res) {
                res.parse(resData);
                this.resources.push(res);
            }
        }
    }

    if (o.surfaces) {
        for (const surfData of o.surfaces as SerializedData[]) {
            const surface = new Surface(
                surfData.width as number,
                surfData.height as number,
                surfData.id as string,
                surfData.scale as number
            );
            surface.parseData(surfData);
            this.surfaces.push(surface);
        }
    }
}

public serialize(): SerializedData {
    const o: SerializedData = {
        type: 'surfaceApplication',
        width: this.width,
        height: this.height,
        rootSurfaceId: this.rootSurfaceId,
    };
    if (this.id) o.id = this.id;
    if (this.version) o.version = this.version;
    if (this.title) o.title = this.title;
    if (this.scale !== 1) o.scale = this.scale;

    if (this.resources.length > 0) {
        o.resources = this.resources.map(r => r.serialize());
    }
    if (this.surfaces.length > 0) {
        o.surfaces = this.surfaces.map(s => s.serialize());
    }
    return o;
}
```

### NavigationAction

Parses action strings and executes against panes:

```typescript
export class NavigationAction {
    public static parse(action: string): NavigationAction | undefined;

    public action: string;       // 'navigate' | 'navigatePane' | 'navigateBack'
    public targetSurfaceId?: string;
    public targetPaneId?: string;
    public transition?: string;
    public duration?: number;

    public execute(app: SurfaceApplication, sourceSurface: Surface): void;
}
```

### Navigation History

Each `SurfacePane` gets a `navigationHistory: string[]` property that tracks surface IDs. When a `navigateBack()` action fires, the previous ID is popped and used to resolve the surface from the application.

---

## Integration with Model System

### Resource Registration

```typescript
// In surface-resource.ts, at module level:
ResourceFactory.registerCreator('surface', {
    create: () => new SurfaceResource()
});
```

This enables `ResourceFactory.create('surface')` to work in the existing `Model.parse()` flow.

### Export Updates

All new classes are exported from `src/index.ts`:

```typescript
export { SurfaceApplication } from './surface/surface-application';
export { SurfaceElementFactory } from './surface/surface-element-factory';
export { SurfaceResource } from './resource/surface-resource';
export { NavigationAction } from './surface/navigation-action';
```

---

## Round-Trip Fidelity

The serialization format guarantees that for any surface `s`:

```typescript
const json = s.formattedJSON();
const s2 = Surface.parse(json);
assert.deepEqual(s.serialize(), s2.serialize());
```

And for applications:

```typescript
const json = app.formattedJSON();
const app2 = SurfaceApplication.parse(json);
assert.deepEqual(app.serialize(), app2.serialize());
```

DOM runtime state (event handlers, HTML elements, controller references) is **not** serialized. Only structural/visual properties persist.

---

## Example: Tab-Based Application

```json
{
  "type": "surfaceApplication",
  "id": "photo-viewer",
  "title": "Photo Viewer",
  "width": 1024,
  "height": 768,
  "rootSurfaceId": "shell",
  "surfaces": [
    {
      "type": "surface",
      "id": "shell",
      "width": 1024,
      "height": 768,
      "backgroundColor": "#1a1a2e",
      "elements": [],
      "layers": [
        {
          "type": "surfaceRadioStrip",
          "id": "tab-bar",
          "left": 0,
          "top": 0,
          "width": 1024,
          "height": 60,
          "orientation": "horizontal",
          "buttonWidth": 200,
          "buttonHeight": 56,
          "normalColor": "#AAAAAA",
          "selectedColor": "#FFFFFF",
          "typeFace": "Helvetica",
          "typeSize": 16,
          "items": [
            { "id": "tab-gallery", "text": "Gallery", "isSelected": true },
            { "id": "tab-favorites", "text": "Favorites" },
            { "id": "tab-settings", "text": "Settings" }
          ]
        },
        {
          "type": "surfacePane",
          "id": "content-pane",
          "left": 0,
          "top": 60,
          "width": 1024,
          "height": 708,
          "childSurfaceId": "gallery-page",
          "transition": "fade",
          "transitionDuration": 0.3
        }
      ]
    },
    {
      "type": "surface",
      "id": "gallery-page",
      "width": 1024,
      "height": 708,
      "elements": [
        {
          "type": "surfaceText",
          "id": "gallery-title",
          "left": 20,
          "top": 10,
          "width": 400,
          "height": 40,
          "content": "Photo Gallery",
          "color": "White",
          "typeSize": 24,
          "typeStyle": "bold"
        }
      ],
      "layers": [
        {
          "type": "surfaceImage",
          "id": "photo-1",
          "left": 20,
          "top": 60,
          "width": 300,
          "height": 200,
          "source": "photos/landscape.jpg",
          "click": "navigate(photo-detail)"
        }
      ]
    },
    {
      "type": "surface",
      "id": "photo-detail",
      "width": 1024,
      "height": 708,
      "layers": [
        {
          "type": "surfaceImage",
          "id": "full-photo",
          "left": 0,
          "top": 0,
          "width": 1024,
          "height": 658,
          "source": "photos/landscape-full.jpg"
        }
      ],
      "elements": [
        {
          "type": "surfaceButton",
          "id": "back-btn",
          "left": 20,
          "top": 668,
          "width": 100,
          "height": 30,
          "click": "navigateBack(slideleft,0.3)"
        }
      ]
    },
    {
      "type": "surface",
      "id": "favorites-page",
      "width": 1024,
      "height": 708,
      "elements": [
        {
          "type": "surfaceText",
          "id": "fav-title",
          "left": 20,
          "top": 10,
          "width": 400,
          "height": 40,
          "content": "Favorites",
          "color": "White",
          "typeSize": 24
        }
      ],
      "layers": []
    },
    {
      "type": "surface",
      "id": "settings-page",
      "width": 1024,
      "height": 708,
      "elements": [
        {
          "type": "surfaceText",
          "id": "settings-title",
          "left": 20,
          "top": 10,
          "width": 400,
          "height": 40,
          "content": "Settings",
          "color": "White",
          "typeSize": 24
        }
      ],
      "layers": []
    }
  ]
}
```

---

## Implementation Order

1. **SurfaceElement parse/serialize** — Add `parse()`/`serialize()` to `SurfaceElement` base class
2. **SurfaceLayer parse/serialize** — Add `parse()`/`serialize()` to `SurfaceLayer` base class
3. **Concrete element/layer parse/serialize** — Add to each concrete class
4. **SurfaceAnimationFrame parse/serialize** — Frame persistence
5. **SurfaceRadioStripItem parse/serialize** — Strip item persistence
6. **SurfaceElementFactory** — Factory for creating surface elements by type tag
7. **Surface parse/serialize** — Full surface persistence
8. **NavigationAction** — Action parser and executor
9. **SurfaceApplication** — Application container with surface collection and navigation
10. **SurfaceResource** — Resource type for model integration
11. **Export updates** — Wire into `src/index.ts`
12. **Tests** — Round-trip tests for all types
