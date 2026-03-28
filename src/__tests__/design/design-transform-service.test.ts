import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { DesignTransformService, type DesignTransformHost } from '../../design/design-transform-service';
import { RectangleElement } from '../../elements/rectangle-element';
import { Model } from '../../core/model';
import { MoveLocation } from '../../elements/move-location';
import { ResizeSize } from '../../elements/resize-size';

function createHost(...rectangles: RectangleElement[]) {
    const model = Model.create(100, 100);
    rectangles.forEach((rectangle) => model.add(rectangle.setInteractive(true)));
    let elementResizeSizes: ResizeSize[] = [];
    let elementMoveLocations: MoveLocation[] = [];

    const host: DesignTransformHost = {
        model,
        selectedElements: model.elements.slice(),
        get elementResizeSizes() {
            return elementResizeSizes;
        },
        set elementResizeSizes(value) {
            elementResizeSizes = value;
        },
        get elementMoveLocations() {
            return elementMoveLocations;
        },
        set elementMoveLocations(value) {
            elementMoveLocations = value;
        },
        constrainToBounds: true,
        onElementSizing: jest.fn(),
        onElementMoving: jest.fn(),
        onElementSized: jest.fn(),
        onElementMoved: jest.fn(),
        onModelUpdated: jest.fn(),
        commitUndoSnapshot: jest.fn(),
        drawIfNeeded: jest.fn(),
        clearSmartAlignmentGuides: jest.fn(),
        isInBounds: (location, size, targetModel, transform) => {
            const modelSize = targetModel?.getSize();
            if (!modelSize) {
                return false;
            }
            return location.x >= 0 && location.y >= 0 && location.x + size.width <= modelSize.width && location.y + size.height <= modelSize.height;
        },
    };

    return { host, model };
}

describe('DesignTransformService', () => {
    test('setElementMoveLocation clamps preview locations to model bounds', () => {
        const service = new DesignTransformService();
        const { host, model } = createHost(RectangleElement.create(10, 10, 20, 15));
        const element = model.elements[0];

        service.setElementMoveLocation(host, element, new Point(90, 95), new Size(20, 15));

        expect(service.getElementMoveLocation(host, element)).toMatchObject({ x: 80, y: 85 });
        expect(host.onElementMoving).toHaveBeenCalledWith(element, expect.objectContaining({ x: 80, y: 85 }));
    });

    test('nudgeLocation clamps movement when the requested offset exceeds bounds', () => {
        const service = new DesignTransformService();
        const { host, model } = createHost(RectangleElement.create(90, 90, 10, 10));
        const element = model.elements[0];

        service.nudgeLocation(host, 5, 7);

        expect(element.getBounds()).toMatchObject({ x: 90, y: 90 });
        expect(host.onElementMoved).toHaveBeenCalledWith(element, expect.objectContaining({ x: 90, y: 90 }));
        expect(host.onModelUpdated).toHaveBeenCalledTimes(1);
        expect(host.commitUndoSnapshot).toHaveBeenCalledTimes(1);
        expect(host.drawIfNeeded).toHaveBeenCalledTimes(1);
    });
});
