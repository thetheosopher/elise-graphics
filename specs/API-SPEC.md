# Elise Graphics Library API Specification

**Version:** 1.0
**Language:** TypeScript
**Target:** HTML5 Canvas 2D

## Overview

Elise is a retained-mode 2D graphics library built on the HTML5 Canvas API. It provides a scene-graph model of elements and resources that can be rendered, interacted with, designed, and animated. The library is structured into the following major subsystems:

## Related Specifications

- [Model Format Specification](MODEL-FORMAT-SPEC.md)
- [Modernization Recommendations](MODERNIZATION-RECOMMENDATIONS.md)

| Module | Purpose |
|--------|---------|
| **Core** | Fundamental types (Point, Size, Region, Color, Matrix2D), Model container, event system |
| **Elements** | Visual primitives (Rectangle, Ellipse, Line, Path, Arc, RegularPolygon, Arrow, Wedge, Ring, Polygon, Polyline, Text, Image, Sprite, ModelElement) |
| **Resources** | Shared assets (BitmapResource, ModelResource, TextResource) with locale support |
| **Fills** | Fill strategies (solid, gradient, image/model patterns) |
| **View** | Read-only model rendering with mouse interaction |
| **Design** | Interactive model editor with selection, handles, grid, drag-and-drop |
| **Command** | Event-driven command dispatch system |
| **Surface** | High-level application framework with layers (image, HTML, video, hidden) |
| **Sketcher** | Progressive drawing animation engine |
| **Transitions** | 38+ visual transition effects and 31 easing functions |

---

## Core Types

### Point

Represents a 2D coordinate.

```typescript
class Point {
  x: number;
  y: number;

  static Origin: Point;                                    // (0, 0)
  static create(x: number, y: number): Point;
  static parse(source: string | Point): Point;             // Parses "x,y" or clones Point
  static scale(point: Point, scaleX: number, scaleY: number,
               baseX?: number, baseY?: number): Point;     // Scale with optional pivot

  clone(): Point;
  withX(x: number): Point;
  withY(y: number): Point;
  equals(that: Point): boolean;
  toString(): string;                                      // Returns "x,y"
}
```

### Size

Represents rectangular dimensions.

```typescript
class Size {
  readonly width: number;
  readonly height: number;

  static Empty: Size;                                      // (0, 0)
  static create(width: number, height: number): Size;
  static parse(source: string | Size): Size;               // Parses "WxH" or clones Size
  static scale(s: Size, scaleX: number, scaleY: number): Size;

  clone(): Size;
  withWidth(width: number): Size;
  withHeight(height: number): Size;
  equals(that: Size): boolean;
  toString(): string;                                      // Returns "WxH"
}
```

### Region

Represents a rectangular area with position and dimensions.

```typescript
class Region {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly size: Size;
  readonly location: Point;

  static create(x: number, y: number, width: number, height: number): Region;

  clone(): Region;
  withX(x: number): Region;
  withY(y: number): Region;
  withWidth(width: number): Region;
  withHeight(height: number): Region;
  withLocation(location: Point): Region;
  withSize(size: Size): Region;
  containsPoint(point: Point): boolean;
  containsCoordinate(x: number, y: number): boolean;
  intersectsWith(region: Region): boolean;
  containsRegion(region: Region): boolean;
}
```

### Color

32-bit RGBA color with 150+ named color constants.

```typescript
class Color {
  a: number;                                               // Alpha (0-255)
  r: number;                                               // Red (0-255)
  g: number;                                               // Green (0-255)
  b: number;                                               // Blue (0-255)
  name?: string;

  // 150+ static named colors
  static AliceBlue: Color;
  static Red: Color;
  static Blue: Color;
  static Transparent: Color;
  // ... etc.

  static create(a: number, r: number, g: number, b: number): Color;
  static parse(colorSource: string | Color): Color;        // Parses string formats or clones a Color instance

  clone(): Color;
  toString(): string;                                      // "Transparent", named, "alpha;NamedColor", or hex
  toHexString(): string;                                   // "#rrggbb" or "#rrggbbaa"
  toStyleString(): string;                                 // CSS "rgb(r,g,b)" or "rgba(r,g,b,a)"
  equals(that: Color): boolean;                            // Full RGBA equality (includes alpha)
  equalsHue(that: Color): boolean;                         // RGB equality (ignores alpha)
  isNamedColor(): boolean;
}
```

Notes:
- `Color.parse` throws for invalid color strings.
- 8-digit hex uses web/CSS order `#rrggbbaa`.

### Matrix2D

2D affine transformation matrix.

```typescript
class Matrix2D {
  m11: number; m12: number;
  m21: number; m22: number;
  offsetX: number; offsetY: number;

  static IDENTITY: Matrix2D;
  static create(m11: number, m12: number, m21: number, m22: number,
                offsetX: number, offsetY: number): Matrix2D;
  static multiply(a: Matrix2D, b: Matrix2D): Matrix2D;

  cloneFrom(that: Matrix2D): Matrix2D;
  translate(tx: number, ty: number): Matrix2D;             // Returns this (chainable)
  scale(sx: number, sy: number): Matrix2D;                 // Returns this (chainable)
  rotate(angle: number): Matrix2D;                         // Radians, returns this (chainable)
}
```

### Utility

Static utility methods.

```typescript
class Utility {
  static getRemoteText(url: string, callback: (text?: string) => void): void;
  static getRemoteTextAsync(url: string): Promise<string | undefined>;
  static getRemoteBytes(url: string, callback: (bytes?: Uint8Array) => void): void;
  static getRemoteBytesAsync(url: string): Promise<Uint8Array | undefined>;
  static getRemoteBlob(url: string, callback: (blob?: Blob) => void): void;
  static getRemoteBlobAsync(url: string): Promise<Blob | undefined>;
  static endsWith(str: string, suffix: string): boolean;
  static startsWith(str: string, prefix: string): boolean;
  static joinPaths(path1: string, path2: string): string;
  static guid(): string;                                   // "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
}
```

