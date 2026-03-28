import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { Size } from '../core/size';
import { ElementBase } from '../elements/element-base';
import { MoveLocation } from '../elements/move-location';
import { ResizeSize } from '../elements/resize-size';

export interface DesignTransformHost {
    model?: { getSize(): Size | undefined };
    selectedElements: ElementBase[];
    elementResizeSizes: ResizeSize[];
    elementMoveLocations: MoveLocation[];
    constrainToBounds: boolean;
    onElementSizing(element: ElementBase, size: Size): void;
    onElementMoving(element: ElementBase, location: Point): void;
    onElementSized(element: ElementBase, size: Size): void;
    onElementMoved(element: ElementBase, location: Point): void;
    onModelUpdated(): void;
    commitUndoSnapshot(): void;
    drawIfNeeded(): void;
    clearSmartAlignmentGuides(): void;
    isInBounds(location: Point, size: Size, model: ElementBase['model'], transform?: string): boolean;
}

export class DesignTransformService {
    public clearElementResizeSizes(host: DesignTransformHost): void {
        host.elementResizeSizes = [];
    }

    public setElementResizeSize(host: DesignTransformHost, element: ElementBase, size: Size, location?: Point): void {
        if (location === undefined) {
            const bounds = element.getBounds();
            if (bounds) {
                location = bounds.location;
            }
        }
        if (!location) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }

