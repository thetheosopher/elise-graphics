import { ElementCommandHandler } from '../command/element-command-handler';
import { IController } from '../controller/controller';
import { CommonEvent } from '../core/common-event';
import { ErrorMessages } from '../core/error-messages';
import { Model } from '../core/model';
import { PointEventParameters } from '../core/point-event-parameters';
import { ElementBase } from '../elements/element-base';
import { SpriteElement } from '../elements/sprite-element';
import { SpriteFrame } from '../elements/sprite-frame';
import { BitmapResource } from '../resource/bitmap-resource';
import { Surface } from './surface';
import { SurfaceElementStates } from './surface-element-states';
import { SurfaceLayer } from './surface-layer';
import { SurfaceRadioItemSpriteElement } from './surface-radio-item-sprite-element';
import { SurfaceRadioItemTextElement } from './surface-radio-item-text-element';
import { SurfaceRadioStripItem } from './surface-radio-strip-item';
import { SurfaceRadioStripSelectionArgs } from './surface-radio-strip-selection-args';
import { SurfaceRadioStripViewController } from './surface-radio-strip-view-controller';

export enum RadioStripOrientation {
    Horizontal = 0,
    Vertical = 1
}

export class SurfaceRadioStrip extends SurfaceLayer {
    public static RADIO_BUTTON_DOWN = 'radioButtonDown';
    public static RADIO_BUTTON_UP = 'radioButtonUp';
    public static RADIO_BUTTON_CLICK = 'radioButtonClick';

    /**
     * Creates a radio button strip
     * @param id - Radio strip id
     * @param arealeft - Strip area x coordinate
     * @param areaTop - Strip area y coordinate
     * @param areaWidth - Strip area width
     * @param areaHeight - Strip area height
     * @param buttonLeft - Button template area x coordinate
     * @param buttonTop - Button template area y coordinate
     * @param buttonWidth - Button template area width
     * @param buttonHeight - Button template area height
     * @param itemSelectedListener - Item selected listener
     * @returns New radio strip layer
     */
    public static create(
        id: string,
        areaLeft: number,
        areaTop: number,
        areaWidth: number,
        areaHeight: number,
        buttonLeft: number,
        buttonTop: number,
        buttonWidth: number,
        buttonHeight: number,
        itemSelectedListener: (args: SurfaceRadioStripSelectionArgs | undefined) => void
    ) {
        const layer = new SurfaceRadioStrip(
            id,
            areaLeft,
            areaTop,
            areaWidth,
            areaHeight,
            buttonLeft,
            buttonTop,
            buttonWidth,
            buttonHeight,
            itemSelectedListener
        );
        return layer;
    }

    /**
     * Strip orientation - Default = horizontal
     */
    public orientation: RadioStripOrientation = RadioStripOrientation.Horizontal;

    /**
     * Button template area X coordinate
     */
    public buttonLeft: number;

    /**
     * Button template area Y coordinate
     */
    public buttonTop: number;

    /**
     * Button template area width
     */
    public buttonWidth: number;

    /**
     * Button template area height
     */
    public buttonHeight: number;

    /**
     * Strip item selection event (strip: RadioStrip, item: RadioStripItem)
     */
    public itemSelected: CommonEvent<SurfaceRadioStripSelectionArgs> = new CommonEvent<SurfaceRadioStripSelectionArgs>();

    /**
     * Strip item normal state sprite index
     */
    public normalIndex: number;

    /**
     * Strip item selected state sprite index
     */
    public selectedIndex: number;

    /**
     * Strip item highlighted state sprite index
     */
    public highlightedIndex: number;

    /**
     * Strip item normal state text color as string
     */
    public normalColor: string;

    /**
     * Strip item highlighted state text color as string
     */
    public highlightedColor: string;

    /**
     * Strip item selected state text color as string
     */
    public selectedColor: string;

    /**
     * Strip item text alignment
     */
    public textAlignment: string;

    /**
     * Strip item text font typeface
     */
    public typeFace: string;

    /**
     * Strip item text font size
     */
    public typeSize: number;

    /**
     * Strip item text font style
     */
    public typeStyle: string;

    /**
     * Strip item text layout padding
     */
    public padding: number;

    /**
     * Maximum scrolling offset
     */
    public maxOffset?: number;

    /**
     * Strip touch down position
     */
    public downPosition?: number;

    /**
     * Strip touch down scroll offset
     */
    public downOffset?: number;