---

## Event System

### CommonEvent\<T\>

Generic event emitter for general-purpose events.

```typescript
class CommonEvent<T> {
  add(handler: (value?: T) => void): void;
  remove(handler: any): void;
  clear(): void;
  trigger(value?: T): void;
  hasListeners(): boolean;
}
```

### ModelEvent\<T\>

Event emitter scoped to a Model context.

```typescript
class ModelEvent<T> {
  add(handler: (model: Model, value?: T) => void): void;
  remove(handler: any): void;
  clear(): void;
  trigger(model: Model, value?: T): void;
}
```

### ControllerEvent\<T\>

Event emitter scoped to a controller context.

```typescript
class ControllerEvent<T> {
  add(handler: (controller: IController, data: T) => void): void;
  remove(handler: any): void;
  clear(): void;
  trigger(controller: IController, data: T): void;
  hasListeners(): boolean;
}
```

---

## Model

The central container for a graphics scene. Extends `ElementBase`.

```typescript
class Model extends ElementBase {
  elements: ElementBase[];
  resources: Resource[];
  resourceManager: ResourceManager;
  controller?: IController;
  canvas?: HTMLCanvasElement;
  context?: CanvasRenderingContext2D;
  basePath: string;
  modelPath?: string;
  displayFPS: boolean;
  lastTime: number;

  // Events
  controllerAttached: ModelEvent<IController>;
  controllerDetached: ModelEvent<IController>;

  // Factory & Loading
  static create(width: number, height: number): Model;
  static parse(json: string): Model;
  static load(basePath: string, uri: string, callback: (model?: Model) => void): void;
  static loadAsync(basePath: string, uri: string): Promise<Model | undefined>;

  // Element Management
  add(el: ElementBase): number;                            // Add to end (painter's top)
  addBottom(el: ElementBase): number;                      // Add to beginning (painter's bottom)
  remove(el: ElementBase): number;                         // Remove, returns index or -1

  // Resource Management
  setBasePath(basePath: string): void;
  setModelPath(path: string, resourceFolder?: string): void;
  prepareResources(localeId?: string, callback?: (result: boolean) => void): void;
  prepareResourcesAsync(localeId?: string): Promise<boolean>;

  // Canvas
  createCanvas(scale?: number): HTMLCanvasElement;
  assignCanvas(canvas: HTMLCanvasElement, scale?: number): void;

  // Rendering
  renderToContext(c: CanvasRenderingContext2D, scale?: number): void;
  setElementStroke(c: CanvasRenderingContext2D, el: ElementBase): boolean;
  setRenderTransform(c: CanvasRenderingContext2D, t: string, origin: Point): void;

  // Hit Testing
  firstActiveElementAt(c: CanvasRenderingContext2D, tx: number, ty: number): ElementBase | undefined;
  activeElementPathAt(c: CanvasRenderingContext2D, tx: number, ty: number): ElementBase[];
  elementsAt(c: CanvasRenderingContext2D, tx: number, ty: number): ElementBase[];
  elementWithId(id: string): ElementBase | undefined;

  // Serialization
  clone(): Model;
  serialize(): any;
  formattedJSON(): string;
  rawJSON(): string;
}
```

---

## Elements

### ElementBase (Abstract)

Base class for all renderable elements. Implements `IPointContainer`.

```typescript
abstract class ElementBase {
  type: string;
  id?: string;
  locked: boolean;
  aspectLocked: boolean;
  editPoints: boolean;
  fill?: string | LinearGradientFill | RadialGradientFill;
  fillScale: number;
  fillOffsetX: number;
  fillOffsetY: number;
  stroke?: string;
  transform?: string;
  interactive: boolean;
  model?: Model;
  parent?: ElementBase;
  tag?: any;

  // Command handler tags
  mouseDown?: string;
  mouseUp?: string;
  mouseEnter?: string;
  mouseLeave?: string;
  click?: string;
  timer?: string;

  // Fill/Stroke state stacks
  fillStack: Array<string | LinearGradientFill | RadialGradientFill | undefined>;
  strokeStack: Array<string | undefined>;

  // Positioning
  size?: string;
  location?: string;
  sizeValue?: Size;
  locationValue?: Point;
  getLocation(): Point | undefined;
  setLocation(location: Point): void;
  getSize(): Size | undefined;
  setSize(size: Size): void;
  getBounds(): Region | undefined;
  translate(offsetX: number, offsetY: number): void;
  scale(scaleX: number, scaleY: number): void;
  nudgeSize(outX: number, outY: number): void;

  // Fluent Setters (return this)
  setFill(fill: string | LinearGradientFill | RadialGradientFill): ElementBase;
  setStroke(stroke: string): ElementBase;
  setFillScale(fillScale: number): ElementBase;
  setFillOffsetX(fillOffsetX: number): ElementBase;
  setFillOffsetY(fillOffsetY: number): ElementBase;
  setInteractive(interactive: boolean): ElementBase;
  setTransform(transform: string): ElementBase;

  // Capabilities (override in subclasses)
  canStroke(): boolean;
  canFill(): boolean;
  canMove(): boolean;
  canResize(): boolean;
  canNudge(): boolean;
  canMovePoint(): boolean;
  canEditPoints(): boolean;

  // Point Editing
  pointCount(): number;
  getPointAt(index: number, depth?: PointDepth): Point;
  setPointAt(index: number, value: Point, depth: PointDepth): void;

  // Rendering
  draw(c: CanvasRenderingContext2D): void;
  hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean;

  // Resources
  registerResources(rm: ResourceManager): void;
  getResourceKeys(): string[];

  // Serialization
  serialize(): any;
  parse(o: any): void;
  parseFluent(o: any): ElementBase;
  clone(): ElementBase;
  cloneTo(e: ElementBase): void;
  cloneToFluent<T extends ElementBase>(e: T): T;
}
```

