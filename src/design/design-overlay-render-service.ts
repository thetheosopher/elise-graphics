import { Color } from '../core/color';
import { ErrorMessages } from '../core/error-messages';
import { Matrix2D } from '../core/matrix-2d';
import { Model } from '../core/model';
import { Point } from '../core/point';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { ElementBase } from '../elements/element-base';
import { RectangleElement } from '../elements/rectangle-element';
import { TextElement } from '../elements/text-element';
import { Component } from './component/component';
import type { DesignSmartAlignmentGuides } from './design-movement-service';
import { GridType } from './grid-type';
import type { Handle } from './handle';

export interface DesignOverlayRenderHost {
    model?: Model;
    scale: number;
    gridType: GridType;
    gridSpacing: number;
    gridColor: string;
    selecting: boolean;
    rubberBandRegion?: Region;
    activeComponent?: Component;
    fillImage?: HTMLImageElement;
    smartAlignmentGuides: DesignSmartAlignmentGuides;
    selectedElements: ElementBase[];
    editingTextElement?: TextElement;
    textSelectionStart: number;
    textSelectionEnd: number;
    isMoving: boolean;
    isResizing: boolean;
    isMovingPoint: boolean;
    isMovingCornerRadius: boolean;
    movingPointIndex?: number;
    movingPointLocation?: Point;
    sizeHandles?: Handle[];
    getElementMoveLocation(element: ElementBase): Point;
    getElementResizeSize(element: ElementBase): Size;
}

export class DesignOverlayRenderService {
    public renderGrid(host: DesignOverlayRenderHost): void {
        if (!host.model || host.gridType === GridType.None || host.gridSpacing < 1) {
            return;
        }

        const context = host.model.context;
        const size = host.model.getSize();
        if (!context || !size) {
            return;
        }

        const spacing = Math.max(1, host.gridSpacing);
        if (host.gridType === GridType.Dots) {
            const backdropRadius = Math.max(1.2 / host.scale, 0.6);
            const foregroundRadius = Math.max(0.7 / host.scale, 0.35);

            for (let y = 0; y <= size.height; y += spacing) {
                for (let x = 0; x <= size.width; x += spacing) {
                    context.beginPath();
                    context.fillStyle = Color.White.toStyleString();
                    context.arc(x, y, backdropRadius, 0, Math.PI * 2);
                    context.fill();

                    context.beginPath();
                    context.fillStyle = Color.Black.toStyleString();
                    context.arc(x, y, foregroundRadius, 0, Math.PI * 2);
                    context.fill();
                }
            }
            return;
        }

        let gridColor: Color;
        try {
            gridColor = Color.parse(host.gridColor || 'Black');
        }
        catch (_error) {
            gridColor = Color.Black;
        }

        context.save();
        context.beginPath();
        context.strokeStyle = Color.White.toStyleString();
        context.lineWidth = 3 / host.scale;
        for (let x = 0; x <= size.width; x += spacing) {
            context.moveTo(x, 0);
            context.lineTo(x, size.height);
        }
        for (let y = 0; y <= size.height; y += spacing) {
            context.moveTo(0, y);
            context.lineTo(size.width, y);
        }
        context.stroke();

        context.beginPath();
        context.strokeStyle = gridColor.toStyleString();
        context.lineWidth = 1 / host.scale;
        for (let x = 0; x <= size.width; x += spacing) {
            context.moveTo(x, 0);
            context.lineTo(x, size.height);
        }
        for (let y = 0; y <= size.height; y += spacing) {
            context.moveTo(0, y);
            context.lineTo(size.width, y);
        }
        context.stroke();
        context.restore();
    }

    public drawDashedLine(
        c: CanvasRenderingContext2D,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        dashLength: number,
    ): void {
        c.beginPath();
        dashLength = dashLength === undefined ? 5 : dashLength;
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        const numDashes = Math.floor(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / dashLength);
        for (let i = 0; i < numDashes; ++i) {
            c[i % 2 === 0 ? 'moveTo' : 'lineTo'](x1 + (deltaX / numDashes) * i, y1 + (deltaY / numDashes) * i);
        }
        c.stroke();
    }

