import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { EllipseElement } from '../../elements/ellipse-element';
import { DesignTool } from './design-tool';

export class EllipseTool extends DesignTool {
  public point1?: Point;
  public point2?: Point;
  public ellipse?: EllipseElement;
  public cancelled: boolean = false;

  public mouseDown(args: MouseLocationArgs): void {
    this.cancelled = false;
    this.point1 = Point.create(args.location.x, args.location.y);
    this.ellipse = EllipseElement.create(args.location.x, args.location.y, 0, 0);
    this.ellipse.setStroke(this.stroke);
    this.ellipse.setFill(this.fill);
    if (this.fillScale !== 1) {
      this.ellipse.setFillScale(this.fillScale);
    }
    if (this.model) {
      this.ellipse.setInteractive(true).addTo(this.model);
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
    if (this.ellipse === undefined) {
      return;
    }
    if (this.point1 === undefined) {
      return;
    }
    if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
      return;
    }
    this.ellipse.setLocation(this.point1);
    this.ellipse.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
    if (this.controller) {
      this.controller.invalidate();
    }
  }

  public mouseUp(args: MouseLocationArgs) {
    if (this.cancelled) {
      return;
    }
    if (this.ellipse == null) {
      return;
    }
    if (this.point1 === undefined) {
      return;
    }
    if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
      return;
    }
    this.ellipse.setLocation(this.point1);
    this.ellipse.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
    if (this.controller) {
      this.controller.invalidate();
    }
    this.ellipse = undefined;
    this.isCreating = false;
  }

  public cancel() {
    this.cancelled = true;
    if (this.model && this.ellipse) {
      this.model.remove(this.ellipse);
    }
    if (this.controller) {
      this.controller.invalidate();
    }
    this.ellipse = undefined;
    this.isCreating = false;
  }
}