### RectangleElement

```typescript
class RectangleElement extends ElementBase {
  // Type: "rectangle"
  static create(x?: number, y?: number, width?: number, height?: number): RectangleElement;
  // Capabilities: canStroke=true, canFill=true
}
```

### EllipseElement

```typescript
class EllipseElement extends ElementBase {
  // Type: "ellipse"
  radiusX: number;
  radiusY: number;
  center?: string;                                         // getter/setter, serialized as "x,y"

  static create(x?: number, y?: number, rx?: number, ry?: number): EllipseElement;
  // If ry omitted, defaults to rx (circle)
  // Capabilities: canStroke=true, canFill=true
}
```

### LineElement

```typescript
class LineElement extends ElementBase {
  // Type: "line"
  p1?: string;                                             // getter/setter, serialized as "x,y"
  p2?: string;                                             // getter/setter, serialized as "x,y"

  static create(x1?: number, y1?: number, x2?: number, y2?: number): LineElement;
  // Capabilities: canStroke=true, canFill=false, canResize=false, canMovePoint=true
  // pointCount=2, editable endpoints
}
```

### PathElement

```typescript
class PathElement extends ElementBase {
  // Type: "path"
  bounds?: Region;

  static create(): PathElement;

  add(command: string): PathElement;                       // Append command (e.g., "m10,20")
  setCommands(commands: string): PathElement;              // Set commands from a space-separated string

  // Capabilities: canStroke=true, canFill=true, canEditPoints=true
  // Commands: mX,Y lX,Y HX VY cCX1,CY1,CX2,CY2,X,Y SCP2X,CP2Y,X,Y QCX,CY,X,Y TX,Y ARX,RY,ROT,LARGE,SWEEP,X,Y z
}
```

Command string format (space-separated tokens):

- `mX,Y`: move to point
- `lX,Y`: line to point
- `HX`: horizontal line to absolute `X`
- `VY`: vertical line to absolute `Y`
- `cCX1,CY1,CX2,CY2,X,Y`: cubic bezier to end point `X,Y`
- `SCP2X,CP2Y,X,Y`: smooth cubic bezier using reflected previous control point
- `QCX,CY,X,Y`: quadratic bezier to end point `X,Y`
- `TX,Y`: smooth quadratic bezier using reflected previous control point
- `ARX,RY,ROT,LARGE,SWEEP,X,Y`: elliptical arc to end point `X,Y`
- `z`: close current subpath

Example using all command types:

```text
m10,10 H50 V30 c60,30,70,50,50,70 S40,90,20,70 T10,50 A10,10,0,0,1,30,30 z
```

### PolygonElement

```typescript
class PolygonElement extends ElementBase {
  // Type: "polygon"
  points?: string;                                         // getter/setter, serialized as "x,y x,y x,y"
  bounds?: Region;

  static create(): PolygonElement;

  addPoint(point: Point): PolygonElement;
  setPoints(source: string | Point[]): PolygonElement;    // String format: "x,y x,y x,y"
  getPoints(): Point[] | undefined;

  // Capabilities: canStroke=true, canFill=true, canEditPoints=true
  // Automatically closed during rendering
}
```

### PolylineElement

```typescript
class PolylineElement extends ElementBase {
  // Type: "polyline"
  points?: string;                                         // getter/setter, serialized as "x,y x,y x,y"
  bounds?: Region;
  smoothPoints: boolean;                                   // Catmull-Rom interpolation

  static create(): PolylineElement;

  addPoint(point: Point): PolylineElement;
  setPoints(source: string | Point[]): PolylineElement;   // String format: "x,y x,y x,y"
  getPoints(): Point[] | undefined;

  // Capabilities: canStroke=true, canFill=false, canEditPoints=true
}
```

### TextElement

```typescript
class TextElement extends ElementBase {
  // Type: "text"
  text?: string;
  source?: string;                                         // TextResource key
  typeface?: string;                                       // Font family (e.g., "Arial, sans-serif")
  typesize?: number;                                       // Font size in pixels
  typestyle?: string;                                      // "bold", "italic", "bold,italic"
  alignment?: string;                                      // "center,middle", "left,top", etc.
  letterSpacing: number;                                   // Extra spacing between characters (px)
  textDecoration?: string;                                 // "underline", "line-through", "overline"
  richText?: TextRun[];                                    // Run-based rich text content

  static create(text?: string | TextResource, x?: number, y?: number,
                width?: number, height?: number): TextElement;

  setText(text: string): TextElement;
  setSource(source: string): TextElement;
  setTypeface(typeface: string): TextElement;
  setTypesize(typesize: number): TextElement;
  setTypestyle(typestyle: string): TextElement;
  setAlignment(alignment: string): TextElement;
  setLetterSpacing(letterSpacing: number): TextElement;
  setTextDecoration(decoration: string): TextElement;

  // Rich text helpers
  getResolvedText(): string;                               // Flattened text from richText or text/source
  getTextLength(): number;                                 // Total editable character count
  getTextStyleAt(index: number): TextRunStyle;             // Style at character position
  replaceTextRange(start: number, end: number,
                   text: string | TextRun[],
                   style?: TextRunStyle): void;            // Replace range with styled content
  applyTextStyle(start: number, end: number,
                 style: TextRunStyle): void;               // Apply style to existing range

  // Layout geometry helpers (require canvas context and element bounds)
  getTextIndexAtPoint(c: CanvasRenderingContext2D,
                      location: Point, size: Size,
                      point: Point): number;               // Character index at canvas point
  getCaretRegion(c: CanvasRenderingContext2D,
                 location: Point, size: Size,
                 index: number): Region;                   // Caret rectangle at index
  getSelectionRegions(c: CanvasRenderingContext2D,
                      location: Point, size: Size,
                      start: number, end: number): Region[];  // Selection rectangles
  getVerticalTextIndex(c: CanvasRenderingContext2D,
                       location: Point, size: Size,
                       index: number, direction: number,
                       preferredX?: number): number;       // Index on adjacent visual line
  getWordRangeAt(index: number): [number, number];         // Word boundaries [start, end)

  getLines(c: CanvasRenderingContext2D,
           text: string, lineWidth: number): string[];     // Word-wrapped lines

  // Capabilities: canStroke=true, canFill=true
  // Auto word-wraps within bounds
}
```

