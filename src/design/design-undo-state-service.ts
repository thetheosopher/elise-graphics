import { Model } from '../core/model';
import { Point } from '../core/point';
import { Size } from '../core/size';
import { ElementBase } from '../elements/element-base';
import type { Handle } from './handle';
import type { DesignUndoSnapshot, UndoSelectionState } from './design-undo-service';

export interface DesignUndoStateHost {
    model?: Model;
    selectedElements: ElementBase[];
    isDirty: boolean;
    restoringUndoState: boolean;
    pendingToolHistoryBaseline?: string;
    isMouseDown: boolean;
    isMoving: boolean;
    isResizing: boolean;
    isRotating: boolean;
    isMovingPivot: boolean;
    isMovingPoint: boolean;
    isMovingCornerRadius: boolean;
    mouseDownPosition?: Point;
    currentWidth?: number;
    currentHeight?: number;
    rotationCenter?: Point;
    originalPivotCenter?: Point;
    originalTransform?: string;
    movingPointIndex?: number;
    movingPointLocation?: Point;
    sizeHandles?: Handle[];
    setSelectedElements(value: ElementBase[]): void;
    setIsDirty(value: boolean): void;
    triggerModelUpdated(): void;
    invalidate(): void;
    drawIfNeeded(): void;
    onSelectionChanged(): void;
    clearElementMoveLocations(): void;
    clearElementResizeSizes(): void;
}

export class DesignUndoStateService {
    public createUndoSnapshot(host: DesignUndoStateHost): DesignUndoSnapshot {
        if (!host.model) {
            throw new Error('Model is undefined.');
        }

        const model = host.model;

        const clone = this.cloneModelForUndo(model);
        const selectedElements = host.selectedElements
            .map((element) => this.createSelectionState(model, element))
            .filter((value): value is UndoSelectionState => value !== undefined);

        return {
            model: clone,
            selectedElements,
            isDirty: host.isDirty,
            signature: this.buildUndoSignature(clone, selectedElements, host.isDirty),
        };
    }

    public applyUndoSnapshot(host: DesignUndoStateHost, snapshot: DesignUndoSnapshot): void {
        if (!host.model) {
            return;
        }

        host.restoringUndoState = true;
        try {
            const restoredModel = this.cloneModelForUndo(snapshot.model);
            this.restoreModelState(host.model, restoredModel);
            this.restoreSelectionState(host, snapshot.selectedElements);
            this.resetTransientInteractionState(host);
            host.setIsDirty(snapshot.isDirty);
            host.triggerModelUpdated();
            host.invalidate();
            host.drawIfNeeded();
        }
        finally {
            host.restoringUndoState = false;
        }
    }

    public buildModelStateSignature(model: Model): string {
        const interactiveSignature = model.elements
            .map((element, index) => `${index}:${element.interactive ? 1 : 0}:${element.editPoints ? 1 : 0}`)
            .join('|');
        return `${model.rawJSON()}::${interactiveSignature}`;
    }

    private createSelectionState(model: Model, element: ElementBase): UndoSelectionState | undefined {
        const index = model.elements.indexOf(element);
        if (index === -1) {
            return undefined;
        }

        return {
            id: element.id,
            index,
            editPoints: !!element.editPoints,
        };
    }

    private buildUndoSignature(model: Model, selectedElements: UndoSelectionState[], isDirty: boolean): string {
        const selectionSignature = selectedElements
            .map((selection) => `${selection.id ?? ''}@${selection.index}:${selection.editPoints ? 1 : 0}`)
            .join('|');
        return `${this.buildModelStateSignature(model)}::${isDirty ? 1 : 0}::${selectionSignature}`;
    }

    private cloneModelForUndo(model: Model): Model {
        const clone = model.clone();
        clone.basePath = model.basePath;
        clone.modelPath = model.modelPath;
        clone.displayFPS = model.displayFPS;
        clone.resourceManager.localResourcePath = model.resourceManager.localResourcePath;
        clone.resourceManager.currentLocaleId = model.resourceManager.currentLocaleId;
        clone.resourceManager.urlProxy = model.resourceManager.urlProxy;
        clone.resources.forEach((resource) => {
            resource.resourceManager = clone.resourceManager;
        });
        clone.elements.forEach((element, index) => {
            const source = model.elements[index];
            if (source) {
                element.interactive = source.interactive;
                element.editPoints = source.editPoints;
            }
            element.model = clone;
        });
        return clone;
    }

