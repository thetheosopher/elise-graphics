import { CommonEvent } from '../core/common-event';
import { ErrorMessages } from '../core/error-messages';
import { Model } from '../core/model';
import { SpriteElement } from '../elements/sprite-element';
import { SpriteFrame } from '../elements/sprite-frame';
import { Surface } from './surface';
import { SurfaceElement } from './surface-element';
import { SurfaceElementStates } from './surface-element-states';

export class SurfaceButtonElement extends SurfaceElement {
    public static BUTTON_CLICK = 'buttonClick';

    /**
     * Renders a multistate image button derived from surface page images
     * @param id - Item id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param clickListener - Click event listener
     */
    public static create(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        clickListener: (button: SurfaceButtonElement | undefined) => void
    ) {
        return new SurfaceButtonElement(id, left, top, width, height, clickListener);
    }

    /**
     * Renders a multistate image button derived from surface page images
     * @param id - Item id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param clickListener - Click event listener
     */
    public static createCheckbox(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        clickListener: (button: SurfaceButtonElement | undefined) => void
    ) {
        const button = new SurfaceButtonElement(id, left, top, width, height, clickListener);
        button.isToggle = true;
        return button;
    }

    /**
     * Renders a multistate image button derived from surface page images
     * @param id - Item id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param clickListener - Click event listener
     */
    public static createRadioButton(
        groupId: string,
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        clickListener: (button: SurfaceButtonElement | undefined) => void
    ) {
        const button = new SurfaceButtonElement(id, left, top, width, height, clickListener);
        button.groupId = groupId;
        button.isToggle = true;
        return button;
    }

    /**
     * Click event (button: SurfaceButton)
     */
    public clicked: CommonEvent<SurfaceButtonElement> = new CommonEvent<SurfaceButtonElement>();

    /**
     * Normal state sprite index
     */
    public normalIndex: number;

    /**
     * Selected state sprite index
     */
    public selectedIndex: number;

    /**
     * Highlighted state sprite index
     */
    public highlightedIndex: number;

    /**
     * Disabled state sprite index
     */
    public disabledIndex: number;

    /**
     * Button enabled state
     */
    public isEnabled: boolean;

    /**
     * Button toggle button selected state
     */
    public isSelected: boolean;

    /**
     * True if toggle button (checkbox/radio)
     */
    public isToggle: boolean;

    /**
     * Button radio group id
     */
    public groupId?: string;

    /**
     * Internal sprite element
     */
    public spriteElement?: SpriteElement;

    /**
     * Renders a multistate image button derived from surface page images
     * @param id - Item id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param clickListener - Click event listener
     */
    constructor(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        clickListener: (button: SurfaceButtonElement | undefined) => void
    ) {
        super(id, left, top, width, height);
        this.normalIndex = 0;
        this.selectedIndex = 0;
        this.highlightedIndex = 0;
        this.disabledIndex = 0;
        this.isEnabled = true;
        this.isSelected = false;
        this.isToggle = false;
        this.setEnabled = this.setEnabled.bind(this);
        this.addToModel = this.addToModel.bind(this);
        this.onClicked = this.onClicked.bind(this);
        if (clickListener) {
            this.clicked.add(clickListener);
        }
    }

    public addTo(surface: Surface): SurfaceElement {
        surface.elements.push(this);
        return this;
    }

    public setEnabled(isEnabled: boolean) {
        if (isEnabled === this.isEnabled) {
            return;
        }
        this.isEnabled = isEnabled;
        if (this.spriteElement && this.surface && this.surface.controller) {
            if (!this.isEnabled) {
                this.spriteElement.frameIndex = this.disabledIndex;
                this.spriteElement.setInteractive(false);
            }
            else {
                if (this.isSelected && this.isToggle) {
                    this.spriteElement.frameIndex = this.selectedIndex;
                }
                else {
                    this.spriteElement.frameIndex = this.normalIndex;
                }
                this.spriteElement.setInteractive(true);
            }
            this.surface.controller.draw();
        }
    }

