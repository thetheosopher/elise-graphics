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
});