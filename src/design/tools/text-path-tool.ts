import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { TextPathElement } from '../../elements/text-path-element';
import { DesignTool } from './design-tool';

/**
 * Design-surface tool that creates a TextPathElement from a drag gesture.
 *
 * The initial guide path is a straight line from the mouse-down point to the
 * current pointer position. After creation, the resulting element is edited
 * through the normal design-surface selection workflow.
 */
export class TextPathTool extends DesignTool {
    public point1?: Point;
    public textPathElement?: TextPathElement;

    public text?: string;
    public typeface?: string;
    public typesize: number;
    public typestyle?: string;
    public alignment?: string;
    public startOffset: number = 0;
    public startOffsetPercent: boolean = false;
    public showPath: boolean = false;
    public side: 'left' | 'right' = 'left';
    public cancelled: boolean = false;

    constructor() {
        super();
        this.typesize = 10;
        this.aspectLocked = false;
    }

    public mouseDown(args: MouseLocationArgs): void {
        this.cancelled = false;
        this.point1 = Point.create(args.location.x, args.location.y);
        this.textPathElement = TextPathElement.create(this.text, `M ${args.location.x} ${args.location.y} L ${args.location.x} ${args.location.y}`);
        this.textPathElement.aspectLocked = this.aspectLocked;
        if (this.stroke) {
            this.textPathElement.setStroke(this.stroke);
        }
        if (this.fill) {
            this.textPathElement.setFill(this.fill);
        }
        if (this.fillScale !== 1) {
            this.textPathElement.setFillScale(this.fillScale);
        }
        this.textPathElement.alignment = this.alignment;
        this.textPathElement.typeface = this.typeface;
        this.textPathElement.typestyle = this.typestyle;
        this.textPathElement.typesize = this.typesize;
        this.textPathElement.startOffset = this.startOffset;
        this.textPathElement.startOffsetPercent = this.startOffsetPercent;
        this.textPathElement.showPath = this.showPath;
        this.textPathElement.side = this.side;
        if (this.model) {
            this.textPathElement.setInteractive(true).addTo(this.model);
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
        if (!this.textPathElement || !this.point1) {
            return;
        }
        this.textPathElement.setPathCommands(`M ${this.point1.x} ${this.point1.y} L ${args.location.x} ${args.location.y}`);
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseUp(args: MouseLocationArgs) {
        if (!this.textPathElement || !this.point1) {
            return;
        }
        if (Math.abs(args.location.x - this.point1.x) < this.minSize && Math.abs(args.location.y - this.point1.y) < this.minSize) {
            this.cancel();
        }
        if (this.cancelled) {
            return;
        }
        this.textPathElement.setPathCommands(`M ${this.point1.x} ${this.point1.y} L ${args.location.x} ${args.location.y}`);
        if (this.controller) {
            this.controller.invalidate();
        }
        this.textPathElement = undefined;
        this.isCreating = false;
    }

    public cancel() {
        this.cancelled = true;
        if (this.model && this.textPathElement) {
            this.model.remove(this.textPathElement);
        }
        if (this.controller) {
            this.controller.invalidate();
        }
        this.textPathElement = undefined;
        this.isCreating = false;
    }
}