#### TextRun

```typescript
interface TextRun {
  text: string;
  typeface?: string;
  typesize?: number;
  typestyle?: string;
  letterSpacing?: number;
  decoration?: string;
}
```

#### TextRunStyle

```typescript
interface TextRunStyle {
  typeface?: string;
  typesize?: number;
  typestyle?: string;
  letterSpacing?: number;
  decoration?: string;
}
```

### ImageElement

```typescript
class ImageElement extends ElementBase {
  // Type: "image"
  source?: string;                                         // BitmapResource key
  opacity: number;                                         // 0-1, default 1

  static create(source?: string | BitmapResource, x?: number, y?: number,
                width?: number, height?: number): ImageElement;

  // Capabilities: canStroke=true (outline), canFill=false
}
```

### ModelElement

```typescript
class ModelElement extends ElementBase {
  // Type: "model"
  source?: string;                                         // ModelResource key
  sourceModel?: Model;                                     // Directly embedded model
  opacity: number;                                         // 0-1, default 1

  static create(source?: string | ModelResource, x?: number, y?: number,
                width?: number, height?: number): ModelElement;

  // Scales inner model to fit element bounds
}
```

### SpriteElement

```typescript
class SpriteElement extends ElementBase {
  // Type: "sprite"
  frames?: SpriteFrame[];
  frameIndex: number;
  loop: boolean;
  onAdvance?: string;                                      // Command handler tag for frame advance

  static create(x?: number, y?: number, width?: number, height?: number): SpriteElement;

  addFrame(frame: SpriteFrame): SpriteElement;
}
```

### SpriteFrame

```typescript
class SpriteFrame {
  source: string;                                          // BitmapResource key
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;                                        // Seconds
  transition: string;                                      // Transition name
  transitionDuration: number;                              // Seconds
  opacity: number;                                         // 0-1

  static create(source: string, x: number, y: number,
                width: number, height: number): SpriteFrame;
}
```

### ElementFactory

```typescript
class ElementFactory {
  static registerCreator(typeName: string, creator: IElementCreator): void;
  static create(typeName: string): ElementBase | undefined;
}
```

---

## Fill Types

### LinearGradientFill

```typescript
class LinearGradientFill {
  type: string;                                            // "linearGradient"
  start: string;                                           // Point as "x,y"
  end: string;                                             // Point as "x,y"
  stops: GradientFillStop[];

  static create(start: string, end: string): LinearGradientFill;

  addFillStop(color: string, offset: number): void;
  clone(): LinearGradientFill;
}
```

Notes:
- `addFillStop` validates inputs through `GradientFillStop` and throws for invalid color strings or offsets outside `[0, 1]`.

### RadialGradientFill

```typescript
class RadialGradientFill {
  type: string;                                            // "radialGradient"
  center: string;                                          // Point as "x,y"
  focus: string;                                           // Point as "x,y"
  radiusX: number;
  radiusY: number;
  stops: GradientFillStop[];

  static create(center: string, focus: string,
                radiusX: number, radiusY: number): RadialGradientFill;

  addFillStop(color: string, offset: number): void;
  clone(): RadialGradientFill;
}
```

Notes:
- `addFillStop` validates inputs through `GradientFillStop` and throws for invalid color strings or offsets outside `[0, 1]`.

### GradientFillStop

```typescript
class GradientFillStop {
  color: string;
  offset: number;

  static create(color: string, offset: number): GradientFillStop;
  static cloneStops(stops: GradientFillStop[]): GradientFillStop[];
  clone(): GradientFillStop;
}
```

Notes:
- `GradientFillStop.create` and the constructor validate `color` using `Color.parse`.
- `offset` must be a finite value in the range `[0, 1]`, otherwise `ErrorMessages.InvalidGradientStopOffset` is thrown.

### FillFactory

```typescript
class FillFactory {
  static fillForElement(el: ElementBase): string | LinearGradientFill | RadialGradientFill | undefined;
  static setElementFill(c: CanvasRenderingContext2D, el: ElementBase): boolean;
}
```

### FillInfo

