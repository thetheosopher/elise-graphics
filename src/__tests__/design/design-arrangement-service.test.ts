import { Model } from '../../core/model';
import { DesignArrangementService, type DesignArrangementHost } from '../../design/design-arrangement-service';
import { ModelElement } from '../../elements/model-element';
import { RectangleElement } from '../../elements/rectangle-element';
import { BitmapResource } from '../../resource/bitmap-resource';
import { ModelResource } from '../../resource/model-resource';
import { Size } from '../../core/size';

function createHost(...rectangles: RectangleElement[]) {
    const model = Model.create(200, 200);
    rectangles.forEach((rectangle) => model.add(rectangle.setInteractive(true)));
    const onElementAdded = jest.fn();
    const onElementRemoved = jest.fn();
    const onElementMoved = jest.fn();
    const onElementSized = jest.fn();
    const onSelectionChanged = jest.fn();
    const onElementsReordered = jest.fn();
    const onModelUpdated = jest.fn();
    const commitUndoSnapshot = jest.fn();
    const drawIfNeeded = jest.fn();
    const setIsDirty = jest.fn();
    let selectedElements = model.elements.slice();

    const host: DesignArrangementHost = {
        model,
        get selectedElements() {
            return selectedElements;
        },
        set selectedElements(value) {
            selectedElements = value;
        },
        constrainToBounds: true,
        minElementSize: new Size(4, 4),
        onElementAdded,
        onElementRemoved,
        onElementMoved,
        onElementSized,
        onSelectionChanged,
        onElementsReordered,
        onModelUpdated,
        commitUndoSnapshot,
        drawIfNeeded,
        setIsDirty,
        setElementResizeSize: jest.fn(),
    };

    return {
        host,
        model,
        callbacks: {
            onElementAdded,
            onElementRemoved,
            onElementMoved,
            onElementSized,
            onSelectionChanged,
            onElementsReordered,
            onModelUpdated,
            commitUndoSnapshot,
            drawIfNeeded,
            setIsDirty,
        },
    };
}

