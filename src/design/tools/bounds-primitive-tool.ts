import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { ElementBase } from '../../elements/element-base';
import { DesignTool } from './design-tool';

export abstract class BoundsPrimitiveTool<T extends ElementBase> extends DesignTool {
    public point1?: Point;

    public element?: T;

    public cancelled: boolean = false;

    protected abstract createElement(x: number, y: number): T;

    protected initializeElement(element: T): void {
        element.aspectLocked = this.aspectLocked;
        if (this.stroke) {
            element.setStroke(this.stroke);
        }
        if (this.fill) {
            element.setFill(this.fill);
        }
        if (this.fillScale !== 1) {
            element.setFillScale(this.fillScale);
        }
    }

    public mouseDown(args: MouseLocationArgs): void {
        this.cancelled = false;
        this.point1 = new Point(args.location.x, args.location.y);
        this.element = this.createElement(args.location.x, args.location.y);
        this.initializeElement(this.element);
        if (this.model) {
            this.element.setInteractive(true).addTo(this.model);
        }
        if (this.controller) {
            this.controller.invalidate();
        }
        this.isCreating = true;
    }

    public mouseMove(args: MouseLocationArgs): void {
        if (this.cancelled || !this.element || !this.point1) {
            return;
        }
        if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
            return;
        }
        this.element.setLocation(this.point1);
        this.element.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseUp(args: MouseLocationArgs): void {
        if (!this.element || !this.point1) {
            return;
        }
        if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
            this.cancel();
            return;
        }
        const size = new Size(args.location.x - this.point1.x, args.location.y - this.point1.y);
        if (size.width < this.minSize || size.height < this.minSize) {
            this.cancel();
            return;
        }
        if (this.cancelled) {
            return;
        }
        this.element.setLocation(this.point1);
        this.element.setSize(size);
        if (this.controller) {
            this.controller.invalidate();
        }
        this.point1 = undefined;
        this.element = undefined;
        this.isCreating = false;
    }

    public cancel(): void {
        this.cancelled = true;
        if (this.model && this.element) {
            this.model.remove(this.element);
        }
        this.point1 = undefined;
        this.element = undefined;
        this.isCreating = false;
        if (this.controller) {
            this.controller.invalidate();
        }
    }
}