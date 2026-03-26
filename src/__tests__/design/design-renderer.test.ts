import { DesignRenderer } from '../../design/design-renderer';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { RectangleElement } from '../../elements/rectangle-element';
import { FillFactory } from '../../fill/fill-factory';
import type { IDesignController } from '../../design/design-controller-interface';

function createController(): IDesignController {
    return {
        isMoving: false,
        isResizing: false,
        isMovingPoint: false,
        isRotating: false,
        isMovingPivot: false,
        rotationStartAngle: 0,
        originalRotation: 0,
        minElementSize: new Size(1, 1),
        snapToGrid: false,
        lockAspect: false,
        isSelected: jest.fn(() => false),
        selectedElementCount: jest.fn(() => 1),
        getElementMoveLocation: jest.fn(() => new Point(0, 0)),
        getElementResizeSize: jest.fn(() => new Size(10, 10)),
        setElementMoveLocation: jest.fn(),
        setElementResizeSize: jest.fn(),
        clearElementMoveLocations: jest.fn(),
        clearElementResizeSizes: jest.fn(),
        getNearestSnapX: jest.fn((x: number) => x),
        getNearestSnapY: jest.fn((y: number) => y),
        invalidate: jest.fn(),
    };
}

function createContext(): CanvasRenderingContext2D {
    return {
        save: jest.fn(),
        restore: jest.fn(),
        scale: jest.fn(),
        translate: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        bezierCurveTo: jest.fn(),
        closePath: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        strokeText: jest.fn(),
        drawImage: jest.fn(),
        globalAlpha: 1,
        textAlign: 'left',
        textBaseline: 'top',
        font: '',
        lineCap: 'butt',
    } as unknown as CanvasRenderingContext2D;
}

