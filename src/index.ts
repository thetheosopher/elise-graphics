import { CommandEventTrigger } from './command/command-event-trigger';
import { ElementCommand } from './command/element-command';
import { ElementCommandHandler } from './command/element-command-handler';
import { ElementCommandHandlerRegistration } from './command/element-command-handler-registration';
import { ControllerEvent } from './controller/controller-event';
import { ControllerEventArgs } from './controller/controller-event-args';
import { Color } from './core/color';
import { CommonEvent } from './core/common-event';
import { ErrorMessages } from './core/error-messages';
import { LocationArgs } from './core/location-args';
import { Logging } from './core/logging';
import { Matrix2D } from './core/matrix-2d';
import { Model } from './core/model';
import { ModelEvent } from './core/model-event';
import { MouseEventArgs } from './core/mouse-event-args';
import { MouseLocationArgs } from './core/mouse-location-args';
import { MousePositionInfo } from './core/mouse-position-info';
import { NamedColor } from './core/named-color';
import { Point } from './core/point';
import { PointDepth } from './core/point-depth';
import { PointEventParameters } from './core/point-event-parameters';
import { Region } from './core/region';
import { ScalingInfo } from './core/scaling-info';
import { Size } from './core/size';
import { SizeArgs } from './core/size-args';
import { StrokeInfo } from './core/stroke-info';
import { TimerParameters } from './core/timer-parameters';
import { Utility } from './core/utility';
import { ViewDragArgs } from './core/view-drag-args';
import { WindingMode } from './core/winding-mode';

import { Component } from './design/component/component';
import { ComponentElement } from './design/component/component-element';
import { ComponentEvent } from './design/component/component-event';
import { ComponentProps } from './design/component/component-props';
import { ComponentRegistry } from './design/component/component-registry';
import { GenericComponentProps } from './design/component/generic-component-props';
import { HtmlComponentProps } from './design/component/html-component-props';
import { ImageBasedComponentProps } from './design/component/image-based-component-props';
import { NavigateComponentProps } from './design/component/navigate-component-props';
import { ProgressRectangle } from './design/component/progress-rectangle';
import { UploadComponentProps } from './design/component/upload-component-props';

import { DesignTool } from './design/tools/design-tool';
import { EllipseTool } from './design/tools/ellipse-tool';
import { ImageElementTool } from './design/tools/image-element-tool';
import { LineTool } from './design/tools/line-tool';
import { ModelElementTool } from './design/tools/model-element-tool';
import { PenTool } from './design/tools/pen-tool';
import { PolygonTool } from './design/tools/polygon-tool';
import { PolylineTool } from './design/tools/polyline-tool';
import { RectangleTool } from './design/tools/rectangle-tool';
import { TextTool } from './design/tools/text-tool';

import { DesignController } from './design/design-controller';
import { DesignRenderer } from './design/design-renderer';
import { GridType } from './design/grid-type';
import { Handle } from './design/handle';
import { HandleFactory } from './design/handle-factory';
import { HandleMovedArgs } from './design/handle-moved-args';

import { ElementBase } from './elements/element-base';
import { ElementCreationProps } from './elements/element-creation-props';
import { ElementCreatorRegistration } from './elements/element-creator-registration';
import { ElementDragArgs } from './elements/element-drag-args';
import { ElementFactory } from './elements/element-factory';
import { ElementLocationArgs } from './elements/element-location-args';
import { ElementMouseEventArgs } from './elements/element-mouse-event-args';
import { ElementSizeArgs } from './elements/element-size-args';
import { ElementSizeProps } from './elements/element-size-props';
import { EllipseElement } from './elements/ellipse-element';
import { ImageElement } from './elements/image-element';
import { InvalidIndexException } from './elements/invalid-index-exception';
import { LineElement } from './elements/line-element';
import { ModelElement } from './elements/model-element';
import { MoveLocation } from './elements/move-location';
import { PathElement } from './elements/path-element';
import { PolygonElement } from './elements/polygon-element';
import { PolylineElement } from './elements/polyline-element';
import { RectangleElement } from './elements/rectangle-element';
import { ResizeSize } from './elements/resize-size';
import { SpriteElement } from './elements/sprite-element';
import { SpriteFrame } from './elements/sprite-frame';
import { SpriteState } from './elements/sprite-state';
import { TextElement } from './elements/text-element';
import { UploadCompletionProps } from './elements/upload-completion-props';
import { UploadProgressProps } from './elements/upload-progress-props';

