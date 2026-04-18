import { SurfacePane } from './surface-pane';
import { Surface } from './surface';
import { SurfaceLayer } from './surface-layer';

/**
 * Parsed navigation action from a click action string
 */
export class NavigationAction {
    /**
     * Parses an action string into a NavigationAction instance
     * @param action - Action string (e.g. "navigate(surfaceId,fade,0.3)")
     * @returns Parsed NavigationAction or undefined if not a recognized action
     */
    public static parse(action: string): NavigationAction | undefined {
        if (!action) {
            return undefined;
        }

        const match = action.match(/^(\w+)\(([^)]*)\)$/);
        if (!match) {
            return undefined;
        }

        const actionName = match[1].toLowerCase();
        const args = match[2].split(',').map(s => s.trim()).filter(s => s.length > 0);

        const nav = new NavigationAction();

        switch (actionName) {
            case 'navigate':
                nav.action = 'navigate';
                nav.targetSurfaceId = args[0];
                if (args.length > 1) {
                    nav.transition = args[1];
                }
                if (args.length > 2) {
                    nav.duration = parseFloat(args[2]);
                }
                break;

            case 'navigatepane':
                nav.action = 'navigatePane';
                nav.targetPaneId = args[0];
                nav.targetSurfaceId = args[1];
                if (args.length > 2) {
                    nav.transition = args[2];
                }
                if (args.length > 3) {
                    nav.duration = parseFloat(args[3]);
                }
                break;

            case 'navigateback':
                nav.action = 'navigateBack';
                if (args.length > 0) {
                    nav.transition = args[0];
                }
                if (args.length > 1) {
                    nav.duration = parseFloat(args[1]);
                }
                break;

            default:
                return undefined;
        }

        return nav;
    }

    /**
     * Action type: 'navigate', 'navigatePane', or 'navigateBack'
     */
    public action: string = '';

    /**
     * Target surface ID for navigation
     */
    public targetSurfaceId?: string;

    /**
     * Target pane ID for directed navigation
     */
    public targetPaneId?: string;

    /**
     * Transition effect name
     */
    public transition?: string;

    /**
     * Transition duration in seconds
     */
    public duration?: number;

    /**
     * Finds the nearest ancestor SurfacePane containing the given surface
     * @param rootSurface - Root surface to search
     * @param targetSurface - Surface whose parent pane to find
     * @returns Parent SurfacePane or undefined
     */
    private findContainingPane(rootSurface: Surface, targetSurface: Surface): SurfacePane | undefined {
        for (const layer of rootSurface.layers) {
            if (layer instanceof SurfacePane) {
                if (layer.childSurface === targetSurface) {
                    return layer;
                }
                // Recursive search in child surface
                const found = this.findContainingPane(layer.childSurface, targetSurface);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    /**
     * Finds a SurfacePane by ID in the root surface tree
     * @param surface - Surface to search
     * @param paneId - Pane ID to find
     * @returns Matching SurfacePane or undefined
     */
    private findPaneById(surface: Surface, paneId: string): SurfacePane | undefined {
        for (const layer of surface.layers) {
            if (layer instanceof SurfacePane) {
                if (layer.id === paneId) {
                    return layer;
                }
                const found = this.findPaneById(layer.childSurface, paneId);
                if (found) {
                    return found;
                }
            }
        }
        return undefined;
    }

    /**
     * Executes the navigation action against an application surface graph
     * @param surfaceLookup - Function to resolve a surface by ID
     * @param rootSurface - Root surface of the application
     * @param sourceSurface - Surface containing the element that triggered the action
     * @param callback - Completion callback
     */
    public execute(
        surfaceLookup: (id: string) => Surface | undefined,
        rootSurface: Surface,
        sourceSurface: Surface,
        callback?: () => void
    ): void {
        const onComplete = () => {
            if (callback) {
                callback();
            }
        };

        switch (this.action) {
            case 'navigate': {
                if (!this.targetSurfaceId) {
                    return;
                }
                const targetSurface = surfaceLookup(this.targetSurfaceId);
                if (!targetSurface) {
                    return;
                }
                // Find nearest containing pane
                const pane = this.findContainingPane(rootSurface, sourceSurface);
                if (!pane) {
                    return;
                }
                // Push current surface onto navigation history
                if (pane.childSurface && pane.childSurface.id) {
                    pane.navigationHistory.push(pane.childSurface.id);
                }
                const newSurface = new Surface(targetSurface.width, targetSurface.height, targetSurface.id, targetSurface.scale);
                newSurface.parseData(targetSurface.serialize());
                pane.replaceSurface(newSurface, () => { onComplete(); }, this.transition, this.duration);
                break;
            }

            case 'navigatePane': {
                if (!this.targetPaneId || !this.targetSurfaceId) {
                    return;
                }
                const targetSurface = surfaceLookup(this.targetSurfaceId);
                if (!targetSurface) {
                    return;
                }
                const pane = this.findPaneById(rootSurface, this.targetPaneId);
                if (!pane) {
                    return;
                }
                if (pane.childSurface && pane.childSurface.id) {
                    pane.navigationHistory.push(pane.childSurface.id);
                }
                const newSurface = new Surface(targetSurface.width, targetSurface.height, targetSurface.id, targetSurface.scale);
                newSurface.parseData(targetSurface.serialize());
                pane.replaceSurface(newSurface, () => { onComplete(); }, this.transition, this.duration);
                break;
            }

            case 'navigateBack': {
                const pane = this.findContainingPane(rootSurface, sourceSurface);
                if (!pane || pane.navigationHistory.length === 0) {
                    return;
                }
                const previousId = pane.navigationHistory.pop()!;
                const previousSurface = surfaceLookup(previousId);
                if (!previousSurface) {
                    return;
                }
                const newSurface = new Surface(previousSurface.width, previousSurface.height, previousSurface.id, previousSurface.scale);
                newSurface.parseData(previousSurface.serialize());
                pane.replaceSurface(newSurface, () => { onComplete(); }, this.transition, this.duration);
                break;
            }
        }
    }
}