    public drawRubberBand(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D): void {
        if (!host.selecting || !host.rubberBandRegion) {
            this.drawHotspot(host, c);
            return;
        }

        const x1 = host.rubberBandRegion.x;
        const x2 = host.rubberBandRegion.x + host.rubberBandRegion.width;
        const y1 = host.rubberBandRegion.y;
        const y2 = host.rubberBandRegion.y + host.rubberBandRegion.height;

        c.strokeStyle = 'black';
        c.lineWidth = 1.0 / host.scale;
        c.strokeRect(x1, y1, host.rubberBandRegion.width, host.rubberBandRegion.height);

        c.strokeStyle = 'white';
        this.drawDashedLine(c, x1, y1, x2, y1, 1);
        this.drawDashedLine(c, x2, y1, x2, y2, 1);
        this.drawDashedLine(c, x2, y2, x1, y2, 1);
        this.drawDashedLine(c, x1, y2, x1, y1, 1);
    }

    public drawHotspot(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D): void {
        if (!host.rubberBandRegion) {
            return;
        }

        c.save();
        c.strokeStyle = 'red';
        c.lineWidth = 1.0 / host.scale;
        if (host.activeComponent?.setCreationFill) {
            host.activeComponent.setCreationFill(c);
        }
        else if (host.fillImage) {
            const pattern = c.createPattern(host.fillImage, 'repeat');
            if (pattern) {
                c.fillStyle = pattern;
            }
        }
        else {
            c.fillStyle = Color.Gold.toStyleString();
        }

        c.globalAlpha = 0.5;
        c.fillRect(
            host.rubberBandRegion.x,
            host.rubberBandRegion.y,
            host.rubberBandRegion.width,
            host.rubberBandRegion.height,
        );
        c.globalAlpha = 1.0;
        c.strokeRect(
            host.rubberBandRegion.x,
            host.rubberBandRegion.y,
            host.rubberBandRegion.width,
            host.rubberBandRegion.height,
        );
        c.restore();
    }

    public drawDashedHorizontalLine(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D, y: number): void {
        const size = this.getModelSize(host);
        this.drawDashedLine(c, 0, y, size.width, y, 1);
    }

    public drawDashedVerticalLine(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D, x: number): void {
        const size = this.getModelSize(host);
        this.drawDashedLine(c, x, 0, x, size.height, 1);
    }

    public drawHorizontalLine(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D, y: number): void {
        const size = this.getModelSize(host);
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(size.width, y);
        c.stroke();
    }

