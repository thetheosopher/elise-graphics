import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { LineElement } from '../../elements/line-element';
import { DesignTool } from './design-tool';

/**
 * Line element creation tool
 */
export class LineTool extends DesignTool {
    public line?: LineElement;
    public cancelled: boolean = false;

    public mouseDown(args: MouseLocationArgs): void {
        this.cancelled = false;
        this.line = LineElement.create(args.location.x, args.location.y, args.location.x, args.location.y);
        this.line.setStroke(this.stroke);
        if (this.model) {
            this.line.setInteractive(true).addTo(this.model);
        }
        this.isCreating = true;
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseMove(args: MouseLocationArgs) {
        if (this.cancelled) {
            return;
        }
        if (!this.line) {
            return;
        }
        this.line.setP2(args.location);
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseUp(args: MouseLocationArgs) {
        if (!this.line) {
            return;
        }
        const p1 = this.line.getP1();
        if(!p1) {
            return;
        }
        if(Math.abs(args.location.x - p1.x) < this.minSize &&
          (Math.abs(args.location.y - p1.y) < this.minSize)) {
            this.cancel();
        }
        if (this.cancelled) {
            return;
        }
        this.line.setP2(args.location);
        if (this.controller) {
            this.controller.invalidate();
        }
        this.line = undefined;
        this.isCreating = false;
    }

    public cancel() {
        this.cancelled = true;
        if (this.model && this.line) {
            this.model.remove(this.line);
        }
        if (this.controller) {
            this.controller.invalidate();
        }
        this.line = undefined;
        this.isCreating = false;
    }
}
