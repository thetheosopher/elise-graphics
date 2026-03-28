import { ElementBase } from '../elements/element-base';

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
}