```typescript
class FillInfo {
  type: string;                                            // 'none'|'color'|'image'|'model'|'linear'|'radial'
  color?: string;
  opacity?: number;
  source?: string;
  scale?: number;
  start?: string;
  end?: string;
  center?: string;
  focus?: string;
  radiusX?: number;
  radiusY?: number;
  fillStops?: GradientFillStop[];

  static getFillInfo(el: ElementBase): FillInfo;
  static getNoFillInfo(): FillInfo;
  static getColorFillInfo(color: string, opacity: number): FillInfo;
  static getImageFillInfo(source: string, opacity: number, scale?: number): FillInfo;
  static getModelFillInfo(source: string, opacity: number, scale?: number): FillInfo;
  static getLinearGradientFillInfo(start: string, end: string, stops: GradientFillStop[]): FillInfo;
  static getRadialGradientFillInfo(center: string, focus: string,
                                    rx: number, ry: number, stops: GradientFillStop[]): FillInfo;
}
```

---

## Resources

### Resource (Abstract Base)

```typescript
abstract class Resource {
  type: string;
  key?: string;
  locale?: string;
  uri?: string;
  resourceManager?: ResourceManager;
  registered: boolean;
  available: boolean;
  error: boolean;

  clone(): Resource;
  parse(o: any): void;
  serialize(): any;
  load(url: string, callback?: (success: boolean) => void): void;
  addTo(model: Model): void;

  matchesFull(key: string, locale: string): boolean;
  matchesLanguage(key: string, language: string): boolean;
  matchesGeneric(key: string): boolean;
  matchesKey(key: string): boolean;
}
```

### BitmapResource

```typescript
class BitmapResource extends Resource {
  // Type: "bitmap"
  size?: Size;
  image?: HTMLImageElement;

  static create(key: string, uriOrImage: string | HTMLImageElement,
                locale?: string): BitmapResource;
}
```

### ModelResource

```typescript
class ModelResource extends Resource {
  // Type: "model"
  size?: Size;
  model?: Model;

  static create(key: string, uriOrModel: string | Model,
                locale?: string): ModelResource;
}
```

### TextResource

```typescript
class TextResource extends Resource {
  // Type: "text"
  text?: string;

  static create(): TextResource;
  static createFromText(key: string, text: string, locale?: string): TextResource;
  static createFromUri(key: string, uri: string, locale?: string): TextResource;
}
```

### ResourceManager

```typescript
class ResourceManager {
  localResourcePath?: string;
  currentLocaleId?: string;
  pendingResources?: Resource[];
  pendingResourceCount: number;
  totalResourceCount: number;
  numberLoaded: number;
  resourceFailed: boolean;
  model?: Model;
  urlProxy?: UrlProxy;

  // Events
  listenerEvent: ResourceManagerEvent<ResourceState>;
  loadCompleted: ResourceManagerEvent<boolean>;

  add(res: Resource): void;
  merge(res: Resource): void;                              // Add or replace matching resource
  get(key: string, localeId?: string): Resource | undefined;
  findBestResource(key: string, locale?: string): Resource | undefined;
  register(key: string): void;                             // Mark for download
  load(callback?: (result: boolean) => void): void;        // Start async loading
  loadAsync(): Promise<boolean>;
}
```

### ResourceFactory

```typescript
class ResourceFactory {
  static registerCreator(name: string, creator: IResourceCreator): void;
  static create(name: string): Resource | undefined;
}
```

---

## View System

### ViewController

Read-only interactive model viewer. Implements `IController`.

```typescript
class ViewController implements IController {
  model?: Model;
  canvas?: HTMLCanvasElement;
  renderer?: ViewRenderer;
  enabled: boolean;
  needsRedraw: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
  timerEnabled: boolean;
  commandHandler?: ElementCommandHandler;

  // Mouse state
  currentX?: number;
  currentY?: number;
  isMouseOver: boolean;
  isMouseDown: boolean;
  mouseOverElement?: ElementBase;
  pressedElement?: ElementBase;
  mouseOverPath: ElementBase[];                            // Deepest-to-outermost hover path
  pressedPath: ElementBase[];                              // Deepest-to-outermost pressed path

  // Events
  modelUpdated: ControllerEvent<Model>;
  enabledChanged: ControllerEvent<boolean>;
  mouseEnteredView: ControllerEvent<MouseEventArgs>;
  mouseLeftView: ControllerEvent<MouseEventArgs>;
  mouseDownView: ControllerEvent<PointEventParameters>;
  mouseUpView: ControllerEvent<PointEventParameters>;
  mouseMovedView: ControllerEvent<PointEventParameters>;
  mouseEnteredElement: ControllerEvent<ElementBase>;
  mouseLeftElement: ControllerEvent<ElementBase>;
  mouseDownElement: ControllerEvent<ElementBase>;
  mouseUpElement: ControllerEvent<ElementBase>;
  elementClicked: ControllerEvent<ElementBase>;
  timer: ControllerEvent<TimerParameters>;

  // Factory
  static initializeTarget(hostDiv: HTMLDivElement, model: Model,
                           scale?: number): ViewController;

  setModel(model: Model): void;
  setEnabled(enabled: boolean, disabledFill?: string): void;
  setScale(scale: number): void;
  windowToCanvas(x: number, y: number): Point;
  windowToCanvasWithOutput(x: number, y: number, out?: Point): Point;
  draw(): void;
  drawIfNeeded(): void;
  invalidate(): void;
  detach(): void;

  // Timer
  startTimer(offset?: number): void;
  pauseTimer(): void;
  resumeTimer(): void;
  stopTimer(): void;
  tick(): void;
}
```

### ViewRenderer

```typescript
class ViewRenderer {
  controller: ViewController;

  renderToContext(c: CanvasRenderingContext2D, scale?: number): void;
  beginRender(c: CanvasRenderingContext2D, scale?: number): void;
  renderElement(c: CanvasRenderingContext2D, el: ElementBase): void;
  endRender(c: CanvasRenderingContext2D): void;
  shouldRender(el: ElementBase, bounds: Region): boolean;
}
```

---

## Design System

### DesignController

