import { ErrorMessages } from '../core/error-messages';
import { Matrix2D } from '../core/matrix-2d';
import { Model } from '../core/model';
import { Point } from '../core/point';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { Utility } from '../core/utility';
import { ElementBase } from '../elements/element-base';
import { ModelElement } from '../elements/model-element';
import { ModelResource } from '../resource/model-resource';

interface MovableSelectionEntry {
    element: ElementBase;
    bounds: Region;
    location: Point;
}

export interface DesignArrangementHost {
    model?: Model;
    selectedElements: ElementBase[];
    constrainToBounds: boolean;
    minElementSize: Size;
    onElementAdded(element: ElementBase): void;
    onElementRemoved(element: ElementBase): void;
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
const GROUP_RESOURCE_KEY_PREFIX = 'elise-group-';

export class DesignArrangementService {
    public canGroupSelected(host: DesignArrangementHost): boolean {
        return this.getOrderedSelectedEntries(host).length > 1;
    }

    public groupSelected(host: DesignArrangementHost): ModelElement | undefined {
        if (!host.model) {
            return undefined;
        }

        const selectedEntries = this.getOrderedSelectedEntries(host);
        if (selectedEntries.length < 2) {
            return undefined;
        }

        const bounds = this.getBoundsForElements(selectedEntries.map((entry) => entry.element));
        if (!bounds) {
            return undefined;
        }

        const groupSize = this.createGroupSize(bounds, host.minElementSize);
        const groupModel = Model.create(groupSize.width, groupSize.height);
        const groupedElements = selectedEntries.map((entry) => this.createGroupedElementClone(entry.element, bounds));
        groupedElements.forEach((element) => groupModel.add(element));
        this.copyReferencedResources(host.model, groupModel, groupedElements);

        const resourceKey = this.createGroupResourceKey(host.model);
        host.model.resourceManager.add(ModelResource.create(resourceKey, groupModel));

        const groupedElement = ModelElement.create(resourceKey, bounds.x, bounds.y, groupSize.width, groupSize.height);
        groupedElement.setInteractive(true);
        this.replaceElementsWithElement(host, selectedEntries, groupedElement);

        host.onModelUpdated();
        host.commitUndoSnapshot();
        host.selectedElements = [groupedElement];
        host.onSelectionChanged();
        host.drawIfNeeded();
        return groupedElement;
    }

    public canUngroupSelected(host: DesignArrangementHost): boolean {
        return this.getUngroupableSelectedEntries(host).length > 0;
    }

    public ungroupSelected(host: DesignArrangementHost): ElementBase[] {
        if (!host.model) {
            return [];
        }

        const ungroupEntries = this.getUngroupableSelectedEntries(host);
        if (ungroupEntries.length === 0) {
            return [];
        }

        const replacements = ungroupEntries.map((entry) => {
            const elements = this.createUngroupedElementClones(entry.element, entry.sourceModel);
            this.copyReferencedResources(entry.sourceModel, host.model!, elements);
            return {
                index: entry.index,
                element: entry.element,
                elements,
            };
        });

        for (let index = replacements.length - 1; index >= 0; index--) {
            const replacement = replacements[index];
            const removedIndex = host.model.remove(replacement.element);
            if (removedIndex === -1) {
                continue;
            }

            host.onElementRemoved(replacement.element);
            this.insertElementsAt(host.model, replacement.index, replacement.elements);
            replacement.elements.forEach((element) => host.onElementAdded(element));
        }

        const ungroupedElements = replacements.flatMap((replacement) => replacement.elements);
        host.onModelUpdated();
        host.commitUndoSnapshot();
        host.selectedElements = ungroupedElements;
        host.onSelectionChanged();
        host.drawIfNeeded();
        return ungroupedElements;
    }

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

    private getOrderedSelectedEntries(host: DesignArrangementHost): Array<{ element: ElementBase; index: number }> {
        if (!host.model || host.selectedElements.length === 0) {
            return [];
        }

        const selectedElementSet = new Set(host.selectedElements);
        const entries: Array<{ element: ElementBase; index: number }> = [];
        host.model.elements.forEach((element, index) => {
            if (selectedElementSet.has(element)) {
                entries.push({ element, index });
            }
        });
        return entries;
    }

    private getUngroupableSelectedEntries(host: DesignArrangementHost): Array<{ element: ModelElement; index: number; sourceModel: Model }> {
        if (!host.model) {
            return [];
        }

        const entries: Array<{ element: ModelElement; index: number; sourceModel: Model }> = [];
        for (const entry of this.getOrderedSelectedEntries(host)) {
            if (!(entry.element instanceof ModelElement)) {
                continue;
            }

            const sourceModel = this.resolveModelElementModel(host.model, entry.element);
            if (sourceModel) {
                entries.push({ element: entry.element, index: entry.index, sourceModel });
            }
        }
        return entries;
    }

