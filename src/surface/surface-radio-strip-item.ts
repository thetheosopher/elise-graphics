import type { SerializedData } from '../core/serialization';
import { Utility } from '../core/utility';
import { SurfaceRadioItemSpriteElement } from './surface-radio-item-sprite-element';
import { SurfaceRadioItemTextElement } from './surface-radio-item-text-element';

/**
 * Represents an item in a radio strip
 */
export class SurfaceRadioStripItem {
    /**
     * Radio strip item ID
     */
    public id: string;

    /**
     * Radio strip item caption text
     */
    public text: string;

    /**
     * True if item is selected
     */
    public isSelected: boolean;

    /**
     * Radio strip item button sprite element
     */
    public spriteElement?: SurfaceRadioItemSpriteElement;

    /**
     * Radio strip item button text element ID
     */
    public textElement?: SurfaceRadioItemTextElement;

    /**
     * @param id - Strip item id
     * @param text - Strip item text
     */
    constructor(id: string, text: string) {
        if (id) {
            this.id = id;
        }
        else {
            this.id = Utility.guid();
        }
        this.text = text;
        this.isSelected = false;
    }

    /**
     * Serializes persistent item properties to a new object
     * @returns Serialized item data
     */
    public serialize(): SerializedData {
        const o: SerializedData = { type: 'surfaceRadioStripItem' };
        if (this.id) {
            o.id = this.id;
        }
        if (this.text) {
            o.text = this.text;
        }
        if (this.isSelected) {
            o.isSelected = this.isSelected;
        }
        return o;
    }

    /**
     * Parses serialized data into item properties
     * @param o - Serialized item data
     */
    public parse(o: SerializedData): void {
        if (o.id !== undefined) {
            this.id = o.id as string;
        }
        if (o.text !== undefined) {
            this.text = o.text as string;
        }
        if (o.isSelected !== undefined) {
            this.isSelected = o.isSelected as boolean;
        }
    }
}
