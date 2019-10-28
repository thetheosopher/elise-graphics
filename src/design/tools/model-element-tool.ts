import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { ModelElement } from '../../elements/model-element';
import { DesignTool } from './design-tool';

export class ModelElementTool extends DesignTool {
  public point1?: Point;
  public source?: string;
  public modelElement?: ModelElement;

  public cancelled: boolean = false;

  constructor() {
    super();
    this.setModelSource = this.setModelSource.bind(this);
  }

  public mouseDown(args: MouseLocationArgs): void {
    this.cancelled = false;
    this.point1 = Point.create(args.location.x, args.location.y);
    this.modelElement = ModelElement.create(this.source, args.location.x, args.location.y, 0, 0);
    if (this.opacity !== 255) {
      this.modelElement.setOpacity(this.opacity / 255.0);
    }
    if (this.stroke) {
      this.modelElement.setStroke(this.stroke);
    }
    if (this.model) {
      this.modelElement.setInteractive(true).addTo(this.model);
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
    if (this.modelElement === undefined) {
      return;
    }
    if (this.point1 === undefined) {
      return;
    }
    if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
      return;
    }
    this.modelElement.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
    if (this.controller) {
      this.controller.invalidate();
    }
  }

  public mouseUp(args: MouseLocationArgs) {
    if (this.cancelled) {
      return;
    }
    if (this.modelElement === undefined) {
      return;
    }
    if (this.point1 === undefined) {
      return;
    }
    if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
      return;
    }
    this.modelElement.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
    if (this.controller) {
      this.controller.invalidate();
    }
    this.modelElement = undefined;
    this.isCreating = false;
  }

  public cancel() {
    this.cancelled = true;
    if (this.model && this.modelElement) {
      this.model.remove(this.modelElement);
    }
    if (this.controller) {
      this.controller.invalidate();
    }
    this.modelElement = undefined;
    this.isCreating = false;
  }

  public setModelSource(source: string) {
    this.source = source;
    if (this.model) {
      const resource = this.model.resourceManager.get(this.source);
      if (resource && !resource.available) {
        this.model.resourceManager.register(this.source);
        this.model.resourceManager.load();
      }
    }
  }
}
