import {ErrorMessages} from '../core/error-messages';
import {Size} from '../core/size';
import {Utility} from '../core/utility';
import {Resource} from './resource';
import {ResourceFactory} from './resource-factory';

export class BitmapResource extends Resource {
    /**
     * Bitmap resource factory function
     * @param key - Resource key
     * @param uriOrImage - Resource URI or existing image object
     * @param locale - Optional resource local (e.g. en-US)
     */
    public static create(key: string, uriOrImage: string | HTMLImageElement, locale?: string): BitmapResource {
        const br = new BitmapResource();
        if (arguments.length >= 2) {
            br.key = key;
            if (typeof uriOrImage === 'string') {
                br.uri = uriOrImage;
            }
            else {
                br.image = uriOrImage;
            }
        }
        if (locale) {
            br.locale = locale;
        }
        return br;
    }

    /**
     * Bitmap dimensions
     */
    public size?: Size;

    /**
     * Retrieved image resource
     */
    public image?: HTMLImageElement;

    /**
     * Bitmap image resource
     */
    constructor() {
        super('bitmap');
    }

    /**
     * Clones this resource to a new instance
     * @returns Cloned bitmap resource
     */
    public clone(): BitmapResource {
        let o: BitmapResource | undefined;
        if (!this.key) {
            throw new Error(ErrorMessages.ResourceKeyIsUndefined);
        }
        if (!this.image && !this.uri) {
            throw new Error(ErrorMessages.BitmapResourceSourceIsUndefined);
        }
        if (this.image) {
            o = BitmapResource.create(this.key, this.image, this.locale);
        }
        else if (this.uri) {
            o = BitmapResource.create(this.key, this.uri, this.locale);
        }
        if (o) {
            super.cloneTo(o);
            if (this.size) {
                o.size = this.size;
            }
        }
        else {
            throw new Error(ErrorMessages.ResourceIsInvalid);
        }
        return o;
    }

    /**
     * Copies properties of another bitmap resource
     * @param o - Source bitmap resource
     */
    public parse(o: any): void {
        super.parse(o);
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
        if (this.size) {
            o.size = this.size.toString();
        }
        return o;
    }

    /**
     * Retrieves image resource
     * @param url - Image URL
     * @param callback - Retrieval callback (result: boolean)
     */
    public load(url: string, callback: (result: boolean) => void): void {
        const image = new Image();
        this.image = image;
        image.src = url;
        image.onload = e => {
            if (callback) {
                callback(true);
            }
        };
        image.onabort = e => {
            if (callback) {
                callback(false);
            }
        };
        image.onerror = e => {
            if (callback) {
                callback(false);
            }
        };
    }

    public initialize() {
        const self = this;

        if (!self.resourceManager) {
            throw new Error(ErrorMessages.ResourceManagerIsUndefined);
        }

        // If embedded image, just unregister
        if (self.image) {
            self.resourceManager.unregister(self, true);
        }
        else {
            // Image Resource Assumed
            const imagePath = self.uri;
            if (!imagePath) {
                throw new Error('Image path is undefined.');
            }
            const imagePathLowered = imagePath.toLowerCase();

            // Local (Server) Image
            if (imagePath.charAt(0) === ':') {
                const url = imagePath.substring(1, imagePath.length);
                self.load(url, success => {
                    if (self.resourceManager) {
                        self.resourceManager.unregister(self, success);
                    }
                });
            }
            else if (imagePath.charAt(0) === '/') {
                // Shared Image
                if (self.resourceManager && self.resourceManager.model) {
                    self.load(Utility.joinPaths(self.resourceManager.model.basePath, imagePath), success => {
                        if (self.resourceManager) {
                            self.resourceManager.unregister(self, success);
                        }
                    });
                }
            }
            else if (imagePathLowered.indexOf('http://') === 0 || imagePathLowered.indexOf('https://') === 0) {
                // Remote / External Image (http:// or https://)
                self.load(imagePath, success => {
                    if (self.resourceManager) {
                        self.resourceManager.unregister(self, success);
                    }
                });
            }
            else {
                // Embedded Image
                if (self.resourceManager && self.resourceManager.localResourcePath) {
                    self.load(Utility.joinPaths(self.resourceManager.localResourcePath, imagePath), success => {
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
ResourceFactory.registerCreator('bitmap', BitmapResource);
