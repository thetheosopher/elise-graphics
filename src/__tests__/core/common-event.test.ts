import { CommonEvent } from '../../core/common-event';

test('common event', () => {
    const evt = new CommonEvent<number>();
    let output1: number | undefined = 0;
    let output2: number | undefined = 0;
    expect(evt.hasListeners()).toBe(false);
    const handler1 = (value: number | undefined) => {
        output1 = value;
    };
    const handler2 = (value: number | undefined) => {
        output2 = value;
    };
    evt.add(handler1);
    expect(evt.hasListeners()).toBe(true);
    evt.add(handler2);
    evt.trigger(1);
    expect(output1).toBe(1);
    expect(output2).toBe(1);
    evt.remove(handler1);
    expect(evt.hasListeners()).toBe(true);
    evt.trigger(2);
    expect(output1).toBe(1);
    expect(output2).toBe(2);
    evt.clear();
    expect(evt.hasListeners()).toBe(false);
});
