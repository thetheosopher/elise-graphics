export enum ResourceLoaderState {
    /**
     * Loader is idle
     */
    Idle = 1,

    /**
     * Start loading resources
     */
    Loading = 2,

    /**
     * Start loading resource
     */
    ResourceStart = 3,

    /**
     * Resource load completed
     */

    ResourceComplete = 4,

    /**
     * Resource load failed
     */
    ResourceFailed = 5
}
