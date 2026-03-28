import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { Size } from '../core/size';
import { ArcElement } from '../elements/arc-element';
import { ArrowElement } from '../elements/arrow-element';
import { WindingMode } from '../core/winding-mode';
import { ElementBase } from '../elements/element-base';
import { EllipseElement } from '../elements/ellipse-element';
import { ImageElement } from '../elements/image-element';
import { LineElement } from '../elements/line-element';
import { ModelElement } from '../elements/model-element';
import { PathElement } from '../elements/path-element';
import { PolygonElement } from '../elements/polygon-element';
import { PolylineElement } from '../elements/polyline-element';
import { RegularPolygonElement } from '../elements/regular-polygon-element';
import { RectangleElement } from '../elements/rectangle-element';
import { RingElement } from '../elements/ring-element';
import { SpriteElement } from '../elements/sprite-element';
import { TextElement } from '../elements/text-element';
import { WedgeElement } from '../elements/wedge-element';
import { tracePathCommands } from '../elements/path-command-utils';
import { FillFactory } from '../fill/fill-factory';
import { BitmapResource } from '../resource/bitmap-resource';
import { ModelResource } from '../resource/model-resource';
import { TextResource } from '../resource/text-resource';
import type { IDesignController } from './design-controller-interface';

/**
 * Renders elements for interactive manipulation
 */
export class DesignRenderer {
    /**
     * Associated design controller
     */
    public controller: IDesignController;

    /**
     * Renders model elements for design controller
     * @param controller - Design controller
     */
    constructor(controller: IDesignController) {
        this.renderToContext = this.renderToContext.bind(this);
        this.renderElement = this.renderElement.bind(this);
        this.renderImageElement = this.renderImageElement.bind(this);
        this.renderSpriteElement = this.renderSpriteElement.bind(this);
        this.renderRectangleElement = this.renderRectangleElement.bind(this);
        this.renderLineElement = this.renderLineElement.bind(this);
        this.renderPolylineElement = this.renderPolylineElement.bind(this);
        this.renderPolygonElement = this.renderPolygonElement.bind(this);
        this.renderPathElement = this.renderPathElement.bind(this);
        this.renderArcElement = this.renderArcElement.bind(this);
        this.renderRegularPolygonElement = this.renderRegularPolygonElement.bind(this);
        this.renderArrowElement = this.renderArrowElement.bind(this);
        this.renderWedgeElement = this.renderWedgeElement.bind(this);
        this.renderRingElement = this.renderRingElement.bind(this);
        this.renderEllipseElement = this.renderEllipseElement.bind(this);
        this.renderTextElement = this.renderTextElement.bind(this);
        this.renderModelElement = this.renderModelElement.bind(this);

        this.controller = controller;
    }

    /**
     * Renders model elements at designated scale to canvas 2d context
     * @param c - Rendering context
     * @param scale - Rendering scale
     */
    public renderToContext(c: CanvasRenderingContext2D, scale: number) {
        const model = this.controller.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const b = model.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        const w = b.size.width;
        const h = b.size.height;

        c.save();
        if (arguments.length > 1 && scale !== 1) {
            c.scale(scale, scale);
        }

        // If transformed
        if (model.transform) {
            model.setRenderTransform(c, model.transform, b.location);
        }
        model.applyRenderOpacity(c);

        // Fill
        if (FillFactory.setElementFill(c, model)) {
            if (model.fillOffsetX || model.fillOffsetY) {
                const fillOffsetX = model.fillOffsetX || 0;
                const fillOffsetY = model.fillOffsetY || 0;
                c.translate(fillOffsetX, fillOffsetY);
                c.fillRect(-fillOffsetX, -fillOffsetY, w, h);
                c.translate(-fillOffsetX, -fillOffsetY);
            } else {
                c.fillRect(0, 0, w, h);
            }
        }

        // Render elements
        c.globalAlpha = 1.0;
        for (const el of model.elements) {
            this.renderElement(c, el);
        }

        // Stroke
        if (model.setElementStroke(c, model)) {
            c.strokeRect(0, 0, w, h);
        }
        c.restore();
    }