Full-featured interactive model editor. Implements `IController`.

```typescript
class DesignController implements IController {
  model?: Model;
  canvas?: HTMLCanvasElement;
  enabled: boolean;
  isDirty: boolean;
  scale: number;
  autoPixelRatio: boolean;
  pixelRatio: number;
  needsRedraw: boolean;

  // Selection
  selectedElements: ElementBase[];
  selectionEnabled: boolean;

  // Grid
  snapToGrid: boolean;
  gridSpacing: number;
  gridType: GridType;                                      // None, Dots, Lines
  gridColor: string;

  // Constraints
  lockAspect: boolean;
  constrainToBounds: boolean;
  minElementSize: Size;
  largeJump: number;
  smartAlignmentEnabled: boolean;
  smartAlignmentThreshold: number;

  // Design Tools
  activeTool?: DesignTool;

  // Events (all ControllerEvent<T>)
  selectionChanged: ControllerEvent<ElementBase[]>;
  elementCreated: ControllerEvent<ElementBase>;
  elementAdded: ControllerEvent<ElementBase>;
  elementRemoved: ControllerEvent<ElementBase>;
  elementMoving: ControllerEvent<MoveLocation[]>;
  elementMoved: ControllerEvent<MoveLocation[]>;
  elementSizing: ControllerEvent<ResizeSize[]>;
  elementSized: ControllerEvent<ResizeSize[]>;
  elementsReordered: ControllerEvent<boolean>;
  isDirtyChanged: ControllerEvent<boolean>;
  onDelete: ControllerEvent<ElementBase[]>;
  viewDragEnter: ControllerEvent<ViewDragArgs>;
  viewDragOver: ControllerEvent<ViewDragArgs>;
  viewDragLeave: ControllerEvent<ViewDragArgs>;
  viewDragDrop: ControllerEvent<ViewDragArgs>;
  elementDragEnter: ControllerEvent<ElementDragArgs>;
  elementDragLeave: ControllerEvent<ElementDragArgs>;
  elementDragDrop: ControllerEvent<ElementDragArgs>;
  contextMenuRequested: ControllerEvent<DesignContextMenuEventArgs>;
  // + all inherited view events

  // Factory
  static initializeTarget(hostDiv: HTMLDivElement, model: Model,
                           scale?: number): DesignController;

  setModel(model: Model): void;
  setEnabled(enabled: boolean, disabledFill?: string): void;
  setScale(scale: number): void;
  setAutoPixelRatio(enabled: boolean, pixelRatio?: number): void;
  setPixelRatio(pixelRatio: number): void;
  draw(): void;
  invalidate(): void;
  detach(): void;

  // Selection
  selectElement(el: ElementBase): void;
  deselectElement(el: ElementBase): void;
  clearSelections(): void;
  selectAll(): void;

  // Element Operations
  deleteSelected(): void;
  moveToFront(el: ElementBase): void;
  moveToBack(el: ElementBase): void;
  moveForward(el: ElementBase): void;
  moveBackward(el: ElementBase): void;
  copySelectedToClipboard(): boolean;
  cutSelectedToClipboard(): boolean;
  pasteFromClipboard(): Promise<boolean>;
  exportSelectionClipboardData(): DesignClipboardData | undefined;
  exportSelectionClipboardText(): string | undefined;
  pasteClipboardData(data: string | DesignClipboardData,
                     offsetX?: number, offsetY?: number): boolean;

  // Undo/Redo
  undo(): boolean;
  redo(): boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoChanged: ControllerEvent<boolean>;

  // Z-Order
  bringToFront(el?: ElementBase): void;
  sendToBack(el?: ElementBase): void;
  bringForward(el?: ElementBase): void;
  sendBackward(el?: ElementBase): void;
  alignSelectedHorizontally(alignment: 'left' | 'center' | 'right'): void;
  alignSelectedVertically(alignment: 'top' | 'middle' | 'bottom'): void;
  distributeSelectedHorizontally(): void;
  distributeSelectedVertically(): void;
  resizeSelectedToSameWidth(): void;
  resizeSelectedToSameHeight(): void;
  resizeSelectedToSameSize(): void;

  // Corner Radius
  setSelectedRectangleCornerRadius(radius: number): void;
  setSelectedRectangleCornerRadii(tl: number, tr: number, br: number, bl: number): void;

  // Text Editing
  editingTextElement?: TextElement;                        // Currently edited text element
  textSelectionStart: number;                              // Selection start index
  textSelectionEnd: number;                                // Selection end index
  isSelectingText: boolean;                                // True during selection drag
  beginTextEdit(textElement?: TextElement, caretIndex?: number): void;
  endTextEdit(): void;
  applySelectedTextStyle(style: TextRunStyle): void;       // Apply style to selection or set pending
  replaceSelectedText(text: string): boolean;              // Replace selection with text
  deleteSelectedText(backward?: boolean): boolean;         // Delete selection or adjacent character
  moveTextCaret(direction: number, extendSelection?: boolean): void;
  moveTextCaretVertically(direction: number, extendSelection?: boolean): void;

  // Tool Management
  setActiveTool(tool: DesignTool): void;
  clearActiveTool(): void;
}
```

```typescript
interface DesignClipboardData {
  format: string;
  version: number;
  resources: SerializedData[];
  elements: SerializedData[];
}
```

```typescript
class DesignContextMenuEventArgs extends PointEventParameters {
  element?: ElementBase;
  selectedElements: ElementBase[];
}
```

### Design Tools

