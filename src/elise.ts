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

export default {
    BitmapResource: { BitmapResource },
    Color: { Color },
    CommandEventTrigger: { CommandEventTrigger },
    CommonEvent: { CommonEvent },
    Component: { Component },
    ComponentElement: { ComponentElement },
    ComponentEvent: { ComponentEvent },
    ComponentProps: { ComponentProps },
    ComponentRegistry: { ComponentRegistry },
    ControllerEvent: { ControllerEvent },
    ControllerEventArgs: { ControllerEventArgs },
    DesignController: { DesignController },
    DesignRenderer: { DesignRenderer },
    DesignTool: { DesignTool },
    ElementBase: { ElementBase },
    ElementCommand: { ElementCommand },
    ElementCommandHandler: { ElementCommandHandler },
    ElementCommandHandlerRegistration: { ElementCommandHandlerRegistration },
    ElementCreationProps: { ElementCreationProps },
    ElementCreatorRegistration: { ElementCreatorRegistration },
    ElementDragArgs: { ElementDragArgs },
    ElementFactory: { ElementFactory },
    ElementLocationArgs: { ElementLocationArgs },
    ElementMouseEventArgs: { ElementMouseEventArgs },
    ElementSizeArgs: { ElementSizeArgs },
    ElementSizeProps: { ElementSizeProps },
    EllipseElement: { EllipseElement },
    EllipseTool: { EllipseTool },
    ErrorMessages: { ErrorMessages },
    FillFactory: { FillFactory },
    FillInfo: { FillInfo },
    GenericComponentProps: { GenericComponentProps },
    GradientFillStop: { GradientFillStop },
    GridType: { GridType },
    Handle: { Handle },
    HandleFactory: { HandleFactory },
    HandleMovedArgs: { HandleMovedArgs },
    HtmlComponentProps: { HtmlComponentProps },
    ImageBasedComponentProps: { ImageBasedComponentProps },
    ImageElement: { ImageElement },
    ImageElementTool: { ImageElementTool },
    InvalidIndexException: { InvalidIndexException },
    LineElement: { LineElement },
    LineTool: { LineTool },
    LinearGradientFill: { LinearGradientFill },
    LocationArgs: { LocationArgs },
    Logging: { Logging },
    Matrix2D: { Matrix2D },
    Model: { Model },
    ModelElement: { ModelElement },
    ModelElementTool: { ModelElementTool },
    ModelEvent: { ModelEvent },
    ModelResource: { ModelResource },
    MouseEventArgs: { MouseEventArgs},
    MouseLocationArgs: { MouseLocationArgs },
    MousePositionInfo: { MousePositionInfo },
    MoveLocation: { MoveLocation },
    NamedColor: { NamedColor },
    NavigateComponentProps: { NavigateComponentProps },
    PaneTransition: { PaneTransition },
    PaneTransitionDirection: { PaneTransitionDirection },
    PaneTransitionFade: { PaneTransitionFade },
    PaneTransitionNone: { PaneTransitionNone },
    PaneTransitionPush: { PaneTransitionPush },
    PaneTransitionReveal: { PaneTransitionReveal },
    PaneTransitionSlide: { PaneTransitionSlide },
    PaneTransitionWipe: { PaneTransitionWipe },
    PathElement: { PathElement },
    PenTool: { PenTool },
    Point: { Point },
    PointDepth: { PointDepth },
    PointEventParameters: { PointEventParameters },
    PolygonElement: { PolygonElement },
    PolygonTool: { PolygonTool },
    PolylineElement: { PolylineElement },
    PolylineTool: { PolylineTool },
    ProgressRectangle: { ProgressRectangle },
    RadialGradientFill: { RadialGradientFill },
    RectangleElement: { RectangleElement },
    RectangleTool: { RectangleTool },
    Region: { Region },
    ResizeSize: { ResizeSize },
    Resource: { Resource },
    ResourceCreatorRegistration: { ResourceCreatorRegistration },
    ResourceFactory: { ResourceFactory },
    ResourceLoaderState: { ResourceLoaderState },
    ResourceManager: { ResourceManager },
    ResourceManagerEvent: { ResourceManagerEvent },
    ResourceState: { ResourceState },
    ScalingInfo: { ScalingInfo },
    Size: { Size },
    SizeArgs: { SizeArgs },
    Sketcher: { Sketcher },
    SpriteElement: { SpriteElement },
    SpriteFrame: { SpriteFrame },
    SpriteState: { SpriteState },
    StrokeInfo: { StrokeInfo },
    Surface: { Surface },
    SurfaceAnimationFrame: { SurfaceAnimationFrame },
    SurfaceAnimationLayer: { SurfaceAnimationLayer },
    SurfaceAnimationViewController: { SurfaceAnimationViewController },
    SurfaceButtonElement: { SurfaceButtonElement },
    SurfaceElement: { SurfaceElement },
    SurfaceElementStates: { SurfaceElementStates },
    SurfaceHiddenLayer: { SurfaceHiddenLayer },
    SurfaceHtmlLayer: { SurfaceHtmlLayer },
    SurfaceImageLayer: { SurfaceImageLayer },
    SurfaceLayer: { SurfaceLayer },
    SurfacePane: { SurfacePane },
    SurfaceRadioItemSpriteElement: { SurfaceRadioItemSpriteElement },
    SurfaceRadioItemTextElement: { SurfaceRadioItemTextElement },
    SurfaceRadioStrip: { SurfaceRadioStrip },
    SurfaceRadioStripItem: { SurfaceRadioStripItem },
    SurfaceRadioStripSelectionArgs: { SurfaceRadioStripSelectionArgs },
    SurfaceRadioStripViewController: { SurfaceRadioStripViewController },
    SurfaceTextElement: { SurfaceTextElement },
    SurfaceVideoLayer: { SurfaceVideoLayer },
    SurfaceViewController: { SurfaceViewController },
    TextElement: { TextElement },
    TextResource: { TextResource },
    TextTool: { TextTool },
    TimerParameters: { TimerParameters },
    TransitionRenderer: { TransitionRenderer },
    UploadCompletionProps: { UploadCompletionProps },
    UploadComponentProps: { UploadComponentProps },
    UploadProgressProps: { UploadProgressProps },
    ViewDragArgs: { ViewDragArgs },
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
    uriTextResource: TextResource.createFromUri
};
