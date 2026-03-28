import { Model } from '../../core/model';
import { DesignClipboardService } from '../../design/design-clipboard-service';
import { RectangleElement } from '../../elements/rectangle-element';

function createModel(...rectangles: RectangleElement[]) {
    const model = Model.create(200, 200);
    rectangles.forEach((rectangle) => model.add(rectangle.setInteractive(true)));
    jest.spyOn(model, 'prepareResources').mockImplementation((_localeId?: string, callback?: (result: boolean) => void) => {
        callback?.(true);
    });
    return model;
}

describe('DesignClipboardService', () => {
    test('exportSelectionClipboardData preserves model ordering for the selected elements', () => {
        const service = new DesignClipboardService();
        const model = createModel(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );

        const payload = service.exportSelectionClipboardData(model, [model.elements[1], model.elements[0]]);

        expect(payload).toBeDefined();

        const clipboardModel = Model.parse(JSON.stringify({
            type: 'model',
            size: model.size || '1,1',
            resources: payload?.resources || [],
            elements: payload?.elements || [],
        }));

        expect(clipboardModel.elements).toHaveLength(2);
        expect(clipboardModel.elements[0].getBounds()?.x).toBe(10);
        expect(clipboardModel.elements[0].getBounds()?.y).toBe(10);
        expect(clipboardModel.elements[1].getBounds()?.x).toBe(40);
        expect(clipboardModel.elements[1].getBounds()?.y).toBe(30);
    });

    test('pasteClipboardData adds interactive elements, applies offsets, and notifies callbacks', () => {
        const service = new DesignClipboardService();
        const sourceModel = createModel(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );
        const targetModel = createModel();
        const onElementAdded = jest.fn();
        const onResourcesPrepared = jest.fn();

        const text = service.exportSelectionClipboardText(sourceModel, sourceModel.elements);
        const pastedElements = service.pasteClipboardData(text!, {
            model: targetModel,
            onElementAdded,
            onResourcesPrepared,
        }, 4, 6);

        expect(pastedElements).toHaveLength(2);
        expect(targetModel.elements).toHaveLength(2);
        expect(targetModel.elements[0].getBounds()?.x).toBe(14);
        expect(targetModel.elements[0].getBounds()?.y).toBe(16);
        expect(targetModel.elements[1].getBounds()?.x).toBe(44);
        expect(targetModel.elements[1].getBounds()?.y).toBe(36);
        expect(targetModel.elements[0].interactive).toBe(true);
        expect(targetModel.elements[1].interactive).toBe(true);
        expect(onElementAdded).toHaveBeenCalledTimes(2);
        expect(onResourcesPrepared).toHaveBeenCalledTimes(1);
    });

    test('copySelectionToClipboard and pasteFromClipboard use incremental paste offsets', async () => {
        const service = new DesignClipboardService();
        const sourceModel = createModel(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );
        const targetModel = createModel();

        expect(service.copySelectionToClipboard(sourceModel, sourceModel.elements)).toBe(true);

        const firstPaste = await service.pasteFromClipboard({ model: targetModel });
        const secondPaste = await service.pasteFromClipboard({ model: targetModel });

        expect(firstPaste).toHaveLength(2);
        expect(secondPaste).toHaveLength(2);
        expect(targetModel.elements).toHaveLength(4);
        expect(targetModel.elements[0].getBounds()?.x).toBe(20);
        expect(targetModel.elements[0].getBounds()?.y).toBe(20);
        expect(targetModel.elements[1].getBounds()?.x).toBe(50);
        expect(targetModel.elements[1].getBounds()?.y).toBe(40);
        expect(targetModel.elements[2].getBounds()?.x).toBe(30);
        expect(targetModel.elements[2].getBounds()?.y).toBe(30);
        expect(targetModel.elements[3].getBounds()?.x).toBe(60);
        expect(targetModel.elements[3].getBounds()?.y).toBe(50);
    });
});
