import { ArcElement } from '../../elements/arc-element';
import { BoundsPrimitiveTool } from './bounds-primitive-tool';

export class ArcTool extends BoundsPrimitiveTool<ArcElement> {
    protected createElement(x: number, y: number): ArcElement {
        return ArcElement.create(x, y, 0, 0);
    }
}