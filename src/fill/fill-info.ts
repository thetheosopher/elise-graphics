import { Color } from '../core/color';
import { Model } from '../core/model';
import { ScalingInfo } from '../core/scaling-info';
import { ElementBase } from '../elements/element-base';
import { GradientFillStop } from './gradient-fill-stop';
import { LinearGradientFill } from './linear-gradient-fill';
import { RadialGradientFill } from './radial-gradient-fill';

/**
 * Describes element fill
 */
export class FillInfo {
    public static getNoFillInfo() {
        const fillInfo = new FillInfo('none');
        return fillInfo;
    }

    public static getColorFillInfo(fillColor: string, fillOpacity: number) {
        const fillInfo = new FillInfo('color');
        fillInfo.color = fillColor;
        fillInfo.opacity = fillOpacity;
        return fillInfo;
    }

    public static getImageFillInfo(fillSource: string, fillOpacity: number, fillScale?: number) {
        const fillInfo = new FillInfo('image');
        fillInfo.source = fillSource;
        fillInfo.opacity = fillOpacity;
        fillInfo.scale = fillScale;
        return fillInfo;
    }

    public static getModelFillInfo(fillSource: string, fillOpacity: number, fillScale?: number) {
        const fillInfo = new FillInfo('model');
        fillInfo.source = fillSource;
        fillInfo.opacity = fillOpacity;
        fillInfo.scale = fillScale;
        return fillInfo;
    }

    public static getLinearGradientFillInfo(start: string, end: string, stops: GradientFillStop[]) {
        const fillInfo = new FillInfo('linear');
        fillInfo.start = start;
        fillInfo.end = end;
        fillInfo.fillStops = stops.slice();
        return fillInfo;
    }

    public static getRadialGradientFillInfo(
        center: string,
        focus: string,
        radiusX: number,
        radiusY: number,
        stops: GradientFillStop[]
    ) {
        const fillInfo = new FillInfo('radial');
        fillInfo.center = center;
        fillInfo.focus = focus;
        fillInfo.radiusX = radiusX;
        fillInfo.radiusY = radiusY;
        fillInfo.fillStops = stops.slice();
        return fillInfo;
    }

    public static getFillInfo(el: ElementBase) {
        if (el.fill) {
            const fill = el.fill;
            if (fill instanceof LinearGradientFill) {
                return FillInfo.getLinearGradientFillInfo(fill.start, fill.end, fill.stops);
            }
            else if (fill instanceof RadialGradientFill) {
                return FillInfo.getRadialGradientFillInfo(
                    fill.center,
                    fill.focus,
                    fill.radiusX,
                    fill.radiusY,
                    fill.stops
                );
            }
            else if (typeof fill === 'string') {
                if (fill.toLowerCase().substring(0, 6) === 'image(') {
                    let key = fill.substring(6, fill.length - 1);
                    let opacity = 1;
                    if (key.indexOf(';') !== -1) {
                        const parts = key.split(';');
                        opacity = parseFloat(parts[0]);
                        key = parts[1];
                    }
                    let scaling = new ScalingInfo();
                    if (el.model) {
                        scaling = el.model.getFillScale(el);
                    }
                    else if (el instanceof Model) {
                        scaling = el.getFillScale(el);
                    }
                    let fillScale = 1.0;
                    if (scaling.rx !== 1) {
                        fillScale = scaling.rx;
                    }
                    else if (scaling.ry !== 1) {
                        fillScale = scaling.ry;
                    }
                    return FillInfo.getImageFillInfo(key, opacity * 255.0, fillScale);
                }
                else if (fill.toLowerCase().substring(0, 6) === 'model(') {
                    let key = fill.substring(6, fill.length - 1);
                    let opacity = 1;
                    if (key.indexOf(';') !== -1) {
                        const parts = key.split(';');
                        opacity = parseFloat(parts[0]);
                        key = parts[1];
                    }
                    let scaling = new ScalingInfo();
                    if (el.model) {
                        scaling = el.model.getFillScale(el);
                    }
                    else if (el instanceof Model) {
                        scaling = el.getFillScale(el);
                    }
                    let fillScale = 1.0;
                    if (scaling.rx !== 1) {
                        fillScale = scaling.rx;
                    }
                    else if (scaling.ry !== 1) {
                        fillScale = scaling.ry;
                    }
                    return FillInfo.getModelFillInfo(key, opacity * 255.0, fillScale);
                }
                else {
                    const color = Color.parse(fill);
                    let opacity = 255;
                    if (color.a !== 255) {
                        opacity = color.a;
                        color.a = 255;
                    }
                    return FillInfo.getColorFillInfo(color.toHexString(), opacity);
                }
            }
        }
        else {
            return FillInfo.getNoFillInfo();
        }
    }

    public type: string;
    public color?: string;
    public opacity?: number;
    public source?: string;
    public scale?: number;

    public start?: string;
    public end?: string;

    public center?: string;
    public focus?: string;
    public radiusX?: number;
    public radiusY?: number;

    public fillStops?: GradientFillStop[];

    private constructor(fillType: string) {
        this.type = fillType;
    }
}
