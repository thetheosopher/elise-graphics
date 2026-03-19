import { Surface } from '../../surface/surface';
import { SurfaceViewController } from '../../surface/surface-view-controller';

test('surface unbind clears loaded and initialized listeners', () => {
    const globalWithWindow = global as unknown as { window?: { removeEventListener: (name: string, fn: unknown, capture?: boolean) => void } };
    globalWithWindow.window = {
        removeEventListener: (_name: string, _fn: unknown, _capture?: boolean) => {}
    };

    const surface = new Surface(100, 100, 'test-surface', 1);
    const controller = new SurfaceViewController();
    surface.controller = controller;

    const loadedHandler = (_result?: boolean) => {};
    const initializedHandler = (_controller?: SurfaceViewController) => {};

    surface.loaded.add(loadedHandler);
    surface.initialized.add(initializedHandler);

    expect(surface.loaded.hasListeners()).toBe(true);
    expect(surface.initialized.hasListeners()).toBe(true);

    surface.unbind();

    expect(surface.loaded.hasListeners()).toBe(false);
    expect(surface.initialized.hasListeners()).toBe(false);
});