import { FillFactory } from './fill/fill-factory';
import { FillInfo } from './fill/fill-info';
import { GradientFillStop } from './fill/gradient-fill-stop';
import { LinearGradientFill } from './fill/linear-gradient-fill';
import { RadialGradientFill } from './fill/radial-gradient-fill';

import { BitmapResource } from './resource/bitmap-resource';
import { ModelResource } from './resource/model-resource';
import { Resource } from './resource/resource';
import { ResourceCreatorRegistration } from './resource/resource-creator-registration';
import { ResourceFactory } from './resource/resource-factory';
import { ResourceLoaderState } from './resource/resource-loader-state';
import { ResourceManager } from './resource/resource-manager';
import { ResourceManagerEvent } from './resource/resource-manager-event';
import { ResourceState } from './resource/resource-state';
import { TextResource } from './resource/text-resource';

import { Sketcher } from './sketcher/sketcher';

import { PaneTransition } from './surface/pane-transitions/pane-transition';
import { PaneTransitionDirection } from './surface/pane-transitions/pane-transition-direction';
import { PaneTransitionFade } from './surface/pane-transitions/pane-transition-fade';
import { PaneTransitionNone } from './surface/pane-transitions/pane-transition-none';
import { PaneTransitionPush } from './surface/pane-transitions/pane-transition-push';
import { PaneTransitionReveal } from './surface/pane-transitions/pane-transition-reveal';
import { PaneTransitionSlide } from './surface/pane-transitions/pane-transition-slide';
import { PaneTransitionWipe } from './surface/pane-transitions/pane-transition-wipe';

import { Surface } from './surface/surface';
import { SurfaceAnimationFrame } from './surface/surface-animation-frame';
import { SurfaceAnimationLayer } from './surface/surface-animation-layer';
import { SurfaceAnimationViewController } from './surface/surface-animation-view-controller';
import { SurfaceButtonElement } from './surface/surface-button-element';
import { SurfaceElement } from './surface/surface-element';
import { SurfaceElementStates } from './surface/surface-element-states';
import { SurfaceHiddenLayer } from './surface/surface-hidden-layer';
import { SurfaceHtmlLayer } from './surface/surface-html-layer';
import { SurfaceImageLayer } from './surface/surface-image-layer';
import { SurfaceLayer } from './surface/surface-layer';
import { SurfacePane } from './surface/surface-pane';
import { SurfaceRadioItemSpriteElement } from './surface/surface-radio-item-sprite-element';
import { SurfaceRadioItemTextElement } from './surface/surface-radio-item-text-element';
import { SurfaceRadioStrip } from './surface/surface-radio-strip';
import { SurfaceRadioStripItem } from './surface/surface-radio-strip-item';
import { SurfaceRadioStripSelectionArgs } from './surface/surface-radio-strip-selection-args';
import { SurfaceRadioStripViewController } from './surface/surface-radio-strip-view-controller';
import { SurfaceTextElement } from './surface/surface-text-element';
import { SurfaceVideoLayer } from './surface/surface-video-layer';
import { SurfaceViewController } from './surface/surface-view-controller';

import { TransitionRenderer } from './transitions/transitions';

import { ViewController } from './view/view-controller';
import { ViewRenderer } from './view/view-renderer';

