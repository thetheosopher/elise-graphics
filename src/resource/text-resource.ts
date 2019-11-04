import {ErrorMessages} from '../core/error-messages';
import {Utility} from '../core/utility';
import {Resource} from './resource';
import {ResourceFactory} from './resource-factory';

export class TextResource extends Resource {
    /**
     * Text resource factory function
     * @returns New text resource
     */
    public static create(): TextResource {
        return new TextResource();
    }

    /**
     * Creates text resource from text string
     * @param key - Resource key
     * @param text - Resource text
     * @param locale - Optional resource locale ID (e.g. en-US)
     * @returns New text resource
     */
    public static createFromText(key: string, text: string, locale?: string): TextResource {
        const tr = new TextResource();
        if (arguments.length >= 2) {
            tr.key = key;
            tr.text = text;
        }
        if (arguments.length >= 3) {
            tr.locale = locale;
        }
        return tr;
    }

    /**
     * Creates text resource from http(s) source URI
     * @param key - Resource key
     * @param uri - Resource URI
     * @param locale - Optional resource locale ID (e.g. en-US)
     * @returns New text resource
     */
    public static createFromUri(key: string, uri: string, locale?: string): TextResource {
        const tr = new TextResource();
        if (arguments.length >= 2) {
            tr.key = key;
            tr.uri = uri;
        }
        if (arguments.length >= 3) {
            tr.locale = locale;
        }
        return tr;
    }

    /**
     * Resource text
     */
    public text?: string;

    /**
     * String text resource
     */
    constructor() {
        super('text');
    }

    /**
     * Clones this resource to a new instance
     * @returns Cloned text resource
     */
    public clone(): TextResource {
        const o: TextResource = new TextResource();
        super.cloneTo(o);
        if (this.text) {
            o.text = this.text;
        }
        return o;
    }

    /**
     * Copies properties of another text resource
     * @param o - Source text resource
     */
    public parse(o: any): void {
        super.parse(o);
        if (o.text) {
            this.text = o.text;
        }
    }

    /**
     * Serializes resource to a new instance
     * @returns Serialized resource instance
     */
    public serialize(): any {
        const o = super.serialize();
        if (this.text) {
            o.text = this.text;
        }
        return o;
    }

    /**
     * Retrieves text resource from an http(s) source
     * @param url - Text source URL
     * @param callback - Retrieval callback (result: boolean)
     */
    public load(url: string, callback: (result: boolean) => void): void {
        const self = this;
        Utility.getRemoteText(url, text => {
            if (text) {
                self.text = text;
                callback(true);
            }
            else {
                callback(false);
            }
        });
    }

    public initialize() {
        const self = this;

        if (!self.resourceManager) {
            throw new Error(ErrorMessages.ResourceManagerIsUndefined);
        }

        // If embedded text, no need to retrieve file
        if (this.text) {
            self.resourceManager.unregister(self, true);
        }
        else {
            // Text Resource type
            const resourcePath = self.uri;
            if (!resourcePath) {
                throw new Error(ErrorMessages.ResourceIsInvalid);
            }
            const resourcePathLowered = resourcePath.toLowerCase();

            // Local (Server) Image
            if (resourcePath.charAt(0) === ':') {
                const url = resourcePath.substring(1, resourcePath.length);
                self.load(url, success => {
                    if (self.resourceManager) {
                        self.resourceManager.unregister(self, success);
                    }
                });
            }
            else if (resourcePath.charAt(0) === '/') {
                // Shared Text Resource
                if (self.resourceManager.model && self.resourceManager.model.basePath) {
                    self.load(Utility.joinPaths(self.resourceManager.model.basePath, resourcePath), success => {
                        if (self.resourceManager) {
                            self.resourceManager.unregister(self, success);
                        }
                    });
                }
            }
            else if (resourcePathLowered.indexOf('http://') === 0 || resourcePathLowered.indexOf('https://') === 0) {
                // Remote / External Image (http:// or https://)
                self.load(resourcePath, success => {
                    if (self.resourceManager) {
                        self.resourceManager.unregister(self, success);
                    }
                });
            }
            else {
                // Embedded Text Resource
                if (self.resourceManager.model && self.resourceManager.localResourcePath) {
                    self.load(Utility.joinPaths(self.resourceManager.localResourcePath, resourcePath), success => {
                        if (self.resourceManager) {
                            self.resourceManager.unregister(self, success);
                        }
                    });
                }
            }
        }
    }
}

// Register type creator
ResourceFactory.registerCreator('text', TextResource);
