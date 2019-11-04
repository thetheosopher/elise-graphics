import {Model} from '../core/model';
import {Utility} from '../core/utility';
import {ElementBase} from '../elements/element-base';
import {Surface} from './surface';

export class SurfaceElement {
    /**
     * Element id
     */
    public id: string;

    /**
     * Element X coordinate
     */
    public left: number;

    /**
     * Element Y coordinate
     */
    public top: number;

    /**
     * Element width
     */
    public width: number;

    /**
     * Element height
     */
    public height: number;

    /**
     * Parent surface
     */
    public surface?: Surface;

    /**
     * Base class for surface elements
     * @param id - Item id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     */
    constructor(id: string, left: number, top: number, width: number, height: number) {
        if (id) {
            this.id = id;
        }
        else {
            this.id = Utility.guid();
        }
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }

    /**
     * Adds item to surface model
     * @param model - Surface model
     */
    public addToModel(model: Model): ElementBase | undefined {
        return undefined;
    }
}
