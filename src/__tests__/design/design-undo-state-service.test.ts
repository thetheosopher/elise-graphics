import { Model } from '../../core/model';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { RectangleElement } from '../../elements/rectangle-element';
import { DesignUndoStateService, type DesignUndoStateHost } from '../../design/design-undo-state-service';

function createHost(model?: Model) {
    let selectedElements = model ? [...model.elements] : [];
    let isDirty = false;
    let restoringUndoState = false;
    let pendingToolHistoryBaseline: string | undefined;
    let isMouseDown = true;
    let isMoving = true;
    let isResizing = true;
    let isRotating = true;
    let isMovingPivot = true;
    let isMovingPoint = true;
    let isMovingCornerRadius = true;
    let mouseDownPosition: Point | undefined = new Point(3, 4);
    let currentWidth = 22;
    let currentHeight = 33;
    let rotationCenter: Point | undefined = new Point(5, 6);
    let originalPivotCenter: Point | undefined = new Point(7, 8);
    let originalTransform: string | undefined = 'rotate(10)';
    let movingPointIndex: number | undefined = 2;
    let movingPointLocation: Point | undefined = new Point(9, 10);
    let sizeHandles: [] | undefined = [];

    const host: DesignUndoStateHost = {
        model,
        get selectedElements() {
            return selectedElements;
        },
        isDirty,
        get restoringUndoState() {
            return restoringUndoState;
        },
        set restoringUndoState(value: boolean) {
            restoringUndoState = value;
        },
        get pendingToolHistoryBaseline() {
            return pendingToolHistoryBaseline;
        },
        set pendingToolHistoryBaseline(value: string | undefined) {
            pendingToolHistoryBaseline = value;
        },
        get isMouseDown() {
            return isMouseDown;
        },
        set isMouseDown(value: boolean) {
            isMouseDown = value;
        },
        get isMoving() {
            return isMoving;
        },
        set isMoving(value: boolean) {
            isMoving = value;
        },
        get isResizing() {
            return isResizing;
        },
        set isResizing(value: boolean) {
            isResizing = value;
        },
        get isRotating() {
            return isRotating;
        },
        set isRotating(value: boolean) {
            isRotating = value;
        },
        get isMovingPivot() {
            return isMovingPivot;
        },
        set isMovingPivot(value: boolean) {
            isMovingPivot = value;
        },
        get isMovingPoint() {
            return isMovingPoint;
        },
        set isMovingPoint(value: boolean) {
            isMovingPoint = value;
        },
        get isMovingCornerRadius() {
            return isMovingCornerRadius;
        },
        set isMovingCornerRadius(value: boolean) {
            isMovingCornerRadius = value;
        },
        get mouseDownPosition() {
            return mouseDownPosition;
        },
        set mouseDownPosition(value: Point | undefined) {
            mouseDownPosition = value;
        },
        get currentWidth() {
            return currentWidth;
        },
        set currentWidth(value: number) {
            currentWidth = value;
        },
        get currentHeight() {
            return currentHeight;
        },
        set currentHeight(value: number) {
            currentHeight = value;
        },
        get rotationCenter() {
            return rotationCenter;
        },
        set rotationCenter(value: Point | undefined) {
            rotationCenter = value;
        },
        get originalPivotCenter() {
            return originalPivotCenter;
        },
        set originalPivotCenter(value: Point | undefined) {
            originalPivotCenter = value;
        },
        get originalTransform() {
            return originalTransform;
        },
        set originalTransform(value: string | undefined) {
            originalTransform = value;
        },
        get movingPointIndex() {
            return movingPointIndex;
        },
        set movingPointIndex(value: number | undefined) {
            movingPointIndex = value;
        },
        get movingPointLocation() {
            return movingPointLocation;
        },
        set movingPointLocation(value: Point | undefined) {
            movingPointLocation = value;
        },
        get sizeHandles() {
            return sizeHandles;
        },
        set sizeHandles(value) {
            sizeHandles = value;
        },
        setSelectedElements(value) {
            selectedElements = value;
        },
        setIsDirty: jest.fn((value: boolean) => {
            isDirty = value;
            host.isDirty = value;
        }),
        triggerModelUpdated: jest.fn(),
        invalidate: jest.fn(),
        drawIfNeeded: jest.fn(),
        onSelectionChanged: jest.fn(),
        clearElementMoveLocations: jest.fn(),
        clearElementResizeSizes: jest.fn(),
    };

    return {
        host,
        getSelectedElements: () => selectedElements,
        getFlags: () => ({
            isDirty,
            restoringUndoState,
            pendingToolHistoryBaseline,
            isMouseDown,
            isMoving,
            isResizing,
            isRotating,
            isMovingPivot,
            isMovingPoint,
            isMovingCornerRadius,
            mouseDownPosition,
            currentWidth,
            currentHeight,
            rotationCenter,
            originalPivotCenter,
            originalTransform,
            movingPointIndex,
            movingPointLocation,
            sizeHandles,
        }),
    };
}