describe('DesignArrangementService', () => {
    test('groupSelected replaces selected elements with a model element resource', () => {
        const service = new DesignArrangementService();
        const { host, model, callbacks } = createHost(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );
        host.selectedElements = [model.elements[1], model.elements[0]];

        expect(service.canGroupSelected(host)).toBe(true);

        const groupedElement = service.groupSelected(host);

        expect(groupedElement).toBeInstanceOf(ModelElement);
        expect(model.elements).toEqual([groupedElement]);
        expect(host.selectedElements).toEqual([groupedElement]);
        expect(groupedElement?.getBounds()).toMatchObject({ x: 10, y: 10, width: 55, height: 40 });

        const groupResource = model.resourceManager.get(groupedElement!.source!) as ModelResource;
        expect(groupResource.model?.elements).toHaveLength(2);
        expect(groupResource.model?.elements[0].getBounds()).toMatchObject({ x: 0, y: 0, width: 20, height: 15 });
        expect(groupResource.model?.elements[1].getBounds()).toMatchObject({ x: 30, y: 20, width: 25, height: 20 });
        expect(groupResource.model?.elements[0].interactive).toBe(false);
        expect(groupResource.model?.elements[1].interactive).toBe(false);
        expect(callbacks.onElementRemoved).toHaveBeenCalledTimes(2);
        expect(callbacks.onElementAdded).toHaveBeenCalledWith(groupedElement);
        expect(callbacks.onSelectionChanged).toHaveBeenCalledTimes(1);
        expect(callbacks.onModelUpdated).toHaveBeenCalledTimes(1);
        expect(callbacks.commitUndoSnapshot).toHaveBeenCalledTimes(1);
    });

    test('ungroupSelected replaces model elements with decomposed elements at host coordinates', () => {
        const service = new DesignArrangementService();
        const { host, model, callbacks } = createHost(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );

        const groupedElement = service.groupSelected(host)!;
        callbacks.onElementAdded.mockClear();
        callbacks.onElementRemoved.mockClear();
        callbacks.onSelectionChanged.mockClear();
        callbacks.onModelUpdated.mockClear();
        callbacks.commitUndoSnapshot.mockClear();
        host.selectedElements = [groupedElement];

        expect(service.canUngroupSelected(host)).toBe(true);

        const ungroupedElements = service.ungroupSelected(host);

        expect(ungroupedElements).toHaveLength(2);
        expect(model.elements).toEqual(ungroupedElements);
        expect(host.selectedElements).toEqual(ungroupedElements);
        expect(model.elements[0].getBounds()).toMatchObject({ x: 10, y: 10, width: 20, height: 15 });
        expect(model.elements[1].getBounds()).toMatchObject({ x: 40, y: 30, width: 25, height: 20 });
        expect(model.elements[0].interactive).toBe(true);
        expect(model.elements[1].interactive).toBe(true);
        expect(callbacks.onElementRemoved).toHaveBeenCalledWith(groupedElement);
        expect(callbacks.onElementAdded).toHaveBeenCalledTimes(2);
        expect(callbacks.onSelectionChanged).toHaveBeenCalledTimes(1);
        expect(callbacks.onModelUpdated).toHaveBeenCalledTimes(1);
        expect(callbacks.commitUndoSnapshot).toHaveBeenCalledTimes(1);
    });

    test('ungroupSelected merges resources referenced by decomposed model children', () => {
        const service = new DesignArrangementService();
        const sourceModel = Model.create(20, 20);
        sourceModel.add(RectangleElement.create(1, 2, 3, 4).setFill('image(hero)'));
        BitmapResource.create('hero', '/hero.png').addTo(sourceModel);

        const { host, model } = createHost();
        const modelElement = ModelElement.create('badge', 10, 10, 20, 20).setInteractive(true) as ModelElement;
        model.resourceManager.add(ModelResource.create('badge', sourceModel));
        model.add(modelElement);
        host.selectedElements = [modelElement];

        const ungroupedElements = service.ungroupSelected(host);

        expect(ungroupedElements).toHaveLength(1);
        expect(ungroupedElements[0].getBounds()).toMatchObject({ x: 11, y: 12, width: 3, height: 4 });
        expect(ungroupedElements[0].fill).toBe('image(hero)');
        expect(model.resourceManager.get('hero')?.uri).toBe('/hero.png');
    });

    test('duplicateSelected clones the current selection and updates selection state', () => {
        const service = new DesignArrangementService();
        const { host, model, callbacks } = createHost(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );

        service.duplicateSelected(host);

        expect(model.elements).toHaveLength(4);
        expect(host.selectedElements).toHaveLength(2);
        expect(host.selectedElements[0]).toBe(model.elements[2]);
        expect(host.selectedElements[1]).toBe(model.elements[3]);
        expect(callbacks.onElementAdded).toHaveBeenCalledTimes(2);
        expect(callbacks.onSelectionChanged).toHaveBeenCalledTimes(1);
        expect(callbacks.setIsDirty).toHaveBeenCalledWith(true);
        expect(callbacks.commitUndoSnapshot).toHaveBeenCalledTimes(1);
    });

    test('bringToFront and alignSelectedHorizontally reorder and align selections', () => {
        const service = new DesignArrangementService();
        const { host, model, callbacks } = createHost(
            RectangleElement.create(0, 0, 5, 5),
            RectangleElement.create(10, 20, 10, 10),
            RectangleElement.create(40, 40, 20, 20),
            RectangleElement.create(30, 60, 30, 20)
        );

        host.selectedElements = [model.elements[0], model.elements[2]];
        service.bringToFront(host);

        expect(model.elements.map((element) => element.getBounds()?.x)).toEqual([10, 30, 0, 40]);
        expect(callbacks.onElementsReordered).toHaveBeenCalledTimes(1);

        host.selectedElements = [model.elements[0], model.elements[1], model.elements[2]];
        service.alignSelectedHorizontally(host, 'center');

        const centers = host.selectedElements.map((element) => {
            const bounds = element.getBounds();
            return bounds ? bounds.x + bounds.width / 2 : undefined;
        });

        expect(centers).toEqual([30, 30, 30]);
        expect(callbacks.onModelUpdated).toHaveBeenCalled();
        expect(callbacks.commitUndoSnapshot).toHaveBeenCalled();
    });

    test('removeUnusedResourcesFromResourceManager prunes unreferenced resources', () => {
        const service = new DesignArrangementService();
        const { host, model, callbacks } = createHost(
            RectangleElement.create(10, 10, 20, 15)
        );
        const rectangle = model.elements[0] as RectangleElement;
        rectangle.setFill('image(hero)');
        BitmapResource.create('hero', '/hero.png').addTo(model);
        BitmapResource.create('unused', '/unused.png').addTo(model);

        expect(service.removeUnusedResourcesFromResourceManager(host)).toBe(1);
        expect(model.resources.map((resource) => resource.key)).toEqual(['hero']);
        expect(callbacks.onModelUpdated).toHaveBeenCalledTimes(1);
        expect(callbacks.commitUndoSnapshot).toHaveBeenCalledTimes(1);
        expect(callbacks.drawIfNeeded).toHaveBeenCalledTimes(1);
    });
});
