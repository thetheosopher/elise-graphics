import { ComponentEvent } from '../../design/component/component-event';

test('component event add/trigger/remove', () => {
    const evt = new ComponentEvent<number>();
    let value = 0;
    const handler = (_source: unknown, data?: number) => {
        value = data ?? 0;
    };

    evt.add(handler);
    expect(evt.hasListeners()).toBe(true);

    evt.trigger({}, 5);
    expect(value).toBe(5);

    evt.remove(handler);
    expect(evt.hasListeners()).toBe(false);
});

test('component event copyTo', () => {
    const source = new ComponentEvent<number>();
    const target = new ComponentEvent<number>();

    let copiedValue = 0;
    source.add((_component, data?: number) => {
        copiedValue = data ?? 0;
    });

    source.copyTo(target);
    target.trigger({}, 9);
    expect(copiedValue).toBe(9);
});