    public drawVerticalLine(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D, x: number): void {
        const size = this.getModelSize(host);
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, size.height);
        c.stroke();
    }

    public drawGuidewires(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D, x: number, y: number): void {
        const size = this.getModelSize(host);
        const scale = host.scale;
        const lineWidth = 1.0 / scale;
        const dashLength = 2 / scale;

        c.strokeStyle = new Color(166, 0, 0, 0).toStyleString();
        c.lineWidth = lineWidth;
        this.drawHorizontalLine(host, c, y);
        this.drawVerticalLine(host, c, x);

        c.strokeStyle = new Color(204, 255, 255, 255).toStyleString();
        this.drawDashedLine(c, x, y, 0, y, dashLength);
        this.drawDashedLine(c, x, y, size.width, y, dashLength);
        this.drawDashedLine(c, x, y, x, 0, dashLength);
        this.drawDashedLine(c, x, y, x, size.height, dashLength);

        c.strokeStyle = new Color(153, 0, 0, 0).toStyleString();
        c.beginPath();
        c.arc(x, y, 6 / scale, 0, Math.PI * 2);
        c.stroke();

        c.strokeStyle = new Color(191, 255, 255, 255).toStyleString();
        c.beginPath();
        c.arc(x, y, 5 / scale, 0, Math.PI * 2);
        c.stroke();

        c.strokeStyle = new Color(153, 0, 0, 0).toStyleString();
        c.beginPath();
        c.arc(x, y, 4 / scale, 0, Math.PI * 2);
        c.stroke();

        c.strokeStyle = new Color(230, 0, 0, 0).toStyleString();
        this.drawDashedLine(c, x - 1 / scale, y, x - 4 / scale, y, 2);
        this.drawDashedLine(c, x + 1 / scale, y, x + 4 / scale, y, 2);
        this.drawDashedLine(c, x, y - 1 / scale, x, y - 4 / scale, 2);
        this.drawDashedLine(c, x, y + 1 / scale, x, y + 4 / scale, 2);
    }

    public drawSmartAlignmentGuides(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D): void {
        if (host.smartAlignmentGuides.vertical.length === 0 && host.smartAlignmentGuides.horizontal.length === 0) {
            return;
        }

        c.save();
        c.strokeStyle = new Color(166, 0, 0, 0).toStyleString();
        c.lineWidth = 1.0 / host.scale;
        for (const x of host.smartAlignmentGuides.vertical) {
            this.drawVerticalLine(host, c, x);
        }
        for (const y of host.smartAlignmentGuides.horizontal) {
            this.drawHorizontalLine(host, c, y);
        }

        c.strokeStyle = new Color(204, 255, 255, 255).toStyleString();
        for (const x of host.smartAlignmentGuides.vertical) {
            this.drawDashedVerticalLine(host, c, x);
        }
        for (const y of host.smartAlignmentGuides.horizontal) {
            this.drawDashedHorizontalLine(host, c, y);
        }
        c.restore();
    }

    public formatIndicatorValue(value: number): string {
        const rounded = Math.round(value * 10) / 10;
        if (Math.abs(rounded - Math.round(rounded)) < 0.05) {
            return Math.round(rounded).toString();
        }
        return rounded.toString();
    }

    public getVisualInteractionBoundsForElement(host: DesignOverlayRenderHost, element: ElementBase): Region | undefined {
        const bounds = element.getBounds();
        if (!bounds) {
            return undefined;
        }

        let location = bounds.location;
        let size = bounds.size;

        if (host.isMoving && element.canMove()) {
            const moveLocation = host.getElementMoveLocation(element);
            const frameLocation = element.getLocation();
            if (frameLocation) {
                location = new Point(
                    bounds.x + (moveLocation.x - frameLocation.x),
                    bounds.y + (moveLocation.y - frameLocation.y),
                );
            }
            else {
                location = moveLocation;
            }
        }
        else if (host.isResizing && element.canResize()) {
            location = host.getElementMoveLocation(element);
            size = host.getElementResizeSize(element);
        }

        return new Region(location.x, location.y, size.width, size.height);
    }

    public getInteractionIndicatorBounds(host: DesignOverlayRenderHost): Region | undefined {
        if (!host.isMoving && !host.isResizing) {
            return undefined;
        }

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const element of host.selectedElements) {
            let indicatorBounds = this.getVisualInteractionBoundsForElement(host, element);
            if (!indicatorBounds) {
                continue;
            }
            if (element.transform) {
                indicatorBounds = this.getTransformedBounds(indicatorBounds.location, indicatorBounds.size, element.transform);
            }

            minX = Math.min(minX, indicatorBounds.x);
            minY = Math.min(minY, indicatorBounds.y);
            maxX = Math.max(maxX, indicatorBounds.x + indicatorBounds.width);
            maxY = Math.max(maxY, indicatorBounds.y + indicatorBounds.height);
        }

        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            return undefined;
        }

        return new Region(minX, minY, maxX - minX, maxY - minY);
    }

    public getInteractionIndicator(host: DesignOverlayRenderHost): { lines: string[]; anchor: Point } | undefined {
        if (host.isMovingPoint && host.movingPointLocation) {
            let anchor = host.movingPointLocation;
            const element = host.selectedElements[0];
            if (element?.transform) {
                const bounds = element.getBounds();
                if (bounds) {
                    const matrix = Matrix2D.fromTransformString(element.transform, bounds.location);
                    anchor = matrix.transformPoint(anchor);
                }
            }
            return {
                lines: [
                    `pt ${host.movingPointIndex ?? 0}`,
                    `x ${this.formatIndicatorValue(host.movingPointLocation.x)} y ${this.formatIndicatorValue(host.movingPointLocation.y)}`,
                ],
                anchor,
            };
        }

        if (host.isMovingCornerRadius && host.sizeHandles && host.sizeHandles.length > 0) {
            const handle = host.sizeHandles[0];
            const rectangle = handle.element;
            if (rectangle instanceof RectangleElement) {
                const cornerNames = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
                const cornerIndex = handle.handleIndex ?? 0;
                const radii = rectangle.getCornerRadii();
                let anchor = new Point(handle.x, handle.y);
                if (rectangle.transform) {
                    const bounds = rectangle.getBounds();
                    if (bounds) {
                        const matrix = Matrix2D.fromTransformString(rectangle.transform, bounds.location);
                        anchor = matrix.transformPoint(anchor);
                    }
                }
                return {
                    lines: [
                        `corner ${cornerNames[cornerIndex] ?? cornerIndex}`,
                        `radius ${this.formatIndicatorValue(radii[cornerIndex] ?? 0)}`,
                    ],
                    anchor,
                };
            }
        }

        const bounds = this.getInteractionIndicatorBounds(host);
        if (!bounds) {
            return undefined;
        }

        return {
            lines: [
                `x ${this.formatIndicatorValue(bounds.x)} y ${this.formatIndicatorValue(bounds.y)}`,
                `w ${this.formatIndicatorValue(bounds.width)} h ${this.formatIndicatorValue(bounds.height)}`,
            ],
            anchor: new Point(bounds.x + bounds.width, bounds.y),
        };
    }

    public drawInteractionIndicator(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D): void {
        const indicator = this.getInteractionIndicator(host);
        if (!indicator || indicator.lines.length === 0) {
            return;
        }

        const scale = host.scale || 1;
        const offsetX = 8 / scale;
        const offsetY = 8 / scale;
        const lineHeight = 13 / scale;
        const startX = indicator.anchor.x + offsetX;
        const startY = Math.max(lineHeight, indicator.anchor.y - offsetY);

        c.save();
        c.font = `${11 / scale}px sans-serif`;
        c.textAlign = 'left';
        c.textBaseline = 'top';
        c.lineWidth = 3 / scale;
        c.strokeStyle = 'white';
        c.fillStyle = new Color(230, 0, 128, 255).toStyleString();

        indicator.lines.forEach((line, index) => {
            const y = startY + index * lineHeight;
            c.strokeText(line, startX, y);
            c.fillText(line, startX, y);
        });

        c.restore();
    }

    public drawTextEditingOverlay(host: DesignOverlayRenderHost, c: CanvasRenderingContext2D): void {
        const textElement = host.editingTextElement;
        if (!textElement || host.selectedElements.indexOf(textElement) === -1) {
            return;
        }

        const bounds = textElement.getBounds();
        if (!bounds) {
            return;
        }

        const start = Math.min(host.textSelectionStart, host.textSelectionEnd);
        const end = Math.max(host.textSelectionStart, host.textSelectionEnd);
        c.save();
        if (textElement.transform && host.model) {
            host.model.setRenderTransform(c, textElement.transform, bounds.location);
        }
        c.fillStyle = 'rgba(80, 140, 255, 0.28)';
        c.strokeStyle = 'rgba(0, 90, 255, 0.9)';
        c.lineWidth = 1 / host.scale;

        if (start !== end) {
            const regions = textElement.getSelectionRegions(c, bounds.location, bounds.size, start, end);
            for (const region of regions) {
                c.fillRect(region.x, region.y, region.width, region.height);
            }
        }
        else {
            const caret = textElement.getCaretRegion(c, bounds.location, bounds.size, start);
            c.beginPath();
            c.moveTo(caret.x, caret.y);
            c.lineTo(caret.x, caret.y + caret.height);
            c.stroke();
        }

        c.restore();
    }

    private getModelSize(host: DesignOverlayRenderHost): Size {
        if (!host.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        const size = host.model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }

        return size;
    }

    private getTransformedBounds(location: Point, size: Size, transform: string): Region {
        const matrix = Matrix2D.fromTransformString(transform, location);
        const corners = [
            matrix.transformPoint(new Point(location.x, location.y)),
            matrix.transformPoint(new Point(location.x + size.width, location.y)),
            matrix.transformPoint(new Point(location.x + size.width, location.y + size.height)),
            matrix.transformPoint(new Point(location.x, location.y + size.height)),
        ];

        let minX = corners[0].x;
        let minY = corners[0].y;
        let maxX = corners[0].x;
        let maxY = corners[0].y;
        for (let index = 1; index < corners.length; index++) {
            minX = Math.min(minX, corners[index].x);
            minY = Math.min(minY, corners[index].y);
            maxX = Math.max(maxX, corners[index].x);
            maxY = Math.max(maxY, corners[index].y);
        }

        return new Region(minX, minY, maxX - minX, maxY - minY);
    }
}