// Exports
export { CommandEventTrigger } from './command/command-event-trigger';
export { ElementCommand } from './command/element-command';
export { ElementCommandHandler } from './command/element-command-handler';
export { ElementCommandHandlerRegistration } from './command/element-command-handler-registration';
export { ControllerEvent } from './controller/controller-event';
export { ControllerEventArgs } from './controller/controller-event-args';
export { Color } from './core/color';
export { CommonEvent } from './core/common-event';
export { ErrorMessages } from './core/error-messages';
export { LocationArgs } from './core/location-args';
export { Logging } from './core/logging';
export { Matrix2D } from './core/matrix-2d';
export { Model } from './core/model';
export { ModelEvent } from './core/model-event';
export { MouseEventArgs } from './core/mouse-event-args';
export { MouseLocationArgs } from './core/mouse-location-args';
export { MousePositionInfo } from './core/mouse-position-info';
export { NamedColor } from './core/named-color';
export { Point } from './core/point';
export { PointDepth } from './core/point-depth';
export { PointEventParameters } from './core/point-event-parameters';
export { Region } from './core/region';
export { ScalingInfo } from './core/scaling-info';
export { Size } from './core/size';
export { SizeArgs } from './core/size-args';
export { StrokeInfo } from './core/stroke-info';
export { TimerParameters } from './core/timer-parameters';
export { Utility } from './core/utility';
export { ViewDragArgs } from './core/view-drag-args';
export { WindingMode } from './core/winding-mode';

export { Component } from './design/component/component';
export { ComponentElement } from './design/component/component-element';
export { ComponentEvent } from './design/component/component-event';
export { ComponentProps } from './design/component/component-props';
export { ComponentRegistry } from './design/component/component-registry';
export { GenericComponentProps } from './design/component/generic-component-props';
export { HtmlComponentProps } from './design/component/html-component-props';
export { ImageBasedComponentProps } from './design/component/image-based-component-props';
export { NavigateComponentProps } from './design/component/navigate-component-props';
export { ProgressRectangle } from './design/component/progress-rectangle';
export { UploadComponentProps } from './design/component/upload-component-props';

export { DesignTool } from './design/tools/design-tool';
export { EllipseTool } from './design/tools/ellipse-tool';
export { ImageElementTool } from './design/tools/image-element-tool';
export { LineTool } from './design/tools/line-tool';
export { ModelElementTool } from './design/tools/model-element-tool';
export { PenTool } from './design/tools/pen-tool';
export { PolygonTool } from './design/tools/polygon-tool';
export { PolylineTool } from './design/tools/polyline-tool';
export { RectangleTool } from './design/tools/rectangle-tool';
export { TextTool } from './design/tools/text-tool';

export { DesignController } from './design/design-controller';
export { DesignRenderer } from './design/design-renderer';
export { GridType } from './design/grid-type';
export { Handle } from './design/handle';
export { HandleFactory } from './design/handle-factory';
export { HandleMovedArgs } from './design/handle-moved-args';

export { ElementBase } from './elements/element-base';
export { ElementCreationProps } from './elements/element-creation-props';
export { ElementCreatorRegistration } from './elements/element-creator-registration';
export { ElementDragArgs } from './elements/element-drag-args';
export { ElementFactory } from './elements/element-factory';
export { ElementLocationArgs } from './elements/element-location-args';
export { ElementMouseEventArgs } from './elements/element-mouse-event-args';
export { ElementSizeArgs } from './elements/element-size-args';
export { ElementSizeProps } from './elements/element-size-props';
export { EllipseElement } from './elements/ellipse-element';
export { ImageElement } from './elements/image-element';
export { InvalidIndexException } from './elements/invalid-index-exception';
export { LineElement } from './elements/line-element';
export { ModelElement } from './elements/model-element';
export { MoveLocation } from './elements/move-location';
export { PathElement } from './elements/path-element';
export { PolygonElement } from './elements/polygon-element';
export { PolylineElement } from './elements/polyline-element';
export { RectangleElement } from './elements/rectangle-element';
export { ResizeSize } from './elements/resize-size';
export { SpriteElement } from './elements/sprite-element';
export { SpriteFrame } from './elements/sprite-frame';
export { SpriteState } from './elements/sprite-state';
export { TextElement } from './elements/text-element';
export { UploadCompletionProps } from './elements/upload-completion-props';
export { UploadProgressProps } from './elements/upload-progress-props';

