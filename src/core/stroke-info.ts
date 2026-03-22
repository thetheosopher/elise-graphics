import { ElementBase } from '../elements/element-base';
import { Color } from './color';

/**
 * Describes the outline stroke for strokable elements
 */
export class StrokeInfo {
    public static parseStroke(stroke: string): { color: Color; width: number } {
        const lastComma = stroke.lastIndexOf(',');
        if (lastComma !== -1 && stroke.charAt(stroke.length - 1) !== ')') {
            const widthPart = stroke.substring(lastComma + 1).trim();
            const width = parseFloat(widthPart);
            if (!isNaN(width) && isFinite(width)) {
                return {
                    color: Color.parse(stroke.substring(0, lastComma).trim()),
                    width: width
                };
            }
        }
        return {
            color: Color.parse(stroke),
            width: 1
        };
    }

    public static getStrokeInfo(el: ElementBase) {
        let opacity = 255;
        if (el.stroke) {
            const parsed = StrokeInfo.parseStroke(el.stroke);
            const color = parsed.color;
            const width = parsed.width;
            opacity = color.a;
            return new StrokeInfo('color', color.toHexString(), opacity, width);
        }
        else {
            return new StrokeInfo('none');
        }
    }

    public strokeType: string;
    public strokeColor?: string;
    public strokeOpacity?: number;
    public strokeWidth?: number;

    constructor(strokeType: string, strokeColor?: string, strokeOpacity?: number, strokeWidth?: number) {
        this.strokeType = strokeType;
        this.strokeColor = strokeColor;
        this.strokeOpacity = strokeOpacity;
        this.strokeWidth = strokeWidth;
    }
}
