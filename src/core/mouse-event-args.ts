import { IMouseEvent } from './mouse-event';

export class MouseEventArgs {
  /**
   * DOM Event or simulated event args
   */
  public event: MouseEvent | IMouseEvent;

  /**
   * Constructs a mouse event args
   * @classdesc Describes a mouse event
   * @param event - DOM event or simulated event args
   */
  constructor(event: MouseEvent | IMouseEvent) {
    this.event = event;
  }
}
