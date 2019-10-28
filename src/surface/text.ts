import { CommonEvent } from '../core/common-event';
import { Model } from '../core/model';
import { RectangleElement } from '../elements/rectangle-element';
import { TextElement } from '../elements/text-element';
import { Surface } from './surface';
import { SurfaceElement } from './surface-element';

export class Text extends SurfaceElement {
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
        clickListener: (text: Text | undefined) => void
    ) {
        return new Text(id, left, top, width, height, content, clickListener);
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
    public clicked: CommonEvent<Text> = new CommonEvent<Text>();

    /**
     * Internal Elise TextElement
     */
    public textElement?: TextElement;

    /**
     * Constructs a text item
     * @classdesc Renders styled text with an optional background fill and border stroke
     * @extends Elise.Player.SurfaceElement
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
        clickListener: (text: Text | undefined) => void
    ) {
        super(id, left, top, width, height);
        this.onClicked = this.onClicked.bind(this);
        this.color = 'Black';
        this.textAlignment = 'left,top';
        this.typeFace = 'sans-serif';
        this.typeSize = 10;
        this.typeStyle = '';
        this.padding = 0;
        this.content = content;

        this.addToModel = this.addToModel.bind(this);
        this.onClicked = this.onClicked.bind(this);

        if (clickListener) {
            this.clicked.add(clickListener);
        }
    }

    /**
     * Creates and adds a text item to target surface
     * @param surface - Target surface for text element
     * @returns This text element
     */
    public addTo(surface: Surface) {
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
        text.click = Text.TEXT_CLICK;
        text.setInteractive(true);
        model.add(text);
        return text;
    }

    /**
     * Click handler called from lower level event handlers
     */
    public onClicked() {
        this.clicked.trigger(this);
    }
}
