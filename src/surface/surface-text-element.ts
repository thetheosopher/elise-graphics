import { CommonEvent } from '../core/common-event';
import { Model } from '../core/model';
import type { SerializedData } from '../core/serialization';
import { RectangleElement } from '../elements/rectangle-element';
import { TextElement } from '../elements/text-element';
import { SurfaceElement, type SurfaceLike } from './surface-element';

/**
 * Renders styled text with an optional background fill and border stroke
 */
export class SurfaceTextElement extends SurfaceElement {
    public static TEXT_CLICK = 'textClick';

    /**
     * Creates a text item
     * @param id - Item id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param content - Rendered text content
     * @param clickListener - Click event listener
     * @returns New text item
     */
    public static create(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        content: string,
        clickListener: (text: SurfaceTextElement | undefined) => void
    ) {
        return new SurfaceTextElement(id, left, top, width, height, content, clickListener);
    }

    /**
     * Rendered text content
     */
    public content: string;

    /**
     * Text color as string
     */
    public color: string;

    /**
     * Text alignment directives
     */
    public textAlignment: string;

    /**
     * Font typeface
     */
    public typeFace: string;

    /**
     * Font type size in pixels
     */
    public typeSize: number;

    /**
     * Font type style
     */
    public typeStyle: string;

    /**
     * Background fill color as string
     */
    public background?: string;

    /**
     * Layut area border stroke
     */
    public border?: string;

    /**
     * Layout area padding
     */
    public padding: number;

    /**
     * Click event
     */
    public clicked: CommonEvent<SurfaceTextElement> = new CommonEvent<SurfaceTextElement>();

    /**
     * Internal Elise TextElement
     */
    public textElement?: TextElement;

    /**
     * @param id - Item id
     * @param left - Layout area x coordinate
     * @param top - Layout area y coordinate
     * @param width - Layout area width
     * @param height - Layout area height
     * @param content - Rendered text content
     * @param clickListener - Click event listener
     */
    constructor(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        content: string,
        clickListener: (text: SurfaceTextElement | undefined) => void
    ) {
        super(id, left, top, width, height);
        this.onClicked = this.onClicked.bind(this);
        this.addToModel = this.addToModel.bind(this);
        this.color = 'Black';
        this.textAlignment = 'left,top';
        this.typeFace = 'sans-serif';
        this.typeSize = 10;
        this.typeStyle = '';
        this.padding = 0;
        this.content = content;
        if (clickListener) {
            this.clicked.add(clickListener);
        }
    }

    /**
     * Creates and adds a text item to target surface
     * @param surface - Target surface for text element
     * @returns This text element
     */
    public addTo(surface: SurfaceLike) {
        surface.elements.push(this);
        return this;
    }

    /**
     * Adds item to surface model
     * @param model - Surface model
     * @returns New text item
     */
    public addToModel(model: Model) {
        if (this.background || this.border) {
            const rect = RectangleElement.create(this.left, this.top, this.width, this.height);
            if (this.background) {
                rect.setFill(this.background);
            }
            if (this.border) {
                rect.setStroke(this.border);
            }
            rect.interactive = false;
            model.add(rect);
        }

        const text = TextElement.create(
            this.content,
            this.left + this.padding,
            this.top + this.padding,
            this.width - this.padding * 2,
            this.height - this.padding * 2
        );
        text.setFill(this.color);
        text.alignment = this.textAlignment;
        text.typeface = this.typeFace;
        text.typesize = this.typeSize;
        text.typestyle = this.typeStyle;
        text.id = this.id;
        this.textElement = text;
        text.click = SurfaceTextElement.TEXT_CLICK;
        text.setInteractive(true);
        model.add(text);
        return text;
    }

    /**
     * Serializes persistent text element properties to a new object
     * @returns Serialized text element data
     */
    public serialize(): SerializedData {
        const o = super.serialize();
        o.type = 'surfaceText';
        if (this.content) {
            o.content = this.content;
        }
        if (this.color !== 'Black') {
            o.color = this.color;
        }
        if (this.textAlignment !== 'left,top') {
            o.textAlignment = this.textAlignment;
        }
        if (this.typeFace !== 'sans-serif') {
            o.typeFace = this.typeFace;
        }
        if (this.typeSize !== 10) {
            o.typeSize = this.typeSize;
        }
        if (this.typeStyle !== '') {
            o.typeStyle = this.typeStyle;
        }
        if (this.background !== undefined) {
            o.background = this.background;
        }
        if (this.border !== undefined) {
            o.border = this.border;
        }
        if (this.padding !== 0) {
            o.padding = this.padding;
        }
        return o;
    }

    /**
     * Parses serialized data into text element properties
     * @param o - Serialized text element data
     */
    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.content !== undefined) {
            this.content = o.content as string;
        }
        if (o.color !== undefined) {
            this.color = o.color as string;
        }
        if (o.textAlignment !== undefined) {
            this.textAlignment = o.textAlignment as string;
        }
        if (o.typeFace !== undefined) {
            this.typeFace = o.typeFace as string;
        }
        if (o.typeSize !== undefined) {
            this.typeSize = o.typeSize as number;
        }
        if (o.typeStyle !== undefined) {
            this.typeStyle = o.typeStyle as string;
        }
        if (o.background !== undefined) {
            this.background = o.background as string;
        }
        if (o.border !== undefined) {
            this.border = o.border as string;
        }
        if (o.padding !== undefined) {
            this.padding = o.padding as number;
        }
    }

    /**
     * Click handler called from lower level event handlers
     */
    public onClicked() {
        this.clicked.trigger(this);
    }
}