    /**
     * Renders a model element to canvas 2d context
     * @param c - Rendering context
     * @param el - Element to render
     */
    public renderElement(c: CanvasRenderingContext2D, el: ElementBase) {
        if (el.visible === false) {
            return;
        }
        switch (el.type) {
            case 'image':
                this.renderImageElement(c, el as ImageElement);
                break;

            case 'sprite':
                this.renderSpriteElement(c, el as SpriteElement);
                break;

            case 'rectangle':
                this.renderRectangleElement(c, el as RectangleElement);
                break;

            case 'line':
                this.renderLineElement(c, el as LineElement);
                break;

            case 'polyline':
                this.renderPolylineElement(c, el as PolylineElement);
                break;

            case 'polygon':
                this.renderPolygonElement(c, el as PolygonElement);
                break;

            case 'path':
                this.renderPathElement(c, el as PathElement);
                break;

            case 'arc':
                this.renderArcElement(c, el as ArcElement);
                break;

            case 'regularPolygon':
                this.renderRegularPolygonElement(c, el as RegularPolygonElement);
                break;

            case 'arrow':
                this.renderArrowElement(c, el as ArrowElement);
                break;

            case 'wedge':
                this.renderWedgeElement(c, el as WedgeElement);
                break;

            case 'ring':
                this.renderRingElement(c, el as RingElement);
                break;

            case 'ellipse':
                this.renderEllipseElement(c, el as EllipseElement);
                break;

            case 'model':
                this.renderModelElement(c, el as ModelElement);
                break;

            case 'text':
                this.renderTextElement(c, el as TextElement);
                break;
        }
    }

