import { Utility } from '../core/utility';
import { RadioItemSpriteElement } from './radio-item-sprite-element';
import { RadioItemTextElement } from './radio-item-text-element';

export class RadioStripItem {
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
    public spriteElement?: RadioItemSpriteElement;

    /**
     * Radio strip item button text element ID
     */
    public textElement?: RadioItemTextElement;

    /**
     * Represents an item in a radio strip
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
}
