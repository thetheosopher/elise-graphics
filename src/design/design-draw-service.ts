import { Color } from '../core/color';
import { Matrix2D } from '../core/matrix-2d';
import { Model } from '../core/model';
import { Point } from '../core/point';
import { Size } from '../core/size';
import { ElementBase } from '../elements/element-base';
import { DesignRenderer } from './design-renderer';
import { Handle } from './handle';

export interface DesignDrawHost {
    canvas?: HTMLCanvasElement;
    model?: Model;
    renderer?: DesignRenderer;
    pixelRatio: number;
    scale: number;
    enabled: boolean;
    rubberBandActive: boolean;
    isMouseDown: boolean;
    isMoving: boolean;
    isResizing: boolean;
    isRotating: boolean;
    currentX?: number;
    currentY?: number;
    currentWidth?: number;
    currentHeight?: number;
    rotationCenter?: Point;
    originalTransform?: string;
    disabledFill?: string;
    selectedElements: ElementBase[];
    refreshPixelRatio(): boolean;
    renderGrid(): void;
    drawTextEditingOverlay(context: CanvasRenderingContext2D): void;
    getElementHandles(element: ElementBase): Handle[];
    drawDashedLine(
        context: CanvasRenderingContext2D,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        dashLength: number,
    ): void;
    drawInteractionIndicator(context: CanvasRenderingContext2D): void;
    drawRubberBand(context: CanvasRenderingContext2D): void;
    drawGuidewires(context: CanvasRenderingContext2D, x: number, y: number): void;
    drawHorizontalLine(context: CanvasRenderingContext2D, y: number): void;
    drawVerticalLine(context: CanvasRenderingContext2D, x: number): void;
    drawDashedHorizontalLine(context: CanvasRenderingContext2D, y: number): void;
    drawDashedVerticalLine(context: CanvasRenderingContext2D, x: number): void;
    drawSmartAlignmentGuides(context: CanvasRenderingContext2D): void;
    getVisualInteractionBoundsForElement(element: ElementBase): { location: Point; size: Size; x: number; y: number; width: number; height: number } | undefined;
    getElementMoveLocation(element: ElementBase): Point;
    calculateFPS(): number;
    setNeedsRedraw(value: boolean): void;
}

export class DesignDrawService {
    public draw(host: DesignDrawHost): void {
        if (!host.canvas || !host.model) {
            return;
        }

        const size = host.model.getSize();
        if (!size) {
            return;
        }

        host.refreshPixelRatio();

        const context = host.canvas.getContext('2d');
        if (!context || !host.renderer) {
            return;
        }

        host.model.context = context;
        if (typeof context.setTransform === 'function') {
            context.setTransform(1, 0, 0, 1, 0, 0);
        }
        context.clearRect(0, 0, host.canvas.width, host.canvas.height);

        context.save();
        context.scale(host.pixelRatio, host.pixelRatio);
        if (host.scale !== 1.0) {
            context.scale(host.scale, host.scale);
        }

        this.renderScene(host, context);
        this.drawSelectionHandles(host, context);
        const completed = this.drawInteractionOverlays(host, context);
        if (!completed) {
            context.restore();
            host.setNeedsRedraw(false);
            return;
        }
        this.drawStatusOverlays(host, context, size);

        context.restore();
        host.setNeedsRedraw(false);
    }

    public renderScene(host: DesignDrawHost, context: CanvasRenderingContext2D): void {
        host.renderGrid();
        host.renderer?.renderToContext(context, 1.0);
        host.drawTextEditingOverlay(context);
    }

    public drawSelectionHandles(host: DesignDrawHost, context: CanvasRenderingContext2D): void {
        if (!host.model) {
            return;
        }

        for (const element of host.selectedElements) {
            const bounds = element.getBounds();
            if (!bounds) {
                continue;
            }

            let reference = new Point(bounds.x, bounds.y);
            if (host.isMoving && element.canMove()) {
                reference = host.getElementMoveLocation(element);
            }
            else if (host.isResizing && element.canResize()) {
                reference = host.getElementMoveLocation(element);
            }

            context.save();
            if (element.transform) {
                host.model.setRenderTransform(context, element.transform, reference);
            }

            const handles = host.getElementHandles(element);
            for (const handle of handles) {
                if (handle.connectedHandles) {
                    for (const connected of handle.connectedHandles) {
                        context.beginPath();
                        context.moveTo(handle.x, handle.y);
                        context.lineTo(connected.x, connected.y);
                        context.strokeStyle = 'white';
                        context.lineWidth = 1.0 / host.scale;
                        context.stroke();
                        context.strokeStyle = 'black';
                        host.drawDashedLine(context, handle.x, handle.y, connected.x, connected.y, 2);
                    }
                }
            }

            for (const handle of handles) {
                handle.draw(context);
            }

            context.restore();
            this.drawRotationFeedback(host, context, element, bounds);
        }
    }

