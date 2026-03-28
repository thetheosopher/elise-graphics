import { Model } from '../../core/model';
import { Point } from '../../core/point';
import { Region } from '../../core/region';
import { Size } from '../../core/size';
import { RectangleElement } from '../../elements/rectangle-element';
import { DesignOverlayRenderService, type DesignOverlayRenderHost } from '../../design/design-overlay-render-service';
import { GridType } from '../../design/grid-type';

function createOverlayContext() {
    return {
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        arc: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        createPattern: jest.fn(() => undefined),
        strokeText: jest.fn(),
        fillText: jest.fn(),
        measureText: jest.fn((text: string) => ({ width: text.length * 10 })),
        lineWidth: 1,
        strokeStyle: '',
        fillStyle: '',
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;
}

function createHost(model?: Model): DesignOverlayRenderHost {
    return {
        model,
        scale: 1,
        gridType: GridType.None,
        gridSpacing: 10,
        gridColor: 'Black',
        selecting: false,
        rubberBandRegion: undefined,
        activeComponent: undefined,
        fillImage: undefined,
        smartAlignmentGuides: { vertical: [], horizontal: [] },
        selectedElements: [],
        editingTextElement: undefined,
        textSelectionStart: 0,
        textSelectionEnd: 0,
        isMoving: false,
        isResizing: false,
        isMovingPoint: false,
        isMovingCornerRadius: false,
        movingPointIndex: undefined,
        movingPointLocation: undefined,
        sizeHandles: undefined,
        getElementMoveLocation: (element) => element.getLocation() || new Point(0, 0),
        getElementResizeSize: (element) => element.getSize() || new Size(0, 0),
    };
}

describe('DesignOverlayRenderService', () => {
    test('renderGrid draws contrast-friendly line grid colors and strokes', () => {
        const service = new DesignOverlayRenderService();
        const model = Model.create(20, 20);
        const context = createOverlayContext();
        const strokeStyles: string[] = [];
        let currentStrokeStyle = '';

        Object.defineProperty(context, 'strokeStyle', {
            configurable: true,
            get: () => currentStrokeStyle,
            set: (value: string) => {
                currentStrokeStyle = value;
                strokeStyles.push(value);
            },
        });

        model.context = context;
        const host = createHost(model);
        host.gridType = GridType.Lines;
        host.gridSpacing = 10;
        host.gridColor = 'Red';

        service.renderGrid(host);

        expect(strokeStyles).toContain('rgb(255,255,255)');
        expect(strokeStyles).toContain('rgb(255,0,0)');
        expect(context.stroke).toHaveBeenCalledTimes(2);
        expect(context.moveTo).toHaveBeenCalledWith(10, 0);
        expect(context.lineTo).toHaveBeenCalledWith(10, 20);
    });

    test('getInteractionIndicator reports moved bounds for selected elements', () => {
        const service = new DesignOverlayRenderService();
        const model = Model.create(100, 100);
        const element = RectangleElement.create(10, 20, 30, 40).setInteractive(true);
        model.add(element);

        const host = createHost(model);
        host.selectedElements = [element];
        host.isMoving = true;
        host.getElementMoveLocation = () => new Point(25, 35);

        const indicator = service.getInteractionIndicator(host);

        expect(indicator?.lines).toEqual(['x 25 y 35', 'w 30 h 40']);
        expect(indicator?.anchor).toMatchObject({ x: 55, y: 35 });
    });

    test('drawTextEditingOverlay fills selection regions for the active text element', () => {
        const service = new DesignOverlayRenderService();
        const context = createOverlayContext();
        const selectionRegion = new Region(4, 6, 20, 12);
        const textElement = {
            getBounds: jest.fn(() => ({
                location: new Point(1, 2),
                size: new Size(30, 12),
            })),
            getSelectionRegions: jest.fn(() => [selectionRegion]),
            getCaretRegion: jest.fn(() => new Region(0, 0, 0, 12)),
        } as never;

        const host = createHost(Model.create(60, 60));
        host.selectedElements = [textElement];
        host.editingTextElement = textElement;
        host.textSelectionStart = 1;
        host.textSelectionEnd = 3;

        service.drawTextEditingOverlay(host, context);

        expect(context.fillRect).toHaveBeenCalledWith(4, 6, 20, 12);
        expect(context.stroke).not.toHaveBeenCalled();
    });
});