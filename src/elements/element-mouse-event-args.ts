import { MouseEventArgs } from '../core/mouse-event-args';
import { ElementBase } from './element-base';

export class ElementMouseEventArgs extends MouseEventArgs {
    /**
     * Model element
     */
    public element: ElementBase;

    /**
     * Constructs an element mouse event args
     * @classdesc Describes an element mouse event
     * @extends Elise.Drawing.Design.MouseEventArgs
     * @param event - DOM mouse event
     * @param element - Model element
     */
    constructor(event: MouseEvent, element: ElementBase) {
        super(event);
        this.element = element;
    }
}
