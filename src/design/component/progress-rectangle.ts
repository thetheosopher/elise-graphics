import { RectangleElement } from '../../elements/rectangle-element';
/**
 * Extends [[RectangleElement]] to describe progress bar progress
 */
export class ProgressRectangle extends RectangleElement {
    public percent: number = 0;

    constructor() {
        super();
    }
}
