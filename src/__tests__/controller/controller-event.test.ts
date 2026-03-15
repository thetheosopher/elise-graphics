import { ControllerEvent } from '../../controller/controller-event';

test('controller event add and trigger', () => {
    const event = new ControllerEvent<string>();
    let received = '';
    event.add((_controller, data) => {
        received = data ?? '';
    });
    event.trigger(undefined as any, 'test-data');
    expect(received).toBe('test-data');
});

test('controller event multiple handlers', () => {
    const event = new ControllerEvent<number>();
    let sum = 0;
    event.add((_c, data) => { sum += data ?? 0; });
    event.add((_c, data) => { sum += (data ?? 0) * 2; });
    event.trigger(undefined as any, 5);
    expect(sum).toBe(15); // 5 + 10
});

test('controller event remove handler', () => {
    const event = new ControllerEvent<number>();
    let called = false;
    const handler = () => { called = true; };
    event.add(handler);
    event.remove(handler);
    event.trigger(undefined as any, 1);
    expect(called).toBe(false);
});

test('controller event hasListeners', () => {
    const event = new ControllerEvent<string>();
    expect(event.hasListeners()).toBe(false);
    const handler = () => {};
    event.add(handler);
    expect(event.hasListeners()).toBe(true);
    event.remove(handler);
    expect(event.hasListeners()).toBe(false);
});

test('controller event clear', () => {
    const event = new ControllerEvent<string>();
    event.add(() => {});
    event.add(() => {});
    expect(event.hasListeners()).toBe(true);
    event.clear();
    expect(event.hasListeners()).toBe(false);
});
