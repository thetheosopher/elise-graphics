import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { TextElement } from '../../elements/text-element';
import { DesignTool } from './design-tool';

/**
 * Text element design creation tool
 */
export class TextTool extends DesignTool {
    public point1?: Point;
    public textElement?: TextElement;

    public text?: string;
    public typeface?: string;
    public typesize: number;
    public typestyle?: string;
    public alignment?: string;
    public cancelled: boolean = false;

    constructor() {
        super();
        this.typesize = 10;
        this.aspectLocked = false;
    }

    public mouseDown(args: MouseLocationArgs): void {
        this.cancelled = false;
        this.point1 = Point.create(args.location.x, args.location.y);
        this.textElement = TextElement.create(this.text, args.location.x, args.location.y, 0, 0);
        this.textElement.aspectLocked = this.aspectLocked;
        if (this.stroke) {
            this.textElement.setStroke(this.stroke);
        }
        if (this.fill) {
            this.textElement.setFill(this.fill);
        }
        if (this.fillScale !== 1) {
            this.textElement.setFillScale(this.fillScale);
        }
        this.textElement.alignment = this.alignment;
        this.textElement.typeface = this.typeface;
        this.textElement.typestyle = this.typestyle;
        this.textElement.typesize = this.typesize;
        if (this.model) {
            this.textElement.setInteractive(true).addTo(this.model);
        }
        if (this.controller) {
            this.controller.invalidate();
        }
        this.isCreating = true;
    }

    public mouseMove(args: MouseLocationArgs) {
        if (this.cancelled) {
            return;
        }
        if (!this.textElement) {
            return;
        }
        if (!this.point1) {
            return;
        }
        if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
            return;
        }
        this.textElement.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseUp(args: MouseLocationArgs) {
        if (!this.textElement) {
            return;
        }
        if (!this.point1) {
            return;
        }
        if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
            return;
        }
        const newSize = new Size(args.location.x - this.point1.x, args.location.y - this.point1.y);
        if (newSize.width < this.minSize || newSize.height < this.minSize) {
            this.cancel();
        }
        if (this.cancelled) {
            return;
        }
        this.textElement.setSize(newSize);
        if (this.controller) {
            this.controller.invalidate();
        }
        this.textElement = undefined;
        this.isCreating = false;
    }

    public cancel() {
        this.cancelled = true;
        if (this.model && this.textElement) {
            this.model.remove(this.textElement);
        }
        if (this.controller) {
            this.controller.invalidate();
        }
        this.textElement = undefined;
        this.isCreating = false;
    }
}
