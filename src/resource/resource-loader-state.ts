/**
 * Describes resource loading state
 */
export enum ResourceLoaderState {
    /**
     * Loader is idle
     */
    Idle = 1,

    /**
     * Resource loading in progress
     */
    Loading = 2,

    /**
     * Start loading resource
     */
    ResourceStart = 3,

    /**
     * Resource load completed successfully
     */

    ResourceComplete = 4,

    /**
     * Resource load failed
     */
    ResourceFailed = 5
}
