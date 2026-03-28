import { RingElement } from '../../elements/ring-element';
import { BoundsPrimitiveTool } from './bounds-primitive-tool';

export class RingTool extends BoundsPrimitiveTool<RingElement> {
    constructor() {
        super();
        this.aspectLocked = true;
    }

    protected createElement(x: number, y: number): RingElement {
        return RingElement.create(x, y, 0, 0);
    }
}