export { FillFactory } from './fill/fill-factory';
export { FillInfo } from './fill/fill-info';
export { GradientFillStop } from './fill/gradient-fill-stop';
export { LinearGradientFill } from './fill/linear-gradient-fill';
export { RadialGradientFill } from './fill/radial-gradient-fill';

export { BitmapResource } from './resource/bitmap-resource';
export { ModelResource } from './resource/model-resource';
export { Resource } from './resource/resource';
export { ResourceCreatorRegistration } from './resource/resource-creator-registration';
export { ResourceFactory } from './resource/resource-factory';
export { ResourceLoaderState } from './resource/resource-loader-state';
export { ResourceManager } from './resource/resource-manager';
export { ResourceManagerEvent } from './resource/resource-manager-event';
export { ResourceState } from './resource/resource-state';
export { TextResource } from './resource/text-resource';

export { Sketcher } from './sketcher/sketcher';

export { PaneTransition } from './surface/pane-transitions/pane-transition';
export { PaneTransitionDirection } from './surface/pane-transitions/pane-transition-direction';
export { PaneTransitionFade } from './surface/pane-transitions/pane-transition-fade';
export { PaneTransitionNone } from './surface/pane-transitions/pane-transition-none';
export { PaneTransitionPush } from './surface/pane-transitions/pane-transition-push';
export { PaneTransitionReveal } from './surface/pane-transitions/pane-transition-reveal';
export { PaneTransitionSlide } from './surface/pane-transitions/pane-transition-slide';
export { PaneTransitionWipe } from './surface/pane-transitions/pane-transition-wipe';

export { Surface } from './surface/surface';
export { SurfaceAnimationFrame } from './surface/surface-animation-frame';
export { SurfaceAnimationLayer } from './surface/surface-animation-layer';
export { SurfaceAnimationViewController } from './surface/surface-animation-view-controller';
export { SurfaceButtonElement } from './surface/surface-button-element';
export { SurfaceElement } from './surface/surface-element';
export { SurfaceElementStates } from './surface/surface-element-states';
export { SurfaceHiddenLayer } from './surface/surface-hidden-layer';
export { SurfaceHtmlLayer } from './surface/surface-html-layer';
export { SurfaceImageLayer } from './surface/surface-image-layer';
export { SurfaceLayer } from './surface/surface-layer';
export { SurfacePane } from './surface/surface-pane';
export { SurfaceRadioItemSpriteElement } from './surface/surface-radio-item-sprite-element';
export { SurfaceRadioItemTextElement } from './surface/surface-radio-item-text-element';
export { SurfaceRadioStrip } from './surface/surface-radio-strip';
export { SurfaceRadioStripItem } from './surface/surface-radio-strip-item';
export { SurfaceRadioStripSelectionArgs } from './surface/surface-radio-strip-selection-args';
export { SurfaceRadioStripViewController } from './surface/surface-radio-strip-view-controller';
export { SurfaceTextElement } from './surface/surface-text-element';
export { SurfaceVideoLayer } from './surface/surface-video-layer';
export { SurfaceViewController } from './surface/surface-view-controller';

export { TransitionRenderer } from './transitions/transitions';

export { ViewController } from './view/view-controller';
export { ViewRenderer } from './view/view-renderer';

const bitmapResource = BitmapResource.create;
export { bitmapResource };

const color = Color.create;
export { color };

const design = DesignController.initializeTarget;
export { design };

const ellipse = EllipseElement.create;
export { ellipse };

const embeddedTextResource = TextResource.createFromText;
export { embeddedTextResource };

const gradientFillStop = GradientFillStop.create;
export { gradientFillStop };

const image = ImageElement.create;
export { image };

const innerModel = ModelElement.create;
export { innerModel };

const line = LineElement.create;
export { line };

