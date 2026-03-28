import { ArrowElement } from '../../elements/arrow-element';
import { BoundsPrimitiveTool } from './bounds-primitive-tool';

export class ArrowTool extends BoundsPrimitiveTool<ArrowElement> {
    protected createElement(x: number, y: number): ArrowElement {
        return ArrowElement.create(x, y, 0, 0);
    }
}