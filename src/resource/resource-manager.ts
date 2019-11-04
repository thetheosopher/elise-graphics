import {ErrorMessages} from '../core/error-messages';
import {Model} from '../core/model';
import {Resource} from './resource';
import {ResourceLoaderState} from './resource-loader-state';
import {ResourceManagerEvent} from './resource-manager-event';
import {ResourceState} from './resource-state';

export class ResourceManager {
    /**
     * Local resource path for model level resources
     */
    public localResourcePath?: string;

    /**
     * Current locale ID to use for localized resource lookups
     */
    public currentLocaleId?: string;

    /**
     * Array of resources not yet downloaded
     */
    public pendingResources?: Resource[] = [];

    /**
     * Number of resources not yet downloaded
     */
    public pendingResourceCount: number;

    /**
     * Total number of resources
     */
    public totalResourceCount: number;

    /**
     * Number of loaded resources
     */
    public numberLoaded: number;

    /**
     * Registered manager event listeners
     */
    public listenerEvent: ResourceManagerEvent<ResourceState> = new ResourceManagerEvent<ResourceState>();

    /**
     * Load completion callback - Multi event listener
     */
    public loadCompleted: ResourceManagerEvent<boolean> = new ResourceManagerEvent<boolean>();

    /**
     * Load completion callback - Final callback
     */
    public completionCallback?: (result: boolean) => void;

    /**
     * Resource loading failed flag
     */
    public resourceFailed: boolean = false;

    /**
     * Reference to model containing resources to manage
     */
    public model?: Model;

    /**
     * Constructs a new resource manager
     * @param model - Model with resources to manage
     */
    constructor(model: Model) {
        this.pendingResourceCount = 0;
        this.totalResourceCount = 0;
        this.numberLoaded = 0;
        this.model = model;

        this.add = this.add.bind(this);
        this.merge = this.merge.bind(this);
        this.findBestResource = this.findBestResource.bind(this);
        this.get = this.get.bind(this);
        this.register = this.register.bind(this);
        this.unregister = this.unregister.bind(this);
        this.oncomplete = this.oncomplete.bind(this);
        this.load = this.load.bind(this);
        this.loadNext = this.loadNext.bind(this);
    }

    /**
     * Adds a resource to managed resources
     * @param res - Resource to add
     */
    public add(res: Resource) {
        res.resourceManager = this;
        if (this.model) {
            this.model.resources.push(res);
        }
    }

    /**
     * Merges (adds or updates) a managed resource
     * @param res - Resource to merge
     */
    public merge(res: Resource) {
        let replaced: Resource | undefined;
        if (!this.model) {
            throw new Error(ErrorMessages.ModelPathUndefined);
        }
        if (res.locale) {
            this.model.resources.forEach(existing => {
                if (existing.key === res.key) {
                    if (existing.locale && existing.locale === res.locale) {
                        replaced = existing;
                        replaced.uri = res.uri;
                    }
                }
            });
        }
        else {
            this.model.resources.forEach(existing => {
                if (existing.key === res.key) {
                    if (!existing.locale) {
                        replaced = existing;
                        replaced.uri = res.uri;
                    }
                }
            });
        }
        if (!replaced) {
            res.resourceManager = this;
            this.model.resources.push(res);
        }
    }