describe('design renderer', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renderElement dispatches to specific renderer by element type', () => {
        const renderer = new DesignRenderer(createController());
        const c = createContext();

        const imageSpy = jest.spyOn(renderer, 'renderImageElement').mockImplementation(() => undefined);
        const spriteSpy = jest.spyOn(renderer, 'renderSpriteElement').mockImplementation(() => undefined);
        const rectangleSpy = jest.spyOn(renderer, 'renderRectangleElement').mockImplementation(() => undefined);
        const lineSpy = jest.spyOn(renderer, 'renderLineElement').mockImplementation(() => undefined);
        const polylineSpy = jest.spyOn(renderer, 'renderPolylineElement').mockImplementation(() => undefined);
        const polygonSpy = jest.spyOn(renderer, 'renderPolygonElement').mockImplementation(() => undefined);
        const pathSpy = jest.spyOn(renderer, 'renderPathElement').mockImplementation(() => undefined);
        const ellipseSpy = jest.spyOn(renderer, 'renderEllipseElement').mockImplementation(() => undefined);
        const modelSpy = jest.spyOn(renderer, 'renderModelElement').mockImplementation(() => undefined);
        const textSpy = jest.spyOn(renderer, 'renderTextElement').mockImplementation(() => undefined);

        renderer.renderElement(c, { type: 'image' } as never);
        renderer.renderElement(c, { type: 'sprite' } as never);
        renderer.renderElement(c, { type: 'rectangle' } as never);
        renderer.renderElement(c, { type: 'line' } as never);
        renderer.renderElement(c, { type: 'polyline' } as never);
        renderer.renderElement(c, { type: 'polygon' } as never);
        renderer.renderElement(c, { type: 'path' } as never);
        renderer.renderElement(c, { type: 'ellipse' } as never);
        renderer.renderElement(c, { type: 'model' } as never);
        renderer.renderElement(c, { type: 'text' } as never);

        expect(imageSpy).toHaveBeenCalledTimes(1);
        expect(spriteSpy).toHaveBeenCalledTimes(1);
        expect(rectangleSpy).toHaveBeenCalledTimes(1);
        expect(lineSpy).toHaveBeenCalledTimes(1);
        expect(polylineSpy).toHaveBeenCalledTimes(1);
        expect(polygonSpy).toHaveBeenCalledTimes(1);
        expect(pathSpy).toHaveBeenCalledTimes(1);
        expect(ellipseSpy).toHaveBeenCalledTimes(1);
        expect(modelSpy).toHaveBeenCalledTimes(1);
        expect(textSpy).toHaveBeenCalledTimes(1);
    });

    test('renderRectangleElement applies fill offsets and stroke', () => {
        const controller = createController();
        const renderer = new DesignRenderer(controller);
        const c = createContext();
        const setElementFillSpy = jest.spyOn(FillFactory, 'setElementFill').mockReturnValue(true);

        const rectangle = RectangleElement.create(10, 20, 30, 40).setCornerRadius(6);
        rectangle.fillOffsetX = 3;
        rectangle.fillOffsetY = 4;
        rectangle.model = {
            resourceManager: {
                get: jest.fn(),
            },
            add: jest.fn(() => 0),
            getSize: jest.fn(() => new Size(100, 100)),
            getFillScale: jest.fn(() => ({ rx: 1, ry: 1 })),
            setElementStroke: jest.fn(() => true),
            setRenderTransform: jest.fn(),
        };

        renderer.renderRectangleElement(c, rectangle as never);

        expect(setElementFillSpy).toHaveBeenCalledWith(c, rectangle);
        expect(c.translate).toHaveBeenNthCalledWith(1, 13, 24);
        expect(c.beginPath).toHaveBeenCalledTimes(2);
        expect(c.moveTo).toHaveBeenCalledWith(3, -4);
        expect(c.quadraticCurveTo).toHaveBeenCalled();
        expect(c.fill).toHaveBeenCalledTimes(1);
        expect(c.translate).toHaveBeenNthCalledWith(2, -13, -24);
        expect(rectangle.model!.setElementStroke).toHaveBeenCalledWith(c, rectangle);
        expect(c.stroke).toHaveBeenCalledTimes(1);
    });

    test('renderElement skips invisible elements', () => {
        const renderer = new DesignRenderer(createController());
        const c = createContext();
        const rectangleSpy = jest.spyOn(renderer, 'renderRectangleElement').mockImplementation(() => undefined);

        renderer.renderElement(c, { type: 'rectangle', visible: false } as never);

        expect(rectangleSpy).not.toHaveBeenCalled();
    });

    test('renderPathElement handles m/l/c/z and moving point in full depth mode', () => {
        const controller = createController();
        controller.isMovingPoint = true;
        controller.movingPointIndex = 3;
        controller.movingPointLocation = new Point(50, 60);
        (controller.isSelected as jest.Mock).mockReturnValue(true);
        (controller.selectedElementCount as jest.Mock).mockReturnValue(1);

        const renderer = new DesignRenderer(controller);
        const c = createContext();
        jest.spyOn(FillFactory, 'setElementFill').mockReturnValue(false);

        const model = {
            setElementStroke: jest.fn(() => true),
            setRenderTransform: jest.fn(),
        };

        const bounds = {
            location: new Point(0, 0),
            size: new Size(100, 100),
            x: 0,
            y: 0,
            width: 100,
            height: 100,
        };

        const pathElement = {
            model,
            getBounds: jest.fn(() => bounds),
            getLocation: jest.fn(() => new Point(0, 0)),
            getCommands: jest.fn(() => ['m0,0', 'l10,20', 'c1,2,3,4,5,6', 'z']),
        };

        renderer.renderPathElement(c, pathElement as never);

        expect(c.beginPath).toHaveBeenCalledTimes(1);
        expect(c.moveTo).toHaveBeenCalledWith(0, 0);
        expect(c.lineTo).toHaveBeenCalledWith(10, 20);
        expect(c.bezierCurveTo).toHaveBeenCalledWith(50, 60, 3, 4, 5, 6);
        expect(c.closePath).toHaveBeenCalledTimes(1);
        expect(model.setElementStroke).toHaveBeenCalledWith(c, pathElement);
        expect(c.stroke).toHaveBeenCalledTimes(1);
    });

    test('renderPathElement fills with nonzero winding and translates with fill offsets', () => {
        const renderer = new DesignRenderer(createController());
        const c = createContext();
        jest.spyOn(FillFactory, 'setElementFill').mockReturnValue(true);

        const model = {
            setElementStroke: jest.fn(() => false),
            setRenderTransform: jest.fn(),
        };

        const pathElement = {
            model,
            fillOffsetX: 2,
            fillOffsetY: 5,
            getBounds: jest.fn(() => ({
                location: new Point(0, 0),
                size: new Size(20, 20),
                x: 0,
                y: 0,
                width: 20,
                height: 20,
            })),
            getLocation: jest.fn(() => new Point(7, 9)),
            getCommands: jest.fn(() => ['m0,0', 'l10,0', 'z']),
        };

        renderer.renderPathElement(c, pathElement as never);

        expect(c.translate).toHaveBeenNthCalledWith(1, 9, 14);
        expect(c.fill).toHaveBeenCalledWith('nonzero');
        expect(c.translate).toHaveBeenNthCalledWith(2, -9, -14);
    });

    test('renderToContext throws when controller model is missing', () => {
        const controller = createController();
        const renderer = new DesignRenderer(controller);
        const c = createContext();

        expect(() => renderer.renderToContext(c, 1)).toThrow('Model is undefined.');
    });

    test('renderToContext applies scale, model fill offsets, dispatch, and stroke', () => {
        const controller = createController();
        const renderer = new DesignRenderer(controller);
        const c = createContext();
        const renderElementSpy = jest.spyOn(renderer, 'renderElement').mockImplementation(() => undefined);
        jest.spyOn(FillFactory, 'setElementFill').mockReturnValue(true);

        const model = {
            transform: 'rotate(10)',
            fillOffsetX: 2,
            fillOffsetY: 3,
            elements: [{ id: 'a' }, { id: 'b' }],
            getBounds: jest.fn(() => ({
                location: new Point(4, 5),
                size: new Size(20, 30),
            })),
            setRenderTransform: jest.fn(),
            setElementStroke: jest.fn(() => true),
        };
        controller.model = model as never;

        renderer.renderToContext(c, 2);

        expect(c.scale).toHaveBeenCalledWith(2, 2);
        expect(model.setRenderTransform).toHaveBeenCalledWith(c, 'rotate(10)', expect.any(Point));
        expect(c.translate).toHaveBeenNthCalledWith(1, 2, 3);
        expect(c.fillRect).toHaveBeenCalledWith(-2, -3, 20, 30);
        expect(c.translate).toHaveBeenNthCalledWith(2, -2, -3);
        expect(renderElementSpy).toHaveBeenCalledTimes(2);
        expect(c.strokeRect).toHaveBeenCalledWith(0, 0, 20, 30);
    });

    test('renderImageElement uses moving/resizing selection coordinates and opacity branch', () => {
        const controller = createController();
        controller.isMoving = true;
        (controller.isSelected as jest.Mock).mockReturnValue(true);
        (controller.getElementMoveLocation as jest.Mock).mockReturnValue(new Point(100, 200));
        (controller.getElementResizeSize as jest.Mock).mockReturnValue(new Size(40, 50));

        const renderer = new DesignRenderer(controller);
        const c = createContext();
        const bitmap = { image: {} };
        const model = {
            resourceManager: { get: jest.fn(() => bitmap) },
            setRenderTransform: jest.fn(),
            setElementStroke: jest.fn(() => true),
        };
        const image = {
            model,
            source: 'hero',
            opacity: 0.4,
            getLocation: jest.fn(() => new Point(1, 2)),
            getSize: jest.fn(() => new Size(3, 4)),
        };

        renderer.renderImageElement(c, image as never);

        expect(c.drawImage).toHaveBeenCalledWith(bitmap.image, 100, 200, 40, 50);
        expect(c.globalAlpha).toBe(1);
        expect(c.strokeRect).toHaveBeenCalledWith(100, 200, 40, 50);
    });

    test('renderImageElement throws when source is missing', () => {
        const renderer = new DesignRenderer(createController());
        const c = createContext();

        const image = {
            model: {
                resourceManager: { get: jest.fn() },
                setElementStroke: jest.fn(() => false),
                setRenderTransform: jest.fn(),
            },
            getLocation: jest.fn(() => new Point(1, 2)),
            getSize: jest.fn(() => new Size(3, 4)),
        };

        expect(() => renderer.renderImageElement(c, image as never)).toThrow('Source is undefined');
    });

    test('renderSpriteElement returns early when no frames are present', () => {
        const renderer = new DesignRenderer(createController());
        const c = createContext();

        const sprite = {
            model: {},
            frames: undefined,
        };

        renderer.renderSpriteElement(c, sprite as never);

        expect(c.drawImage).not.toHaveBeenCalled();
    });

    test('renderSpriteElement uses frame opacity branch drawImage signature', () => {
        const renderer = new DesignRenderer(createController());
        const c = createContext();
        const bitmap = { image: {} };

        const sprite = {
            model: {
                resourceManager: { get: jest.fn(() => bitmap) },
                setRenderTransform: jest.fn(),
            },
            frameIndex: 0,
            frames: [{ source: 'sheet', x: 1, y: 2, width: 10, height: 11, opacity: 0.5 }],
            getLocation: jest.fn(() => new Point(7, 8)),
            getSize: jest.fn(() => new Size(20, 21)),
        };

        renderer.renderSpriteElement(c, sprite as never);

        expect(c.drawImage).toHaveBeenCalledWith(bitmap.image, 1, 2, 10, 11, 7, 8, 20, 21);
        expect(c.globalAlpha).toBe(1);
    });

    test('renderModelElement scales to inner model and renders non-opacity path', () => {
        const renderer = new DesignRenderer(createController());
        const c = createContext();

        const innerModel = {
            size: '20x10',
            getSize: jest.fn(() => new Size(20, 10)),
            renderToContext: jest.fn(),
        };
        const modelElement = {
            model: {
                resourceManager: { get: jest.fn(() => ({ model: innerModel })) },
                setRenderTransform: jest.fn(),
            },
            source: 'nested',
            getLocation: jest.fn(() => new Point(10, 30)),
            getSize: jest.fn(() => new Size(40, 20)),
        };

        renderer.renderModelElement(c, modelElement as never);

        expect(c.translate).toHaveBeenCalledWith(10, 30);
        expect(c.scale).toHaveBeenCalledWith(2, 2);
        expect(innerModel.renderToContext).toHaveBeenCalledWith(c);
    });
});