    public drawRotationFeedback(
        host: DesignDrawHost,
        context: CanvasRenderingContext2D,
        element: ElementBase,
        bounds: { location: Point; size: Size; x: number; y: number; width: number; height: number },
    ): void {
        if (!host.isRotating || !host.rotationCenter) {
            return;
        }

        const angle = element.getRotation();
        let centerX = host.rotationCenter.x;
        let centerY = host.rotationCenter.y;
        if (host.originalTransform) {
            const feedbackMatrix = Matrix2D.fromTransformString(host.originalTransform, new Point(bounds.x, bounds.y));
            const feedbackCenter = feedbackMatrix.transformPoint(new Point(centerX, centerY));
            centerX = feedbackCenter.x;
            centerY = feedbackCenter.y;
        }

        const scale = host.scale;
        context.save();
        context.strokeStyle = new Color(153, 0, 128, 255).toStyleString();
        context.lineWidth = 1.0 / scale;
        context.setLineDash([4 / scale, 4 / scale]);
        context.beginPath();
        context.moveTo(centerX, centerY);
        const armLength = 40 / scale;
        const angleRad = (angle * Math.PI) / 180;
        context.lineTo(
            centerX + armLength * Math.cos(angleRad - Math.PI / 2),
            centerY + armLength * Math.sin(angleRad - Math.PI / 2),
        );
        context.stroke();
        context.setLineDash([]);

        if (Math.abs(angle) > 0.5) {
            const arcRadius = 30 / scale;
            const startRad = -Math.PI / 2;
            const endRad = startRad + angleRad;
            context.beginPath();
            context.arc(centerX, centerY, arcRadius, startRad, endRad, angle < 0);
            context.strokeStyle = new Color(128, 0, 128, 255).toStyleString();
            context.lineWidth = 1.5 / scale;
            context.stroke();
        }

        const displayAngle = Math.round(angle * 10) / 10;
        const fontSize = 11 / scale;
        context.font = `${fontSize}px sans-serif`;
        context.fillStyle = new Color(230, 0, 128, 255).toStyleString();
        context.fillText(`${displayAngle}°`, centerX + 8 / scale, centerY - 8 / scale);
        context.restore();
    }

    public drawInteractionOverlays(host: DesignDrawHost, context: CanvasRenderingContext2D): boolean {
        host.drawInteractionIndicator(context);

        if (!host.enabled) {
            return true;
        }

        if (host.rubberBandActive) {
            host.drawRubberBand(context);
        }
        else if (
            host.isMouseDown &&
            host.currentX !== undefined &&
            host.currentY !== undefined &&
            host.currentWidth !== undefined &&
            host.currentHeight !== undefined &&
            host.selectedElements.length === 0
        ) {
            host.drawGuidewires(context, host.currentX + host.currentWidth, host.currentY + host.currentHeight);
        }
        else if ((host.isResizing || host.isMoving) && host.selectedElements.length === 1) {
            const element = host.selectedElements[0];
            const visualBounds = host.getVisualInteractionBoundsForElement(element);
            if (!visualBounds) {
                return false;
            }

            const size = visualBounds.size;
            const location = visualBounds.location;
            let transformed = false;

            if (element.transform && host.model) {
                context.save();
                transformed = true;
                const bounds = element.getBounds();
                if (bounds) {
                    let reference = new Point(bounds.x, bounds.y);
                    if (host.isMoving && element.canMove()) {
                        reference = host.getElementMoveLocation(element);
                    }
                    else if (host.isResizing && element.canResize()) {
                        reference = host.getElementMoveLocation(element);
                    }
                    host.model.setRenderTransform(context, element.transform, reference);
                }
            }

            context.strokeStyle = new Color(166, 0, 0, 0).toStyleString();
            context.lineWidth = 1.0 / host.scale;
            host.drawHorizontalLine(context, location.y);
            host.drawHorizontalLine(context, location.y + size.height);
            host.drawVerticalLine(context, location.x);
            host.drawVerticalLine(context, location.x + size.width);

            context.strokeStyle = new Color(204, 255, 255, 255).toStyleString();
            host.drawDashedHorizontalLine(context, location.y);
            host.drawDashedHorizontalLine(context, location.y + size.height);
            host.drawDashedVerticalLine(context, location.x);
            host.drawDashedVerticalLine(context, location.x + size.width);

            if (transformed) {
                context.restore();
            }
        }

        if (host.isMoving) {
            host.drawSmartAlignmentGuides(context);
        }

        return true;
    }

    public drawStatusOverlays(host: DesignDrawHost, context: CanvasRenderingContext2D, size: Size): void {
        if (host.model?.displayFPS) {
            context.fillStyle = Color.CornflowerBlue.toStyleString();
            context.font = '16px monospace';
            context.fillText(`${host.calculateFPS().toFixed()} fps`, 20, 20);
        }

        if (!host.enabled && host.disabledFill) {
            context.fillStyle = Color.parse(host.disabledFill).toStyleString();
            context.fillRect(0, 0, size.width, size.height);
        }
    }
}