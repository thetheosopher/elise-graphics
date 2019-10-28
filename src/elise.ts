import { CommandEventTrigger } from './command/command-event-trigger';
import { ElementCommand } from './command/element-command';
import { ElementCommandHandler } from './command/element-command-handler';
import { ControllerEvent } from './controller/controller-event';
import { Color } from './core/color';
import { Matrix2D } from './core/matrix-2d';
import { Model } from './core/model';
import { Point } from './core/point';
import { Region } from './core/region';
import { Size } from './core/size';
import { StrokeInfo } from './core/stroke-info';
import { Utility } from './core/utility';
import { WindingMode } from './core/winding-mode';
import { EllipseElement } from './elements/ellipse-element';
import { ImageElement } from './elements/image-element';
import { LineElement } from './elements/line-element';
import { ModelElement } from './elements/model-element';
import { PathElement } from './elements/path-element';
import { PolygonElement } from './elements/polygon-element';
import { PolylineElement } from './elements/polyline-element';
import { RectangleElement } from './elements/rectangle-element';
import { SpriteElement } from './elements/sprite-element';
import { SpriteFrame } from './elements/sprite-frame';
import { SpriteState } from './elements/sprite-state';
import { TextElement } from './elements/text-element';
import { FillFactory } from './fill/fill-factory';
import { FillInfo } from './fill/fill-info';
import { GradientFillStop } from './fill/gradient-fill-stop';
import { LinearGradientFill } from './fill/linear-gradient-fill';
import { RadialGradientFill } from './fill/radial-gradient-fill';
import { BitmapResource } from './resource/bitmap-resource';
import { ModelResource } from './resource/model-resource';
import { ResourceState } from './resource/resource-state';
import { TextResource } from './resource/text-resource';
import { Sketcher } from './sketcher/sketcher';
import { TransitionRenderer } from './transitions/transitions';

export default {
  BitmapResource: { BitmapResource },
  Color: { Color },
  CommandEventTrigger: { CommandEventTrigger },
  ControllerEvent: { ControllerEvent },
  ElementCommand: { ElementCommand },
  ElementCommandHandler: { ElementCommandHandler },
  Ellipse: EllipseElement,
  FillFactory: { FillFactory },
  FillInfo: { FillInfo },
  GradientFillStop: { GradientFillStop },
  Image: ImageElement,
  Line: LineElement,
  LinearGradientFill: { LinearGradientFill },
  Matrix2D: { Matrix2D },
  Model: { Model },
  ModelElement: { ModelElement },
  ModelResource: { ModelResource },
  PathElement: { PathElement },
  Point: { Point },
  Polygon: PolygonElement,
  Polyline: PolylineElement,
  RadialGradientFill: { RadialGradientFill },
  Rectangle: RectangleElement,
  Region: { Region },
  ResourceState: { ResourceState },
  Size: { Size },
  Sketcher: { Sketcher },
  Sprite: SpriteElement,
  SpriteFrame: { SpriteFrame },
  SpriteState: { SpriteState },
  StrokeInfo: { StrokeInfo },
  TextElement: { TextElement },
  TextResource: { TextResource },
  TransitionRenderer: { TransitionRenderer },
  WindingMode: { WindingMode },
  bitmapResource: BitmapResource.create,
  color: Color.create,
  ellipse: EllipseElement.create,
  embeddedTextResource: TextResource.createFromText,
  gradientFillStop: GradientFillStop.create,
  image: ImageElement.create,
  innerModel: ModelElement.create,
  line: LineElement.create,
  linearGradientFill: LinearGradientFill.create,
  log: (output: string) => {
    console.log(output);
  },
  matrix2D: Matrix2D.create,
  model: Model.create,
  modelResource: ModelResource.create,
  newId: Utility.guid,
  path: PathElement.create,
  point: Point.create,
  polygon: PolygonElement.create,
  polyline: PolylineElement.create,
  radialGradientFill: RadialGradientFill.create,
  rectangle: RectangleElement.create,
  region: Region.create,
  requestAnimationFrame: false,
  size: Size.create,
  sketcher: Sketcher.create,
  sprite: SpriteElement.create,
  spriteFrame: SpriteFrame.create,
  text: TextElement.create,
  uriTextResource: TextResource.createFromUri,
};
