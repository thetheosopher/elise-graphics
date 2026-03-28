import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { ElementBase } from '../elements/element-base';

interface MovableSelectionEntry {
    element: ElementBase;
    bounds: Region;
    location: Point;
}

export interface DesignArrangementHost {
    model?: {
        elements: ElementBase[];
        add(element: ElementBase): void;
        resourceManager: { pruneUnusedResources(): unknown[] };
    };
    selectedElements: ElementBase[];
    constrainToBounds: boolean;
    minElementSize: Size;
    onElementAdded(element: ElementBase): void;
    onElementMoved(element: ElementBase, location: Point): void;
    onElementSized(element: ElementBase, size: Size): void;
    onSelectionChanged(): void;
    onElementsReordered(): void;
    onModelUpdated(): void;
    commitUndoSnapshot(): void;
    drawIfNeeded(): void;
    setIsDirty(isDirty: boolean): void;
    setElementResizeSize(element: ElementBase, size: Size, location?: Point): void;
}

const EPSILON = 2e-23;

export class DesignArrangementService {
    public duplicateSelected(host: DesignArrangementHost): void {
        const newSelected: ElementBase[] = [];
        if (host.selectedElements.length > 0) {
            host.selectedElements.forEach((element) => {
                const clone = element.clone();
                clone.setInteractive(true);
                if (host.model) {
                    host.model.add(clone);
                }
                host.onElementAdded(clone);
                newSelected.push(clone);
            });
            host.selectedElements = newSelected;
            host.onSelectionChanged();
            host.setIsDirty(true);
            host.commitUndoSnapshot();
        }
    }

