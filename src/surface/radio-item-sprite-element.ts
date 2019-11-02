import { Point } from '../core/point';
import { Size } from '../core/size';
import { SpriteElement } from '../elements/sprite-element';

export class RadioItemSpriteElement extends SpriteElement {
    /**
     * Radio strip group ID
     */
    public groupId: string;

    /**
     * Radio strip item ID
     */
    public itemId: string;

    /**
     * Extends Elise.SpriteElement to add strip item groupId and itemId properties
     * @param groupId - Radio item group id
     * @param itemId - Radio item id
     * @param left - Radio item x coordinate
     * @param top - Radio item y coordinate
     * @param width - Radio item width
     * @param height - Radio item height
     */
    constructor(groupId: string, itemId: string, left: number, top: number, width: number, height: number) {
        super();
        this.setSize(new Size(width, height));
        this.setLocation(new Point(left, top));
        this.groupId = groupId;
        this.itemId = itemId;
    }
}
