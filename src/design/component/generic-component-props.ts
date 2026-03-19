import { Color } from '../../core/color';
import { ComponentProps } from './component-props';

/**
 * Encapsulates generic component creation properties
 */
export class GenericComponentProps extends ComponentProps {
    constructor() {
        super();

        this.onSetCreationFill = this.onSetCreationFill.bind(this);

        this.fill = '#00ff00c0'; // Mostly translucent green
        this.stroke = 'Black';
        this.selectedFill = '#00ff0080'; // Less translucent green
        this.selectedStroke = 'Gold,5';
        this.initialized = true;
        this.create = this.defaultCreate;
        this.size.add(this.defaultResize);
        this.select.add(this.defaultSelect);
        this.deselect.add(this.defaultDeselect);

        this.setCreationFill = this.onSetCreationFill;
    }

    private onSetCreationFill(c: CanvasRenderingContext2D): void {
        const color = Color.parse(this.selectedFill as string);
        c.fillStyle = color.toStyleString();
    }
}
