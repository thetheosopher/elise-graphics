import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { LineElement } from '../../elements/line-element';
import { PolylineElement } from '../../elements/polyline-element';
import { DesignTool } from './design-tool';

export class PenTool extends DesignTool {

    public points?: Point[];
    public lastPoint?: Point;
    public polyline?: PolylineElement;
    public line?: LineElement;

    public mouseDown(args: MouseLocationArgs): void {
        if (!this.points || this.points.length === 0) {
            this.points = [];
            this.points.push(new Point(args.location.x, args.location.y));
            this.points.push(new Point(args.location.x, args.location.y));
            this.lastPoint = this.points[this.points.length - 1];
            this.line = LineElement.create(this.points[0].x, this.points[0].y, this.points[1].x, this.points[1].y);
            this.line.setStroke(this.stroke);
            if(this.model) {
                this.line.setInteractive(true).addTo(this.model);
            }
            this.isCreating = true;
        }
        if(this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseMove(args: MouseLocationArgs) {
        if (this.line === undefined && this.polyline === undefined) {
            return;
        }
        if (this.line !== undefined) {
            this.line.setP2(args.location);
        }
        else if (this.lastPoint) {
            this.lastPoint.x = args.location.x;
            this.lastPoint.y = args.location.y;
        }
        if(this.points) {
            if (this.model && this.line) {
                this.model.remove(this.line);
                this.line = undefined;
                this.polyline = PolylineElement.create();
                this.polyline.smoothPoints = true;
                this.polyline.setStroke(this.stroke);
                this.polyline.setInteractive(true).addTo(this.model);
                this.lastPoint = new Point(args.location.x, args.location.y);
                for(const pnt of this.points) {
                    this.polyline.addPoint(pnt.clone());
                }
                const point = new Point(args.location.x, args.location.y);
                this.lastPoint = point;
                this.polyline.addPoint(this.lastPoint);
                this.points.push(point);
            }
            else if (this.polyline != null) {
                const point = new Point(args.location.x, args.location.y);
                this.points.push(point);
                this.lastPoint = point;
                this.polyline.addPoint(this.lastPoint);
            }
        }
        if(this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseUp(args: MouseLocationArgs) {
        this.line = undefined;
        this.polyline = undefined;
        this.points = undefined;
        this.lastPoint = undefined;
        if(this.controller) {
            this.controller.invalidate();
        }
        this.isCreating = false;
    }

    public cancel() {
        if (this.model && this.line) {
            this.model.remove(this.line);
            this.line = undefined;
        }
        else if (this.polyline !== undefined) {
            if(this.model && this.points) {
                this.points.splice(this.points.length - 1);
                if (this.points.length < 3) {
                    this.model.remove(this.polyline);
                }
                else {
                    this.polyline.setPoints(this.points);
                }
            }
        }
        this.line = undefined;
        this.polyline = undefined;
        this.points = undefined;
        this.lastPoint = undefined;
        if(this.controller) {
            this.controller.invalidate();
        }
        this.isCreating = false;
    }
}