    private restoreModelState(target: Model, source: Model): void {
        target.type = source.type;
        target.id = source.id;
        target.sizeValue = source.sizeValue ? Size.parse(source.sizeValue) : undefined;
        target.locationValue = source.locationValue ? Point.parse(source.locationValue) : undefined;
        target.locked = source.locked;
        target.aspectLocked = source.aspectLocked;
        target.fill = this.cloneFillValue(source.fill);
        target.fillScale = source.fillScale;
        target.fillOffsetX = source.fillOffsetX;
        target.fillOffsetY = source.fillOffsetY;
        target.stroke = source.stroke;
        target.opacity = source.opacity;
        target.transform = source.transform;
        target.clipPath = source.clipPath
            ? {
                  commands: source.clipPath.commands.slice(),
                  winding: source.clipPath.winding,
                  transform: source.clipPath.transform,
                  units: source.clipPath.units,
              }
            : undefined;
        target.mouseDown = source.mouseDown;
        target.mouseUp = source.mouseUp;
        target.mouseEnter = source.mouseEnter;
        target.mouseLeave = source.mouseLeave;
        target.click = source.click;
        target.basePath = source.basePath;
        target.modelPath = source.modelPath;
        target.displayFPS = source.displayFPS;
        target.resources = source.resources;
        target.elements = source.elements;
        target.resourceManager.model = target;
        target.resourceManager.localResourcePath = source.resourceManager.localResourcePath;
        target.resourceManager.currentLocaleId = source.resourceManager.currentLocaleId;
        target.resourceManager.urlProxy = source.resourceManager.urlProxy;
        target.resourceManager.pendingResources = [];
        target.resourceManager.pendingResourceCount = 0;
        target.resourceManager.totalResourceCount = target.resources.length;
        target.resourceManager.numberLoaded = 0;
        target.resourceManager.resourceFailed = false;
        target.resourceManager.completionCallback = undefined;
        target.resources.forEach((resource) => {
            resource.resourceManager = target.resourceManager;
        });
        target.elements.forEach((element) => {
            element.model = target;
        });
    }

    private cloneFillValue(fill: ElementBase['fill']): ElementBase['fill'] {
        if (!fill || typeof fill === 'string') {
            return fill;
        }

        if ('clone' in fill && typeof fill.clone === 'function') {
            return fill.clone();
        }

        return fill;
    }

    private restoreSelectionState(host: DesignUndoStateHost, selectionStates: UndoSelectionState[]): void {
        if (!host.model) {
            return;
        }

        const selectedElements: ElementBase[] = [];
        host.model.elements.forEach((element) => {
            element.editPoints = false;
        });

        selectionStates.forEach((selection) => {
            let element: ElementBase | undefined;
            if (selection.id) {
                element = host.model?.elements.find((candidate) => candidate.id === selection.id);
            }
            if (!element) {
                element = host.model?.elements[selection.index];
            }
            if (element && selectedElements.indexOf(element) === -1) {
                element.editPoints = selection.editPoints;
                selectedElements.push(element);
            }
        });

        host.setSelectedElements(selectedElements);
        host.onSelectionChanged();
    }

    private resetTransientInteractionState(host: DesignUndoStateHost): void {
        host.isMouseDown = false;
        host.isMoving = false;
        host.isResizing = false;
        host.isRotating = false;
        host.isMovingPivot = false;
        host.isMovingPoint = false;
        host.isMovingCornerRadius = false;
        host.mouseDownPosition = undefined;
        host.currentWidth = 0;
        host.currentHeight = 0;
        host.rotationCenter = undefined;
        host.originalPivotCenter = undefined;
        host.originalTransform = undefined;
        host.movingPointIndex = undefined;
        host.movingPointLocation = undefined;
        host.sizeHandles = undefined;
        host.clearElementMoveLocations();
        host.clearElementResizeSizes();
        host.pendingToolHistoryBaseline = undefined;
    }
}