```typescript
abstract class DesignTool {
  controller: DesignController;
  abstract onMouseDown(x: number, y: number): void;
  abstract onMouseMove(x: number, y: number): void;
  abstract onMouseUp(x: number, y: number): void;
}

class RectangleTool extends DesignTool { }
class EllipseTool extends DesignTool { }
class LineTool extends DesignTool { }
class PenTool extends DesignTool { }
class PolygonTool extends DesignTool { }
class PolylineTool extends DesignTool { }
class TextTool extends DesignTool { }
class ImageElementTool extends DesignTool { }
class ModelElementTool extends DesignTool { }
```

### GridType

```typescript
enum GridType {
  None = 0,
  Dots = 1,
  Lines = 2
}
```

---

## Command System

### ElementCommand

```typescript
class ElementCommand {
  name: string;
  parameter: string;

  static parse(commandString: string): ElementCommand;    // Parses "name(param)"
}
```

### ElementCommandHandler

```typescript
class ElementCommandHandler {
  registrations: ElementCommandHandlerRegistration[];

  // Built-in command names
  static PUSH_FILL: string;
  static POP_FILL: string;
  static PUSH_STROKE: string;
  static POP_STROKE: string;
  static PUSH_FRAME: string;
  static POP_FRAME: string;

  attachController(controller: IController): void;
  addHandler(command: string, handler: CommandHandlerFunction): void;
  removeHandler(command: string): void;
  clearHandlers(): void;
  onElementCommandFired(controller: IController, element: ElementBase,
                        command: string, trigger: string,
                        parameters?: PointEventParameters): boolean;
}
```

### CommandEventTrigger

```typescript
class CommandEventTrigger {
  static None: string;                                    // "none"
  static MouseEnter: string;                              // "mouseEnter"
  static MouseLeave: string;                              // "mouseLeave"
  static MouseDown: string;                               // "mouseDown"
  static MouseUp: string;                                 // "mouseUp"
  static Click: string;                                   // "click"
  static Timer: string;                                   // "timer"
}
```

---

## Surface System

### Surface

High-level application container with layered media content.

```typescript
class Surface {
  width: number;
  height: number;
  id: string;
  scale: number;
  opacity: number;
  backgroundColor?: string;
  elements: SurfaceElement[];
  layers: SurfaceLayer[];
  hostDiv?: HTMLDivElement;
  controller?: SurfaceViewController;
  model?: Model;
  isChild: boolean;

  // State images
  normalImageSource?: string;
  selectedImageSource?: string;
  highlightedImageSource?: string;
  disabledImageSource?: string;

  // Events
  error: CommonEvent<string>;
  loaded: CommonEvent<boolean>;
  initialized: CommonEvent<SurfaceViewController>;

  static create(width: number, height: number, id: string, scale: number): Surface;

  bind(hostDiv: HTMLDivElement, callback?: () => void, onBottom?: boolean): void;
  unbind(): void;
  elementWithId(id: string): SurfaceElement | undefined;
  layerWithId(id: string): SurfaceLayer | undefined;
  setScale(scale: number): void;
  setOpacity(opacity: number): void;
  setTranslateX(tx: number): void;
  setTranslateY(ty: number): void;
}
```

### Layer Types

```typescript
// Base layer
class SurfaceLayer extends SurfaceElement {
  opacity: number;
  translateX: number;
  translateY: number;
}

// Image layer — renders <img>
class SurfaceImageLayer extends SurfaceLayer {
  source: string;
  clicked: CommonEvent<SurfaceImageLayer>;
  static create(): SurfaceImageLayer;
}

// HTML layer — renders <iframe>
class SurfaceHtmlLayer extends SurfaceLayer {
  source: string;
  scrolling: string;                                       // Default: 'auto'
  sandbox: boolean;                                        // Default: true
  scaleContent: boolean;                                   // Default: true
  static create(): SurfaceHtmlLayer;
}

// Video layer — renders <video>
class SurfaceVideoLayer extends SurfaceLayer {
  source: string;
  loop: boolean;
  autoPlay: boolean;
  nativeControls: boolean;
  started: CommonEvent<SurfaceVideoLayer>;
  stopped: CommonEvent<SurfaceVideoLayer>;
  static create(): SurfaceVideoLayer;
}

// Hidden layer — invisible click zone
class SurfaceHiddenLayer extends SurfaceLayer {
  clicked: CommonEvent<SurfaceHiddenLayer>;
  static create(): SurfaceHiddenLayer;
}
```

### SurfaceButtonElement

```typescript
class SurfaceButtonElement extends SurfaceElement {
  isEnabled: boolean;
  isSelected: boolean;
  isToggle: boolean;
  groupId?: string;
  clicked: CommonEvent<SurfaceButtonElement>;

  static create(id: string, left: number, top: number,
                width: number, height: number,
                clickListener: (b: SurfaceButtonElement) => void): SurfaceButtonElement;
  static createCheckbox(...): SurfaceButtonElement;
  static createRadioButton(groupId: string, ...): SurfaceButtonElement;
}
```

### SurfacePane

```typescript
class SurfacePane extends SurfaceLayer {
  childSurface: Surface;

  static create(): SurfacePane;

  addToSurface(surface: Surface): void;
  prepare(callback: () => void): void;
  replaceSurface(newChild: Surface, callback?: (pane: SurfacePane) => void,
                 transition?: string, duration?: number): void;
}
```

---

## SVG Interop

### SVGImporter

```typescript
class SVGImporter {
  static import(svgContent: string, model: Model): void;  // Parse SVG string into model
}
```

**Supported import elements:** `path`, `rect`, `ellipse`, `circle`, `line`, `polygon`, `polyline`, `text`, `image`, `g`, `symbol`, `use`.

**Preserved hierarchy:** Container elements (`<g>`, nested `<svg>`, `<symbol>`) are imported as nested `ModelElement` instances with inner `Model`s, preserving the source document's grouping structure. `<use>` references are resolved against named elements collected during import.

