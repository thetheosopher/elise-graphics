import { ControllerEvent } from '../../controller/controller-event';
import { Size } from '../../core/size';
import { DesignCanvasLifecycleService, type DesignCanvasLifecycleHost } from '../../design/design-canvas-lifecycle-service';

function createLifecycleHost() {
    const controller = {} as any;
    const controllerDetached = new ControllerEvent<any>();
    const draw = jest.fn();
    const clearControllerEvents = jest.fn();
    let canvasValue: HTMLCanvasElement | undefined;
    let rendererValue: unknown;
    let pixelRatioValue = 1;
    let autoPixelRatioValue = false;
    const model = {
        controller,
        controllerDetached,
        getSize: () => new Size(120, 80),
    };

    const host: DesignCanvasLifecycleHost = {
        controller,
        model,
        get canvas() {
            return canvasValue;
        },
        set canvas(value) {
            canvasValue = value;
        },
        get renderer() {
            return rendererValue as never;
        },
        set renderer(value) {
            rendererValue = value;
        },
        scale: 2,
        get pixelRatio() {
            return pixelRatioValue;
        },
        set pixelRatio(value) {
            pixelRatioValue = value;
        },
        get autoPixelRatio() {
            return autoPixelRatioValue;
        },
        set autoPixelRatio(value) {
            autoPixelRatioValue = value;
        },
        onCanvasMouseEnter: jest.fn(),
        onCanvasMouseLeave: jest.fn(),
        onCanvasMouseDown: jest.fn(),
        onCanvasContextMenu: jest.fn(),
        onCanvasMouseMove: jest.fn(),
        onCanvasTouchStart: jest.fn(),
        onCanvasTouchMove: jest.fn(),
        onCanvasTouchEnd: jest.fn(),
        onCanvasTouchCancel: jest.fn(),
        onCanvasKeyDown: jest.fn(() => true),
        onCanvasDragEnter: jest.fn(),
        onCanvasDragOver: jest.fn(),
        onCanvasDragLeave: jest.fn(),
        onCanvasDrop: jest.fn(),
        onWindowResize: jest.fn(),
        windowTouchEnd: jest.fn(),
        windowTouchMove: jest.fn(),
        windowTouchCancel: jest.fn(),
        detachModelController: () => {
            (model as any).controller = undefined;
            model.controllerDetached.trigger(model as any, controller as any);
        },
        draw,
        clearControllerEvents,
    };

    return { host, model, draw, clearControllerEvents, controllerDetached };
}

describe('DesignCanvasLifecycleService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
        delete (globalThis as { document?: Document }).document;
        delete (globalThis as { window?: Window & typeof globalThis }).window;
    });

    test('createCanvas wires event handlers, renderer, and backing store sizing', () => {
        const service = new DesignCanvasLifecycleService();
        const { host } = createLifecycleHost();
        const addEventListener = jest.fn();
        const canvas = {
            width: 0,
            height: 0,
            style: { width: '', height: '', touchAction: '' },
            setAttribute: jest.fn(),
            addEventListener,
        } as unknown as HTMLCanvasElement;
        (globalThis as { document?: Partial<Document> }).document = {
            createElement: jest.fn(() => canvas),
        } as Partial<Document> as Document;
        (globalThis as { window?: Partial<Window & typeof globalThis> }).window = {
            addEventListener: jest.fn(),
            devicePixelRatio: 1,
        } as Partial<Window & typeof globalThis> as Window & typeof globalThis;

        service.createCanvas(host);

        expect(host.canvas).toBe(canvas);
        expect(host.renderer).toBeDefined();
        expect(canvas.setAttribute).toHaveBeenCalledWith('tabindex', '0');
        expect(canvas.style.touchAction).toBe('none');
        expect(addEventListener).toHaveBeenCalledTimes(14);
        expect(canvas.width).toBe(240);
        expect(canvas.height).toBe(160);
        expect(canvas.style.width).toBe('240px');
        expect(canvas.style.height).toBe('160px');
    });

    test('detach removes listeners, clears controller events, and unsets canvas', () => {
        const service = new DesignCanvasLifecycleService();
        const { host, model, clearControllerEvents, controllerDetached } = createLifecycleHost();
        const removeEventListener = jest.fn();
        const removeChild = jest.fn();
        const canvas = {
            parentElement: { removeChild, style: {} },
            removeEventListener,
        } as unknown as HTMLCanvasElement;
        host.canvas = canvas;
        (globalThis as { window?: Partial<Window & typeof globalThis> }).window = {
            removeEventListener: jest.fn(),
        } as Partial<Window & typeof globalThis> as Window & typeof globalThis;
        const detachSpy = jest.fn();
        controllerDetached.add(detachSpy);

        service.detach(host);

        expect(model.controller).toBeUndefined();
        expect(detachSpy).toHaveBeenCalledTimes(1);
        expect(removeEventListener).toHaveBeenCalledTimes(14);
        expect(removeChild).toHaveBeenCalledWith(canvas);
        expect(clearControllerEvents).toHaveBeenCalledTimes(1);
        expect(host.canvas).toBeUndefined();
    });

    test('setAutoPixelRatio and setPixelRatio refresh size and trigger redraw', () => {
        const service = new DesignCanvasLifecycleService();
        const { host, draw } = createLifecycleHost();
        const canvas = {
            width: 0,
            height: 0,
            style: { width: '', height: '' },
            parentElement: { style: {} },
        } as unknown as HTMLCanvasElement;
        host.canvas = canvas;
        (globalThis as { window?: Partial<Window & typeof globalThis> }).window = {
            devicePixelRatio: 2,
        } as Partial<Window & typeof globalThis> as Window & typeof globalThis;

        service.setAutoPixelRatio(host, true);

        expect(host.autoPixelRatio).toBe(true);
        expect(host.pixelRatio).toBe(2);
        expect(canvas.width).toBe(480);
        expect(canvas.height).toBe(320);

        service.setPixelRatio(host, 3);

        expect(host.autoPixelRatio).toBe(false);
        expect(host.pixelRatio).toBe(3);
        expect(canvas.width).toBe(720);
        expect(canvas.height).toBe(480);
        expect(draw).toHaveBeenCalledTimes(2);
    });
});