    /**
     * Array of radio strip items
     */
    public items: SurfaceRadioStripItem[] = [];

    /**
     * Radio strip view controller
     */
    public controller?: SurfaceRadioStripViewController;

    /**
     * Radio strip drawing model
     */
    public model?: Model;

    /**
     * Radio strip host canvas element
     */
    public element?: HTMLCanvasElement;

    public scrollTimer?: number;

    /**
     * Scrollable list of radio button items derived from surface image templates
     * @param id - Radio strip id
     * @param arealeft - Strip area x coordinate
     * @param areaTop - Strip area y coordinate
     * @param areaWidth - Strip area width
     * @param areaHeight - Strip area height
     * @param buttonLeft - Button template area x coordinate
     * @param buttonTop - Button template area y coordinate
     * @param buttonWidth - Button template area width
     * @param buttonHeight - Button template area height
     * @param itemSelectedListener - Item selected listener
     */
    constructor(
        id: string,
        areaLeft: number,
        areaTop: number,
        areaWidth: number,
        areaHeight: number,
        buttonLeft: number,
        buttonTop: number,
        buttonWidth: number,
        buttonHeight: number,
        itemSelectedListener: (args: SurfaceRadioStripSelectionArgs | undefined) => void
    ) {
        super(id, areaLeft, areaTop, areaWidth, areaHeight);

        this.normalIndex = 0;
        this.selectedIndex = 0;
        this.highlightedIndex = 0;
        this.normalColor = 'Black';
        this.highlightedColor = 'Black';
        this.selectedColor = 'Black';
        this.textAlignment = 'center,middle';
        this.typeFace = 'sans-serif';
        this.typeSize = 12;
        this.typeStyle = '';
        this.padding = 0;

        this.addItem = this.addItem.bind(this);
        this.removeItem = this.removeItem.bind(this);
        this.itemWithId = this.itemWithId.bind(this);
        this.selectItem = this.selectItem.bind(this);
        this.selectedItemIndex = this.selectedItemIndex.bind(this);
        this.scrollTo = this.scrollTo.bind(this);
        this.refreshModel = this.refreshModel.bind(this);
        this.stripDown = this.stripDown.bind(this);
        this.stripMoved = this.stripMoved.bind(this);
        this.setOffset = this.setOffset.bind(this);
        this.moveStart = this.moveStart.bind(this);
        this.moveEnd = this.moveEnd.bind(this);
        this.moveBack = this.moveBack.bind(this);
        this.moveForward = this.moveForward.bind(this);

        this.onRadioButtonDown = this.onRadioButtonDown.bind(this);
        this.onRadioButtonUp = this.onRadioButtonUp.bind(this);
        this.onRadioButtonClicked = this.onRadioButtonClicked.bind(this);

        this.buttonLeft = buttonLeft;
        this.buttonTop = buttonTop;
        this.buttonWidth = buttonWidth;
        this.buttonHeight = buttonHeight;
        if (itemSelectedListener) {
            this.itemSelected.add(itemSelectedListener);
        }
    }

    /**
     * Adds a new strip item
     * @param id - Item id
     * @param text - Item text
     */
    public addItem(id: string, text: string) {
        const item = new SurfaceRadioStripItem(id, text);
        this.items.push(item);
        if (this.controller) {
            this.refreshModel();
        }
    }

    /**
     * Removes a strip item
     * @param id - Item id
     */
    public removeItem(id: string) {
        const item = this.itemWithId(id);
        let index;
        if (item !== undefined) {
            index = this.items.indexOf(item);
            this.items.splice(index, 1);
            if (this.controller) {
                this.refreshModel();
            }
        }
    }

    /**
     * Retrieves a strip item by its id
     * @param id - Item id
     * @returns Radio strip item with id or undefined if not found
     */
    public itemWithId(id: string) {
        for (const item of this.items) {
            if (item.id === id) {
                return item;
            }
        }
        return undefined;
    }