    private getBoundsForElements(elements: ElementBase[]): Region | undefined {
        let bounds: Region | undefined;
        for (const element of elements) {
            const elementBounds = this.getVisualBounds(element);
            if (!elementBounds) {
                continue;
            }

            if (!bounds) {
                bounds = elementBounds;
                continue;
            }

            const minX = Math.min(bounds.x, elementBounds.x);
            const minY = Math.min(bounds.y, elementBounds.y);
            const maxX = Math.max(bounds.x + bounds.width, elementBounds.x + elementBounds.width);
            const maxY = Math.max(bounds.y + bounds.height, elementBounds.y + elementBounds.height);
            bounds = new Region(minX, minY, maxX - minX, maxY - minY);
        }
        return bounds;
    }

    private getVisualBounds(element: ElementBase): Region | undefined {
        const bounds = element.getBounds();
        if (!bounds || !element.transform) {
            return bounds;
        }

        const location = element.getLocation() || bounds.location;
        const size = element.getSize() || bounds.size;
        return this.getTransformedAABB(location, size, element.transform);
    }

    private getTransformedAABB(location: Point, size: Size, transform: string): Region {
        const matrix = Matrix2D.fromTransformString(transform, location);
        const corners = [
            matrix.transformPoint(new Point(location.x, location.y)),
            matrix.transformPoint(new Point(location.x + size.width, location.y)),
            matrix.transformPoint(new Point(location.x + size.width, location.y + size.height)),
            matrix.transformPoint(new Point(location.x, location.y + size.height)),
        ];

        let minX = corners[0].x;
        let minY = corners[0].y;
        let maxX = corners[0].x;
        let maxY = corners[0].y;
        for (let index = 1; index < corners.length; index++) {
            minX = Math.min(minX, corners[index].x);
            minY = Math.min(minY, corners[index].y);
            maxX = Math.max(maxX, corners[index].x);
            maxY = Math.max(maxY, corners[index].y);
        }

        return new Region(minX, minY, maxX - minX, maxY - minY);
    }

    private createGroupSize(bounds: Region, minElementSize: Size): Size {
        return new Size(
            Math.max(bounds.width, minElementSize.width, EPSILON),
            Math.max(bounds.height, minElementSize.height, EPSILON),
        );
    }

    private createGroupedElementClone(element: ElementBase, groupBounds: Region): ElementBase {
        const clone = this.cloneElement(element);
        clone.translate(-groupBounds.x, -groupBounds.y);
        clone.editPoints = false;
        clone.setInteractive(false);
        return clone;
    }

    private cloneElement(element: ElementBase): ElementBase {
        const clone = element.clone();
        if (element instanceof ModelElement && clone instanceof ModelElement && element.sourceModel) {
            const sourceModel = element.sourceModel as Model;
            clone.sourceModel = typeof sourceModel.clone === 'function' ? sourceModel.clone() : sourceModel;
        }
        return clone;
    }

    private copyReferencedResources(sourceModel: Model, targetModel: Model, elements: ElementBase[]): void {
        const referencedKeys = new Set<string>();
        elements.forEach((element) => {
            element.getResourceKeys().forEach((key) => referencedKeys.add(key));
        });

        sourceModel.resources.forEach((resource) => {
            if (resource.key && referencedKeys.has(resource.key)) {
                targetModel.resourceManager.merge(resource.clone());
            }
        });
    }

    private createGroupResourceKey(model: Model): string {
        let key = GROUP_RESOURCE_KEY_PREFIX + Utility.guid();
        while (model.resources.some((resource) => resource.key === key)) {
            key = GROUP_RESOURCE_KEY_PREFIX + Utility.guid();
        }
        return key;
    }

    private replaceElementsWithElement(
        host: DesignArrangementHost,
        entries: Array<{ element: ElementBase; index: number }>,
        replacement: ElementBase,
    ): void {
        if (!host.model || entries.length === 0) {
            return;
        }

        const insertionIndex = entries[0].index;
        for (let index = entries.length - 1; index >= 0; index--) {
            const removedIndex = host.model.remove(entries[index].element);
            if (removedIndex !== -1) {
                host.onElementRemoved(entries[index].element);
            }
        }

        this.insertElementAt(host.model, insertionIndex, replacement);
        host.onElementAdded(replacement);
    }

