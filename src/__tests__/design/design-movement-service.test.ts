import { Model } from '../../core/model';
import { Point } from '../../core/point';
import { DesignMovementService, type DesignMovementHost } from '../../design/design-movement-service';
import { RectangleElement } from '../../elements/rectangle-element';

function createHost(...rectangles: RectangleElement[]) {
    const model = Model.create(200, 200);
    rectangles.forEach((rectangle) => model.add(rectangle.setInteractive(true)));
    let selectedElements = model.elements.slice();

    const host: DesignMovementHost = {
        model,
        get selectedElements() {
            return selectedElements;
        },
        set selectedElements(value) {
            selectedElements = value;
        },
        constrainToBounds: true,
        snapToGrid: false,
        smartAlignmentEnabled: true,
        smartAlignmentThreshold: 12,
        getNearestSnapX: (newX: number) => {
            const remainder = newX % 10;
            if (remainder === 0) {
                return newX;
            }
            return remainder < 5 ? newX - remainder : newX + (10 - remainder);
        },
        getNearestSnapY: (newY: number) => {
            const remainder = newY % 10;
            if (remainder === 0) {
                return newY;
            }
            return remainder < 5 ? newY - remainder : newY + (10 - remainder);
        },
    };

    return { host, model };
}

describe('DesignMovementService', () => {
    test('constrainMoveDeltaToBounds clamps movement to the model bounds', () => {
        const service = new DesignMovementService();
        const { host } = createHost(
            RectangleElement.create(10, 10, 20, 15),
            RectangleElement.create(40, 30, 25, 20)
        );

        const entries = service.getSelectedMovableEntries(host.selectedElements);
        const constrained = service.constrainMoveDeltaToBounds(host, entries, -30, 500);

        expect(constrained).toMatchObject({ x: -10, y: 150 });
    });

    test('getSmartAlignmentDelta snaps a moving multi-selection to nearby element bounds', () => {
        const service = new DesignMovementService();
        const { host, model } = createHost(
            RectangleElement.create(10, 10, 10, 10),
            RectangleElement.create(25, 15, 10, 10),
            RectangleElement.create(50, 40, 20, 20)
        );

        host.selectedElements = [model.elements[0], model.elements[1]];
        const entries = service.getSelectedMovableEntries(host.selectedElements);
        const smartAligned = service.getSmartAlignmentDelta(host, entries, 44, 35);

        expect(smartAligned.guides.vertical).toHaveLength(1);
        expect(smartAligned.guides.horizontal).toHaveLength(1);
        expect(smartAligned.deltaX).not.toBe(44);
        expect(smartAligned.deltaY).toBe(35);
    });

    test('snapMoveDeltaToGrid snaps a moving selection using the combined selection bounds', () => {
        const service = new DesignMovementService();
        const { host } = createHost(
            RectangleElement.create(13, 17, 20, 15),
            RectangleElement.create(38, 22, 10, 10)
        );

        host.snapToGrid = true;
        const entries = service.getSelectedMovableEntries(host.selectedElements);
        const snapped = service.snapMoveDeltaToGrid(host, entries, 8, 6);

        expect(snapped).toMatchObject({ x: 7, y: 3 });
    });
});
