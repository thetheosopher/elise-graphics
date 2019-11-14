import { Model } from '../../core/model';
import { MouseLocationArgs } from '../../core/mouse-location-args';
import { LinearGradientFill } from '../../fill/linear-gradient-fill';
import { RadialGradientFill } from '../../fill/radial-gradient-fill';
import { DesignController } from '../design-controller';

/**
 * Base class for design surface tools
 */
export abstract class DesignTool {
    public model?: Model;
    public controller?: DesignController;
    public opacity: number;
    public stroke?: string;
    public fill?: string | LinearGradientFill | RadialGradientFill;
    public fillScale: number;
    public fillOffsetX: number;
    public fillOffsetY: number;
    public isCreating: boolean = false;

    constructor() {
        this.cancel = this.cancel.bind(this);
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.mouseUp = this.mouseUp.bind(this);

        this.opacity = 255;
        this.fillScale = 1;
        this.fillOffsetX = 0;
        this.fillOffsetY = 0;
    }

    public abstract mouseDown(args: MouseLocationArgs): void;
    public abstract mouseMove(args: MouseLocationArgs): void;
    public abstract mouseUp(args: MouseLocationArgs): void;
    public abstract cancel(): void;

    public setFill(fill: string | LinearGradientFill | RadialGradientFill | undefined) {
        if (typeof fill === 'string') {
            this.fill = fill;
        }
        else if (fill !== undefined) {
            this.fill = fill.clone();
        }
    }
}
