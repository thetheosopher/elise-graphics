import { IController } from '../controller/controller';
import { ElementBase } from '../elements/element-base';
import { ElementFactory } from '../elements/element-factory';
import { FillFactory } from '../fill/fill-factory';
import { Resource } from '../resource/resource';
import { ResourceFactory } from '../resource/resource-factory';
import { ResourceManager } from '../resource/resource-manager';
import { ResourceState } from '../resource/resource-state';
import { Color } from './color';
import { ErrorMessages } from './error-messages';
import { ModelEvent } from './model-event';
import { Point } from './point';
import { ScalingInfo } from './scaling-info';
import { Size } from './size';
import { Utility } from './utility';

/**
 * Container for rendered drawing elements and their referenced resource collection
 */
export class Model extends ElementBase {
    /**
     * Parses JSON string into model object
     * @param json - JSON source string
     */
    public static parse(json: string) {
        const o = JSON.parse(json);
        const model = new Model();
        model.parse(o);
        if (o.resources) {
            o.resources.forEach((value: Resource) => {
                const res = ResourceFactory.create(value.type);
                if (res) {
                    res.parse(value);
                    model.resourceManager.add(res);
                }
            });
        }
        if (o.elements) {
            o.elements.forEach((value: Resource) => {
                const element = ElementFactory.create(value.type);
                if (element) {
                    element.parse(value);
                    model.add(element);
                }
            });
        }
        return model;
    }

    /**
     * Loads serialized model from specified path
     * @param basePath - Base path for model URI and resource references
     * @param uri - Base path relative path to serialized model
     * @param callback - Retrieval callback accepting deserialized Model instance
     */
    public static load(basePath: string, uri: string, callback: (model?: Model) => void) {
        let modelPath: string;
        let modelFilePath: string;
        if (Utility.endsWith(uri, '/')) {
            modelPath = basePath + uri;
            modelFilePath = modelPath + 'model.json';
        }
        else {
            modelPath = basePath + uri.substring(0, uri.lastIndexOf('/') + 1);
            modelFilePath = basePath + uri;
        }
        Utility.getRemoteText(modelFilePath, json => {
            if (json) {
                const model = Model.parse(json);
                model.setBasePath(basePath);
                model.setModelPath(modelPath);
                if (callback) {
                    callback(model);
                }
            }
            else {
                callback(undefined);
            }
        });
    }

    /**
     * Model factory function
     * @param width - Model width
     * @param height - Model height
     * @returns New model instance
     */
    public static create(width: number, height: number): Model {
        const model = new Model();
        model._size = new Size(width, height);
        return model;
    }

    /**
     * Event fired when controller is attached to model
     */
    public controllerAttached: ModelEvent<IController> = new ModelEvent<IController>();

    /**
     * Event fired when controller is detached from model
     */
    public controllerDetached: ModelEvent<IController> = new ModelEvent<IController>();

    /**
     * Base path for relative resource reference
     */
    public basePath: string;

    /**
     * Model source path
     */
    public modelPath?: string;

    /**
     * Ordered array of element to be rendered. Elements are rendered using the 'painters model' with
     * elements rendered in the order they exist in the element array.
     */
    public elements: ElementBase[] = [];

    /**
     * Collection of shared resources referenced by contained elements
     */
    public resources: Resource[] = [];

    /**
     * Manager for referenced resource resolution
     */
    public resourceManager: ResourceManager;

    /**
     * Controller providing rendering and user interaction services
     */
    public controller?: IController;

    /**
     * Hosting HTML canvas element into which model is rendered
     */
    public canvas?: HTMLCanvasElement;

    /**
     * Canvas 2D rendering context into which model is rendered
     */
    public context?: CanvasRenderingContext2D;

    /**
     * Time of last frame render
     */
    public lastTime: number;

    /**
     * Enables/disables display of rendering frame rate
     */
    public displayFPS: boolean;

