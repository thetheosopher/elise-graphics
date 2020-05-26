import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { LineElement } from '../../elements/line-element';
import { PolygonElement } from '../../elements/polygon-element';
import { DesignTool } from './design-tool';

/**
 * Polygon element design creation tool
 */
export class PolygonTool extends DesignTool {
    public points?: Point[];
    public lastPoint?: Point;
    public polygon?: PolygonElement;
    public line?: LineElement;

    public mouseDown(args: MouseLocationArgs): void {
        if (!this.points || this.points.length === 0) {
            this.points = [];
            this.points.push(new Point(args.location.x, args.location.y));
            this.points.push(new Point(args.location.x, args.location.y));
            this.lastPoint = this.points[this.points.length - 1];
            this.line = LineElement.create(this.points[0].x, this.points[0].y, this.points[1].x, this.points[1].y);
            this.line.setStroke(this.stroke);
            if (this.model) {
                this.line.setInteractive(true).addTo(this.model);
            }
            this.isCreating = true;
        }
        else {
            if (this.model && this.line) {
                this.model.remove(this.line);
                this.line = undefined;
                this.polygon = PolygonElement.create();
                this.polygon.setStroke(this.stroke);
                this.polygon.setFill(this.fill);
                if (this.fillScale !== 1) {
                    this.polygon.setFillScale(this.fillScale);
                }
                this.polygon.setInteractive(true).addTo(this.model);
                this.points[1].x = args.location.x;
                this.points[1].y = args.location.y;
                this.lastPoint = new Point(args.location.x, args.location.y);
                for (const pnt of this.points) {
                    this.polygon.addPoint(pnt);
                }
                const point = new Point(args.location.x, args.location.y);
                this.lastPoint = point;
                this.polygon.addPoint(this.lastPoint);
                this.points.push(point);
            }
            else if (this.polygon) {
                const point = new Point(args.location.x, args.location.y);
                this.points.push(point);
                this.lastPoint = point;
                this.polygon.addPoint(this.lastPoint);
            }
        }
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseMove(args: MouseLocationArgs) {
        if (!this.line && !this.polygon) {
            return;
        }
        if (this.line) {
            this.line.setP2(args.location);
        }
        else if (this.lastPoint) {
            this.lastPoint.x = args.location.x;
            this.lastPoint.y = args.location.y;
        }
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseUp(args: MouseLocationArgs) {
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public cancel() {
        if (this.model && this.line) {
            this.model.remove(this.line);
            this.line = undefined;
        }
        else if (this.polygon && this.points && this.model) {
            // this.points.splice(this.points.length - 1);
            if (this.points.length < 3) {
                this.model.remove(this.polygon);
            }
            else {
                this.polygon.setPoints(this.points);
            }
        }
        this.line = undefined;
        this.polygon = undefined;
        this.points = undefined;
        this.lastPoint = undefined;
        if (this.controller) {
            this.controller.invalidate();
        }
        this.isCreating = false;
    }
}
