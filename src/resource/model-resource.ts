import { ErrorMessages } from '../core/error-messages';
import { Model } from '../core/model';
import { Size } from '../core/size';
import { Utility } from '../core/utility';
import { Resource } from './resource';
import { ResourceFactory } from './resource-factory';
import { UrlProxy } from './url-proxy';

/**
 * Embedded or externally referenced model resource
 */
export class ModelResource extends Resource {
    /**
     * Creates model resource from string model URI (referenced) or exising model object (embedded)
     * @param key - Resource key
     * @param uriOrModel - Model URI or existing model object
     * @param locale - Optional resource locale ID (e.g. en-US)
     * @returns New model resource
     */
    public static create(key: string, uriOrModel: string | Model, locale?: string): ModelResource {
        const r = new ModelResource();
        if (arguments.length >= 2) {
            r.key = key;
            if (typeof uriOrModel === 'string') {
                r.uri = uriOrModel;
            }
            else {
                r.model = uriOrModel.clone();
            }
        }
        if (locale) {
            r.locale = locale;
        }
        return r;
    }

    /**
     * Model dimensions
     */
    public size?: Size;

    /**
     * Resource model
     */
    public model?: Model;

    constructor() {
        super('model');
    }

    /**
     * Clones this resource to a new instance
     * @returns Cloned model resource
     */
    public clone(): ModelResource {
        let o: ModelResource | undefined;
        if (!this.key) {
            throw new Error(ErrorMessages.ResourceKeyIsUndefined);
        }
        if (this.model) {
            o = ModelResource.create(this.key, this.model, this.locale);
        }
        else if (this.uri) {
            o = ModelResource.create(this.key, this.uri, this.locale);
        }
        if (!o) {
            throw new Error(ErrorMessages.ResourceIsInvalid);
        }
        super.cloneTo(o);
        if (this.size) {
            o.size = this.size;
        }
        return o;
    }

    /**
     * Copies properties of another model resource
     * @param o - Source model resource
     */
    public parse(o: any): void {
        super.parse(o);
        if (o.model) {
            this.model = Model.parse(JSON.stringify(o.model));
        }
        if (o.size) {
            this.size = Size.parse(o.size);
        }
    }

    /**
     * Serializes resource to a new instance
     * @returns Serialized resource instance
     */
    public serialize(): any {
        const o = super.serialize();
        if (this.model && !this.uri) {
            o.model = JSON.parse(JSON.stringify(this.model.serialize()));
        }
        if (this.size) {
            o.size = this.size.toString();
        }
        return o;
    }

    /**
     * Retrieves model resource from an http(s) source
     * @param url - Model source URL
     * @param callback - Retrieval callback (result: boolean)
     */
    public load(url: string, callback: (result: boolean) => void): void {
        const res = this;
        if (!res.resourceManager) {
            throw new Error(ErrorMessages.ResourceManagerIsUndefined);
        }
        if (!res.resourceManager.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        let urlProxy: UrlProxy | undefined;
        if (this.resourceManager) {
            urlProxy = this.resourceManager.urlProxy;
        }
        if (Utility.startsWith(url.toLowerCase(), 'http://') || Utility.startsWith(url.toLowerCase(), 'https://')) {
            Model.load('', url, model => {
                if (model && res.resourceManager) {
                    res.model = model;
                    res.model.resourceManager.urlProxy = urlProxy;
                    res.model.prepareResources(res.resourceManager.currentLocaleId, () => {
                        callback(true);
                    });
                }
                else {
                    callback(false);
                }
            });
        }
        else {
            if (!res.resourceManager.model.basePath) {
                throw new Error(ErrorMessages.ModelBasePathUndefined);
            }
            const basePath = res.resourceManager.model.basePath;
            const relUrl = url.substring(basePath.length, url.length);
            Model.load(basePath, relUrl, model => {
                if (model && res.resourceManager) {
                    res.model = model;
                    res.model.resourceManager.urlProxy = urlProxy;
                    res.model.prepareResources(res.resourceManager.currentLocaleId, () => {
                        callback(true);
                    });
                }
                else {
                    callback(false);
                }
            });
        }
    }

    public initialize() {
        const self = this;

        if (!self.resourceManager) {
            throw new Error(ErrorMessages.ResourceManagerIsUndefined);
        }

        // If embedded model, no need to retrieve, but init resources
        if (self.model && self.resourceManager.model) {
            self.model.basePath = self.resourceManager.model.basePath;
            self.model.prepareResources(self.resourceManager.currentLocaleId, success => {
                if (self.resourceManager) {
                    self.resourceManager.unregister(self, success);
                }
            });
        }
        else {
            // Get model source URI
            const modelPath = this.uri;

            if (!modelPath) {
                throw new Error(ErrorMessages.ModelPathUndefined);
            }

            // If Url Proxy is set, use it to get signed url
            if (self.resourceManager.urlProxy) {
                self.resourceManager.urlProxy.getUrl(modelPath, (success, url) => {
                    if (success) {
                        self.load(url, result => {
                            if (self.resourceManager) {
                                self.resourceManager.unregister(self, result);
                            }
                        });
                    }
                    else {
                        if (self.resourceManager) {
                            self.resourceManager.unregister(self, false);
                        }
                    }
                });
            }
            else if (modelPath.charAt(0) === ':') {
                // Local (Server) Model
                const url = modelPath.substring(1, modelPath.length);
                self.load(url, success => {
                    if (self.resourceManager) {
                        self.resourceManager.unregister(self, success);
                    }
                });
            }
            else if (modelPath.charAt(0) === '/') {
                // Shared model resource relative to model base path
                if (self.resourceManager && self.resourceManager.model && self.resourceManager.model.basePath) {
                    self.load(Utility.joinPaths(self.resourceManager.model.basePath, modelPath), success => {
                        if (self.resourceManager) {
                            self.resourceManager.unregister(self, success);
                        }
                    });
                }
            }
            else {
                // Embedded model resource
                if (self.resourceManager && self.resourceManager.localResourcePath) {
                    self.load(Utility.joinPaths(self.resourceManager.localResourcePath, modelPath), success => {
                        if (self.resourceManager) {
                            self.resourceManager.unregister(self, success);
                        }
                    });
                }
            }
        }
    }
}

/* Register type creator */
ResourceFactory.registerCreator('model', ModelResource);
