import { ErrorMessages } from '../core/error-messages';
import { Model } from '../core/model';
import { Region } from '../core/region';
import { ElementBase } from '../elements/element-base';
import { FillFactory } from '../fill/fill-factory';

interface ViewControllerLike {
    offsetX: number;
    offsetY: number;
    model?: Model;
}

/**
 * Renders model content for viewing
 */
export class ViewRenderer {
    /**
     * View controller
     */
    public controller: ViewControllerLike;

    /**
     * @param controller - Associated view controller
     */
    constructor(controller: ViewControllerLike) {
        this.controller = controller;
    }

    /**
     * Renders controller model to provided 2d canvas context at specified scale
     * @param c - Rendering context
     * @param scale - Optional rendering scale. Default is 1.
     */
    public renderToContext(c: CanvasRenderingContext2D, scale?: number): void {
        const model = this.controller.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        const w = size.width;
        const h = size.height;

        // Begin rendering context and render base model
        this.beginRender(c, scale);

        // Render elements
        const modelBounds = new Region(this.controller.offsetX, this.controller.offsetY, w, h);
        for (const element of model.elements) {
            if (this.shouldRender(element, modelBounds)) {
                element.draw(c);
            }
        }

        // End rendering context
        this.endRender(c);
    }

    public applyRenderState(c: CanvasRenderingContext2D, scale?: number): void {
        const model = this.controller.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        if (arguments.length > 1 && scale !== undefined && scale !== 1) {
            c.scale(scale, scale);
        }

        if (model.transform !== undefined) {
            const location = model.getLocation();
            if (location) {
                model.setRenderTransform(c, model.transform, location);
            }
        }
        model.applyRenderOpacity(c);
    }

    public beginRender(c: CanvasRenderingContext2D, scale?: number) {
        const model = this.controller.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const size = model.getSize();
        if (!size) {
            throw new Error(ErrorMessages.SizeUndefined);
        }

        // Save context state
        c.save();

        this.applyRenderState(c, scale);

        // Fill
        if (FillFactory.setElementFill(c, model)) {
            const w = size.width;
            const h = size.height;
            c.fillRect(0, 0, w, h);
        }
    }

    public renderElement(c: CanvasRenderingContext2D, el: ElementBase) {
        if (el.visible === false) {
            return;
        }
        el.draw(c);
    }

    public endRender(c: CanvasRenderingContext2D) {
        this.renderModelStroke(c);

        // Restore context state
        c.restore();
    }

    public renderModelStroke(c: CanvasRenderingContext2D): void {
        const model = this.controller.model;

        if (model && model.setElementStroke(c, model)) {
            const size = model.getSize();
            if (size) {
                const w = size.width;
                const h = size.height;
                c.strokeRect(0, 0, w, h);
            }
        }
    }

    /**
     * Determines if element intersect rendering region and should be rendered or is out of bounds
     * @param el - Rendered element
     * @param bounds - Rendering region
     * @returns True if element should be rendered
     */
    public shouldRender(el: ElementBase, bounds: Region): boolean {
        if (el.visible === false) {
            return false;
        }
        // If no transform, check bounds
        if (!el.transform) {
            const b = el.getBounds();
            if (b) {
                return b.intersectsWith(bounds);
            }
            return false;
        }
        else {
            // If transform, always render
            // TODO - Compute transformed bounds
            return true;
        }
    }
}
