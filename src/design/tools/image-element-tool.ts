import { MouseLocationArgs } from '../../core/mouse-location-args';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { ImageElement } from '../../elements/image-element';
import { DesignTool } from './design-tool';
import { BitmapResource } from '../../resource/bitmap-resource';

/**
 * Image element creation tool
 */
export class ImageElementTool extends DesignTool {
    public point1?: Point;
    public source?: string;
    public imageElement?: ImageElement;

    public nativeAspect?: number;

    public cancelled: boolean = false;

    constructor() {
        super();
        this.minSize = 4;
        this.setImageSource = this.setImageSource.bind(this);
    }

    public mouseDown(args: MouseLocationArgs): void {
        this.cancelled = false;
        this.point1 = Point.create(args.location.x, args.location.y);
        this.imageElement = ImageElement.create(this.source, args.location.x, args.location.y, 0, 0);
        this.imageElement.aspectLocked = this.aspectLocked;
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

    private getNewSize(deltaX: number, deltaY: number) {
        if(this.nativeAspect != null && this.aspectLocked) {
            if(deltaX > deltaY) {
                return new Size(deltaX, deltaX / this.nativeAspect);
            }
            else {
                return new Size(deltaY * this.nativeAspect, deltaY);
            }
        }
        else {
            return new Size(deltaX, deltaY);
        }
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
        const newSize = this.getNewSize(args.location.x - this.point1.x, args.location.y - this.point1.y);
        if(newSize.width < this.minSize || newSize.height < this.minSize) {
            return;
        }
        this.imageElement.setSize(newSize);
        if (this.controller) {
            this.controller.invalidate();
        }
    }

    public mouseUp(args: MouseLocationArgs) {
        if (!this.imageElement) {
            return;
        }
        if (!this.point1) {
            return;
        }
        if (args.location.x < this.point1.x || args.location.y < this.point1.y) {
            return;
        }
        const newSize = this.getNewSize(args.location.x - this.point1.x, args.location.y - this.point1.y);
        if(newSize.width < this.minSize || newSize.height < this.minSize) {
            this.cancel();
        }
        if (this.cancelled) {
            return;
        }
        this.imageElement.setSize(newSize);
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
            const resource:BitmapResource | undefined = this.model.resourceManager.get(this.source);
            if (resource && !resource.available) {
                this.model.resourceManager.register(this.source);
                this.model.resourceManager.load((result) => {
                    if(result && resource.image) {
                        this.nativeAspect = resource.image.naturalWidth / resource.image.naturalHeight;
                    }
                });
            }
            else if(resource !== undefined && resource.image) {
                this.nativeAspect = resource.image.naturalWidth / resource.image.naturalHeight;
            }
        }
    }
}