    private insertElementAt(model: Model, index: number, element: ElementBase): void {
        element.model = model;
        element.parent = model;
        model.elements.splice(index, 0, element);
    }

    private insertElementsAt(model: Model, index: number, elements: ElementBase[]): void {
        elements.forEach((element, offset) => this.insertElementAt(model, index + offset, element));
    }

    private resolveModelElementModel(model: Model, element: ModelElement): Model | undefined {
        if (element.sourceModel) {
            const sourceModel = element.sourceModel as Model;
            return Array.isArray(sourceModel.elements) ? sourceModel : undefined;
        }

        if (!element.source) {
            return undefined;
        }

        const resource = model.resourceManager.get(element.source) as ModelResource | undefined;
        return resource && resource.model ? resource.model : undefined;
    }

    private createUngroupedElementClones(element: ModelElement, sourceModel: Model): ElementBase[] {
        const location = element.getLocation();
        if (!location) {
            return [];
        }

        const sourceSize = sourceModel.getSize();
        const requestedSize = element.getSize();
        let scaleX = 1;
        let scaleY = 1;
        if (sourceSize && requestedSize && sourceSize.width > 0 && sourceSize.height > 0) {
            scaleX = requestedSize.width / sourceSize.width;
            scaleY = requestedSize.height / sourceSize.height;
        }

        const useTransformMatrix = !!element.transform || !!sourceModel.transform;
        const transformMatrix = useTransformMatrix
            ? this.createModelElementRenderMatrix(element, sourceModel, location, scaleX, scaleY)
            : undefined;

        return sourceModel.elements.map((sourceElement) => {
            const clone = this.cloneElement(sourceElement);
            clone.editPoints = false;
            clone.setInteractive(true);

            if (transformMatrix) {
                this.applyRenderMatrixToElement(clone, transformMatrix);
            }
            else {
                if (scaleX !== 1 || scaleY !== 1) {
                    clone.scale(scaleX, scaleY);
                }
                clone.translate(location.x, location.y);
            }
            return clone;
        });
    }

    private createModelElementRenderMatrix(
        element: ModelElement,
        sourceModel: Model,
        location: Point,
        scaleX: number,
        scaleY: number,
    ): Matrix2D {
        const matrix = element.transform
            ? this.cloneMatrix(Matrix2D.fromTransformString(element.transform, location))
            : this.identityMatrix();

        matrix.translate(location.x, location.y);
        if (scaleX !== 1 || scaleY !== 1) {
            matrix.scale(scaleX, scaleY);
        }

        if (sourceModel.transform) {
            const sourceLocation = sourceModel.getLocation() || Point.Origin;
            return this.combineMatrices(matrix, Matrix2D.fromTransformString(sourceModel.transform, sourceLocation));
        }

        return matrix;
    }

    private applyRenderMatrixToElement(element: ElementBase, renderMatrix: Matrix2D): void {
        const bounds = element.getBounds();
        const origin = element.getLocation() || bounds?.location || Point.Origin;
        const existingTransform = element.transform
            ? Matrix2D.fromTransformString(element.transform, origin)
            : this.identityMatrix();
        const combinedRenderMatrix = this.combineMatrices(renderMatrix, existingTransform);
        const relativeMatrix = this.combineMatrices(
            this.combineMatrices(this.translationMatrix(-origin.x, -origin.y), combinedRenderMatrix),
            this.translationMatrix(origin.x, origin.y),
        );
        element.transform = this.formatMatrixTransform(relativeMatrix);
    }

    private identityMatrix(): Matrix2D {
        return new Matrix2D(1, 0, 0, 1, 0, 0);
    }

    private translationMatrix(x: number, y: number): Matrix2D {
        return new Matrix2D(1, 0, 0, 1, x, y);
    }

    private cloneMatrix(matrix: Matrix2D): Matrix2D {
        return new Matrix2D(matrix.m11, matrix.m12, matrix.m21, matrix.m22, matrix.offsetX, matrix.offsetY);
    }

    private combineMatrices(left: Matrix2D, right: Matrix2D): Matrix2D {
        return Matrix2D.multiply(right, left);
    }

    private formatMatrixTransform(matrix: Matrix2D): string {
        return 'matrix(' + [
            matrix.m11,
            matrix.m12,
            matrix.m21,
            matrix.m22,
            matrix.offsetX,
            matrix.offsetY,
        ].map((value) => this.formatMatrixNumber(value)).join(',') + ')';
    }

    private formatMatrixNumber(value: number): string {
        if (Math.abs(value) <= EPSILON) {
            return '0';
        }
        return Number(value.toFixed(12)).toString();
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
