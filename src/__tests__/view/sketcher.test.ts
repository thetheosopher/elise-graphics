import { Model } from '../../core/model';
import { Sketcher } from '../../sketcher/sketcher';

describe('Sketcher', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('reapplies viewport and render state for incremental batches', () => {
        const context = {
            save: jest.fn(),
            restore: jest.fn(),
            clearRect: jest.fn(),
            fillRect: jest.fn(),
        } as unknown as CanvasRenderingContext2D;
        const renderer = {
            applyRenderState: jest.fn(),
            renderElement: jest.fn(),
            renderModelStroke: jest.fn(),
        };
        const controller = {
            canvas: {
                getContext: () => context,
            } as unknown as HTMLCanvasElement,
            model: Model.create(100, 50),
            renderer,
            scale: 3,
            applyRenderViewport: jest.fn(),
        } as unknown as any;
        const sourceElement = {
            type: 'rectangle',
            fill: '#123456',
            clone: jest.fn(() => ({
                setFill: jest.fn(),
                setStroke: jest.fn(),
            })),
        };
        const sourceModel = Model.create(100, 50);
        sourceModel.elements = [sourceElement as unknown as any];
        const drawModel = Model.create(100, 50);
        const sketcher = new Sketcher(sourceModel);
        const sketchDone = jest.fn();

        jest.spyOn(global, 'setTimeout').mockReturnValue(0 as unknown as NodeJS.Timeout);

        sketcher.controller = controller;
        sketcher.drawModel = drawModel;
        sketcher.repeat = false;
        sketcher.sketchDone.add(sketchDone);

        sketcher.onModelSet();
        sketcher.drawNextElement(sketcher);
        sketcher.drawNextElement(sketcher);
        sketcher.drawNextElement(sketcher);
        sketcher.drawNextElement(sketcher);

        expect(controller.applyRenderViewport).toHaveBeenNthCalledWith(1, context, true);
        expect(controller.applyRenderViewport).toHaveBeenNthCalledWith(2, context, false);
        expect(controller.applyRenderViewport).toHaveBeenNthCalledWith(3, context);
        expect(renderer.applyRenderState).toHaveBeenNthCalledWith(1, context, 3);
        expect(renderer.applyRenderState).toHaveBeenNthCalledWith(2, context, 3);
        expect(renderer.applyRenderState).toHaveBeenNthCalledWith(3, context, 3);
        expect(renderer.renderElement).toHaveBeenCalledTimes(2);
        expect(renderer.renderModelStroke).toHaveBeenCalledWith(context);
        expect(sketchDone).toHaveBeenCalledWith(true);
    });
});