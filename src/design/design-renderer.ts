import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { Size } from '../core/size';
import { WindingMode } from '../core/winding-mode';
import { ElementBase } from '../elements/element-base';
import { EllipseElement } from '../elements/ellipse-element';
import { ImageElement } from '../elements/image-element';
import { LineElement } from '../elements/line-element';
import { ModelElement } from '../elements/model-element';
import { PathElement } from '../elements/path-element';
import { PolygonElement } from '../elements/polygon-element';
import { PolylineElement } from '../elements/polyline-element';
import { RectangleElement } from '../elements/rectangle-element';
import { SpriteElement } from '../elements/sprite-element';
import { TextElement } from '../elements/text-element';
import { FillFactory } from '../fill/fill-factory';
import { BitmapResource } from '../resource/bitmap-resource';
import { ModelResource } from '../resource/model-resource';
import { TextResource } from '../resource/text-resource';
import { DesignController } from './design-controller';

export class DesignRenderer {
    /**
     * Associated design controller
     */
    public controller: DesignController;

    /**
     * Renders model elements for design controller
     * @param controller - Design controller
     */
    constructor(controller: DesignController) {
        this.controller = controller;
        this.renderToContext = this.renderToContext.bind(this);
        this.renderElement = this.renderElement.bind(this);
        this.renderImageElement = this.renderImageElement.bind(this);
        this.renderSpriteElement = this.renderSpriteElement.bind(this);
        this.renderRectangleElement = this.renderRectangleElement.bind(this);
        this.renderLineElement = this.renderLineElement.bind(this);
        this.renderPolylineElement = this.renderPolylineElement.bind(this);
        this.renderPolygonElement = this.renderPolygonElement.bind(this);
        this.renderPathElement = this.renderPathElement.bind(this);
        this.renderEllipseElement = this.renderEllipseElement.bind(this);
        this.renderTextElement = this.renderTextElement.bind(this);
        this.renderModelElement = this.renderModelElement.bind(this);
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

        // Fill
        if (FillFactory.setElementFill(c, model)) {
            if (model.fillOffsetX || model.fillOffsetY) {
                const fillOffsetX = model.fillOffsetX || 0;
                const fillOffsetY = model.fillOffsetY || 0;
                c.translate(fillOffsetX, fillOffsetY);
                c.fillRect(-fillOffsetX, -fillOffsetY, w, h);
                c.translate(-fillOffsetX, -fillOffsetY);
            }
            else {
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
        if (el.type === 'image') {
            this.renderImageElement.apply(this, [ c, el as ImageElement ]);
        }
        else if (el.type === 'sprite') {
            this.renderSpriteElement.apply(this, [ c, el as SpriteElement ]);
        }
        else if (el.type === 'rectangle') {
            this.renderRectangleElement.apply(this, [ c, el as RectangleElement ]);
        }
        else if (el.type === 'line') {
            this.renderLineElement.apply(this, [ c, el as LineElement ]);
        }
        else if (el.type === 'polyline') {
            this.renderPolylineElement.apply(this, [ c, el as PolylineElement ]);
        }
        else if (el.type === 'polygon') {
            this.renderPolygonElement.apply(this, [ c, el as PolygonElement ]);
        }
        else if (el.type === 'path') {
            this.renderPathElement.apply(this, [ c, el as PathElement ]);
        }
        else if (el.type === 'ellipse') {
            this.renderEllipseElement.apply(this, [ c, el as EllipseElement ]);
        }
        else if (el.type === 'model') {
            this.renderModelElement.apply(this, [ c, el as ModelElement ]);
        }
        else if (el.type === 'text') {
            this.renderTextElement.apply(this, [ c, el as TextElement ]);
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
        if (image.opacity !== undefined && image.opacity > 0 && image.opacity < 1.0) {
            const o = c.globalAlpha;
            c.globalAlpha = image.opacity;
            c.drawImage(resource.image, location.x, location.y, size.width, size.height);
            c.globalAlpha = o;
        }
        else if (resource.image) {
            try {
                c.drawImage(resource.image, location.x, location.y, size.width, size.height);
            } catch (ignore) {
                throw new Error('Warning: Exception thrown calling canvas context drawImage.\r\n' + ignore);
            }
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
        if (frame.opacity !== undefined && frame.opacity > 0 && frame.opacity < 1.0) {
            const o = c.globalAlpha;
            c.globalAlpha = frame.opacity;
            c.drawImage(
                resource.image,
                frame.x,
                frame.y,
                frame.width,
                frame.height,
                location.x,
                location.y,
                size.width,
                size.height
            );
            c.globalAlpha = o;
        }
        else {
            c.drawImage(
                resource.image,
                frame.x,
                frame.y,
                frame.width,
                frame.height,
                location.x,
                location.y,
                size.width,
                size.height
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
            let loc = rectangle.getLocation();
            if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(rectangle)) {
                loc = this.controller.getElementMoveLocation(rectangle);
            }
            if (!loc) {
                throw new Error(ErrorMessages.LocationUndefined);
            }
            if (rectangle.fillOffsetX || rectangle.fillOffsetY) {
                const fillOffsetX = rectangle.fillOffsetX || 0;
                const fillOffsetY = rectangle.fillOffsetY || 0;
                c.translate(loc.x + fillOffsetX, loc.y + fillOffsetY);
                c.fillRect(-fillOffsetX, -fillOffsetY, w, h);
                c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
            }
            else {
                c.translate(loc.x, loc.y);
                c.fillRect(0, 0, w, h);
                c.translate(-loc.x, -loc.y);
            }
        }
        if (model.setElementStroke(c, rectangle)) {
            c.strokeRect(x, y, w, h);
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
            }
            else if (this.controller.movingPointIndex === 1) {
                p1x = p1.x;
                p1y = p1.y;
                p2x = this.controller.movingPointLocation.x;
                p2y = this.controller.movingPointLocation.y;
            }
            else {
                p1x = p1.x;
                p2x = p2.x;
                p1y = p1.y;
                p2y = p2.y;
            }
        }
        else {
            p1x = p1.x;
            p2x = p2.x;
            p1y = p1.y;
            p2y = p2.y;
        }
        c.save();
        if (line.transform) {
            model.setRenderTransform(c, line.transform, new Point(p1x, p1y));
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
            model.setRenderTransform(c, polyline.transform, b.location);
        }
        c.beginPath();
        if (movingPointIndex === 0 && movingPointLocation) {
            c.moveTo(movingPointLocation.x, movingPointLocation.y);
        }
        else {
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
                }
                else {
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
            }
            else {
                scaled2 = Point.scale(polyline.getPointAt(i + 1), scaleX, scaleY, b.x, b.y);
                scaled2 = Point.translate(scaled2, offsetX, offsetY);
                c.lineTo(scaled2.x, scaled2.y);
            }
        }
        else {
            for (i = 1; i < l; i++) {
                if (i === movingPointIndex && movingPointLocation) {
                    c.lineTo(movingPointLocation.x + offsetX, movingPointLocation.y + offsetY);
                }
                else {
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
            model.setRenderTransform(c, polygon.transform, b.location);
        }
        c.beginPath();
        if (movingPointIndex === 0 && movingPointLocation) {
            c.moveTo(movingPointLocation.x, movingPointLocation.y);
        }
        else {
            scaled = Point.scale(polygon.getPointAt(0), scaleX, scaleY, b.x, b.y);
            scaled = Point.translate(scaled, offsetX, offsetY);
            c.moveTo(scaled.x, scaled.y);
        }
        const l = polygon.pointCount();
        let i;
        for (i = 1; i < l; i++) {
            if (i === movingPointIndex && movingPointLocation) {
                c.lineTo(movingPointLocation.x, movingPointLocation.y);
            }
            else {
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
                }
                else {
                    c.fill('nonzero');
                }
                c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
            }
            else {
                c.translate(loc.x, loc.y);
                if (polygon.winding && polygon.winding === WindingMode.EvenOdd) {
                    c.fill('evenodd');
                }
                else {
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
        let depth;
        let current = -1;
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
            if (this.controller.selectedElementCount() === 1) {
                depth = PointDepth.Full;
            }
            else {
                depth = PointDepth.Simple;
            }
        }
        c.save();
        if (pathElement.transform) {
            model.setRenderTransform(c, pathElement.transform, b.location);
        }
        c.beginPath();
        const commands = pathElement.getCommands();
        if (commands) {
            for (const command of commands) {
                if (command.charAt(0) === 'm') {
                    current++;
                    if (current === movingPointIndex && movingPointLocation) {
                        c.moveTo(movingPointLocation.x + offsetX, movingPointLocation.y + offsetY);
                    }
                    else {
                        let point = Point.parse(command.substring(1, command.length));
                        point = Point.scale(point, scaleX, scaleY, b.x, b.y);
                        point = Point.translate(point, offsetX, offsetY);
                        c.moveTo(point.x, point.y);
                    }
                }
                else if (command.charAt(0) === 'l') {
                    current++;
                    if (current === movingPointIndex && movingPointLocation) {
                        c.lineTo(movingPointLocation.x + offsetX, movingPointLocation.y + offsetY);
                    }
                    else {
                        let point = Point.parse(command.substring(1, command.length));
                        point = Point.scale(point, scaleX, scaleY, b.x, b.y);
                        point = Point.translate(point, offsetX, offsetY);
                        c.lineTo(point.x, point.y);
                    }
                }
                else if (command.charAt(0) === 'c') {
                    const parts = command.substring(1, command.length).split(',');
                    let cp1 = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
                    cp1 = Point.scale(cp1, scaleX, scaleY, b.x, b.y);
                    cp1 = Point.translate(cp1, offsetX, offsetY);
                    let cp2 = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
                    cp2 = Point.scale(cp2, scaleX, scaleY, b.x, b.y);
                    cp2 = Point.translate(cp2, offsetX, offsetY);
                    let endPoint: Point = new Point(parseFloat(parts[4]), parseFloat(parts[5]));
                    endPoint = Point.scale(endPoint, scaleX, scaleY, b.x, b.y);
                    endPoint = Point.translate(endPoint, offsetX, offsetY);
                    current++;
                    if (movingPointLocation) {
                        if (current === movingPointIndex) {
                            endPoint = movingPointLocation;
                        }
                        if (depth === PointDepth.Full) {
                            current++;
                            if (current === movingPointIndex) {
                                cp1 = movingPointLocation;
                            }
                            current++;
                            if (current === movingPointIndex) {
                                cp2 = movingPointLocation;
                            }
                        }
                    }
                    c.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
                }
                else if (command.charAt(0) === 'z') {
                    c.closePath();
                }
            }
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
                    }
                    else {
                        c.fill('nonzero');
                    }
                    c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
                }
                else {
                    c.translate(loc.x, loc.y);
                    if (pathElement.winding && pathElement.winding === WindingMode.EvenOdd) {
                        c.fill('evenodd');
                    }
                    else {
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
        if (!radiusX || !radiusY || !center) {
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
                model.setRenderTransform(c, ellipse.transform, new Point(b.x, b.y));
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
                }
                else {
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
     * @param rectangle - Text element to render
     */
    public renderTextElement(c: CanvasRenderingContext2D, textElement: TextElement) {
        const model = textElement.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
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
        c.save();
        if (textElement.transform) {
            model.setRenderTransform(c, textElement.transform, new Point(location.x, location.y));
        }
        c.beginPath();
        c.rect(location.x, location.y, size.width + 10, size.height);
        c.clip();
        let font = '';
        let fontSize = 10.0;
        let i;
        let parts;
        if (textElement.typestyle) {
            parts = textElement.typestyle.split(',');
            for (const part of parts) {
                font += part;
                font += ' ';
            }
        }
        if (textElement.typesize) {
            fontSize = textElement.typesize;
            font += textElement.typesize + 'px ';
        }
        if (textElement.typeface) {
            parts = textElement.typeface.split(',');
            for (const part of parts) {
                font += part;
                font += ' ';
            }
        }
        else {
            font += 'sans-serif';
        }
        c.font = font;
        let valign = 'top';
        let halign = 'left';
        if (textElement.alignment) {
            parts = textElement.alignment.split(',');
            for (const part of parts) {
                if (part.toLowerCase() === 'start') {
                    c.textAlign = 'start';
                    halign = 'left';
                }
                else if (part.toLowerCase() === 'end') {
                    c.textAlign = 'end';
                    halign = 'right';
                }
                else if (part.toLowerCase() === 'left') {
                    c.textAlign = 'left';
                    halign = 'left';
                }
                else if (part.toLowerCase() === 'right') {
                    c.textAlign = 'right';
                    halign = 'right';
                }
                else if (part.toLowerCase() === 'center') {
                    c.textAlign = 'center';
                    halign = 'center';
                }
                else if (part.toLowerCase() === 'top') {
                    valign = 'top';
                }
                else if (part.toLowerCase() === 'bottom') {
                    valign = 'bottom';
                }
                else if (part.toLowerCase() === 'middle') {
                    valign = 'middle';
                }
            }
        }

        // Resolve content
        let text;
        if (textElement.source) {
            const resource = model.resourceManager.get(textElement.source) as TextResource;
            if (resource) {
                text = resource.text;
            }
        }
        if (!text) {
            text = textElement.text;
        }
        if (!text) {
            return;
        }

        // Get lines of content
        const lines = textElement.getLines(c, text, size.width);

        // Compute total height of content
        const lineHeight = fontSize;
        const totalHeight = lineHeight * lines.length;
        let x;
        let y;

        if (FillFactory.setElementFill(c, textElement)) {
            let loc = textElement.getLocation();
            if (loc) {
                if (
                    (this.controller.isMoving || this.controller.isResizing) &&
                    this.controller.isSelected(textElement)
                ) {
                    loc = this.controller.getElementMoveLocation(textElement);
                }

                // Iterate lines and fill text
                x = location.x;
                if (halign === 'right') {
                    x += size.width;
                }
                else if (halign === 'center') {
                    x += size.width / 2;
                }
                y = location.y;
                c.textBaseline = 'top';
                if (valign === 'middle') {
                    y = location.y + size.height / 2 - totalHeight / 2;
                }
                else if (valign === 'bottom') {
                    y = location.y + size.height - totalHeight;
                }
                for (const line of lines) {
                    if (textElement.fillOffsetX || textElement.fillOffsetY) {
                        const fillOffsetX = textElement.fillOffsetX || 0;
                        const fillOffsetY = textElement.fillOffsetY || 0;
                        c.translate(loc.x + fillOffsetX, loc.y + fillOffsetY);
                        c.fillText(line, -fillOffsetX + x - loc.x, -fillOffsetY + y - loc.y);
                        c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
                    }
                    else {
                        c.translate(loc.x, loc.y);
                        c.fillText(line, x - loc.x, y - loc.y);
                        c.translate(-loc.x, -loc.y);
                    }
                    y += lineHeight;
                }
            }
        }

        if (model.setElementStroke(c, textElement)) {
            // Iterate lines and stroke text
            x = location.x;
            if (halign === 'right') {
                x += size.width;
            }
            else if (halign === 'center') {
                x += size.width / 2;
            }
            y = location.y;
            if (valign === 'middle') {
                y = location.y + size.height / 2 - totalHeight / 2;
            }
            else if (valign === 'bottom') {
                y = location.y + size.height - totalHeight;
            }
            for (const line of lines) {
                c.strokeText(line, x, y);
                y += lineHeight;
            }
        }
        c.restore();
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
            throw new Error(ErrorMessages.LocationUndefined)
        }
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if ((this.controller.isMoving || this.controller.isResizing) && this.controller.isSelected(modelElement)) {
            location = this.controller.getElementMoveLocation(modelElement);
            size = this.controller.getElementResizeSize(modelElement);
        }

        if (!modelElement.source) {
            throw new Error(ErrorMessages.SourceUndefined);
        }
        const resource = model.resourceManager.get(modelElement.source) as ModelResource;
        const innerModel = resource.model;
        if (!innerModel) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        const x = location.x;
        const y = location.y;
        let w = 0;
        let h = 0;
        let rx = 1;
        let ry = 1;
        if (size && size !== Size.Empty) {
            w = size.width;
            h = size.height;
        }
        else if (innerModel.size) {
            size = innerModel.getSize();
            if (size) {
                w = size.width;
                h = size.height;
            }
        }
        if (innerModel.size) {
            size = innerModel.getSize();
            if (size) {
                rx = w / size.width;
                ry = h / size.height;
            }
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
        }
        else {
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
