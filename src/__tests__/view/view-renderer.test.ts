import { ViewRenderer } from '../../view/view-renderer';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { FillFactory } from '../../fill/fill-factory';
import { ErrorMessages } from '../../core/error-messages';

function createContext(): CanvasRenderingContext2D {
    return {
        save: jest.fn(),
        restore: jest.fn(),
        scale: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
    } as unknown as CanvasRenderingContext2D;
}

describe('view renderer', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renderToContext throws when model is missing', () => {
        const renderer = new ViewRenderer({ offsetX: 0, offsetY: 0 });
        const c = createContext();

        expect(() => renderer.renderToContext(c)).toThrow(ErrorMessages.ModelUndefined);
    });

    test('renderToContext throws when model size is missing', () => {
        const renderer = new ViewRenderer({
            offsetX: 0,
            offsetY: 0,
            model: {
                getSize: jest.fn(() => undefined),
            } as never,
        });
        const c = createContext();

        expect(() => renderer.renderToContext(c)).toThrow(ErrorMessages.SizeUndefined);
    });

    test('renderToContext draws only renderable elements and ends render', () => {
        const c = createContext();
        jest.spyOn(FillFactory, 'setElementFill').mockReturnValue(false);
        const drawA = jest.fn();
        const drawB = jest.fn();

        const model = {
            getSize: jest.fn(() => new Size(100, 80)),
            elements: [{ draw: drawA }, { draw: drawB }],
            getLocation: jest.fn(() => new Point(0, 0)),
            setRenderTransform: jest.fn(),
            setElementStroke: jest.fn(() => false),
        };
        const renderer = new ViewRenderer({ offsetX: 5, offsetY: 7, model: model as never });

        const shouldRenderSpy = jest
            .spyOn(renderer, 'shouldRender')
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(false);

        renderer.renderToContext(c, 2);

        expect(shouldRenderSpy).toHaveBeenCalledTimes(2);
        expect(drawA).toHaveBeenCalledTimes(1);
        expect(drawB).not.toHaveBeenCalled();
        expect(c.restore).toHaveBeenCalledTimes(1);
    });

    test('beginRender applies scale, transform and fill when available', () => {
        const c = createContext();
        jest.spyOn(FillFactory, 'setElementFill').mockReturnValue(true);

        const model = {
            transform: 'rotate(10)',
            getSize: jest.fn(() => new Size(20, 30)),
            getLocation: jest.fn(() => new Point(1, 2)),
            setRenderTransform: jest.fn(),
        };

        const renderer = new ViewRenderer({ offsetX: 0, offsetY: 0, model: model as never });
        renderer.beginRender(c, 3);

        expect(c.save).toHaveBeenCalledTimes(1);
        expect(c.scale).toHaveBeenCalledWith(3, 3);
        expect(model.setRenderTransform).toHaveBeenCalledWith(c, 'rotate(10)', expect.any(Point));
        expect(c.fillRect).toHaveBeenCalledWith(0, 0, 20, 30);
    });

    test('endRender strokes model bounds when stroke is enabled', () => {
        const c = createContext();
        const model = {
            setElementStroke: jest.fn(() => true),
            getSize: jest.fn(() => new Size(11, 12)),
        };
        const renderer = new ViewRenderer({ offsetX: 0, offsetY: 0, model: model as never });

        renderer.endRender(c);

        expect(c.strokeRect).toHaveBeenCalledWith(0, 0, 11, 12);
        expect(c.restore).toHaveBeenCalledTimes(1);
    });

    test('shouldRender returns true for transformed elements', () => {
        const renderer = new ViewRenderer({ offsetX: 0, offsetY: 0 });
        const result = renderer.shouldRender({ transform: 'scale(2)' } as never, { x: 0 } as never);

        expect(result).toBe(true);
    });

    test('shouldRender returns bounds intersection result and false for missing bounds', () => {
        const renderer = new ViewRenderer({ offsetX: 0, offsetY: 0 });
        const bounds = { id: 'region' } as never;

        const intersecting = {
            getBounds: jest.fn(() => ({ intersectsWith: jest.fn(() => true) })),
        };
        const outside = {
            getBounds: jest.fn(() => ({ intersectsWith: jest.fn(() => false) })),
        };
        const missing = {
            getBounds: jest.fn(() => undefined),
        };

        expect(renderer.shouldRender(intersecting as never, bounds)).toBe(true);
        expect(renderer.shouldRender(outside as never, bounds)).toBe(false);
        expect(renderer.shouldRender(missing as never, bounds)).toBe(false);
    });
});
