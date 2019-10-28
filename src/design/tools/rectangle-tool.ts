import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { RectangleElement } from '../../elements/rectangle-element';
import { DesignTool } from './design-tool';

export class RectangleTool extends DesignTool {

    public point1?: Point;
    public rectangle?: RectangleElement;
    public cancelled: boolean = false;

    public mouseDown(args: MouseLocationArgs): void {
        this.cancelled = false;
        this.point1 = Point.create(args.location.x, args.location.y);
        this.rectangle = RectangleElement.create(args.location.x, args.location.y, 0, 0);
        if (this.stroke) {
            this.rectangle.setStroke(this.stroke);
        }
        if (this.fill) {
            this.rectangle.setFill(this.fill);
        }
        if (this.fillScale !== 1) {
            this.rectangle.setFillScale(this.fillScale);
        }
        if(this.model) {
            this.rectangle.setInteractive(true).addTo(this.model);
        }
        if(this.controller) {
            this.controller.invalidate();
        }
        this.isCreating = true;
    }

    public mouseMove(args: MouseLocationArgs) {
        if (this.cancelled) {
            return;
        }
        if (!this.rectangle) {
            return;
        }
        if(!this.point1) {
            return;
        }
        if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
            return;
        }
        this.rectangle.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
        if(this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseUp(args: MouseLocationArgs) {
        if (this.cancelled) {
            return;
        }
        if (!this.rectangle) {
            return;
        }
        if(!this.point1) {
            return;
        }
        if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
            return;
        }
        this.rectangle.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
        if(this.controller) {
            this.controller.invalidate();
        }
        this.rectangle = undefined;
        this.isCreating = false;
    }

    public cancel() {
        this.cancelled = true;
        if(this.model && this.rectangle) {
            this.model.remove(this.rectangle);
        }
        if(this.controller) {
            this.controller.invalidate();
        }
        this.rectangle = undefined;
        this.isCreating = false;
    }
}