    /**
     * Selects a strip item by its id
     * @param id - Item id to select
     * @param inhibitEvent - True to inhibit select event
     */
    public selectItem(id: string, inhibitEvent: boolean) {
        const self = this;
        const item = self.itemWithId(id);
        if (!item) {
            return;
        }
        if (!item.isSelected) {
            self.items.forEach((radioItem) => {
                if (radioItem.id === item.id) {
                    radioItem.isSelected = true;
                    if (radioItem.spriteElement) {
                        radioItem.spriteElement.frameIndex = self.selectedIndex;
                    }
                    if (radioItem.textElement) {
                        radioItem.textElement.setFill(self.selectedColor);
                    }
                }
                else {
                    radioItem.isSelected = false;
                    if (radioItem.spriteElement) {
                        radioItem.spriteElement.frameIndex = self.normalIndex;
                    }
                    if (radioItem.textElement) {
                        radioItem.textElement.setFill(self.normalColor);
                    }
                }
            });
        }
        if (arguments.length === 1 || !inhibitEvent) {
            if (self.itemSelected.hasListeners()) {
                self.itemSelected.trigger(new SurfaceRadioStripSelectionArgs(self, item));
            }
        }
        if (self.controller) {
            self.controller.draw();
        }
    }

    /**
     * Retrieves index of selected item or -1 if no item selected
     * @returns Zero based index of selected item or -1 if no item selected
     */
    public selectedItemIndex() {
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].isSelected) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Scrolls strip to specified offset
     * @param offset - Target scroll offset
     */
    public scrollTo(offset: number) {
        const self = this;
        let currentOffset: number;
        if (!self.controller) {
            return;
        }
        if (self.orientation === RadioStripOrientation.Horizontal) {
            currentOffset = self.controller.offsetX;
        }
        else {
            currentOffset = self.controller.offsetY;
        }

        if (currentOffset === offset) {
            return;
        }
        if (offset < 0) {
            offset = 0;
        }
        if (self.maxOffset !== undefined && offset > self.maxOffset) {
            offset = self.maxOffset;
        }
        const increment = (offset - currentOffset) / 15;
        if (self.scrollTimer) {
            clearInterval(self.scrollTimer);
        }
        self.scrollTimer = setInterval(() => {
            if (!self.controller) {
                return;
            }
            if (self.orientation === RadioStripOrientation.Horizontal) {
                self.controller.offsetX = self.controller.offsetX + increment;
                if (increment < 0 && self.controller.offsetX <= offset) {
                    self.controller.offsetX = offset;
                    if (self.scrollTimer) {
                        clearInterval(self.scrollTimer);
                        delete self.scrollTimer;
                    }
                }
                else if (increment > 0 && self.controller.offsetX >= offset) {
                    self.controller.offsetX = offset;
                    if (self.scrollTimer) {
                        clearInterval(self.scrollTimer);
                        delete self.scrollTimer;
                    }
                }
            }
            else {
                self.controller.offsetY = self.controller.offsetY + increment;
                if (increment < 0 && self.controller.offsetY <= offset) {
                    self.controller.offsetY = offset;
                    if (self.scrollTimer) {
                        clearInterval(self.scrollTimer);
                        delete self.scrollTimer;
                    }
                }
                else if (increment > 0 && self.controller.offsetY >= offset) {
                    self.controller.offsetY = offset;
                    if (self.scrollTimer) {
                        clearInterval(self.scrollTimer);
                        delete self.scrollTimer;
                    }
                }
            }
            self.controller.draw();
        }, 15);
    }

    /**
     * Ensures item with a given id is scrolled into view
     * @param id - Item id to ensure visible
     */
    public ensureVisible(id: string) {
        const item = this.itemWithId(id);
        if (!item || !this.controller) {
            return;
        }
        const index = this.items.indexOf(item);
        if (this.orientation === RadioStripOrientation.Horizontal) {
            let buttonLeft = index * this.buttonWidth;
            let buttonRight = buttonLeft + this.buttonWidth;
            if (index < this.items.length - 1 && this.width >= this.buttonWidth * 2) {
                buttonRight += this.buttonWidth;
            }
            if (index > 0 && this.width >= this.buttonWidth * 3) {
                buttonLeft -= this.buttonWidth;
            }
            let offset = this.controller.offsetX;
            const viewPortLeft = offset;
            const viewPortRight = offset + this.width;
            if (buttonLeft >= viewPortLeft && buttonRight <= viewPortRight) {
                return;
            }
            if (buttonLeft < viewPortLeft) {
                offset = buttonLeft;
            }
            else if (buttonRight > viewPortRight) {
                offset = buttonRight - this.width;
            }
            this.scrollTo(offset);
        }
        else {
            let buttonTop = index * this.buttonHeight;
            let buttonBottom = buttonTop + this.buttonHeight;
            if (index < this.items.length - 1 && this.height >= this.buttonHeight * 2) {
                buttonBottom += this.buttonHeight;
            }
            if (index > 0 && this.height >= this.buttonHeight * 3) {
                buttonTop -= this.buttonHeight;
            }
            let offset = this.controller.offsetY;
            const viewPortTop = offset;
            const viewPortBottom = offset + this.height;
            if (buttonTop >= viewPortTop && buttonBottom <= viewPortBottom) {
                return;
            }
            if (buttonTop < viewPortTop) {
                offset = buttonTop;
            }
            else if (buttonBottom > viewPortBottom) {
                offset = buttonBottom - this.height;
            }
            this.scrollTo(offset);
        }
    }

    /**
     * Adds radio strip to parent surface
     * @param surface - Parent surface
     */
    public addToSurface(surface: Surface) {
        this.surface = surface;

        // If no normal image, throw error
        if (!surface.normalImageSource) {
            throw new Error(ErrorMessages.NormalImageSourceUndefined);
        }

        // Create model
        const model = Model.create(this.width, this.height);
        this.model = model;

        // Add defined image resources
        let frameCount = 0;
        if (surface.normalImageSource) {
            BitmapResource.create(SurfaceElementStates.NORMAL, surface.normalImageSource).addTo(model);
            frameCount++;
        }
        if (surface.selectedImageSource) {
            this.selectedIndex = frameCount;
            frameCount++;
            BitmapResource.create(SurfaceElementStates.SELECTED, surface.selectedImageSource).addTo(model);
        }
        if (surface.highlightedImageSource) {
            this.highlightedIndex = frameCount;
            if (this.selectedIndex === this.normalIndex) {
                this.selectedIndex = this.highlightedIndex;
            }
            frameCount++;
            BitmapResource.create(SurfaceElementStates.HIGHLIGHTED, surface.highlightedImageSource).addTo(model);
        }

        // Add static image from background area
        const background = SpriteElement.create(0, 0, this.width, this.height);
        background.interactive = false;
        background.frames = [];
        background.frames.push(
            SpriteFrame.create(SurfaceElementStates.NORMAL, this.left, this.top, this.width, this.height, 0, 'none', 0)
        );
        if (surface.selectedImageSource) {
            background.frames.push(
                SpriteFrame.create(SurfaceElementStates.SELECTED, this.left, this.top, this.width, this.height, 0, 'none', 0)
            );
        }
        if (surface.highlightedImageSource) {
            background.frames.push(
                SpriteFrame.create(
                    SurfaceElementStates.HIGHLIGHTED,
                    this.left,
                    this.top,
                    this.width,
                    this.height,
                    0,
                    'none',
                    0
                )
            );
        }
        model.add(background);

        // Add button items
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            let sprite: SurfaceRadioItemSpriteElement;
            if (this.orientation === RadioStripOrientation.Horizontal) {
                sprite = new SurfaceRadioItemSpriteElement(
                    this.id,
                    item.id,
                    i * this.buttonWidth,
                    0,
                    this.buttonWidth,
                    this.buttonHeight
                );
            }
            else {
                sprite = new SurfaceRadioItemSpriteElement(
                    this.id,
                    item.id,
                    0,
                    i * this.buttonHeight,
                    this.buttonWidth,
                    this.buttonHeight
                );
            }
            sprite.frames = [];
            sprite.id = item.id + '_sprite';
            item.spriteElement = sprite;
            sprite.frames.push(
                SpriteFrame.create(
                    SurfaceElementStates.NORMAL,
                    this.buttonLeft,
                    this.buttonTop,
                    this.buttonWidth,
                    this.buttonHeight,
                    0,
                    'none',
                    0
                )
            );
            if (surface.selectedImageSource) {
                sprite.frames.push(
                    SpriteFrame.create(
                        SurfaceElementStates.SELECTED,
                        this.buttonLeft,
                        this.buttonTop,
                        this.buttonWidth,
                        this.buttonHeight,
                        0,
                        'none',
                        0
                    )
                );
            }
            if (surface.highlightedImageSource) {
                sprite.frames.push(
                    SpriteFrame.create(
                        SurfaceElementStates.HIGHLIGHTED,
                        this.buttonLeft,
                        this.buttonTop,
                        this.buttonWidth,
                        this.buttonHeight,
                        0,
                        'none',
                        0
                    )
                );
            }
            if (this.highlightedIndex !== this.normalIndex) {
                sprite.mouseDown = 'radioButtonDown(' + this.highlightedIndex + ')';
                sprite.mouseUp = 'radioButtonUp()';
            }
            else if (this.selectedIndex !== this.normalIndex) {
                sprite.mouseDown = 'radioButtonDown(' + this.selectedIndex + ')';
                sprite.mouseUp = 'radioButtonUp()';
            }
            else {
                sprite.mouseDown = 'radioButtonDown(' + this.normalIndex + ')';
                sprite.mouseUp = 'radioButtonUp()';
            }
            sprite.click = 'radioButtonClick';
            sprite.interactive = true;
            model.add(sprite);

            let text: SurfaceRadioItemTextElement;
            if (this.orientation === RadioStripOrientation.Horizontal) {
                text = new SurfaceRadioItemTextElement(
                    this.id,
                    item.id,
                    item.text,
                    i * this.buttonWidth,
                    0,
                    this.buttonWidth,
                    this.buttonHeight
                ).setFill(this.normalColor);
            }
            else {
                text = new SurfaceRadioItemTextElement(
                    this.id,
                    item.id,
                    item.text,
                    0,
                    i * this.buttonHeight,
                    this.buttonWidth,
                    this.buttonHeight
                ).setFill(this.normalColor);
            }
            text.id = item.id + '_text';

            text.alignment = this.textAlignment;
            text.typeface = this.typeFace;
            text.typestyle = this.typeStyle;
            text.typesize = this.typeSize;

            text.interactive = false;
            item.textElement = text;
            model.add(text);
        }

        const controller = new SurfaceRadioStripViewController();
        controller.eventDelay = 150;
        controller.mouseDownView.add(this.stripDown);
        controller.mouseMovedView.add(this.stripMoved);
        this.controller = controller;
        controller.strip = this;
        controller.setScale(surface.scale);
        controller.setModel(this.model);

        const canvas = controller.getCanvas();
        canvas.setAttribute('id', this.id + '_canvas');
        canvas.style.position = 'absolute';
        canvas.style.left = this.translateX + this.left * surface.scale + 'px';
        canvas.style.top = this.translateY + this.top * surface.scale + 'px';
        canvas.style.opacity = (this.surface.opacity * this.opacity).toString();

        let maxOffset: number;
        if (this.orientation === RadioStripOrientation.Horizontal) {
            maxOffset = this.items.length * this.buttonWidth - this.width;
        }
        else {
            maxOffset = this.items.length * this.buttonHeight - this.height;
        }
        if (maxOffset < 0) {
            maxOffset = 0;
        }
        this.maxOffset = maxOffset;
        this.element = canvas;
    }

    /**
     * Refreshes the drawing model for updated items
     */
    public refreshModel() {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if(!this.controller) {
            throw new Error(ErrorMessages.ControllerIsUndefined);
        }
        const surface = this.surface;
        if (!surface) {
            return;
        }

        // Remove elements for items
        for (const el of model.elements) {
            if (el instanceof SurfaceRadioItemSpriteElement || el instanceof SurfaceRadioItemTextElement) {
                if (el.itemId) {
                    model.remove(el);
                }
            }
        }

        // Add button items
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            let sprite: SurfaceRadioItemSpriteElement;
            if (this.orientation === RadioStripOrientation.Horizontal) {
                sprite = new SurfaceRadioItemSpriteElement(
                    this.id,
                    item.id,
                    i * this.buttonWidth,
                    0,
                    this.buttonWidth,
                    this.buttonHeight
                );
            }
            else {
                sprite = new SurfaceRadioItemSpriteElement(
                    this.id,
                    item.id,
                    0,
                    i * this.buttonHeight,
                    this.buttonWidth,
                    this.buttonHeight
                );
            }
            item.spriteElement = sprite;
            sprite.interactive = true;
            sprite.id = item.id + '_sprite';
            sprite.groupId = this.id;
            sprite.itemId = item.id;
            sprite.frames = [];
            sprite.frames.push(
                SpriteFrame.create(
                    SurfaceElementStates.NORMAL,
                    this.buttonLeft,
                    this.buttonTop,
                    this.buttonWidth,
                    this.buttonHeight,
                    0,
                    'none',
                    0
                )
            );
            if (surface.selectedImageSource) {
                sprite.frames.push(
                    SpriteFrame.create(
                        SurfaceElementStates.SELECTED,
                        this.buttonLeft,
                        this.buttonTop,
                        this.buttonWidth,
                        this.buttonHeight,
                        0,
                        'none',
                        0
                    )
                );
            }
            if (surface.highlightedImageSource) {
                sprite.frames.push(
                    SpriteFrame.create(
                        SurfaceElementStates.HIGHLIGHTED,
                        this.buttonLeft,
                        this.buttonTop,
                        this.buttonWidth,
                        this.buttonHeight,
                        0,
                        'none',
                        0
                    )
                );
            }
            if (this.highlightedIndex !== this.normalIndex) {
                sprite.mouseDown = 'radioButtonDown(' + this.highlightedIndex + ')';
                sprite.mouseUp = 'radioButtonUp()';
            }
            else if (this.selectedIndex !== this.normalIndex) {
                sprite.mouseDown = 'radioButtonDown(' + this.selectedIndex + ')';
                sprite.mouseUp = 'radioButtonUp()';
            }
            else {
                sprite.mouseDown = 'radioButtonDown(' + this.normalIndex + ')';
                sprite.mouseUp = 'radioButtonUp()';
            }
            sprite.click = 'radioButtonClick';
            sprite.interactive = true;
            model.add(sprite);
            let text: SurfaceRadioItemTextElement;
            if (this.orientation === RadioStripOrientation.Horizontal) {
                text = new SurfaceRadioItemTextElement(
                    this.id,
                    item.id,
                    item.text,
                    i * this.buttonWidth,
                    0,
                    this.buttonWidth,
                    this.buttonHeight
                );
            }
            else {
                text = new SurfaceRadioItemTextElement(
                    this.id,
                    item.id,
                    item.text,
                    0,
                    i * this.buttonHeight,
                    this.buttonWidth,
                    this.buttonHeight
                );
            }
            text.setFill(this.normalColor);
            item.textElement = text;
            text.interactive = false;
            text.id = item.id + '_text';
            text.itemId = item.id;
            text.alignment = this.textAlignment;
            text.typeface = this.typeFace;
            text.typesize = this.typeSize;
            model.add(text);
        }

        let maxOffset: number;
        if (this.orientation === RadioStripOrientation.Horizontal) {
            maxOffset = this.items.length * this.buttonWidth - this.width;
        }
        else {
            maxOffset = this.items.length * this.buttonHeight - this.height;
        }
        if (maxOffset < 0) {
            maxOffset = 0;
        }
        this.maxOffset = maxOffset;
        if (this.orientation === RadioStripOrientation.Horizontal) {
            if (this.controller.offsetX > this.maxOffset) {
                this.controller.offsetX = this.maxOffset;
            }
        }
        else {
            if (this.controller.offsetY > this.maxOffset) {
                this.controller.offsetY = this.maxOffset;
            }
        }
        this.controller.draw();
    }

    /**
     * Handles radio strip mouse down event
     * @param c - Strip view controller
     * @param args - Strip mouse down point info
     */
    public stripDown(controller: IController, args: PointEventParameters) {
        const c = controller as SurfaceRadioStripViewController;
        if (!c.strip || !args.point) {
            return;
        }
        if (c.strip.orientation === RadioStripOrientation.Horizontal) {
            c.strip.downOffset = c.offsetX;
            c.strip.downPosition = args.point.x;
        }
        else {
            c.strip.downOffset = c.offsetY;
            c.strip.downPosition = args.point.y;
        }
    }

    /**
     * Handles radio strip mouse move event
     * @param c - Strip view controller
     * @param args - Strip mouse move point info
     */
    public stripMoved(controller: IController, args: PointEventParameters) {
        const c = controller as SurfaceRadioStripViewController;
        if (!c.strip || !args.point || !c.strip.downPosition || !c.strip.downOffset || !c.strip.maxOffset) {
            return;
        }
        if (c.isMouseDown) {
            if (c.strip.orientation === RadioStripOrientation.Horizontal) {
                let deltaX = args.point.x - c.strip.downPosition;
                deltaX /= c.scale;
                const offset = c.strip.downOffset - deltaX;
                if (offset < 0) {
                    c.strip.scrollTo(0);
                }
                else if (offset <= c.strip.maxOffset) {
                    c.strip.scrollTo(offset);
                }
            }
            else {
                let deltaY = args.point.y - c.strip.downPosition;
                deltaY /= c.scale;
                const offset = c.strip.downOffset - deltaY;
                if (offset < 0) {
                    c.strip.scrollTo(0);
                }
                else if (offset <= c.strip.maxOffset) {
                    c.strip.scrollTo(offset);
                }
            }
        }
    }

    /**
     * Sets scroll offset
     * @param offset - Scroll offset
     */
    public setOffset(offset: number) {
        if (!this.controller || !this.controller.offsetX || !this.maxOffset) {
            return;
        }
        if (this.orientation === RadioStripOrientation.Horizontal) {
            if (offset === this.controller.offsetX) {
                return;
            }
            if (offset > this.maxOffset) {
                this.controller.offsetX = this.maxOffset;
            }
            else if (offset >= 0) {
                this.controller.offsetX = offset;
            }
        }
        else {
            if (offset === this.controller.offsetY) {
                return;
            }
            if (offset > this.maxOffset) {
                this.controller.offsetY = this.maxOffset;
            }
            else if (offset >= 0) {
                this.controller.offsetY = offset;
            }
        }
        this.controller.draw();
    }

    /**
     * Scrolls to start
     */
    public moveStart() {
        this.scrollTo(0);
    }

    /**
     * Scrolls to end
     */
    public moveEnd() {
        if (this.maxOffset) {
            this.scrollTo(this.maxOffset);
        }
    }

    /**
     * Scrolls toward the beginning by one item
     */
    public moveBack() {
        if (!this.controller) {
            return;
        }
        if (this.orientation === RadioStripOrientation.Horizontal) {
            const offset = this.controller.offsetX;
            this.scrollTo(offset - this.buttonWidth);
        }
        else {
            const offset = this.controller.offsetY;
            this.scrollTo(offset - this.buttonHeight);
        }
    }

    /**
     * Scrolls toward the end by one item
     */
    public moveForward() {
        if (!this.controller) {
            return;
        }
        if (this.orientation === RadioStripOrientation.Horizontal) {
            const offset = this.controller.offsetX;
            this.scrollTo(offset + this.buttonWidth);
        }
        else {
            const offset = this.controller.offsetY;
            this.scrollTo(offset + this.buttonHeight);
        }
    }

    /**
     * Loads required resource and calls completion callback
     * @param callback - Completion callback (success: boolean)
     */
    public prepare(callback: (success: boolean) => void) {
        const self = this;
        if (!self.controller || !self.element || !self.surface || !self.surface.div) {
            return;
        }

        // let parentElement = document.getElementById(self.surface.hostDivId);
        // parentElement.appendChild(self.element);
        self.surface.div.appendChild(self.element);

        self.controller.surface = self.surface;
        const commandHandler = new ElementCommandHandler();
        commandHandler.attachController(self.controller);
        commandHandler.addHandler(
            SurfaceRadioStrip.RADIO_BUTTON_CLICK,
            (controller: IController, element: ElementBase, command: string, trigger: string, parameters: any) => {
                const radioStripController = controller as SurfaceRadioStripViewController;
                const radioStrip = radioStripController.strip;
                const radioStripSpriteElement = element as SurfaceRadioItemSpriteElement;
                if (radioStrip) {
                    radioStrip.onRadioButtonClicked(radioStripSpriteElement.itemId);
                }
            }
        );
        commandHandler.addHandler(
            SurfaceRadioStrip.RADIO_BUTTON_DOWN,
            (controller: IController, element: ElementBase, command: string, trigger: string, parameters: any) => {
                const radioStripController = controller as SurfaceRadioStripViewController;
                const radioStrip = radioStripController.strip;
                const radioStripSpriteElement = element as SurfaceRadioItemSpriteElement;
                if (radioStrip) {
                    radioStrip.onRadioButtonDown(radioStripSpriteElement.itemId);
                }
            }
        );
        commandHandler.addHandler(
            SurfaceRadioStrip.RADIO_BUTTON_UP,
            (controller: IController, element: ElementBase, command: string, trigger: string, parameters: any) => {
                const radioStripController = controller as SurfaceRadioStripViewController;
                const radioStrip = radioStripController.strip;
                const radioStripSpriteElement = element as SurfaceRadioItemSpriteElement;
                if (radioStrip) {
                    radioStrip.onRadioButtonUp(radioStripSpriteElement.itemId);
                }
            }
        );

        if (!self.model) {
            return;
        }

        if (self.surface.resourceListenerEvent.hasListeners()) {
            self.surface.resourceListenerEvent.listeners.forEach((listener) => {
                if (!self.model) {
                    return;
                }
                self.model.resourceManager.listenerEvent.add(listener);
            });
        }

        self.model.prepareResources(undefined, (success) => {
            if (!self.surface) {
                throw new Error(ErrorMessages.SurfaceIsUndefined);
            }
            if (success) {
                self.isPrepared = true;
                if (self.controller) {
                    self.controller.draw();
                }
                if (callback) {
                    callback(true);
                }
            }
            else {
                self.surface.onErrorInternal(ErrorMessages.ResourcesFailedToLoad);
                if (callback) {
                    callback(false);
                }
            }
        });
    }

    /**
     * Detaches surface and destroys visual elements
     */
    public destroy() {
        if (this.controller) {
            this.controller.detach();
        }
        if (this.element) {
            delete this.element;
        }
        delete this.surface;
    }

    /**
     * Onload initialization
     */
    public onload() {
        return;
    }

    /**
     * Onunload teardown
     */
    public onunload() {
        return;
    }

    /**
     * Sets rendering scale
     */
    public setScale(scale: number) {
        if (this.controller) {
            this.controller.setScale(scale);
        }
        if (!this.element) {
            return this;
        }
        const canvas = this.element as HTMLCanvasElement;
        canvas.style.left = this.translateX + this.left * scale + 'px';
        canvas.style.top = this.translateY + this.top * scale + 'px';
        canvas.style.width = this.width * scale + 'px';
        canvas.style.height = this.height * scale + 'px';
        return this;
    }

    /**
     * Sets rendering opacity
     */
    public setOpacity(opacity: number) {
        this.opacity = opacity;
        if (this.element && this.surface) {
            this.element.style.opacity = (this.surface.opacity * this.opacity).toString();
        }
        return this;
    }

    /**
     * Sets X translation
     */
    public setTranslateX(translateX: number) {
        this.translateX = translateX;
        if (this.element && this.surface) {
            this.element.style.left = (this.translateX + this.left) * this.surface.scale + 'px';
        }
        return this;
    }

    /**
     * Sets Y translation
     */
    public setTranslateY(translateY: number) {
        this.translateY = translateY;
        if (this.element && this.surface) {
            this.element.style.top = (this.translateY + this.top) * this.surface.scale + 'px';
        }
        return this;
    }

    public onRadioButtonDown(itemId: string) {
        const item = this.itemWithId(itemId);
        if (!item || !this.controller) {
            return;
        }
        if (item.textElement) {
            item.textElement.setFill(this.highlightedColor);
        }
        const element = item.spriteElement;
        if (!element) {
            return;
        }
        if (!element.frameStack) {
            element.frameStack = [];
        }
        element.frameStack.push(element.frameIndex);
        element.frameIndex = this.highlightedIndex;
        this.controller.draw();
    }

    public onRadioButtonUp(itemId: string) {
        const item = this.itemWithId(itemId);
        if (!item || !this.controller) {
            return;
        }
        if (item.textElement) {
            if (item.isSelected) {
                item.textElement.setFill(this.selectedColor);
            }
            else {
                item.textElement.setFill(this.normalColor);
            }
        }
        const element = item.spriteElement;
        if (!element) {
            return;
        }
        if (element.frameStack) {
            if (element.frameStack.length > 0) {
                const index = element.frameStack.pop();
                if (index !== undefined) {
                    element.frameIndex = index;
                }
            }
            if (element.frameStack.length === 0) {
                delete element.frameStack;
            }
        }
        this.controller.draw();
    }

    public onRadioButtonClicked(itemId: string) {
        const item = this.itemWithId(itemId);
        const self = this;
        if (!item || !self.controller) {
            return;
        }
        if (!item.isSelected) {
            self.items.forEach((radioItem) => {
                if (radioItem.id === item.id) {
                    radioItem.isSelected = true;
                    if (radioItem.spriteElement) {
                        radioItem.spriteElement.frameIndex = self.selectedIndex;
                    }
                    if (radioItem.textElement) {
                        radioItem.textElement.setFill(self.selectedColor);
                    }
                }
                else {
                    radioItem.isSelected = false;
                    if (radioItem.spriteElement) {
                        radioItem.spriteElement.frameIndex = self.normalIndex;
                    }
                    if (radioItem.textElement) {
                        radioItem.textElement.setFill(self.normalColor);
                    }
                }
            });
        }
        if (self.itemSelected.hasListeners()) {
            self.itemSelected.trigger(new SurfaceRadioStripSelectionArgs(self, item));
        }
        self.controller.draw();
        self.ensureVisible(itemId);
    }

    public addTo(surface: Surface) {
        surface.layers.push(this);
        return this;
    }
}