**Inherited attributes:** fill, stroke, opacity, transforms, text properties, gradients from `<defs>`, clip-path references.

### SVGExporter

SVG export is accessed through `Model.toSVG()`:

```typescript
// On Model:
toSVG(): string;                                           // Returns complete SVG markup string
```

**Exported element types:** `RectangleElement`, `EllipseElement`, `LineElement`, `PathElement`, `ArcElement`, `RegularPolygonElement`, `ArrowElement`, `WedgeElement`, `RingElement`, `PolygonElement`, `PolylineElement`, `TextElement`, `ImageElement`, `ModelElement`.

**ModelElement export:** Resource-backed `ModelElement`s are exported as `<symbol>` + `<use>` pairs with deduplication. Embedded source models are exported as nested `<g>` groups.

---

## Sketcher

Progressive drawing animation engine that reveals a model in two passes.

```typescript
class Sketcher {
  modelUrl?: string;
  sourceModel?: Model;
  drawModel?: Model;
  controller?: ViewController;
  scale: number;

  // Timing
  timerDelay: number;                                      // Default: 20ms
  strokeBatchSize: number;                                 // Default: 128
  fillDelay: number;                                       // Default: 5000ms
  fillBatchSize: number;                                   // Default: 1024
  repeatDelay: number;                                     // Default: 10000ms

  // Options
  repeat: boolean;
  sketchColor: boolean;
  strokeOpacity: number;                                   // Default: 128

  // Events
  sketchDone: CommonEvent<boolean>;

  static create(modelUrl: string, scale?: number): Sketcher;

  addTo(model: Model): void;
}
```

---

## Transitions

### TransitionRenderer

```typescript
class TransitionRenderer {
  // Transition functions (38+)
  static fade(c: CanvasRenderingContext2D, c1: HTMLCanvasElement,
              c2: HTMLCanvasElement, offset: number): void;
  static pushLeft(...): void;
  static pushRight(...): void;
  static pushUp(...): void;
  static pushDown(...): void;
  static wipeLeft(...): void;
  // ... 30+ more transition functions

  // Easing functions (13)
  static easeLinear(t: number, b: number, c: number, d: number): number;
  static easeInQuad(...): number;
  static easeOutQuad(...): number;
  static easeInOutQuad(...): number;
  static easeInCubic(...): number;
  static easeOutCubic(...): number;
  static easeInOutCubic(...): number;
  static easeInQuart(...): number;
  static easeOutQuart(...): number;
  static easeInOutQuart(...): number;
  static easeInQuint(...): number;
  static easeOutQuint(...): number;
  static easeInOutQuint(...): number;

  // Lookup functions
  static getRenderFunction(name: string): TransitionRenderFunction;
  static getEasingFunction(name: string): EasingFunction;

  // Sprite animation
  static transitionSprite(controller: IController, sprite: SpriteElement,
                          sourceFrame: number, targetFrame: number,
                          transition: string): void;
  static spriteIncrementHandler(c: IController, el: ElementBase,
                                command: string, trigger: string,
                                parameters?: PointEventParameters): void;
}
```

---

## Convenience Factory Functions

The library exports shortcut factory functions at the module level:

```typescript
// Elements
const ellipse: (x?, y?, rx?, ry?) => EllipseElement;
const image: (source?, x?, y?, w?, h?) => ImageElement;
const innerModel: (source?, x?, y?, w?, h?) => ModelElement;
const line: (x1?, y1?, x2?, y2?) => LineElement;
const path: () => PathElement;
const polygon: () => PolygonElement;
const polyline: () => PolylineElement;
const rectangle: (x?, y?, w?, h?) => RectangleElement;
const sprite: (x?, y?, w?, h?) => SpriteElement;
const text: (text?, x?, y?, w?, h?) => TextElement;

// Model
const model: (width, height) => Model;

// Resources
const bitmapResource: (key, uriOrImage, locale?) => BitmapResource;
const modelResource: (key, uriOrModel, locale?) => ModelResource;
const embeddedTextResource: (key, text, locale?) => TextResource;
const uriTextResource: (key, uri, locale?) => TextResource;

// Core types
const color: (a, r, g, b) => Color;
const point: (x, y) => Point;
const size: (width, height) => Size;
const region: (x, y, width, height) => Region;
const matrix2D: (m11, m12, m21, m22, offsetX, offsetY) => Matrix2D;

// Fills
const linearGradientFill: (start, end) => LinearGradientFill;
const radialGradientFill: (center, focus, rx, ry) => RadialGradientFill;
const gradientFillStop: (color, offset) => GradientFillStop;
const spriteFrame: (source, x, y, w, h) => SpriteFrame;

// Controllers
const view: (hostDiv, model, scale?) => ViewController;
const design: (hostDiv, model, scale?) => DesignController;

// Utilities
const sketcher: (modelUrl, scale?) => Sketcher;
const newId: () => string;
```

---

## Enums Summary

| Enum | Values |
|------|--------|
| `WindingMode` | `NonZero = 1`, `EvenOdd = 2` |
| `PointDepth` | `Simple = 1`, `Full = 2` |
| `GridType` | `None = 0`, `Dots = 1`, `Lines = 2` |
| `CommandEventTrigger` | Class constants: `None`, `MouseEnter`, `MouseLeave`, `MouseDown`, `MouseUp`, `Click`, `Timer` |
| `ResourceState` | Class (`loaded`, `target`, `index`, `total`, `resource`) used in resource manager events |
| `ResourceLoaderState` | Loader state tracking |
| `PaneTransitionDirection` | Pane transition directions |
