import { colorRefToString, GdiBackgroundMode, GdiBrushStyle, GdiPenStyle, GdiTextAlignFlags, type LogBrush, type LogFont, type LogPen } from './wmf-types';

export interface GdiBrushObject {
    kind: 'brush';
    brush: LogBrush;
    fill?: string;
}

export interface GdiPenObject {
    kind: 'pen';
    pen: LogPen;
    stroke?: string;
    strokeDash?: number[];
}

export interface GdiFontObject {
    kind: 'font';
    font: LogFont;
}

export type GdiObject = GdiBrushObject | GdiPenObject | GdiFontObject;

const resolvePenDash = (style: number, width: number): number[] | undefined => {
    const unit = Math.max(1, width);
    switch (style & 0x000F) {
        case GdiPenStyle.Dash:
            return [4 * unit, 2 * unit];
        case GdiPenStyle.Dot:
            return [unit, 2 * unit];
        case GdiPenStyle.DashDot:
            return [4 * unit, 2 * unit, unit, 2 * unit];
        case GdiPenStyle.DashDotDot:
            return [4 * unit, 2 * unit, unit, 2 * unit, unit, 2 * unit];
        default:
            return undefined;
    }
};

export const createBrushObject = (brush: LogBrush): GdiBrushObject => {
    let fill: string | undefined;
    if (brush.style === GdiBrushStyle.Solid || brush.style === GdiBrushStyle.Hatched) {
        fill = colorRefToString(brush.color);
    }
    return {
        kind: 'brush',
        brush,
        fill,
    };
};

export const createPenObject = (pen: LogPen): GdiPenObject => {
    const style = pen.style & 0x000F;
    const width = Math.max(1, Math.abs(pen.widthX || 1));
    return {
        kind: 'pen',
        pen,
        stroke: style === GdiPenStyle.Null ? undefined : colorRefToString(pen.color) + ', ' + width,
        strokeDash: resolvePenDash(style, width),
    };
};

export const createFontObject = (font: LogFont): GdiFontObject => ({
    kind: 'font',
    font,
});

export class GdiState {
    public drawingObjects: Array<GdiObject | null> = [];

    public currentFill?: string;
    public currentStroke?: string = '#000000, 1';
    public currentStrokeDash?: number[];
    public currentFont?: LogFont;

    public currentX: number = 0;
    public currentY: number = 0;

    public xOffset: number = 0;
    public yOffset: number = 0;
    public xRange: number = 0;
    public yRange: number = 0;
    public flipX: boolean = false;
    public flipY: boolean = false;

    public nonZeroFill: boolean = true;
    public textColor: string = '#000000';
    public textAlign: number = GdiTextAlignFlags.TA_LEFT | GdiTextAlignFlags.TA_TOP | GdiTextAlignFlags.TA_NOUPDATECP;
    public bkMode: number = GdiBackgroundMode.Transparent;
    public bkColor: string = '#FFFFFF';

    public addObject(object: GdiObject): number {
        const emptyIndex = this.drawingObjects.findIndex((entry) => entry === null);
        if (emptyIndex >= 0) {
            this.drawingObjects[emptyIndex] = object;
            return emptyIndex;
        }
        this.drawingObjects.push(object);
        return this.drawingObjects.length - 1;
    }

    public selectObject(index: number): void {
        if (index < 0 || index >= this.drawingObjects.length) {
            return;
        }
        const object = this.drawingObjects[index];
        if (!object) {
            return;
        }
        switch (object.kind) {
            case 'brush':
                this.currentFill = object.fill;
                break;
            case 'pen':
                this.currentStroke = object.stroke;
                this.currentStrokeDash = object.strokeDash ? object.strokeDash.slice() : undefined;
                break;
            case 'font':
                this.currentFont = object.font;
                break;
        }
    }

    public deleteObject(index: number): void {
        if (index >= 0 && index < this.drawingObjects.length) {
            this.drawingObjects[index] = null;
        }
    }

    public setWindowOrg(x: number, y: number): void {
        this.xOffset = x;
        this.yOffset = y;
    }

    public setWindowExt(xExtent: number, yExtent: number): void {
        this.flipX = xExtent < 0;
        this.flipY = yExtent < 0;
        if (xExtent !== 0) {
            this.xRange = Math.abs(xExtent);
        }
        if (yExtent !== 0) {
            this.yRange = Math.abs(yExtent);
        }
    }

    public initializeFromBounds(left: number, top: number, right: number, bottom: number): void {
        this.xOffset = left;
        this.yOffset = top;
        this.xRange = Math.abs(right - left);
        this.yRange = Math.abs(bottom - top);
        this.flipX = right < left;
        this.flipY = bottom < top;
    }

    public fixX(x: number): number {
        return this.flipX ? this.xOffset - x : x - this.xOffset;
    }

    public fixY(y: number): number {
        return this.flipY ? this.yOffset - y : y - this.yOffset;
    }
}