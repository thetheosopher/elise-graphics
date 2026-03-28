import { Model } from '../../core/model';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { DesignDrawService, type DesignDrawHost } from '../../design/design-draw-service';

function createContext() {
    return {
        clearRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        setTransform: jest.fn(),
        scale: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        arc: jest.fn(),
        fillText: jest.fn(),
        setLineDash: jest.fn(),
        fillRect: jest.fn(),
        lineWidth: 1,
        strokeStyle: '',
        fillStyle: '',
        font: '',
    } as unknown as CanvasRenderingContext2D;
}

function createHost(context: CanvasRenderingContext2D): DesignDrawHost {
    const model = Model.create(100, 80);
    const canvas = {
        width: 100,
        height: 80,
        getContext: jest.fn(() => context),
    } as unknown as HTMLCanvasElement;

    return {
        canvas,
        model,
        renderer: { renderToContext: jest.fn() } as never,
        pixelRatio: 2,
        scale: 1.5,
        enabled: true,
        rubberBandActive: false,
        isMouseDown: false,
        isMoving: false,
        isResizing: false,
        isRotating: false,
        currentX: undefined,
        currentY: undefined,
        currentWidth: undefined,
        currentHeight: undefined,
        rotationCenter: undefined,
        originalTransform: undefined,
        disabledFill: undefined,
        selectedElements: [],
        refreshPixelRatio: jest.fn(() => false),
        renderGrid: jest.fn(),
        drawTextEditingOverlay: jest.fn(),
        getElementHandles: jest.fn(() => []),
        drawDashedLine: jest.fn(),
        drawInteractionIndicator: jest.fn(),
        drawRubberBand: jest.fn(),
        drawGuidewires: jest.fn(),
        drawHorizontalLine: jest.fn(),
        drawVerticalLine: jest.fn(),
        drawDashedHorizontalLine: jest.fn(),
        drawDashedVerticalLine: jest.fn(),
        drawSmartAlignmentGuides: jest.fn(),
        getVisualInteractionBoundsForElement: jest.fn(),
        getElementMoveLocation: jest.fn(() => new Point(0, 0)),
        calculateFPS: jest.fn(() => 60),
        setNeedsRedraw: jest.fn(),
    };
}

describe('DesignDrawService', () => {
    test('draw orchestrates render phases and clears redraw state', () => {
        const service = new DesignDrawService();
        const context = createContext();
        const host = createHost(context);
        const renderSceneSpy = jest.spyOn(service, 'renderScene');
        const selectionSpy = jest.spyOn(service, 'drawSelectionHandles');
        const overlaysSpy = jest.spyOn(service, 'drawInteractionOverlays');
        const statusSpy = jest.spyOn(service, 'drawStatusOverlays');

        service.draw(host);

        expect(host.refreshPixelRatio).toHaveBeenCalledTimes(1);
        expect(renderSceneSpy).toHaveBeenCalledWith(host, context);
        expect(selectionSpy).toHaveBeenCalledWith(host, context);
        expect(overlaysSpy).toHaveBeenCalledWith(host, context);
        expect(statusSpy).toHaveBeenCalledWith(host, context, expect.objectContaining({
            width: 100,
            height: 80,
        }));
        expect(host.setNeedsRedraw).toHaveBeenCalledWith(false);
        expect(context.restore).toHaveBeenCalled();
    });

    test('drawRotationFeedback renders arm arc and angle label', () => {
        const service = new DesignDrawService();
        const context = createContext();
        const host = createHost(context);
        host.isRotating = true;
        host.scale = 1;
        host.rotationCenter = new Point(20, 30);

        const element = {
            getRotation: jest.fn(() => 45),
        } as never;

        service.drawRotationFeedback(host, context, element, {
            location: new Point(10, 12),
            size: new Size(30, 20),
            x: 10,
            y: 12,
            width: 30,
            height: 20,
        });

        expect(context.setLineDash).toHaveBeenNthCalledWith(1, [4, 4]);
        expect(context.setLineDash).toHaveBeenNthCalledWith(2, []);
        expect(context.arc).toHaveBeenCalledWith(20, 30, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI / 4, false);
        expect(context.fillText).toHaveBeenCalledWith('45°', 28, 22);
    });
});