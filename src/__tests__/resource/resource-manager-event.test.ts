import { ResourceManagerEvent } from '../../resource/resource-manager-event';

test('resource manager event add/trigger/remove', () => {
    const evt = new ResourceManagerEvent<number>();
    let value = 0;
    const handler = (_source: unknown, data?: number) => {
        value = data ?? 0;
    };

    evt.add(handler);
    expect(evt.hasListeners()).toBe(true);

    evt.trigger({}, 7);
    expect(value).toBe(7);

    evt.remove(handler);
    expect(evt.hasListeners()).toBe(false);
});

test('resource manager event listeners remains accessible', () => {
    const evt = new ResourceManagerEvent<number>();
    evt.add(() => {});
    expect(evt.listeners.length).toBe(1);
    evt.clear();
    expect(evt.listeners.length).toBe(0);
});
