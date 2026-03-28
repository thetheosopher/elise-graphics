import { RegularPolygonElement } from '../../elements/regular-polygon-element';
import { BoundsPrimitiveTool } from './bounds-primitive-tool';

export class RegularPolygonTool extends BoundsPrimitiveTool<RegularPolygonElement> {
    constructor() {
        super();
        this.aspectLocked = true;
    }

    protected createElement(x: number, y: number): RegularPolygonElement {
        return RegularPolygonElement.create(x, y, 0, 0);
    }
}