    constructor() {
        super('model');

        this.lastTime = 0;
        this.basePath = '/';
        this.displayFPS = false;

        this.resourceManager = new ResourceManager(this);

        // Enable for debugging
        // this.resourceManager.listenerEvent.add(this.listen);

        this.listen = this.listen.bind(this);
        this.setBasePath = this.setBasePath.bind(this);
        this.setModelPath = this.setModelPath.bind(this);
        this.add = this.add.bind(this);
        this.remove = this.remove.bind(this);
        this.createCanvas = this.createCanvas.bind(this);
        this.assignCanvas = this.assignCanvas.bind(this);
        this.prepareResources = this.prepareResources.bind(this);
        this.setElementStroke = this.setElementStroke.bind(this);
        this.setRenderTransform = this.setRenderTransform.bind(this);
        this.getFillScale = this.getFillScale.bind(this);
        this.firstActiveElementAt = this.firstActiveElementAt.bind(this);
        this.elementsAt = this.elementsAt.bind(this);
        this.elementWithId = this.elementWithId.bind(this);
        this.renderToContext = this.renderToContext.bind(this);
        this.strokeForElement = this.strokeForElement.bind(this);
        this.calculateFPS = this.calculateFPS.bind(this);
        this.formattedJSON = this.formattedJSON.bind(this);
        this.rawJSON = this.rawJSON.bind(this);
    }

    /**
     * Debug resource listening function (optionally added as listener to resource manager)
     *
     * Example
     *  ```
     *  model.resourceManager.listenerEvent.add(model.listen);
     *  ```
     * @param rm - Resource manager
     * @param state - Resource state
     */
    public listen(rm: ResourceManager, state: ResourceState): void {
        console.log(state.numberLoaded + '/' + state.totalResources + ', ' + state.status + '(' + state.code + ')');
    }

    /**
     * Sets base path for relative pathed resources
     * @param basePath - Resources base path
     */
    public setBasePath(basePath: string): void {
        this.basePath = basePath;
    }

    /**
     * Sets model path and optionally resource folder path
     * @param path - Model path
     * @param resourceFolder - Resource folder local path
     */
    public setModelPath(path: string, resourceFolder?: string) {
        this.modelPath = path;
        if (!Utility.endsWith(this.modelPath, '/')) {
            this.modelPath = this.modelPath + '/';
        }
        if (arguments.length !== 1) {
            this.resourceManager.localResourcePath = this.modelPath + 'r/';
        }
        else {
            this.resourceManager.localResourcePath = this.modelPath;
        }
    }

    /**
     * Adds an element to the end of the ordered elements array
     * @param el - Element to add
     * @returns New element index
     */
    public add(el: ElementBase): number {
        if (this.elements.indexOf(el) !== -1) {
            throw new Error(ErrorMessages.ElementAlreadyExists);
        }
        el.model = this;
        this.elements.push(el);
        return this.elements.length - 1;
    }

    /**
     * Adds an element to the beginning of the ordered elements array
     * @param el - Element to add
     * @returns New element index
     */
    public addBottom(el: ElementBase): number {
        if (this.elements.indexOf(el) !== -1) {
            throw new Error(ErrorMessages.ElementAlreadyExists);
        }
        el.model = this;
        this.elements.unshift(el);
        return 0;
    }

    /**
     * Removes an element from the elements array
     * @param el - Element to remove
     * @returns Index of removed element or -1 if not found
     */
    public remove(el: ElementBase): number {
        const index = this.elements.indexOf(el);
        if (index !== -1) {
            el.model = undefined;
            this.elements.splice(index, 1);
        }
        return index;
    }