const linearGradientFill = LinearGradientFill.create;
export { linearGradientFill };

export function log(output: string){
    console.log(output);
}

const matrix2D = Matrix2D.create;
export { matrix2D };

const model = Model.create;
export { model };

const modelResource = ModelResource.create;
export { modelResource };

const newId = Utility.guid;
export { newId };

const path = PathElement.create;
export { path };

const point = Point.create;
export { point };

const polygon = PolygonElement.create;
export { polygon };

const polyline = PolylineElement.create;
export { polyline };

const radialGradientFill = RadialGradientFill.create;
export { radialGradientFill };

const rectangle = RectangleElement.create;
export { rectangle };

const region = Region.create;
export { region };

const size = Size.create;
export { size };

const sketcher = Sketcher.create;
export { sketcher };

const sprite = SpriteElement.create;
export { sprite };

const spriteFrame = SpriteFrame.create;
export { spriteFrame };

const text = TextElement.create;
export { text };

const uriTextResource = TextResource.createFromUri;
export { uriTextResource };

const view = ViewController.initializeTarget;
export { view };

export default {
    BitmapResource: BitmapResource,
    Color: Color,
    CommandEventTrigger: CommandEventTrigger,
    CommonEvent: CommonEvent,
    Component: Component,
    ComponentElement: ComponentElement,
    ComponentEvent: ComponentEvent,
    ComponentProps: ComponentProps,
    ComponentRegistry: ComponentRegistry,
    ControllerEvent: ControllerEvent,
    ControllerEventArgs: ControllerEventArgs,
    DesignController: DesignController,
    DesignRenderer: DesignRenderer,
    DesignTool: DesignTool,
    ElementBase: ElementBase,
    ElementCommand: ElementCommand,
    ElementCommandHandler: ElementCommandHandler,
    ElementCommandHandlerRegistration: ElementCommandHandlerRegistration,
    ElementCreationProps: ElementCreationProps,
    ElementCreatorRegistration: ElementCreatorRegistration,
    ElementDragArgs: ElementDragArgs,
    ElementFactory: ElementFactory,
    ElementLocationArgs: ElementLocationArgs,
    ElementMouseEventArgs: ElementMouseEventArgs,
    ElementSizeArgs: ElementSizeArgs,
    ElementSizeProps: ElementSizeProps,
    EllipseElement: EllipseElement,
    EllipseTool: EllipseTool,
    ErrorMessages: ErrorMessages,
    FillFactory: FillFactory,
    FillInfo: FillInfo,
    GenericComponentProps: GenericComponentProps,
    GradientFillStop: GradientFillStop,
    GridType: GridType,
    Handle: Handle,
    HandleFactory: HandleFactory,
    HandleMovedArgs: HandleMovedArgs,
    HtmlComponentProps: HtmlComponentProps,
    ImageBasedComponentProps: ImageBasedComponentProps,
    ImageElement: ImageElement,
    ImageElementTool: ImageElementTool,
    InvalidIndexException: InvalidIndexException,
    LineElement: LineElement,
    LineTool: LineTool,
    LinearGradientFill: LinearGradientFill,
    LocationArgs: LocationArgs,
    Logging: Logging,
    Matrix2D: Matrix2D,
    Model: Model,
    ModelElement: ModelElement,
    ModelElementTool: ModelElementTool,
    ModelEvent: ModelEvent,
    ModelResource: ModelResource,
    MouseEventArgs: MouseEventArgs,
    MouseLocationArgs: MouseLocationArgs,
    MousePositionInfo: MousePositionInfo,
    MoveLocation: MoveLocation,
    NamedColor: NamedColor,
    NavigateComponentProps: NavigateComponentProps,
    PaneTransition: PaneTransition,
    PaneTransitionDirection: PaneTransitionDirection,
    PaneTransitionFade: PaneTransitionFade,
    PaneTransitionNone: PaneTransitionNone,
    PaneTransitionPush: PaneTransitionPush,
    PaneTransitionReveal: PaneTransitionReveal,
    PaneTransitionSlide: PaneTransitionSlide,
    PaneTransitionWipe: PaneTransitionWipe,
    PathElement: PathElement,
    PenTool: PenTool,
    Point: Point,
    PointDepth: PointDepth,
    PointEventParameters: PointEventParameters,
    PolygonElement: PolygonElement,
    PolygonTool: PolygonTool,
    PolylineElement: PolylineElement,
    PolylineTool: PolylineTool,
    ProgressRectangle: ProgressRectangle,
    RadialGradientFill: RadialGradientFill,
    RectangleElement: RectangleElement,
    RectangleTool: RectangleTool,
    Region: Region,
    ResizeSize: ResizeSize,
    Resource: Resource,
    ResourceCreatorRegistration: ResourceCreatorRegistration,
    ResourceFactory: ResourceFactory,
    ResourceLoaderState: ResourceLoaderState,
    ResourceManager: ResourceManager,
    ResourceManagerEvent: ResourceManagerEvent,
    ResourceState: ResourceState,
    ScalingInfo: ScalingInfo,
    Size: Size,
    SizeArgs: SizeArgs,
    Sketcher: Sketcher,
    SpriteElement: SpriteElement,
    SpriteFrame: SpriteFrame,
    SpriteState: SpriteState,
    StrokeInfo: StrokeInfo,
    Surface: Surface,
    SurfaceAnimationFrame: SurfaceAnimationFrame,
    SurfaceAnimationLayer: SurfaceAnimationLayer,
    SurfaceAnimationViewController: SurfaceAnimationViewController,
    SurfaceButtonElement: SurfaceButtonElement,
    SurfaceElement: SurfaceElement,
    SurfaceElementStates: SurfaceElementStates,
    SurfaceHiddenLayer: SurfaceHiddenLayer,
    SurfaceHtmlLayer: SurfaceHtmlLayer,
    SurfaceImageLayer: SurfaceImageLayer,
    SurfaceLayer: SurfaceLayer,
    SurfacePane: SurfacePane,
    SurfaceRadioItemSpriteElement: SurfaceRadioItemSpriteElement,
    SurfaceRadioItemTextElement: SurfaceRadioItemTextElement,
    SurfaceRadioStrip: SurfaceRadioStrip,
    SurfaceRadioStripItem: SurfaceRadioStripItem,
    SurfaceRadioStripSelectionArgs: SurfaceRadioStripSelectionArgs,
    SurfaceRadioStripViewController: SurfaceRadioStripViewController,
    SurfaceTextElement: SurfaceTextElement,
    SurfaceVideoLayer: SurfaceVideoLayer,
    SurfaceViewController: SurfaceViewController,
    TextElement: TextElement,
    TextResource: TextResource,
    TextTool: TextTool,
    TimerParameters: TimerParameters,
    TransitionRenderer: TransitionRenderer,
    UploadCompletionProps: UploadCompletionProps,
    UploadComponentProps: UploadComponentProps,
    UploadProgressProps: UploadProgressProps,
    Utility: Utility,
    ViewController: ViewController,
    ViewDragArgs: ViewDragArgs,
    ViewRenderer: ViewRenderer,
    WindingMode: WindingMode,

    bitmapResource: bitmapResource,
    color: color,
    design: design,
    ellipse: ellipse,
    embeddedTextResource: embeddedTextResource,
    gradientFillStop: gradientFillStop,
    image: image,
    innerModel: innerModel,
    line: line,
    linearGradientFill: linearGradientFill,
    log: log,
    matrix2D: matrix2D,
    model: model,
    modelResource: modelResource,
    newId: newId,
    path: path,
    point: point,
    polygon: polygon,
    polyline: polyline,
    radialGradientFill: radialGradientFill,
    rectangle: rectangle,
    region: region,
    requestAnimationFrame: false,
    size: size,
    sketcher: sketcher,
    sprite: sprite,
    spriteFrame: spriteFrame,
    text: text,
    uriTextResource: uriTextResource,
    view: view
};