    /**
     * Renders an imag eelement to canvas 2d context
     * @param c - Rendering context
     * @param image - Image element to render
     */
    public renderImageElement(c: CanvasRenderingContext2D, image: ImageElement) {
        const model = image.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!image.source) {
            throw new Error(ErrorMessages.SourceUndefined);
        }
        const resource = model.resourceManager.get(image.source) as BitmapResource;
        if (!resource.image) {
            throw new Error(ErrorMessages.ImageUndefined);
        }
        let location = image.getLocation();
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        let size = image.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SourceUndefined);
        }
        if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(image)) {
            location = this.controller.getElementMoveLocation(image);
            size = this.controller.getElementResizeSize(image);
        }
        c.save();
        if (image.transform) {
            model.setRenderTransform(c, image.transform, location);
        }
        image.applyRenderOpacity(c);
        try {
            c.drawImage(resource.image, location.x, location.y, size.width, size.height);
        } catch (ignore) {
            throw new Error(ErrorMessages.CanvasDrawImageError + ':' + ignore);
        }
        if (model.setElementStroke(c, image)) {
            c.strokeRect(location.x, location.y, size.width, size.height);
        }
        c.restore();
    }

    /**
     * Renders a sprite element to canvas 2d context
     * @param c - Rendering context
     * @param sprite - Sprite element to render
     */
    public renderSpriteElement(c: CanvasRenderingContext2D, sprite: SpriteElement) {
        const model = sprite.model;
        if (!sprite.frames) {
            return;
        }
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const frame = sprite.frames[sprite.frameIndex];
        const resource = model.resourceManager.get(frame.source) as BitmapResource;
        if (!resource.image) {
            throw new Error(ErrorMessages.ImageUndefined);
        }
        let location = sprite.getLocation();
        let size = sprite.getSize();
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(sprite)) {
            location = this.controller.getElementMoveLocation(sprite);
            size = this.controller.getElementResizeSize(sprite);
        }
        c.save();
        if (sprite.transform) {
            model.setRenderTransform(c, sprite.transform, location);
        }
        sprite.applyRenderOpacity(c);
        if (frame.opacity !== undefined && frame.opacity > 0 && frame.opacity < 1.0) {
            c.globalAlpha *= frame.opacity;
            c.drawImage(
                resource.image,
                frame.x,
                frame.y,
                frame.width,
                frame.height,
                location.x,
                location.y,
                size.width,
                size.height,
            );
        } else {
            c.drawImage(
                resource.image,
                frame.x,
                frame.y,
                frame.width,
                frame.height,
                location.x,
                location.y,
                size.width,
                size.height,
            );
        }
        c.restore();
    }

    /**
     * Renders a rectangle element to canvas 2d context
     * @param c - Rendering context
     * @param rectangle - Rectangle element to render
     */
    public renderRectangleElement(c: CanvasRenderingContext2D, rectangle: RectangleElement) {
        const model = rectangle.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let location = rectangle.getLocation();
        let size = rectangle.getSize();
        if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(rectangle)) {
            location = this.controller.getElementMoveLocation(rectangle);
            size = this.controller.getElementResizeSize(rectangle);
        }
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        const x = location.x;
        const y = location.y;
        const w = size.width;
        const h = size.height;
        c.save();
        if (rectangle.transform) {
            model.setRenderTransform(c, rectangle.transform, location);
        }
        if (FillFactory.setElementFill(c, rectangle)) {
            if (rectangle.fillOffsetX || rectangle.fillOffsetY) {
                const fillOffsetX = rectangle.fillOffsetX || 0;
                const fillOffsetY = rectangle.fillOffsetY || 0;
                c.translate(location.x + fillOffsetX, location.y + fillOffsetY);
                c.beginPath();
                rectangle.tracePath(c, new Point(-fillOffsetX, -fillOffsetY), new Size(w, h));
                c.fill();
                c.translate(-(location.x + fillOffsetX), -(location.y + fillOffsetY));
            } else {
                c.translate(location.x, location.y);
                c.beginPath();
                rectangle.tracePath(c, Point.Origin, new Size(w, h));
                c.fill();
                c.translate(-location.x, -location.y);
            }
        }
        if (model.setElementStroke(c, rectangle)) {
            c.beginPath();
            rectangle.tracePath(c, location, size);
            c.stroke();
        }
        c.restore();
    }

    /**
     * Renders a line element to canvas 2d context
     * @param c - Rendering context
     * @param line - Line element to render
     */
    public renderLineElement(c: CanvasRenderingContext2D, line: LineElement) {
        const model = line.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let p1x;
        let p2x;
        let p1y;
        let p2y;
        let offsetX = 0;
        let offsetY = 0;
        const b = line.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        const p1 = line.getP1();
        const p2 = line.getP2();
        if (!p1 || !p2) {
            throw new Error(ErrorMessages.NoPointsAreDefined);
        }
        let location = b.location;
        if (this.controller.isMoving && this.controller.isSelected(line)) {
            location = this.controller.getElementMoveLocation(line);
            offsetX = location.x - b.x;
            offsetY = location.y - b.y;
        }
        if (this.controller.isMovingPoint && this.controller.isSelected(line) && this.controller.movingPointLocation) {
            if (this.controller.movingPointIndex === 0) {
                p1x = this.controller.movingPointLocation.x;
                p1y = this.controller.movingPointLocation.y;
                p2x = p2.x;
                p2y = p2.y;
            } else if (this.controller.movingPointIndex === 1) {
                p1x = p1.x;
                p1y = p1.y;
                p2x = this.controller.movingPointLocation.x;
                p2y = this.controller.movingPointLocation.y;
            } else {
                p1x = p1.x;
                p2x = p2.x;
                p1y = p1.y;
                p2y = p2.y;
            }
        } else {
            p1x = p1.x;
            p2x = p2.x;
            p1y = p1.y;
            p2y = p2.y;
        }
        c.save();
        if (line.transform) {
            model.setRenderTransform(c, line.transform, location);
        }
        c.beginPath();
        c.moveTo(p1x + offsetX, p1y + offsetY);
        c.lineTo(p2x + offsetX, p2y + offsetY);
        if (model.setElementStroke(c, line)) {
            c.stroke();
        }
        c.restore();
    }

    /**
     * Renders a polyline element to canvas 2d context
     * @param c - Rendering context
     * @param polyline - Polyline element to render
     */
    public renderPolylineElement(c: CanvasRenderingContext2D, polyline: PolylineElement) {
        const model = polyline.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let movingPointIndex;
        let movingPointLocation;
        let offsetX = 0;
        let offsetY = 0;
        let scaleX = 1;
        let scaleY = 1;
        const b = polyline.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let location = b.location;
        let size = b.size;
        let scaled;
        if (this.controller.isMoving && this.controller.isSelected(polyline)) {
            location = this.controller.getElementMoveLocation(polyline);
            offsetX = location.x - b.x;
            offsetY = location.y - b.y;
        }
        if (this.controller.isResizing && this.controller.isSelected(polyline)) {
            location = this.controller.getElementMoveLocation(polyline);
            size = this.controller.getElementResizeSize(polyline);
            offsetX = location.x - b.x;
            offsetY = location.y - b.y;
            scaleX = size.width / b.width;
            scaleY = size.height / b.height;
        }
        if (this.controller.isMovingPoint && this.controller.isSelected(polyline)) {
            movingPointIndex = this.controller.movingPointIndex;
            movingPointLocation = this.controller.movingPointLocation;
        }
        c.save();
        if (polyline.transform) {
            model.setRenderTransform(c, polyline.transform, location);
        }
        c.beginPath();
        if (movingPointIndex === 0 && movingPointLocation) {
            c.moveTo(movingPointLocation.x, movingPointLocation.y);
        } else {
            scaled = Point.scale(polyline.getPointAt(0), scaleX, scaleY, b.x, b.y);
            scaled = Point.translate(scaled, offsetX, offsetY);
            c.moveTo(scaled.x, scaled.y);
        }
        const l = polyline.pointCount();
        let i;
        let scaled2;
        if (polyline.smoothPoints) {
            for (i = 1; i < l - 2; i++) {
                if (i === movingPointIndex && movingPointLocation) {
                    scaled2 = Point.scale(polyline.getPointAt(i + 1), scaleX, scaleY, b.x, b.y);
                    scaled2 = Point.translate(scaled2, offsetX, offsetY);
                    const xc = (movingPointLocation.x + scaled2.x) / 2;
                    const yc = (movingPointLocation.y + scaled2.y) / 2;
                    c.quadraticCurveTo(movingPointLocation.x, movingPointLocation.y, xc, yc);
                } else {
                    scaled = Point.scale(polyline.getPointAt(i), scaleX, scaleY, b.x, b.y);
                    scaled = Point.translate(scaled, offsetX, offsetY);
                    scaled2 = Point.scale(polyline.getPointAt(i + 1), scaleX, scaleY, b.x, b.y);
                    scaled2 = Point.translate(scaled2, offsetX, offsetY);
                    const xc = (scaled.x + scaled2.x) / 2;
                    const yc = (scaled.y + scaled2.y) / 2;
                    c.quadraticCurveTo(scaled.x, scaled.y, xc, yc);
                }
            }
            c.lineCap = 'round';
            if (i === movingPointIndex && movingPointLocation) {
                scaled2 = Point.scale(movingPointLocation, scaleX, scaleY, b.x, b.y);
                scaled2 = Point.translate(scaled2, offsetX, offsetY);
                c.lineTo(scaled2.x, scaled2.y);
                // c.quadraticCurveTo(movingPointLocation.x, movingPointLocation.y, scaled2.x, scaled2.y);
            } else {
                scaled2 = Point.scale(polyline.getPointAt(i + 1), scaleX, scaleY, b.x, b.y);
                scaled2 = Point.translate(scaled2, offsetX, offsetY);
                c.lineTo(scaled2.x, scaled2.y);
            }
        } else {
            for (i = 1; i < l; i++) {
                if (i === movingPointIndex && movingPointLocation) {
                    c.lineTo(movingPointLocation.x + offsetX, movingPointLocation.y + offsetY);
                } else {
                    scaled = Point.scale(polyline.getPointAt(i), scaleX, scaleY, b.x, b.y);
                    scaled = Point.translate(scaled, offsetX, offsetY);
                    c.lineTo(scaled.x, scaled.y);
                }
            }
        }
        if (model.setElementStroke(c, polyline)) {
            c.stroke();
        }
        c.restore();
    }

    /**
     * Renders a polygon element to canvas 2d context
     * @param c - Rendering context
     * @param polygon - Polygon element to render
     */
    public renderPolygonElement(c: CanvasRenderingContext2D, polygon: PolygonElement) {
        const model = polygon.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let movingPointIndex = null;
        let movingPointLocation = null;
        let offsetX = 0;
        let offsetY = 0;
        let scaleX = 1;
        let scaleY = 1;
        const b = polygon.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let location = b.location;
        let size = b.size;
        let scaled;
        if (this.controller.isMoving && this.controller.isSelected(polygon)) {
            location = this.controller.getElementMoveLocation(polygon);
            offsetX = location.x - b.x;
            offsetY = location.y - b.y;
        }
        if (this.controller.isResizing && this.controller.isSelected(polygon)) {
            location = this.controller.getElementMoveLocation(polygon);
            size = this.controller.getElementResizeSize(polygon);
            offsetX = location.x - b.x;
            offsetY = location.y - b.y;
            scaleX = size.width / b.width;
            scaleY = size.height / b.height;
        }
        if (this.controller.isMovingPoint && this.controller.isSelected(polygon)) {
            movingPointIndex = this.controller.movingPointIndex;
            movingPointLocation = this.controller.movingPointLocation;
        }
        c.save();
        if (polygon.transform) {
            model.setRenderTransform(c, polygon.transform, location);
        }
        c.beginPath();
        if (movingPointIndex === 0 && movingPointLocation) {
            c.moveTo(movingPointLocation.x, movingPointLocation.y);
        } else {
            scaled = Point.scale(polygon.getPointAt(0), scaleX, scaleY, b.x, b.y);
            scaled = Point.translate(scaled, offsetX, offsetY);
            c.moveTo(scaled.x, scaled.y);
        }
        const l = polygon.pointCount();
        let i;
        for (i = 1; i < l; i++) {
            if (i === movingPointIndex && movingPointLocation) {
                c.lineTo(movingPointLocation.x, movingPointLocation.y);
            } else {
                scaled = Point.scale(polygon.getPointAt(i), scaleX, scaleY, b.x, b.y);
                scaled = Point.translate(scaled, offsetX, offsetY);
                c.lineTo(scaled.x, scaled.y);
            }
        }
        c.closePath();
        if (FillFactory.setElementFill(c, polygon)) {
            let loc = polygon.getLocation();
            if (!loc) {
                throw new Error(ErrorMessages.LocationUndefined);
            }
            if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(polygon)) {
                loc = this.controller.getElementMoveLocation(polygon);
            }
            if (polygon.fillOffsetX || polygon.fillOffsetY) {
                const fillOffsetX = polygon.fillOffsetX || 0;
                const fillOffsetY = polygon.fillOffsetY || 0;
                c.translate(loc.x + fillOffsetX, loc.y + fillOffsetY);
                if (polygon.winding && polygon.winding === WindingMode.EvenOdd) {
                    c.fill('evenodd');
                } else {
                    c.fill('nonzero');
                }
                c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
            } else {
                c.translate(loc.x, loc.y);
                if (polygon.winding && polygon.winding === WindingMode.EvenOdd) {
                    c.fill('evenodd');
                } else {
                    c.fill('nonzero');
                }
                c.translate(-loc.x, -loc.y);
            }
        }
        if (model.setElementStroke(c, polygon)) {
            c.stroke();
        }
        c.restore();
    }

    /**
     * Renders a path element to canvas 2d context
     * @param c - Rendering context
     * @param pathElement - Path element to render
     */
    public renderPathElement(c: CanvasRenderingContext2D, pathElement: PathElement) {
        const model = pathElement.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let movingPointIndex;
        let movingPointLocation;
        let offsetX = 0;
        let offsetY = 0;
        let scaleX = 1;
        let scaleY = 1;
        const b = pathElement.getBounds();
        if (!b) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        let location = b.location;
        let size = b.size;
        if (this.controller.isMoving && this.controller.isSelected(pathElement)) {
            location = this.controller.getElementMoveLocation(pathElement);
            offsetX = location.x - b.x;
            offsetY = location.y - b.y;
        }
        if (this.controller.isResizing && this.controller.isSelected(pathElement)) {
            location = this.controller.getElementMoveLocation(pathElement);
            size = this.controller.getElementResizeSize(pathElement);
            offsetX = location.x - b.x;
            offsetY = location.y - b.y;
            scaleX = size.width / b.width;
            scaleY = size.height / b.height;
        }
        if (this.controller.isMovingPoint && this.controller.isSelected(pathElement)) {
            movingPointIndex = this.controller.movingPointIndex;
            movingPointLocation = this.controller.movingPointLocation;
        }
        c.save();
        if (pathElement.transform) {
            model.setRenderTransform(c, pathElement.transform, location);
        }
        c.beginPath();
        const commands = pathElement.getCommands();
        if (commands) {
            const previewPath = PathElement.create();
            previewPath.setCommands(commands.join(' '));
            if (scaleX !== 1 || scaleY !== 1) {
                previewPath.scale(scaleX, scaleY);
            }
            if (offsetX !== 0 || offsetY !== 0) {
                previewPath.translate(offsetX, offsetY);
            }
            if (movingPointIndex !== undefined && movingPointLocation) {
                previewPath.setPointAt(
                    movingPointIndex,
                    new Point(movingPointLocation.x + offsetX, movingPointLocation.y + offsetY),
                    this.controller.selectedElementCount() === 1 ? PointDepth.Full : PointDepth.Simple,
                );
            }
            tracePathCommands(c, previewPath.getCommands());
        }

        if (FillFactory.setElementFill(c, pathElement)) {
            let loc = pathElement.getLocation();
            if (loc) {
                if (
                    (this.controller.isMoving || this.controller.isResizing) &&
                    this.controller.isSelected(pathElement)
                ) {
                    loc = this.controller.getElementMoveLocation(pathElement);
                }
                if (pathElement.fillOffsetX || pathElement.fillOffsetY) {
                    const fillOffsetX = pathElement.fillOffsetX || 0;
                    const fillOffsetY = pathElement.fillOffsetY || 0;
                    c.translate(loc.x + fillOffsetX, loc.y + fillOffsetY);
                    if (pathElement.winding && pathElement.winding === WindingMode.EvenOdd) {
                        c.fill('evenodd');
                    } else {
                        c.fill('nonzero');
                    }
                    c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
                } else {
                    c.translate(loc.x, loc.y);
                    if (pathElement.winding && pathElement.winding === WindingMode.EvenOdd) {
                        c.fill('evenodd');
                    } else {
                        c.fill('nonzero');
                    }
                    c.translate(-loc.x, -loc.y);
                }
            }
        }

        if (model.setElementStroke(c, pathElement)) {
            c.stroke();
        }
        c.restore();
    }

    private renderEditablePrimitive<T extends ElementBase>(c: CanvasRenderingContext2D, element: T & { clone(): T }): void {
        const model = element.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        let preview: T & { clone(): T } = element;
        if (
            (this.controller.isMoving || this.controller.isResizing || this.controller.isMovingPoint)
            && this.controller.isSelected(element)
        ) {
            preview = element.clone() as T & { clone(): T };
            preview.model = model;
            if (this.controller.isMoving || this.controller.isResizing) {
                preview.setLocation(this.controller.getElementMoveLocation(element));
            }
            if (this.controller.isResizing) {
                preview.setSize(this.controller.getElementResizeSize(element));
            }
            if (this.controller.isMovingPoint && this.controller.movingPointIndex !== undefined && this.controller.movingPointLocation) {
                preview.setPointAt(
                    this.controller.movingPointIndex,
                    this.controller.movingPointLocation,
                    this.controller.selectedElementCount() === 1 ? PointDepth.Full : PointDepth.Simple,
                );
            }
        }

        preview.draw(c);
    }

    public renderArcElement(c: CanvasRenderingContext2D, arc: ArcElement) {
        this.renderEditablePrimitive(c, arc);
    }

    public renderRegularPolygonElement(c: CanvasRenderingContext2D, polygon: RegularPolygonElement) {
        this.renderEditablePrimitive(c, polygon);
    }

    public renderArrowElement(c: CanvasRenderingContext2D, arrow: ArrowElement) {
        this.renderEditablePrimitive(c, arrow);
    }

    public renderWedgeElement(c: CanvasRenderingContext2D, wedge: WedgeElement) {
        this.renderEditablePrimitive(c, wedge);
    }

    public renderRingElement(c: CanvasRenderingContext2D, ring: RingElement) {
        this.renderEditablePrimitive(c, ring);
    }

    /**
     * Renders an ellipe element to canvas 2d context
     * @param c - Rendering context
     * @param ellipse - Ellipse element to render
     */
    public renderEllipseElement(c: CanvasRenderingContext2D, ellipse: EllipseElement) {
        const model = ellipse.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let center = ellipse.getCenter();
        let radiusX = ellipse.radiusX;
        let radiusY = ellipse.radiusY;
        if (radiusX === undefined || radiusY === undefined || center === undefined) {
            throw new Error(ErrorMessages.PointsAreInvalid);
        }
        if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(ellipse)) {
            const location = this.controller.getElementMoveLocation(ellipse);
            const size = this.controller.getElementResizeSize(ellipse);
            center = new Point(location.x + size.width / 2, location.y + size.height / 2);
            radiusX = size.width / 2;
            radiusY = size.height / 2;
        }
        c.save();
        if (ellipse.transform) {
            const b = ellipse.getBounds();
            if (b) {
                let ref = b.location;
                if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(ellipse)) {
                    ref = this.controller.getElementMoveLocation(ellipse);
                }
                model.setRenderTransform(c, ellipse.transform, ref);
            }
        }
        const scaleY = radiusY / radiusX;
        c.save();
        c.beginPath();
        c.translate(center.x, center.y);
        c.scale(1.0, scaleY);
        c.arc(0, 0, radiusX, 0, Math.PI * 2, false);
        c.closePath();
        c.restore();
        if (FillFactory.setElementFill(c, ellipse)) {
            let loc = ellipse.getLocation();
            if (loc) {
                if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(ellipse)) {
                    loc = this.controller.getElementMoveLocation(ellipse);
                }
                if (ellipse.fillOffsetX || ellipse.fillOffsetY) {
                    const fillOffsetX = ellipse.fillOffsetX || 0;
                    const fillOffsetY = ellipse.fillOffsetY || 0;
                    c.translate(loc.x + fillOffsetX, loc.y + fillOffsetY);
                    c.fill();
                    c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
                } else {
                    c.translate(loc.x, loc.y);
                    c.fill();
                    c.translate(-loc.x, -loc.y);
                }
            }
        }
        if (model.setElementStroke(c, ellipse)) {
            c.stroke();
        }
        c.restore();
    }

    /**
     * Renders a text element to canvas 2d context
     * @param c - Rendering context
     * @param textElement - Text element to render
     */
    public renderTextElement(c: CanvasRenderingContext2D, textElement: TextElement) {
        let location = textElement.getLocation();
        let size = textElement.getSize();
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(textElement)) {
            location = this.controller.getElementMoveLocation(textElement);
            size = this.controller.getElementResizeSize(textElement);
        }
        textElement.renderText(c, location, size);
    }

    /**
     * Renders a model element to canvas 2d context
     * @param c - Rendering context
     * @param modelElement - Model element to render
     */
    public renderModelElement(c: CanvasRenderingContext2D, modelElement: ModelElement) {
        const model = modelElement.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let location = modelElement.getLocation();
        let size = modelElement.getSize();
        if (!location) {
            throw new Error(ErrorMessages.LocationUndefined);
        }
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(modelElement)) {
            location = this.controller.getElementMoveLocation(modelElement);
            size = this.controller.getElementResizeSize(modelElement);
        }

        let innerModel;
        if (modelElement.sourceModel) {
            innerModel = modelElement.sourceModel;
        } else {
            if (!modelElement.source) {
                throw new Error(ErrorMessages.SourceUndefined);
            }
            const resource = model.resourceManager.get(modelElement.source) as ModelResource;
            innerModel = resource.model;
        }
        if (!innerModel) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        const x = location.x;
        const y = location.y;
        let w = 0;
        let h = 0;
        let rx = 1;
        let ry = 1;
        const innerModelSize = innerModel.getSize();
        if (size && size !== Size.Empty) {
            w = size.width;
            h = size.height;
        } else if (innerModelSize) {
            w = innerModelSize.width;
            h = innerModelSize.height;
        }
        if (innerModelSize && innerModelSize.width > 0 && innerModelSize.height > 0) {
            rx = w / innerModelSize.width;
            ry = h / innerModelSize.height;
        }

        // Clip to bounds
        /*
        c.save();
        c.rect(x, y, w, h);
        c.stroke();
        c.clip();
        */

        // If not full opacity, then render to intermediate canvas
        if (modelElement.opacity !== undefined && modelElement.opacity > 0 && modelElement.opacity < 1.0) {
            const offscreen = document.createElement('canvas');
            offscreen.width = w;
            offscreen.height = h;
            const c2 = offscreen.getContext('2d');
            if (c2) {
                c2.scale(rx, ry);
                innerModel.renderToContext(c2);
            }
            c.save();
            c.globalAlpha = modelElement.opacity;
            if (modelElement.transform) {
                model.setRenderTransform(c, modelElement.transform, new Point(x, y));
            }
            c.drawImage(offscreen, x, y);
            c.restore();
        } else {
            c.save();
            if (modelElement.transform) {
                model.setRenderTransform(c, modelElement.transform, new Point(x, y));
            }
            c.save();
            c.translate(x, y);
            if (rx !== 1 || ry !== 1) {
                c.scale(rx, ry);
            }
            // innerModel.renderer = this;
            innerModel.renderToContext(c);
            c.restore();
            c.restore();
        }

        // Restore clip
        // c.restore();
    }
}
