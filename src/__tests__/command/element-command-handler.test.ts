import { ElementCommandHandler } from '../../command/element-command-handler';
import { CommandEventTrigger } from '../../command/command-event-trigger';
import { TimerParameters } from '../../core/timer-parameters';

function createController() {
    return {
        draw: jest.fn(),
        invalidate: jest.fn(),
        mouseEnteredElement: { add: jest.fn() },
        mouseLeftElement: { add: jest.fn() },
        mouseDownElement: { add: jest.fn() },
        mouseUpElement: { add: jest.fn() },
        elementClicked: { add: jest.fn() },
        timer: { add: jest.fn() },
    } as never;
}

describe('element command handler', () => {
    test('pushFill and popFill update fill stack and redraw', () => {
        const controller = createController() as never;
        const element = {
            fill: 'Red',
            setFill: jest.fn(function(this: { fill?: string }, value: string) {
                this.fill = value;
                return this;
            }),
        };

        ElementCommandHandler.pushFill(controller, element as never, 'pushFill(Blue)', '', '');

        expect(element.fill).toBe('Blue');
        expect((element as never as { fillStack?: string[] }).fillStack).toEqual(['Red']);
        expect((controller as never as { draw: jest.Mock }).draw).toHaveBeenCalledTimes(1);

        ElementCommandHandler.popFill(controller, element as never, '', '', '');

        expect(element.fill).toBe('Red');
        expect((element as never as { fillStack?: string[] }).fillStack).toBeUndefined();
        expect((controller as never as { draw: jest.Mock }).draw).toHaveBeenCalledTimes(2);
    });

    test('popFill and popStroke return early when stacks are missing', () => {
        const controller = createController() as never;
        const element = {};

        ElementCommandHandler.popFill(controller, element as never, '', '', '');
        ElementCommandHandler.popStroke(controller, element as never, '', '', undefined);

        expect((controller as never as { draw: jest.Mock }).draw).not.toHaveBeenCalled();
    });

    test('pushStroke and popStroke update stack and redraw', () => {
        const controller = createController() as never;
        const element = {
            stroke: 'Black,1',
        };

        ElementCommandHandler.pushStroke(controller, element as never, 'pushStroke(Gold,2)', '', '');

        expect(element.stroke).toBe('Gold,2');
        expect((element as never as { strokeStack?: string[] }).strokeStack).toEqual(['Black,1']);

        ElementCommandHandler.popStroke(controller, element as never, '', '', undefined);

        expect(element.stroke).toBe('Black,1');
        expect((element as never as { strokeStack?: string[] }).strokeStack).toBeUndefined();
        expect((controller as never as { draw: jest.Mock }).draw).toHaveBeenCalledTimes(2);
    });

    test('pushFrame and popFrame manage sprite frame stack', () => {
        const controller = createController() as never;
        const sprite = {
            frameIndex: 1,
        };

        ElementCommandHandler.pushFrame(controller, sprite as never, 'pushFrame(3)', '', undefined);

        expect(sprite.frameIndex).toBe(3);
        expect((sprite as never as { frameStack?: number[] }).frameStack).toEqual([1]);

        ElementCommandHandler.popFrame(controller, sprite as never, '', '', undefined);

        expect(sprite.frameIndex).toBe(1);
        expect((sprite as never as { frameStack?: number[] }).frameStack).toBeUndefined();
        expect((controller as never as { draw: jest.Mock }).draw).toHaveBeenCalledTimes(2);
    });

    test('attachController wires all controller events', () => {
        const handler = new ElementCommandHandler();
        const controller = createController() as never;

        handler.attachController(controller);

        expect((controller as never as { commandHandler?: unknown }).commandHandler).toBe(handler);
        expect((controller as never as { mouseEnteredElement: { add: jest.Mock } }).mouseEnteredElement.add).toHaveBeenCalledWith(handler.elementMouseEntered);
        expect((controller as never as { mouseLeftElement: { add: jest.Mock } }).mouseLeftElement.add).toHaveBeenCalledWith(handler.elementMouseLeft);
        expect((controller as never as { mouseDownElement: { add: jest.Mock } }).mouseDownElement.add).toHaveBeenCalledWith(handler.elementMouseDown);
        expect((controller as never as { mouseUpElement: { add: jest.Mock } }).mouseUpElement.add).toHaveBeenCalledWith(handler.elementMouseUp);
        expect((controller as never as { elementClicked: { add: jest.Mock } }).elementClicked.add).toHaveBeenCalledWith(handler.elementClicked);
        expect((controller as never as { timer: { add: jest.Mock } }).timer.add).toHaveBeenCalledWith(handler.timer);
    });

    test('onElementCommandFired returns false when command registration is missing', () => {
        const handler = new ElementCommandHandler();
        const controller = createController() as never;

        const result = handler.onElementCommandFired(controller, {} as never, 'unknown(1)', CommandEventTrigger.Click);

        expect(result).toBe(false);
    });

    test('onElementCommandFired executes registered handler and returns true', () => {
        const handler = new ElementCommandHandler();
        const controller = createController() as never;
        const callback = jest.fn();

        handler.addHandler('pushFill', callback as never);

        const result = handler.onElementCommandFired(controller, {} as never, 'pushFill(Blue)', CommandEventTrigger.Click);

        expect(result).toBe(true);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('addHandler updates existing registration; removeHandler and clearHandlers prune list', () => {
        const handler = new ElementCommandHandler();
        const first = jest.fn();
        const second = jest.fn();

        handler.addHandler('pushFill', first as never);
        handler.addHandler('pushFill', second as never);

        expect(handler.registrations.length).toBe(1);
        expect(handler.getRegistration('pushFill')?.handler).toBe(second);

        handler.removeHandler('pushFill');
        expect(handler.getRegistration('pushFill')).toBeUndefined();

        handler.addHandler('pushStroke', first as never);
        handler.clearHandlers();
        expect(handler.registrations).toEqual([]);
    });

    test('timer calls element timers recursively for nested model elements and model resources', () => {
        const handler = new ElementCommandHandler();
        const controller = createController() as never;

        const rootTimed = { type: 'rectangle', timer: 'pushFill(Blue)' };
        const nestedTimed = { type: 'rectangle', timer: 'pushStroke(Red,2)' };
        const resourceTimed = { type: 'rectangle', timer: 'pushFrame(2)' };

        const nestedModel = {
            elements: [nestedTimed],
            resources: [],
            resourceManager: { get: jest.fn() },
        };

        const resourceModel = {
            elements: [resourceTimed],
            resources: [],
            resourceManager: { get: jest.fn() },
        };

        const rootModelElement = {
            type: 'model',
            source: 'nested',
            sourceModel: undefined,
        };

        const rootModel = {
            elements: [rootTimed, rootModelElement],
            resources: [{ type: 'model', model: resourceModel }],
            resourceManager: { get: jest.fn(() => ({ model: nestedModel })) },
        };

        (controller as never as { model?: unknown }).model = rootModel;
        (controller as never as { commandHandler?: unknown }).commandHandler = handler;

        const firedSpy = jest.spyOn(handler, 'onElementCommandFired').mockImplementation(() => true);

        handler.timer(controller, new TimerParameters(2, 0.1));

        expect(firedSpy).toHaveBeenCalledWith(controller, rootTimed as never, 'pushFill(Blue)', CommandEventTrigger.Timer, expect.any(TimerParameters));
        expect(firedSpy).toHaveBeenCalledWith(controller, nestedTimed as never, 'pushStroke(Red,2)', CommandEventTrigger.Timer, expect.any(TimerParameters));
        expect(firedSpy).toHaveBeenCalledWith(controller, resourceTimed as never, 'pushFrame(2)', CommandEventTrigger.Timer, expect.any(TimerParameters));
    });

    test('element mouse event helpers do not fire without matching command string', () => {
        const handler = new ElementCommandHandler();
        const controller = createController() as never;
        (controller as never as { commandHandler?: unknown }).commandHandler = handler;

        const firedSpy = jest.spyOn(handler, 'onElementCommandFired').mockImplementation(() => true);

        handler.elementMouseEntered(controller, {} as never);
        handler.elementMouseLeft(controller, {} as never);
        handler.elementMouseDown(controller, {} as never);
        handler.elementMouseUp(controller, {} as never);
        handler.elementClicked(controller, {} as never);

        expect(firedSpy).not.toHaveBeenCalled();
    });
});
