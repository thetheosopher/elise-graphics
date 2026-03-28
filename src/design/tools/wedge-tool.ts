import { WedgeElement } from '../../elements/wedge-element';
import { BoundsPrimitiveTool } from './bounds-primitive-tool';

export class WedgeTool extends BoundsPrimitiveTool<WedgeElement> {
    protected createElement(x: number, y: number): WedgeElement {
        return WedgeElement.create(x, y, 0, 0);
    }
}