    /**
     * Creates canvas for rendering at specified scale
     * @param scale - Rendering scale factor. Default is 1.
     * @returns New canvas element
     */
    public createCanvas(scale?: number): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        let s = 1;
        if (scale !== undefined && scale > 0) {
            s = scale;
        }
        if (this._size) {
            canvas.width = this._size.width * s;
            canvas.height = this._size.height * s;
        }
        this.canvas = canvas;
        return canvas;
    }

    /**
     * Assigns an existing canvas, resizing if necessary
     * @param canvas - Existing canvas element
     * @param scale - Rendering scale. Default is 1.
     */
    public assignCanvas(canvas: HTMLCanvasElement, scale?: number) {
        this.canvas = canvas;
        let s = 1;
        if (scale && scale > 0) {
            s = scale;
        }
        if (this._size) {
            this.canvas.width = this._size.width * s;
            this.canvas.height = this._size.height * s;
        }
    }

    /**
     * Gets reference counts for resource keys
     * @param localeId - Desired locale ID (e.g. en-US) or null for any locale
     */
    public getResourceKeyReferenceCounts(localeId: string) {
        const keys: { [index: string]: any } = {};

        const rm = this.resourceManager;
        const model = this;

        // Set locale
        rm.currentLocaleId = localeId;

        // Register resources for any model level fills
        if (model.fill) {
            if (typeof model.fill === 'string') {
                const modelFill = model.fill as string;
                if (modelFill.toLowerCase().substring(0, 6) === 'image(') {
                    let key = modelFill.substring(6, modelFill.length - 1);
                    if (key.indexOf(';') !== -1) {
                        const parts = key.split(';');
                        key = parts[1];
                    }
                    if (!keys[key]) {
                        keys[key] = 1;
                    }
                    else {
                        keys[key] += 1;
                    }
                }
                else if (modelFill.toLowerCase().substring(0, 6) === 'model(') {
                    let key = modelFill.substring(6, modelFill.length - 1);
                    if (key.indexOf(';') !== -1) {
                        const parts = key.split(';');
                        key = parts[1];
                    }
                    if (!keys[key]) {
                        keys[key] = 1;
                    }
                    else {
                        keys[key] += 1;
                    }
                }
            }
        }

        // Register resources from all elements
        const ml = model.elements.length;
        for (let i = 0; i < ml; i++) {
            const element = model.elements[i];
            if (element.getResourceKeys) {
                const elementKeys = element.getResourceKeys();
                for (const elementKey of elementKeys) {
                    if (!keys[elementKey]) {
                        keys[elementKey] = 1;
                    }
                    else {
                        keys[elementKey] += 1;
                    }
                }
            }
        }

        return keys;
    }

    /**
     * Load all resource for the specified, optional, locale ID and
     * call callback upon completion
     * @param localeId - Desired locale ID (e.g. en-US) or null for any locale
     * @param callback - Completion callback with boolean success or failure result (result: boolean)
     */
    public prepareResources(localeId?: string, callback?: (result: boolean) => void) {
        const rm = this.resourceManager;
        const model = this;

        // Set locale
        rm.currentLocaleId = localeId;

        // Register resources for any model level fills
        if (model.fill) {
            if (typeof model.fill === 'string') {
                const modelFill = model.fill as string;
                if (modelFill.toLowerCase().substring(0, 6) === 'image(') {
                    let key = modelFill.substring(6, modelFill.length - 1);
                    if (key.indexOf(';') !== -1) {
                        const parts = key.split(';');
                        key = parts[1];
                    }
                    rm.register(key);
                }
                else if (modelFill.toLowerCase().substring(0, 6) === 'model(') {
                    let key = modelFill.substring(6, modelFill.length - 1);
                    if (key.indexOf(';') !== -1) {
                        const parts = key.split(';');
                        key = parts[1];
                    }
                    rm.register(key);
                }
            }
        }

        // Register resources from all elements
        const ml = model.elements.length;
        for (let i = 0; i < ml; i++) {
            const element = model.elements[i];
            if (element.registerResources) {
                element.registerResources(rm);
            }
        }

        // Load resources
        rm.load(callback);
    }

    /**
     * Sets rendering stroke style on canvas element for given element
     * @param c - Rendering context
     * @param el - Element being rendered
     * @returns True if stroke was applied for element
     */
    public setElementStroke(c: CanvasRenderingContext2D, el: ElementBase): boolean {
        let color: Color;
        const stroke = this.strokeForElement(el);
        if (!stroke || stroke === 'no') {
            c.strokeStyle = 'rgba(0, 0, 0, 0)';
            return false;
        }
        if (stroke.indexOf(',') !== -1) {
            const parts = stroke.split(',');
            color = Color.parse(parts[0]);
            const width = parseFloat(parts[1]);
            c.lineWidth = width;
        }
        else {
            color = Color.parse(stroke);
            c.lineWidth = 1;
        }
        c.strokeStyle = color.toStyleString();
        c.globalAlpha = 1;
        return true;
    }

    /**
     * Sets rendering transform on canvas element for given element
     * @param c - Rendering context
     * @param t - Element transform property
     * @param origin - Reference point for transform
     */
    public setRenderTransform(c: CanvasRenderingContext2D, t: string, origin: Point) {
        if (t.length > 6 && t.substring(0, 6).toLowerCase() === 'scale(') {
            let command = t.substring(6, t.length - 1);
            let refX = origin.x;
            let refY = origin.y;
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                command = command.substring(0, command.indexOf('('));
                const center = Point.parse(centerString);
                refX += center.x;
                refY += center.y;
                c.translate(origin.x + center.x, origin.y + center.y);
            }
            else {
                c.translate(origin.x, origin.y);
            }
            if (command.indexOf(',') !== -1) {
                const parts = command.split(',');
                c.scale(parseFloat(parts[0]), parseFloat(parts[1]));
            }
            else {
                const scale = parseFloat(command);
                c.scale(scale, scale);
            }
            c.translate(-refX, -refY);
        }
        else if (t.length > 7 && t.substring(0, 7).toLowerCase() === 'rotate(') {
            let command = t.substring(7, t.length - 1);
            let refX = origin.x;
            let refY = origin.y;
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                command = command.substring(0, command.indexOf('('));
                const center = Point.parse(centerString);
                refX += center.x;
                refY += center.y;
                c.translate(origin.x + center.x, origin.y + center.y);
            }
            else {
                c.translate(origin.x, origin.y);
            }
            const angle = Math.PI / 180 * parseFloat(command);
            c.rotate(angle);
            c.translate(-refX, -refY);
        }
        else if (t.length > 10 && t.substring(0, 10).toLowerCase() === 'translate(') {
            const command = t.substring(10, t.length - 1);
            const parts = command.split(',');
            c.translate(parseFloat(parts[0]), parseFloat(parts[1]));
        }
        else if (t.length > 5 && t.substring(0, 5).toLowerCase() === 'skew(') {
            let command = t.substring(5, t.length - 1);
            let refX = origin.x;
            let refY = origin.y;
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                command = command.substring(0, command.indexOf('('));
                const center = Point.parse(centerString);
                refX += center.x;
                refY += center.y;
                c.translate(origin.x + center.x, origin.y + center.y);
            }
            else {
                c.translate(origin.x, origin.y);
            }
            const parts = command.split(',');
            const skewX = Math.PI / 180 * parseFloat(parts[0]);
            const skewY = Math.PI / 180 * parseFloat(parts[1]);
            c.transform(1, skewY, skewX, 1, 0, 0);
            c.translate(-refX, -refY);
        }
        else if (t.length > 7 && t.substring(0, 7).toLowerCase() === 'matrix(') {
            let command = t.substring(7, t.length - 1);
            let refX = origin.x;
            let refY = origin.y;
            if (command.indexOf('(') !== -1) {
                const centerString = command.substring(command.indexOf('(') + 1, command.length - 1);
                command = command.substring(0, command.indexOf('('));
                const center = Point.parse(centerString);
                refX += center.x;
                refY += center.y;
                c.translate(origin.x + center.x, origin.y + center.y);
            }
            else {
                c.translate(origin.x, origin.y);
            }
            const parts = command.split(',');
            c.transform(
                parseFloat(parts[0]),
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3]),
                parseFloat(parts[4]),
                parseFloat(parts[5])
            );
            c.translate(-refX, -refY);
        }
    }

    /**
     * Retrieves  scaling factor for fill
     * @param el - Element rendered
     * @returns Fill scaling info
     */
    public getFillScale(el: ElementBase): ScalingInfo {
        const result = new ScalingInfo();
        result.rx = 1.0;
        result.ry = 1.0;
        if (el.fillScale) {
            result.rx = el.fillScale;
            result.ry = el.fillScale;
        }
        return result;
    }

    /**
     * Returns topmost element at given coordinate or null if none found
     * @param c - Rendering context
     * @param tx - X coordinate
     * @param ty - Y coordinate
     * @returns Topmost element at coordinate or null if none found
     */
    public firstActiveElementAt(c: CanvasRenderingContext2D, tx: number, ty: number) {
        const count = this.elements.length;
        for (let i = count - 1; i >= 0; i--) {
            const el = this.elements[i];
            if (el.interactive && el.hitTest(c, tx, ty)) {
                return el;
            }
        }
        return undefined;
    }

    /**
     * Returns all elements at given coordinate or empty [] if none found
     * @param c - Rendering context
     * @param tx - X coordinate
     * @param ty - Y coordinate
     * @returns Array of elements at coordinate
     */
    public elementsAt(c: CanvasRenderingContext2D, tx: number, ty: number): ElementBase[] {
        const els: ElementBase[] = [];
        this.elements.forEach(el => {
            if (el.interactive && el.hitTest(c, tx, ty)) {
                els.push(el);
            }
        });
        return els;
    }

    /**
     * Returns element with given ID or null if not found
     * @param id - Element ID
     * @returns First element with given ID or undefined if not found
     */
    public elementWithId(id: string) {
        const count = this.elements.length;
        for (let i = 0; i < count; i++) {
            const el = this.elements[i];
            if (el.id === id) {
                return el;
            }
        }
        return undefined;
    }

    /**
     * Renders model to provided 2d canvas rendering context at specified scale
     * @param c - Rendering context
     * @param scale - Rendering scale. Default is 1.
     */
    public renderToContext(c: CanvasRenderingContext2D, scale?: number) {
        if (!this._size) {
            throw new Error('Size is undefined.');
        }
        let location = this._location;
        if (!location) {
            location = new Point(0, 0);
        }
        let w = this._size.width;
        let h = this._size.height;
        if (scale) {
            w *= scale;
            h *= scale;
        }

        // If transformed
        c.save();
        c.beginPath();
        c.rect(0, 0, w, h);
        c.clip();
        if (this.transform) {
            this.setRenderTransform(c, this.transform, location);
        }

        // Fill
        if (FillFactory.setElementFill(c, this)) {
            if (this.fillOffsetX || this.fillOffsetY) {
                const fillOffsetX = this.fillOffsetX || 0;
                const fillOffsetY = this.fillOffsetY || 0;
                c.translate(fillOffsetX, fillOffsetY);
                c.fillRect(-fillOffsetX, -fillOffsetY, w, h);
                c.translate(-fillOffsetX, -fillOffsetY);
            }
            else {
                c.fillRect(0, 0, w, h);
            }
        }

        // Render elements
        c.globalAlpha = 1.0;
        const el = this.elements.length;
        for (let i = 0; i < el; i++) {
            this.elements[i].draw(c);
        }

        // Stroke
        if (this.setElementStroke(c, this)) {
            c.strokeRect(0, 0, this._size.width, this._size.height);
        }
        c.restore();
    }

    /**
     * Returns stroke for given element with inheritance
     * @param el - Element
     * @returns Element stroke
     */
    public strokeForElement(el: ElementBase): string | undefined {
        let compare: ElementBase | undefined = el;
        while (compare) {
            if (compare.stroke) {
                return compare.stroke;
            }
            compare = compare.parent;
        }
        return undefined;
    }

    /**
     * Calculates frame rate in frames/second based on time since last frame
     * @returns Frame rate in frames / second
     */
    public calculateFPS(): number {
        const now = +new Date();
        const fps = 1000 / (now - this.lastTime);
        this.lastTime = now;
        return fps;
    }

    /**
     * Clones this model to a new instance
     * @returns Cloned model instance
     */
    public clone(): Model {
        if (!this._size) {
            throw new Error('Size is undefined.');
        }
        const m: Model = Model.create(this._size.width, this._size.height);
        super.cloneTo(m);
        if (this.resourceManager && this.resources && this.resources.length > 0) {
            m.resources = [];
            this.resources.forEach(r => {
                m.resources.push(r.clone());
            });
        }
        if (this.elements && this.elements.length > 0) {
            m.elements = [];
            this.elements.forEach(e => {
                const clone = e.clone();
                clone.model = m;
                m.elements.push(clone);
            });
        }
        return m;
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): any {
        const o = super.serialize();
        if (this.resources && this.resources.length > 0) {
            o.resources = [];
            this.resources.forEach(r => {
                o.resources.push(r.serialize());
            });
        }
        if (this.elements && this.elements.length > 0) {
            o.elements = [];
            this.elements.forEach(e => {
                o.elements.push(e.serialize());
            });
        }
        return o;
    }

    /**
     * Serializes model to formatted JSON string
     */
    public formattedJSON(): string {
        const o = this.serialize();
        return JSON.stringify(o, null, ' ');
    }

    /**
     * Serializes model to raw JSON string
     */
    public rawJSON(): string {
        const o = this.serialize();
        return JSON.stringify(o);
    }
    /**
     * Can model be stroked
     * @returns Can stroke
     */
    public canStroke(): boolean {
        return true;
    }

    /**
     * Can model be filled
     * @returns Can fill
     */
    public canFill(): boolean {
        return true;
    }
}
