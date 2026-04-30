import type { Region } from '../core/region';
import { ElementBase } from '../elements/element-base';

export interface DesignLayerSummary {
    element: ElementBase;
    index: number;
    layerNumber: number;
    type: string;
    id?: string;
    description: string;
    selected: boolean;
    interactive: boolean;
    canMove: boolean;
    canResize: boolean;
    canFill: boolean;
    canStroke: boolean;
    bounds?: Region;
}

export interface DesignSelectionSummary {
    totalElements: number;
    selectedCount: number;
    selectedLayers: DesignLayerSummary[];
    layers: DesignLayerSummary[];
    movableSelectedCount: number;
    resizeableSelectedCount: number;
    lowestSelectedIndex?: number;
    highestSelectedIndex?: number;
}

export interface DesignSelectionHost {
    model?: {
        elements: ElementBase[];
    };
    selectedElements: ElementBase[];
    onSelectionChanged(): void;
}

export class DesignSelectionService {
    public clearSelections(host: DesignSelectionHost): void {
        if (host.selectedElements.length === 0) {
            return;
        }

        host.selectedElements.forEach((element) => {
            if (element.canEditPoints()) {
                element.editPoints = false;
            }
        });
        host.selectedElements = [];
        host.onSelectionChanged();
    }

    public isSelected(host: DesignSelectionHost, element: ElementBase): boolean {
        return host.selectedElements.indexOf(element) !== -1;
    }

    public selectElement(host: DesignSelectionHost, element: ElementBase): void {
        if (this.isSelected(host, element)) {
            return;
        }

        host.selectedElements.push(element);
        host.onSelectionChanged();
    }

    public deselectElement(host: DesignSelectionHost, element: ElementBase): void {
        const index = host.selectedElements.indexOf(element);
        if (index === -1) {
            return;
        }

        host.selectedElements.splice(index, 1);
        if (element.canEditPoints()) {
            element.editPoints = false;
        }
        host.onSelectionChanged();
    }

    public toggleSelected(host: DesignSelectionHost, element: ElementBase): void {
        const index = host.selectedElements.indexOf(element);
        if (index !== -1) {
            if (element.canEditPoints()) {
                if (!element.editPoints) {
                    element.editPoints = true;
                }
                else {
                    element.editPoints = false;
                    host.selectedElements.splice(index, 1);
                }
            }
            else {
                host.selectedElements.splice(index, 1);
            }
        }
        else {
            host.selectedElements.push(element);
        }
        host.onSelectionChanged();
    }

    public selectAll(host: DesignSelectionHost): void {
        host.selectedElements = [];
        if (host.model) {
            host.model.elements.forEach((element) => {
                if (element.interactive) {
                    host.selectedElements.push(element);
                }
            });
        }
        host.onSelectionChanged();
    }

    public selectElements(host: DesignSelectionHost, elements: ElementBase[]): void {
        if (!elements) {
            return;
        }

        for (const element of elements) {
            this.selectElement(host, element);
        }
    }

    public getSelectionSummary(host: DesignSelectionHost): DesignSelectionSummary {
        const elements = host.model?.elements ?? [];
        const layers = elements.map((element, index) => this.createLayerSummary(host, element, index, elements.length));
        const selectedLayers = layers.filter((layer) => layer.selected);
        const selectedIndexes = selectedLayers.map((layer) => layer.index);

        return {
            totalElements: elements.length,
            selectedCount: selectedLayers.length,
            selectedLayers,
            layers,
            movableSelectedCount: selectedLayers.filter((layer) => layer.canMove).length,
            resizeableSelectedCount: selectedLayers.filter((layer) => layer.canResize).length,
            lowestSelectedIndex: selectedIndexes.length > 0 ? Math.min(...selectedIndexes) : undefined,
            highestSelectedIndex: selectedIndexes.length > 0 ? Math.max(...selectedIndexes) : undefined,
        };
    }

    private createLayerSummary(
        host: DesignSelectionHost,
        element: ElementBase,
        index: number,
        totalElements: number,
    ): DesignLayerSummary {
        return {
            element,
            index,
            layerNumber: totalElements - index,
            type: element.type,
            id: element.id,
            description: element.describe(),
            selected: this.isSelected(host, element),
            interactive: element.interactive !== false,
            canMove: element.canMove(),
            canResize: element.canResize(),
            canFill: element.canFill(),
            canStroke: element.canStroke(),
            bounds: element.getBounds(),
        };
    }
}