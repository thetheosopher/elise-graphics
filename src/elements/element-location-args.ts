import { LocationArgs } from '../core/location-args';
import { Point } from '../core/point';
import { ElementBase } from './element-base';

export class ElementLocationArgs extends LocationArgs {
  /**
   * Model element
   */
  public element: ElementBase;

  /**
   * Constructs an element location args
   * @classdesc Describes an element location
   * @extends Elise.Drawing.Design.LocationArgs
   * @param element - Model element
   * @param location - Location
   */
  constructor(element: ElementBase, location: Point) {
    super(location);
    this.element = element;
  }
}
