import { ElementBase } from '../elements/element-base';
import { Color } from './color';

export class StrokeInfo {
  public static getStrokeInfo(el: ElementBase) {
    let color: Color;
    let width = 1;
    let opacity = 255;
    if (el.stroke) {
      const stroke = el.stroke;
      if (stroke.indexOf(',') !== -1) {
        const parts = stroke.split(',');
        color = Color.parse(parts[0]);
        width = parseFloat(parts[1]);
      } else {
        color = Color.parse(stroke);
      }
      if (color.a !== 255) {
        opacity = color.a;
        color.a = 255;
      }
      return new StrokeInfo('color', color.toHexString(), opacity, width);
    } else {
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
