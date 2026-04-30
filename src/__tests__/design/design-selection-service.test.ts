import { Model } from '../../core/model';
import { RectangleElement } from '../../elements/rectangle-element';
import { DesignSelectionService, type DesignSelectionHost } from '../../design/design-selection-service';

function createHost() {
    const model = Model.create(100, 100);
    const editable = RectangleElement.create(5, 5, 20, 10).setInteractive(true);
    const plain = RectangleElement.create(30, 10, 15, 12).setInteractive(true);
    const lockedOut = RectangleElement.create(60, 20, 18, 14);
    model.add(editable);
    model.add(plain);
    model.add(lockedOut);

    const host: DesignSelectionHost = {
        model,
        selectedElements: [],
        onSelectionChanged: jest.fn(),
    };

    return { host, editable, plain, lockedOut };
}

describe('DesignSelectionService', () => {
    test('clearSelections clears edit-point state and notifies once', () => {
        const service = new DesignSelectionService();
        const { host, editable, plain } = createHost();
        editable.editPoints = true;
        host.selectedElements = [editable, plain];

        service.clearSelections(host);

        expect(host.selectedElements).toEqual([]);
        expect(editable.editPoints).toBe(false);
        expect(host.onSelectionChanged).toHaveBeenCalledTimes(1);
    });

    test('toggleSelected cycles editable elements through selected, edit-points, and deselected states', () => {
        const service = new DesignSelectionService();
        const { host, editable } = createHost();
        host.selectedElements = [editable];

        service.toggleSelected(host, editable);

        expect(host.selectedElements).toEqual([editable]);
        expect(editable.editPoints).toBe(true);

        service.toggleSelected(host, editable);

        expect(host.selectedElements).toEqual([]);
        expect(editable.editPoints).toBe(false);
        expect(host.onSelectionChanged).toHaveBeenCalledTimes(2);
    });

    test('deselectElement removes the element, clears edit points, and notifies', () => {
        const service = new DesignSelectionService();
        const { host, editable, plain } = createHost();
        editable.editPoints = true;
        host.selectedElements = [editable, plain];

        service.deselectElement(host, editable);

        expect(host.selectedElements).toEqual([plain]);
        expect(editable.editPoints).toBe(false);
        expect(host.onSelectionChanged).toHaveBeenCalledTimes(1);
    });

    test('selectAll keeps only interactive elements', () => {
        const service = new DesignSelectionService();
        const { host, editable, plain, lockedOut } = createHost();
        host.selectedElements = [lockedOut];

        service.selectAll(host);

        expect(host.selectedElements).toEqual([editable, plain]);
        expect(host.onSelectionChanged).toHaveBeenCalledTimes(1);
    });

    test('selectElements adds only new selections and preserves order', () => {
        const service = new DesignSelectionService();
        const { host, editable, plain } = createHost();
        host.selectedElements = [editable];

        service.selectElements(host, [editable, plain]);

        expect(host.selectedElements).toEqual([editable, plain]);
        expect(host.onSelectionChanged).toHaveBeenCalledTimes(1);
    });

    test('getSelectionSummary reports layer order, selection state, and capabilities', () => {
        const service = new DesignSelectionService();
        const { host, editable, plain } = createHost();
        editable.id = 'editable-rect';
        host.selectedElements = [plain, editable];

        const summary = service.getSelectionSummary(host);

        expect(summary.totalElements).toBe(3);
        expect(summary.selectedCount).toBe(2);
        expect(summary.lowestSelectedIndex).toBe(0);
        expect(summary.highestSelectedIndex).toBe(1);
        expect(summary.movableSelectedCount).toBe(2);
        expect(summary.resizeableSelectedCount).toBe(2);
        expect(summary.layers.map((layer) => layer.element)).toEqual(host.model!.elements);
        expect(summary.layers[0].element).toBe(editable);
        expect(summary.layers[0].index).toBe(0);
        expect(summary.layers[0].layerNumber).toBe(3);
        expect(summary.layers[0].type).toBe('rectangle');
        expect(summary.layers[0].id).toBe('editable-rect');
        expect(summary.layers[0].selected).toBe(true);
        expect(summary.layers[0].interactive).toBe(true);
        expect(summary.layers[0].canMove).toBe(true);
        expect(summary.layers[0].canResize).toBe(true);
        expect(summary.layers[0].bounds?.x).toBe(5);
        expect(summary.layers[0].bounds?.y).toBe(5);
        expect(summary.layers[2].selected).toBe(false);
        expect(summary.layers[2].interactive).toBe(false);
        expect(summary.selectedLayers.map((layer) => layer.element)).toEqual([editable, plain]);
    });
});