    /**
     * Returns to closest matching localized resource for a
     * given key using fallback rules
     * @param key - Resource key
     * @param locale - Desired resource locale (e.g. en-US)
     * @returns Best available resource
     */
    public findBestResource(key: string, locale: string | undefined): Resource | undefined {
        let language: string | undefined;
        if (!this.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        // Try to find exact locale match if locale was specified
        if (locale && locale.length > 0) {
            for (const compare of this.model.resources) {
                if (compare.matchesFull(key, locale)) {
                    return compare;
                }
            }
        }

        // If locale was specified
        if (locale && locale.length > 0) {
            // Return generic locale match if available
            if (locale.indexOf('-') !== -1) {
                language = locale.substring(0, locale.indexOf('-'));
                for (const compare of this.model.resources) {
                    if (compare.matchesFull(key, language)) {
                        return compare;
                    }
                }
            }

            // Return other language variant if available
            if (locale.indexOf('-') !== -1) {
                language = locale.substring(0, locale.indexOf('-'));
                for (const compare of this.model.resources) {
                    if (compare.matchesLanguage(key, language)) {
                        return compare;
                    }
                }
            }

            // If generic locale requested, return any matching specific locale
            if (locale.indexOf('-') === -1 && language) {
                for (const compare of this.model.resources) {
                    if (compare.matchesLanguage(key, language)) {
                        return compare;
                    }
                }
            }
        }

        // Return unspecified locale id if available
        for (const compare of this.model.resources) {
            if (compare.matchesGeneric(key)) {
                return compare;
            }
        }

        // Return anything matching key
        for (const compare of this.model.resources) {
            if (compare.matchesKey(key)) {
                return compare;
            }
        }

        return undefined;
    }

    /**
     * Returns to closest matching localized resource for a
     * given key using fallback rules
     * @param key - Resource key
     * @param localeID - Desired resource locale (e.g. en-US)
     * @returns Best available resource
     */
    public get(key: string, localeId?: string): Resource | undefined {
        let locale: string | undefined;
        if (!localeId) {
            locale = this.currentLocaleId;
        }
        else {
            locale = localeId;
        }
        return this.findBestResource(key, locale);
    }

    /**
     * Registers best available resource for download
     * @param key - Resource key
     */
    public register(key: string): void {
        const res = this.get(key, this.currentLocaleId);
        if (res) {
            if (!res.resourceManager) {
                res.resourceManager = this;
            }
            if (res.type === 'text' && !res.uri) {
                return;
            }
            if (!res.registered) {
                res.registered = true;
                if (!this.pendingResources) {
                    this.pendingResources = [];
                }
                this.pendingResources.push(res);
                this.pendingResourceCount++;
                this.totalResourceCount++;
            }
        }
    }

    /**
     * Unregisters a downloaded resource
     * @param res - Resource downloaded
     * @param success - True if resource downloaded successfully
     */
    public unregister(res: Resource, success: boolean): void {
        // Remove resource from registered resources
        let state: ResourceState;
        if (!this.pendingResources) {
            return;
        }
        const pl = this.pendingResources.length;
        for (let i = 0; i < pl; i++) {
            if (this.pendingResources[i] === res) {
                this.pendingResources.splice(i, 1);
                res.registered = false;
                this.pendingResourceCount--;
                if (success) {
                    res.available = true;
                    this.numberLoaded++;
                }
                else {
                    res.error = true;
                    this.resourceFailed = true;
                }
                break;
            }
        }

        // Notify any event listeners
        if (this.listenerEvent.hasListeners()) {
            if (success) {
                state = new ResourceState(
                    this.numberLoaded,
                    this.totalResourceCount,
                    ResourceLoaderState.ResourceComplete,
                    res.uri || res.key || ''
                );
                this.listenerEvent.trigger(this, state);
            }
            else {
                state = new ResourceState(
                    this.numberLoaded,
                    this.totalResourceCount,
                    ResourceLoaderState.ResourceFailed,
                    res.uri || res.key || ''
                );
                this.listenerEvent.trigger(this, state);
            }
        }

        // If all done, call oncomplete
        if (this.pendingResourceCount === 0) {
            this.oncomplete(this.resourceFailed ? false : true);
            return;
        }

        // Load next resource if not done
        this.loadNext();
    }

    /**
     * Notify listeners and completion callbacks
     * @param success - Success or failure indication
     */
    public oncomplete(success: boolean): void {
        let state: ResourceState;
        if (success) {
            state = new ResourceState(
                this.numberLoaded,
                this.totalResourceCount,
                ResourceLoaderState.Idle,
                'All Resources Loaded.'
            );
        }
        else {
            state = new ResourceState(
                this.numberLoaded,
                this.totalResourceCount,
                ResourceLoaderState.Idle,
                'One or More Resources Failed To Load.'
            );
        }
        this.listenerEvent.trigger(this, state);
        this.loadCompleted.trigger(this, success);
        if (this.completionCallback) {
            this.completionCallback(success);
        }
    }

    /**
     * Loads all resource registered for download
     * @param callback - Success or failure completion callback (result: boolean)
     */
    public load(callback?: (result: boolean) => void): void {
        const rm = this;
        rm.resourceFailed = false;
        rm.completionCallback = callback;
        if (rm.pendingResourceCount === 0) {
            rm.oncomplete(true);
            return;
        }
        if (this.listenerEvent.hasListeners()) {
            const state = new ResourceState(
                rm.numberLoaded,
                rm.totalResourceCount,
                ResourceLoaderState.Loading,
                'Starting Resource Load'
            );
            this.listenerEvent.trigger(this, state);
        }
        rm.loadNext();
    }

    /**
     * Request next registered resource
     */
    public loadNext(): void {
        let state: ResourceState;
        const self = this;
        if (!self.pendingResources) {
            this.oncomplete(this.resourceFailed ? false : true);
            return;
        }
        if (self.pendingResourceCount === 0) {
            this.oncomplete(this.resourceFailed ? false : true);
            return;
        }

        // Get remaining pending resources
        const toLoad: Resource[] = [];
        self.pendingResourceCount = 0;
        for (const pendingResource of self.pendingResources) {
            if (!pendingResource.available) {
                toLoad.push(pendingResource);
                self.pendingResourceCount++;
            }
        }

        // If no pending resource, notify completion
        if (self.pendingResourceCount === 0) {
            self.oncomplete(true);
            return;
        }

        // Get next resource to load
        const resourceToLoad = toLoad[0];

        // Notify listeners of request
        if (self.listenerEvent.hasListeners()) {
            state = new ResourceState(
                self.numberLoaded,
                self.totalResourceCount,
                ResourceLoaderState.ResourceStart,
                resourceToLoad.uri || resourceToLoad.key || ''
            );
            self.listenerEvent.trigger(self, state);
        }

        // Initialize resource
        resourceToLoad.initialize();
    }
}