    public moveElementToBottom(host: DesignArrangementHost, element: ElementBase): void {
        if (!host.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        const index = host.model.elements.indexOf(element);
        if (index > 0) {
            host.model.elements.splice(index, 1);
            host.model.elements.splice(0, 0, element);
            host.onElementsReordered();
        }
    }

    public moveElementToTop(host: DesignArrangementHost, element: ElementBase): void {
        if (!host.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        const index = host.model.elements.indexOf(element);
        if (index < host.model.elements.length - 1) {
            host.model.elements.splice(index, 1);
            host.model.elements.splice(host.model.elements.length, 0, element);
            host.onElementsReordered();
        }
    }

    public moveElementBackward(host: DesignArrangementHost, element: ElementBase): void {
        if (!host.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        const index = host.model.elements.indexOf(element);
        if (index > 0) {
            host.model.elements.splice(index, 1);
            host.model.elements.splice(index - 1, 0, element);
            host.onElementsReordered();
        }
    }

    public moveElementForward(host: DesignArrangementHost, element: ElementBase): void {
        if (!host.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        const index = host.model.elements.indexOf(element);
        if (index < host.model.elements.length - 1) {
            host.model.elements.splice(index, 1);
            host.model.elements.splice(index + 1, 0, element);
            host.onElementsReordered();
        }
    }

    public sendToBack(host: DesignArrangementHost, element?: ElementBase): void {
        this.reorderElements(host, this.getReorderTargets(host.selectedElements, element), 'back');
    }

    public bringToFront(host: DesignArrangementHost, element?: ElementBase): void {
        this.reorderElements(host, this.getReorderTargets(host.selectedElements, element), 'front');
    }

    public sendBackward(host: DesignArrangementHost, element?: ElementBase): void {
        this.reorderElements(host, this.getReorderTargets(host.selectedElements, element), 'backward');
    }

    public bringForward(host: DesignArrangementHost, element?: ElementBase): void {
        this.reorderElements(host, this.getReorderTargets(host.selectedElements, element), 'forward');
    }

    public alignSelectedHorizontally(host: DesignArrangementHost, alignment: 'left' | 'center' | 'right'): void {
        const bounds = this.getBoundsForMovableEntries(this.getSelectedMovableEntries(host.selectedElements));
        if (!bounds) {
            return;
        }

        let changed = false;
        for (const selectedElement of host.selectedElements) {
            if (!selectedElement.canMove()) {
                continue;
            }
            const elementBounds = selectedElement.getBounds();
            if (!elementBounds) {
                continue;
            }

            let targetX = elementBounds.x;
            if (alignment === 'left') {
                targetX = bounds.x;
            }
            else if (alignment === 'center') {
                targetX = bounds.x + bounds.width / 2 - elementBounds.width / 2;
            }
            else {
                targetX = bounds.x + bounds.width - elementBounds.width;
            }

            changed = this.moveElementToBoundPosition(host, selectedElement, elementBounds, targetX, elementBounds.y) || changed;
        }

        this.finalizeSelectionLayoutChange(host, changed);
    }

    public alignSelectedVertically(host: DesignArrangementHost, alignment: 'top' | 'middle' | 'bottom'): void {
        const bounds = this.getBoundsForMovableEntries(this.getSelectedMovableEntries(host.selectedElements));
        if (!bounds) {
            return;
        }

        let changed = false;
        for (const selectedElement of host.selectedElements) {
            if (!selectedElement.canMove()) {
                continue;
            }
            const elementBounds = selectedElement.getBounds();
            if (!elementBounds) {
                continue;
            }

            let targetY = elementBounds.y;
            if (alignment === 'top') {
                targetY = bounds.y;
            }
            else if (alignment === 'middle') {
                targetY = bounds.y + bounds.height / 2 - elementBounds.height / 2;
            }
            else {
                targetY = bounds.y + bounds.height - elementBounds.height;
            }

            changed = this.moveElementToBoundPosition(host, selectedElement, elementBounds, elementBounds.x, targetY) || changed;
        }

        this.finalizeSelectionLayoutChange(host, changed);
    }

    public distributeSelectedHorizontally(host: DesignArrangementHost): void {
        const entries = this.getSelectedMovableEntries(host.selectedElements).sort((left, right) => left.bounds.x - right.bounds.x);
        if (entries.length < 3) {
            return;
        }

        const first = entries[0];
        const last = entries[entries.length - 1];
        const totalWidth = entries.reduce((sum, entry) => sum + entry.bounds.width, 0);
        const available = (last.bounds.x + last.bounds.width) - first.bounds.x - totalWidth;
        const gap = available / (entries.length - 1);

        let cursor = first.bounds.x + first.bounds.width + gap;
        let changed = false;
        for (let index = 1; index < entries.length - 1; index++) {
            const entry = entries[index];
            changed = this.moveElementToBoundPosition(host, entry.element, entry.bounds, cursor, entry.bounds.y) || changed;
            cursor += entry.bounds.width + gap;
        }

        this.finalizeSelectionLayoutChange(host, changed);
    }

    public distributeSelectedVertically(host: DesignArrangementHost): void {
        const entries = this.getSelectedMovableEntries(host.selectedElements).sort((top, bottom) => top.bounds.y - bottom.bounds.y);
        if (entries.length < 3) {
            return;
        }

        const first = entries[0];
        const last = entries[entries.length - 1];
        const totalHeight = entries.reduce((sum, entry) => sum + entry.bounds.height, 0);
        const available = (last.bounds.y + last.bounds.height) - first.bounds.y - totalHeight;
        const gap = available / (entries.length - 1);

        let cursor = first.bounds.y + first.bounds.height + gap;
        let changed = false;
        for (let index = 1; index < entries.length - 1; index++) {
            const entry = entries[index];
            changed = this.moveElementToBoundPosition(host, entry.element, entry.bounds, entry.bounds.x, cursor) || changed;
            cursor += entry.bounds.height + gap;
        }

        this.finalizeSelectionLayoutChange(host, changed);
    }

    public resizeSelectedToSameWidth(host: DesignArrangementHost): void {
        const referenceSize = this.getReferenceResizeSize(host.selectedElements);
        if (!referenceSize) {
            return;
        }

        this.resizeSelectedElements(host, referenceSize.width, undefined);
    }

    public resizeSelectedToSameHeight(host: DesignArrangementHost): void {
        const referenceSize = this.getReferenceResizeSize(host.selectedElements);
        if (!referenceSize) {
            return;
        }

        this.resizeSelectedElements(host, undefined, referenceSize.height);
    }

    public resizeSelectedToSameSize(host: DesignArrangementHost): void {
        const referenceSize = this.getReferenceResizeSize(host.selectedElements);
        if (!referenceSize) {
            return;
        }

        this.resizeSelectedElements(host, referenceSize.width, referenceSize.height);
    }

    public removeUnusedResourcesFromResourceManager(host: DesignArrangementHost): number {
        if (!host.model) {
            return 0;
        }

        const removed = host.model.resourceManager.pruneUnusedResources();
        if (removed.length === 0) {
            return 0;
        }

        host.onModelUpdated();
        host.commitUndoSnapshot();
        host.drawIfNeeded();
        return removed.length;
    }

    private getReorderTargets(selectedElements: ElementBase[], element?: ElementBase): ElementBase[] {
        if (element) {
            return [element];
        }
        return selectedElements.slice();
    }

    private reorderElements(host: DesignArrangementHost, targets: ElementBase[], direction: 'back' | 'front' | 'backward' | 'forward'): void {
        if (!host.model || targets.length === 0) {
            return;
        }

        const targetSet = new Set(targets);
        const original = host.model.elements.slice();
        let reordered = original.slice();

        if (direction === 'back') {
            reordered = original.filter((element) => targetSet.has(element)).concat(original.filter((element) => !targetSet.has(element)));
        }
        else if (direction === 'front') {
            reordered = original.filter((element) => !targetSet.has(element)).concat(original.filter((element) => targetSet.has(element)));
        }
        else if (direction === 'backward') {
            for (let index = 1; index < reordered.length; index++) {
                if (targetSet.has(reordered[index]) && !targetSet.has(reordered[index - 1])) {
                    const temp = reordered[index - 1];
                    reordered[index - 1] = reordered[index];
                    reordered[index] = temp;
                }
            }
        }
        else {
            for (let index = reordered.length - 2; index >= 0; index--) {
                if (targetSet.has(reordered[index]) && !targetSet.has(reordered[index + 1])) {
                    const temp = reordered[index + 1];
                    reordered[index + 1] = reordered[index];
                    reordered[index] = temp;
                }
            }
        }

        if (this.elementsMatchOrder(original, reordered)) {
            return;
        }

        host.model.elements = reordered;
        host.onElementsReordered();
    }

    private getSelectedMovableEntries(selectedElements: ElementBase[]): MovableSelectionEntry[] {
        const entries: MovableSelectionEntry[] = [];
        for (const selectedElement of selectedElements) {
            if (!selectedElement.canMove()) {
                continue;
            }

            const bounds = selectedElement.getBounds();
            if (!bounds) {
                continue;
            }

            const location = selectedElement.getLocation() || bounds.location;
            entries.push({
                element: selectedElement,
                bounds,
                location: new Point(location.x, location.y),
            });
        }

        return entries;
    }

    private getBoundsForMovableEntries(entries: MovableSelectionEntry[]): Region | undefined {
        if (entries.length === 0) {
            return undefined;
        }

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const entry of entries) {
            minX = Math.min(minX, entry.bounds.x);
            minY = Math.min(minY, entry.bounds.y);
            maxX = Math.max(maxX, entry.bounds.x + entry.bounds.width);
            maxY = Math.max(maxY, entry.bounds.y + entry.bounds.height);
        }

        return new Region(minX, minY, maxX - minX, maxY - minY);
    }

    private moveElementToBoundPosition(
        host: DesignArrangementHost,
        element: ElementBase,
        currentBounds: Region,
        targetBoundsX: number,
        targetBoundsY: number,
    ): boolean {
        const currentLocation = element.getLocation() || currentBounds.location;
        const targetLocation = new Point(
            currentLocation.x + (targetBoundsX - currentBounds.x),
            currentLocation.y + (targetBoundsY - currentBounds.y),
        );

        if (
            Math.abs(targetLocation.x - currentLocation.x) <= EPSILON &&
            Math.abs(targetLocation.y - currentLocation.y) <= EPSILON
        ) {
            return false;
        }

        const nextSize = element.getSize() || currentBounds.size;
        const constrainedLocation = this.getConstrainedMoveLocation(host, element, targetLocation, nextSize);
        if (
            Math.abs(constrainedLocation.x - currentLocation.x) <= EPSILON &&
            Math.abs(constrainedLocation.y - currentLocation.y) <= EPSILON
        ) {
            return false;
        }

        element.setLocation(constrainedLocation);
        const newLocation = element.getLocation();
        if (newLocation) {
            host.onElementMoved(element, newLocation);
        }
        return true;
    }

    private finalizeSelectionLayoutChange(host: DesignArrangementHost, changed: boolean): void {
        if (!changed) {
            return;
        }

        host.onModelUpdated();
        host.commitUndoSnapshot();
        host.drawIfNeeded();
    }

    private getConstrainedMoveLocation(host: DesignArrangementHost, element: ElementBase, location: Point, size: Size): Point {
        if (!element.model) {
            return location;
        }

        let newX = location.x;
        let newY = location.y;
        if (host.constrainToBounds) {
            const modelSize = element.model.getSize();
            if (!modelSize) {
                return location;
            }
            if (newX < 0) {
                newX = 0;
            }
            else if (newX + size.width > modelSize.width) {
                newX = modelSize.width - size.width;
            }
            if (newY < 0) {
                newY = 0;
            }
            else if (newY + size.height > modelSize.height) {
                newY = modelSize.height - size.height;
            }
        }

        return new Point(newX, newY);
    }

    private getReferenceResizeSize(selectedElements: ElementBase[]): Size | undefined {
        for (const selectedElement of selectedElements) {
            if (!selectedElement.canResize()) {
                continue;
            }

            const size = selectedElement.getSize();
            if (size) {
                return new Size(size.width, size.height);
            }

            const bounds = selectedElement.getBounds();
            if (bounds) {
                return new Size(bounds.width, bounds.height);
            }
        }

        return undefined;
    }

    private resizeSelectedElements(host: DesignArrangementHost, targetWidth?: number, targetHeight?: number): void {
        let changed = false;

        for (const selectedElement of host.selectedElements) {
            if (!selectedElement.canResize()) {
                continue;
            }

            const bounds = selectedElement.getBounds();
            if (!bounds) {
                continue;
            }

            const nextWidth = targetWidth ?? bounds.width;
            const nextHeight = targetHeight ?? bounds.height;
            if (nextWidth <= 0 || nextHeight <= 0) {
                continue;
            }

            const nextSize = this.getConstrainedResizeTarget(host, selectedElement, bounds.location, new Size(nextWidth, nextHeight));
            if (Math.abs(nextSize.width - bounds.width) <= EPSILON && Math.abs(nextSize.height - bounds.height) <= EPSILON) {
                continue;
            }

            selectedElement.setSize(nextSize);
            host.onElementSized(selectedElement, nextSize);
            host.setElementResizeSize(selectedElement, nextSize, bounds.location);
            changed = true;
        }

        if (changed) {
            host.onModelUpdated();
            host.commitUndoSnapshot();
            host.drawIfNeeded();
        }
    }

    private getConstrainedResizeTarget(host: DesignArrangementHost, element: ElementBase, location: Point, size: Size): Size {
        let newWidth = size.width;
        let newHeight = size.height;

        if (host.constrainToBounds && element.model) {
            const modelSize = element.model.getSize();
            if (modelSize) {
                if (location.x + newWidth > modelSize.width) {
                    newWidth = modelSize.width - location.x;
                }
                if (location.y + newHeight > modelSize.height) {
                    newHeight = modelSize.height - location.y;
                }
            }
        }

        return new Size(Math.max(newWidth, host.minElementSize.width), Math.max(newHeight, host.minElementSize.height));
    }

    private elementsMatchOrder(left: ElementBase[], right: ElementBase[]): boolean {
        if (left.length !== right.length) {
            return false;
        }
        for (let index = 0; index < left.length; index++) {
            if (left[index] !== right[index]) {
                return false;
            }
        }
        return true;
    }
}