    /**
     * Adds button to surface model
     * @returns New button
     */
    public addToModel(model: Model) {
        const surface = this.surface;
        if (!surface) {
            throw new Error(ErrorMessages.SurfaceIsUndefined);
        }

        // If no normal image, throw error
        if (!surface.normalImageSource) {
            throw new Error(ErrorMessages.NormalImageSourceUndefined);
        }

        const sprite = SpriteElement.create(this.left, this.top, this.width, this.height);
        sprite.id = this.id;
        this.spriteElement = sprite;
        sprite.frames = [];
        sprite.frames.push(
            SpriteFrame.create(SurfaceElementStates.NORMAL, this.left, this.top, this.width, this.height, 0, 'none', 0)
        );

        if (surface.selectedImageSource) {
            sprite.frames.push(
                SpriteFrame.create(
                    SurfaceElementStates.SELECTED,
                    this.left,
                    this.top,
                    this.width,
                    this.height,
                    0,
                    'none',
                    0
                )
            );
            this.selectedIndex = sprite.frames.length - 1;
        }

        if (surface.highlightedImageSource) {
            sprite.frames.push(
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
            this.highlightedIndex = sprite.frames.length - 1;
            if (!surface.selectedImageSource) {
                this.selectedIndex = this.highlightedIndex;
            }
        }

        if (surface.disabledImageSource) {
            sprite.frames.push(
                SpriteFrame.create(
                    SurfaceElementStates.DISABLED,
                    this.left,
                    this.top,
                    this.width,
                    this.height,
                    0,
                    'none',
                    0
                )
            );
            this.disabledIndex = sprite.frames.length - 1;
        }

        if (this.highlightedIndex !== this.normalIndex) {
            sprite.mouseDown = 'pushFrame(' + this.highlightedIndex + ')';
            sprite.mouseUp = 'popFrame()';
        }
        else if (this.selectedIndex !== this.normalIndex) {
            sprite.mouseDown = 'pushFrame(' + this.selectedIndex + ')';
            sprite.mouseUp = 'popFrame()';
        }
        sprite.click = SurfaceButtonElement.BUTTON_CLICK;

        if (!this.isEnabled) {
            sprite.frameIndex = this.disabledIndex;
        }
        else {
            if (this.isSelected && this.isToggle) {
                sprite.frameIndex = this.selectedIndex;
            }
            sprite.setInteractive(true);
        }

        model.add(sprite);

        return sprite;
    }

    /**
     * Click handler called from lower level event handlers
     */
    public onClicked() {
        const self = this;
        if (!self.surface) {
            throw new Error(ErrorMessages.SurfaceIsUndefined);
        }
        if (self.isToggle) {
            if (self.groupId !== null) {
                if (!self.isSelected) {
                    self.surface.elements.forEach(sel => {
                        if (sel instanceof SurfaceButtonElement && sel.spriteElement) {
                            if (sel.id === self.id) {
                                sel.isSelected = true;
                                sel.spriteElement.frameIndex = sel.selectedIndex;
                            }
                            else if (self.groupId === sel.groupId) {
                                sel.isSelected = false;
                                if (sel.isEnabled) {
                                    sel.spriteElement.frameIndex = sel.normalIndex;
                                }
                                else {
                                    sel.spriteElement.frameIndex = sel.disabledIndex;
                                }
                            }
                        }
                    });
                }
                else {
                    self.surface.elements.forEach(sel => {
                        if (sel instanceof SurfaceButtonElement && sel.spriteElement) {
                            if (self.groupId === sel.groupId) {
                                sel.isSelected = false;
                                sel.spriteElement.frameIndex = sel.normalIndex;
                            }
                        }
                    });
                }
            }
            else if (self.spriteElement) {
                if (!self.isSelected) {
                    self.isSelected = true;
                    self.spriteElement.frameIndex = self.selectedIndex;
                }
                else {
                    self.isSelected = false;
                    self.spriteElement.frameIndex = self.normalIndex;
                }
            }
        }
        if (self.clicked.hasListeners()) {
            self.clicked.trigger(self);
        }
        if (self.surface.controller) {
            self.surface.controller.draw();
        }
    }
}
