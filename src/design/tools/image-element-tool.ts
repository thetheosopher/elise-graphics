import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { ImageElement } from '../../elements/image-element';
import { DesignTool } from './design-tool';

/**
 * Image element creation tool
 */
export class ImageElementTool extends DesignTool {
    public point1?: Point;
    public source?: string;
    public imageElement?: ImageElement;

    public cancelled: boolean = false;

    constructor() {
        super();
        this.setImageSource = this.setImageSource.bind(this);
    }

    public mouseDown(args: MouseLocationArgs): void {
        this.cancelled = false;
        this.point1 = Point.create(args.location.x, args.location.y);
        this.imageElement = ImageElement.create(this.source, args.location.x, args.location.y, 0, 0);
        if (this.opacity !== 255) {
            this.imageElement.setOpacity(this.opacity / 255.0);
        }
        if (this.stroke) {
            this.imageElement.setStroke(this.stroke);
        }
        if (this.model) {
            this.imageElement.setInteractive(true).addTo(this.model);
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
        if (!this.imageElement) {
            return;
        }
        if (!this.point1) {
            return;
        }
        if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
            return;
        }
        this.imageElement.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseUp(args: MouseLocationArgs) {
        if (this.cancelled) {
            return;
        }
        if (!this.imageElement) {
            return;
        }
        if (!this.point1) {
            return;
        }
        if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
            return;
        }
        this.imageElement.setSize(new Size(args.location.x - this.point1.x, args.location.y - this.point1.y));
        if (this.controller) {
            this.controller.invalidate();
        }
        this.imageElement = undefined;
        this.isCreating = false;
    }

    public cancel() {
        this.cancelled = true;
        if (this.model && this.imageElement) {
            this.model.remove(this.imageElement);
        }
        if (this.controller) {
            this.controller.invalidate();
        }
        this.imageElement = undefined;
        this.isCreating = false;
    }

    public setImageSource(source: string) {
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
