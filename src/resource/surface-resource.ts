import { ErrorMessages } from '../core/error-messages';
import type { SerializedData } from '../core/serialization';
import { Utility } from '../core/utility';
import { Surface } from '../surface/surface';
import { Resource } from './resource';
import { ResourceFactory } from './resource-factory';

/**
 * Embedded or externally referenced surface resource
 */
export class SurfaceResource extends Resource {
    /**
     * Creates surface resource from string URI (referenced) or existing surface object (embedded)
     * @param key - Resource key
     * @param uriOrSurface - Surface URI or existing surface object
     * @param locale - Optional resource locale ID (e.g. en-US)
     * @returns New surface resource
     */
    public static create(key: string, uriOrSurface: string | Surface, locale?: string): SurfaceResource {
        const r = new SurfaceResource();
        r.key = key;
        if (typeof uriOrSurface === 'string') {
            r.uri = uriOrSurface;
        } else {
            r.surface = uriOrSurface;
        }
        if (locale) {
            r.locale = locale;
        }
        return r;
    }

    /**
     * Resource surface
     */
    public surface?: Surface;

    constructor() {
        super('surface');
    }

    /**
     * Clones this resource to a new instance
     * @returns Cloned surface resource
     */
    public clone(): SurfaceResource {
        if (!this.key) {
            throw new Error(ErrorMessages.ResourceKeyIsUndefined);
        }
        let o: SurfaceResource;
        if (this.surface) {
            // Clone by serializing and re-parsing
            o = SurfaceResource.create(this.key, this.surface, this.locale);
        } else if (this.uri) {
            o = SurfaceResource.create(this.key, this.uri, this.locale);
        } else {
            throw new Error(ErrorMessages.ResourceIsInvalid);
        }
        super.cloneTo(o);
        return o;
    }

    /**
     * Copies properties of another surface resource
     * @param o - Source serialized data
     */
    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.surface) {
            this.surface = Surface.parse(JSON.stringify(o.surface));
        }
    }

    /**
     * Serializes resource to a new instance
     * @returns Serialized resource instance
     */
    public serialize(): SerializedData {
        const o = super.serialize();
        if (this.surface && !this.uri) {
            o.surface = JSON.parse(JSON.stringify(this.surface.serialize()));
        }
        return o;
    }

    /**
     * Retrieves surface resource from an http(s) source
     * @param url - Surface source URL
     * @param callback - Retrieval callback (result: boolean)
     */
    public load(url: string, callback: (result: boolean) => void): void {
        const res = this;
        Utility.getRemoteText(url, json => {
            if (json) {
                try {
                    res.surface = Surface.parse(json);
                    callback(true);
                } catch {
                    callback(false);
                }
            } else {
                callback(false);
            }
        });
    }

    public initialize(): void {
        const self = this;
        if (!self.resourceManager) {
            throw new Error(ErrorMessages.ResourceManagerIsUndefined);
        }

        if (self.surface) {
            // Embedded surface, no loading needed
            if (self.resourceManager) {
                self.resourceManager.unregister(self, true);
            }
        } else {
            const surfacePath = self.uri;
            if (!surfacePath) {
                throw new Error(ErrorMessages.ResourceIsInvalid);
            }

            if (self.resourceManager.urlProxy) {
                self.resourceManager.urlProxy.getUrl(surfacePath, (success, proxyUrl) => {
                    if (success) {
                        self.load(proxyUrl, result => {
                            if (self.resourceManager) {
                                self.resourceManager.unregister(self, result);
                            }
                        });
                    } else {
                        if (self.resourceManager) {
                            self.resourceManager.unregister(self, false);
                        }
                    }
                });
            } else {
                let url = surfacePath;
                if (self.resourceManager.model && self.resourceManager.model.basePath) {
                    url = self.resourceManager.model.basePath + surfacePath;
                }
                self.load(url, result => {
                    if (self.resourceManager) {
                        self.resourceManager.unregister(self, result);
                    }
                });
            }
        }
    }
}

// Register factory creator
ResourceFactory.registerCreator('surface', {
    create: () => new SurfaceResource()
});