        let newWidth = size.width;
        let newHeight = size.height;
        if (!element.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const modelSize = element.model.getSize();
        if (!modelSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        if (host.constrainToBounds) {
            if (location.x + size.width > modelSize.width) {
                newWidth = modelSize.width - location.x;
            }
            if (location.y + size.height > modelSize.height) {
                newHeight = modelSize.height - location.y;
            }
        }
        const newSize = new Size(newWidth, newHeight);
        if (!host.constrainToBounds || host.isInBounds(location, newSize, element.model, element.transform)) {
            for (const resizeSize of host.elementResizeSizes) {
                if (resizeSize.element === element) {
                    resizeSize.size = newSize;
                    host.onElementSizing(element, newSize);
                    return;
                }
            }
            host.elementResizeSizes.push(new ResizeSize(element, newSize));
            host.onElementSizing(element, newSize);
        }
    }

    public getElementResizeSize(host: DesignTransformHost, element: ElementBase): Size {
        for (const resizeSize of host.elementResizeSizes) {
            if (resizeSize.element === element) {
                return resizeSize.size;
            }
        }
        const size = element.getSize();
        if (size) {
            return new Size(size.width, size.height);
        }
        const bounds = element.getBounds();
        if (bounds) {
            return new Size(bounds.width, bounds.height);
        }
        throw new Error(ErrorMessages.SizeUndefined);
    }

    public clearElementMoveLocations(host: DesignTransformHost): void {
        host.elementMoveLocations = [];
        host.clearSmartAlignmentGuides();
    }

    public setElementMoveLocation(host: DesignTransformHost, element: ElementBase, location: Point, size: Size): void {
        if (!element.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let newSize: Size | undefined = size;
        if (newSize === undefined) {
            newSize = element.getSize();
        }
        if (!newSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        const modelSize = element.model.getSize();
        if (!modelSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }
        let newX = location.x;
        let newY = location.y;
        if (host.constrainToBounds) {
            if (newX < 0) {
                newX = 0;
            }
            else if (newX + newSize.width > modelSize.width) {
                newX = modelSize.width - newSize.width;
            }
            if (newY < 0) {
                newY = 0;
            }
            else if (newY + newSize.height > modelSize.height) {
                newY = modelSize.height - newSize.height;
            }
        }
        const newLocation = new Point(newX, newY);
        if (!host.constrainToBounds || host.isInBounds(newLocation, newSize, element.model, element.transform)) {
            for (const moveLocation of host.elementMoveLocations) {
                if (moveLocation.element === element) {
                    moveLocation.location = newLocation;
                    host.onElementMoving(element, newLocation);
                    return;
                }
            }
            host.elementMoveLocations.push(new MoveLocation(element, newLocation));
            host.onElementMoving(element, newLocation);
        }
    }

    public getElementMoveLocation(host: DesignTransformHost, element: ElementBase): Point {
        for (const moveLocation of host.elementMoveLocations) {
            if (moveLocation.element === element) {
                return moveLocation.location;
            }
        }
        const location = element.getLocation();
        if (location) {
            return new Point(location.x, location.y);
        }
        const bounds = element.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        return new Point(bounds.x, bounds.y);
    }

    public nudgeSize(host: DesignTransformHost, offsetX: number, offsetY: number): void {
        for (const element of host.selectedElements) {
            if (element.canNudge()) {
                const bounds = element.getBounds();
                if (!bounds) {
                    return;
                }
                const size = new Size(bounds.width + offsetX, bounds.height + offsetY);
                if (size.width <= 0 || size.height <= 0) {
                    return;
                }
                if (
                    host.constrainToBounds &&
                    element.model &&
                    !host.isInBounds(bounds.location, size, element.model, element.transform)
                ) {
                    return;
                }
            }
        }
        for (const element of host.selectedElements) {
            if (element.canNudge()) {
                element.nudgeSize(offsetX, offsetY);
                const size = element.getSize();
                if (size) {
                    host.onElementSized(element, size);
                    this.setElementResizeSize(host, element, size, element.getLocation());
                }
            }
        }
        host.onModelUpdated();
        host.commitUndoSnapshot();
        host.drawIfNeeded();
    }

    public nudgeLocation(host: DesignTransformHost, offsetX: number, offsetY: number): void {
        if (!host.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const modelSize = host.model.getSize();
        if (!modelSize) {
            throw new Error(ErrorMessages.SizeUndefined);
        }

        let allGood = true;
        for (const element of host.selectedElements) {
            if (element.canNudge()) {
                const bounds = element.getBounds();
                if (!bounds) {
                    throw new Error(ErrorMessages.BoundsAreUndefined);
                }
                const location = new Point(bounds.x + offsetX, bounds.y + offsetY);
                if (
                    host.constrainToBounds &&
                    element.model &&
                    !host.isInBounds(location, bounds.size, element.model, element.transform)
                ) {
                    allGood = false;
                    break;
                }
            }
        }
        if (!allGood) {
            let x1 = Number.POSITIVE_INFINITY;
            let x2 = Number.NEGATIVE_INFINITY;
            let y1 = Number.POSITIVE_INFINITY;
            let y2 = Number.NEGATIVE_INFINITY;
            for (const selectedElement of host.selectedElements) {
                if (selectedElement.canNudge()) {
                    const bounds = selectedElement.getBounds();
                    if (!bounds) {
                        continue;
                    }
                    if (bounds.x < x1) {
                        x1 = bounds.x;
                    }
                    if (bounds.x + bounds.width > x2) {
                        x2 = bounds.x + bounds.width;
                    }
                    if (bounds.y < y1) {
                        y1 = bounds.y;
                    }
                    if (bounds.y + bounds.height > y2) {
                        y2 = bounds.y + bounds.height;
                    }
                }
            }
            if (offsetX < 0 && x1 + offsetX < 0) {
                offsetX = -x1;
            }
            else if (offsetX > 0 && x2 + offsetX > modelSize.width) {
                offsetX = modelSize.width - x2;
            }
            if (offsetY < 0 && y1 + offsetY < 0) {
                offsetY = -y1;
            }
            else if (offsetY > 0 && y2 + offsetY > modelSize.height) {
                offsetY = modelSize.height - y2;
            }
        }

        for (const element of host.selectedElements) {
            if (element.canNudge()) {
                element.translate(offsetX, offsetY);
                const bounds = element.getBounds();
                if (bounds) {
                    host.onElementMoved(element, bounds.location);
                }
            }
        }

        host.onModelUpdated();
        host.commitUndoSnapshot();
        host.drawIfNeeded();
    }
}
