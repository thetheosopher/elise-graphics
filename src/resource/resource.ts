import type { SerializedData } from '../core/serialization';

interface ResourceManagerModelLike {
    basePath: string;
}

interface ResourceManagerLike {
    localResourcePath?: string;
    model?: ResourceManagerModelLike;
    currentLocaleId?: string;
    urlProxy?: {
        getUrl(url: string, callback: (success: boolean, proxyUrl: string) => void): void;
    };
    unregister(resource: Resource, success: boolean): void;
    merge(resource: Resource): void;
}

interface ResourceModelLike {
    resourceManager: ResourceManagerLike;
}

/**
 * Base class for model resources
 */
export abstract class Resource {
    /**
     * Resource type tag
     */
    public type: string;

    /**
     * Resource key
     */
    public key?: string;

    /**
     * Optional resource locale
     */
    public locale?: string;

    /**
     * Resource URI
     */
    public uri?: string;

    /**
     * Resource manager
     */
    public resourceManager?: ResourceManagerLike;

    /**
     * True if registered for retrieval
     */
    public registered: boolean = false;

    /**
     * True if downloaded and available
     */
    public available: boolean = false;

    /**
     * True if error during retrieval
     */
    public error: boolean = false;

    /**
     * Resource base class
     */
    constructor(type: string) {
        this.type = type;
        this.clone = this.clone.bind(this);
        this.cloneTo = this.cloneTo.bind(this);
        this.parse = this.parse.bind(this);
        this.serialize = this.serialize.bind(this);
        this.load = this.load.bind(this);
        this.matchesFull = this.matchesFull.bind(this);
        this.matchesGeneric = this.matchesGeneric.bind(this);
        this.matchesKey = this.matchesKey.bind(this);
        this.matchesLanguage = this.matchesLanguage.bind(this);
    }

    /**
     * Clones this resource to a new instance
     * @returns Cloned resource instance
     */
    public clone(): Resource {
        const ResourceCtor = this.constructor as { new (): Resource };
        const o = new ResourceCtor();
        this.cloneTo(o);
        return o;
    }

    /**
     * Clones properties of this resource to another resource
     * @param o - Target resource for property copy
     */
    public cloneTo(o: Resource): void {
        if (this.type) {
            o.type = this.type;
        }
        if (this.key) {
            o.key = this.key;
        }
        if (this.locale) {
            o.locale = this.locale;
        }
        if (this.uri) {
            o.uri = this.uri;
        }
    }

    /**
     * Clones properties from another resource to this resource
     * @param o - Source resource for property copy
     */
    public parse(o: SerializedData): void {
        if (o.key) {
            this.key = o.key as string;
        }
        if (o.locale) {
            this.locale = o.locale as string;
        }
        if (o.uri) {
            this.uri = o.uri as string;
        }
    }

    /**
     * Clones serializable properties from this resource to a new resource
     * @returns Serialized resource instance
     */
    public serialize(): SerializedData {
        const o: SerializedData = { type: this.type };
        if (this.key) {
            o.key = this.key;
        }
        if (this.locale) {
            o.locale = this.locale;
        }
        if (this.uri) {
            o.uri = this.uri;
        }
        return o;
    }

    /**
     * Retrieves a resource from an http(s) source
     * @param url - Resource source URL
     * @param callback - Retrieval callback (result: boolean)
     */
    public load(url: string, callback?: (result: boolean) => void): void {
        if (this.resourceManager && this.resourceManager.urlProxy) {
            this.resourceManager.urlProxy.getUrl(url, (success, proxyUrl) => {
                if (callback) {
                    callback(success);
                }
            });
        }
        else {
            if (callback) {
                callback(true);
            }
        }
    }

    /**
     * Determines if this resource fully matches a request for a desired localized
     * resource including key and locale (e.g. en-US)
     * @param key - Resource key
     * @param locale - Desired resource locale identifier
     * @returns True if both key and locale id match
     */
    public matchesFull(key: string, locale: string): boolean {
        if (!this.key) {
            return false;
        }
        if (this.key.toLowerCase() !== key.toLowerCase()) {
            return false;
        }
        if (this.locale && locale) {
            return this.locale.toLowerCase() === locale.toLowerCase();
        }
        return false;
    }

    /**
     * Determines if this resource matches a request for a desired localized
     * resource including key and language part of locale ID (e.g. en part of en-US)
     * @param key - Resource key
     * @param language - Desired resource locale identifier
     * @returns True if both key and language of requested locale match
     */
    public matchesLanguage(key: string, language: string): boolean {
        if (!this.key) {
            return false;
        }
        if (this.key.toLowerCase() !== key.toLowerCase()) {
            return false;
        }
        if (this.locale && language) {
            return this.locale.toLowerCase().slice(0, language.length + 1) === language.toLowerCase() + '-';
        }
        return false;
    }

    /**
     * Determines if this resource matches a request for a desired
     * resource key and is a generic resource without a locale designation
     * @param key - Resource key
     * @returns True if key matches resource request and resource is generic
     */
    public matchesGeneric(key: string): boolean {
        if (!this.key) {
            return false;
        }
        if (this.key.toLowerCase() !== key.toLowerCase()) {
            return false;
        }
        if (!this.locale || this.locale === null) {
            return true;
        }
        return false;
    }

    /**
     * Determines if this resource matches a request for a desired
     * resource key regardless of requested locale or resource locale
     * @param key - Resource key
     * @returns True if key matches resource request
     */
    public matchesKey(key: string): boolean {
        if (!this.key) {
            return false;
        }
        return this.key.toLowerCase() === key.toLowerCase();
    }

    public abstract initialize(): void;

    public addTo(model: ResourceModelLike) {
        model.resourceManager.merge(this);
        return this;
    }
}