describe('DesignUndoStateService', () => {
    test('createUndoSnapshot captures selected element state and dirty signature', () => {
        const model = Model.create(60, 60);
        const first = RectangleElement.create(1, 2, 10, 11).setInteractive(true);
        const second = RectangleElement.create(20, 21, 12, 13).setInteractive(false);
        second.editPoints = true;
        model.add(first);
        model.add(second);

        const service = new DesignUndoStateService();
        const { host } = createHost(model);
        host.setSelectedElements([second]);
        host.setIsDirty(true);

        const snapshot = service.createUndoSnapshot(host);

        expect(snapshot.model).not.toBe(model);
        expect(snapshot.selectedElements).toEqual([
            {
                id: second.id,
                index: 1,
                editPoints: true,
            },
        ]);
        expect(snapshot.isDirty).toBe(true);
        expect(snapshot.signature).toContain('::1::');
    });

    test('applyUndoSnapshot restores model selection dirty flag and transient interaction state', () => {
        const sourceModel = Model.create(80, 80);
        const sourceFirst = RectangleElement.create(5, 6, 10, 10).setInteractive(true);
        const sourceSecond = RectangleElement.create(30, 31, 14, 15).setInteractive(true);
        sourceSecond.editPoints = true;
        sourceModel.add(sourceFirst);
        sourceModel.add(sourceSecond);

        const service = new DesignUndoStateService();
        const sourceHost = createHost(sourceModel).host;
        sourceHost.setSelectedElements([sourceSecond]);
        const snapshot = service.createUndoSnapshot(sourceHost);

        const targetModel = Model.create(80, 80);
        targetModel.add(RectangleElement.create(1, 1, 5, 5));
        const target = createHost(targetModel);
        target.host.pendingToolHistoryBaseline = 'baseline';
        target.host.setSelectedElements([targetModel.elements[0]]);
        target.host.isDirty = true;

        service.applyUndoSnapshot(target.host, snapshot);

        expect(targetModel.elements).toHaveLength(2);
        expect(targetModel.elements[1].getLocation()).toMatchObject({ x: 30, y: 31 });
        expect(target.getSelectedElements()).toHaveLength(1);
        expect(target.getSelectedElements()[0].id).toBe(sourceSecond.id);
        expect(target.getSelectedElements()[0].editPoints).toBe(true);
        expect(target.host.onSelectionChanged).toHaveBeenCalledTimes(1);
        expect(target.host.triggerModelUpdated).toHaveBeenCalledTimes(1);
        expect(target.host.invalidate).toHaveBeenCalledTimes(1);
        expect(target.host.drawIfNeeded).toHaveBeenCalledTimes(1);
        expect(target.host.clearElementMoveLocations).toHaveBeenCalledTimes(1);
        expect(target.host.clearElementResizeSizes).toHaveBeenCalledTimes(1);

        const flags = target.getFlags();
        expect(flags.isDirty).toBe(false);
        expect(flags.restoringUndoState).toBe(false);
        expect(flags.pendingToolHistoryBaseline).toBeUndefined();
        expect(flags.isMouseDown).toBe(false);
        expect(flags.isMoving).toBe(false);
        expect(flags.isResizing).toBe(false);
        expect(flags.isRotating).toBe(false);
        expect(flags.isMovingPivot).toBe(false);
        expect(flags.isMovingPoint).toBe(false);
        expect(flags.isMovingCornerRadius).toBe(false);
        expect(flags.mouseDownPosition).toBeUndefined();
        expect(flags.currentWidth).toBe(0);
        expect(flags.currentHeight).toBe(0);
        expect(flags.rotationCenter).toBeUndefined();
        expect(flags.originalPivotCenter).toBeUndefined();
        expect(flags.originalTransform).toBeUndefined();
        expect(flags.movingPointIndex).toBeUndefined();
        expect(flags.movingPointLocation).toBeUndefined();
        expect(flags.sizeHandles).toBeUndefined();
    });

    test('buildModelStateSignature includes interactive and edit point state', () => {
        const model = Model.create(40, 40);
        const rectangle = RectangleElement.create(1, 1, 10, 10).setInteractive(false);
        model.add(rectangle);

        const service = new DesignUndoStateService();
        const initial = service.buildModelStateSignature(model);

        rectangle.setInteractive(true);
        rectangle.editPoints = true;
        const updated = service.buildModelStateSignature(model);

        expect(updated).not.toBe(initial);
        expect(updated).toContain(':1:1');
    });
});