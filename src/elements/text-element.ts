import {ErrorMessages} from '../core/error-messages';
import {Point} from '../core/point';
import {Size} from '../core/size';
import {FillFactory} from '../fill/fill-factory';
import {ResourceManager} from '../resource/resource-manager';
import {TextResource} from '../resource/text-resource';
import {ElementBase} from './element-base';

export class TextElement extends ElementBase {
    /**
     * Text element factory function
     * @param text - Text string or text resource key to render
     * @param x - Text block x coordinate
     * @param y - Text block y coordinate
     * @param width - Text block width
     * @param height - Text block height
     * @returns New text element
     */
    public static create(
        text?: string | TextResource,
        x?: number,
        y?: number,
        width?: number,
        height?: number
    ): TextElement {
        const e = new TextElement();
        if (!text) {
            return e;
        }
        if (typeof text === 'string') {
            e.text = text;
        }
        else {
            e.source = text.key;
        }
        if (x !== undefined && y !== undefined) {
            e._location = new Point(x, y);
        }
        if (width !== undefined && height !== undefined) {
            e._size = new Size(width, height);
        }
        return e;
    }

    /**
     * Text string to render
     */
    public text?: string;

    /**
     * Text resource key
     */
    public source?: string;

    /**
     * Font typeface
     */
    public typeface?: string;

    /**
     * Font type size in pixels
     */
    public typesize?: number;

    /**
     * Font typestyle
     */
    public typestyle?: string;

    /**
     * Text block alignment directives
     */
    public alignment?: string;

    /**
     * Constructs a text element
     */
    constructor() {
        super('text');
        this.setText = this.setText.bind(this);
        this.setSource = this.setSource.bind(this);
        this.setTypeface = this.setTypeface.bind(this);
        this.setTypesize = this.setTypesize.bind(this);
        this.setTypestyle = this.setTypestyle.bind(this);
        this.setAlignment = this.setAlignment.bind(this);
        this.getLines = this.getLines.bind(this);
    }

    /**
     * Copies properties of another object to this instance
     * @param o - Source object
     */
    public parse(o: any): void {
        super.parse(o);
        if (o.text) {
            this.text = o.text;
        }
        if (o.source) {
            this.source = o.source;
        }
        if (o.typeface) {
            this.typeface = o.typeface;
        }
        if (o.typesize) {
            this.typesize = o.typesize;
        }
        if (o.typestyle) {
            this.typestyle = o.typestyle;
        }
        if (o.alignment) {
            this.alignment = o.alignment;
        }
        if (!this.location) {
            this._location = new Point(0, 0);
        }
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): any {
        const o = super.serialize();
        if (this.text) {
            o.text = this.text;
        }
        if (this.source) {
            o.source = this.source;
        }
        if (this.typeface) {
            o.typeface = this.typeface;
        }
        if (this.typesize) {
            o.typesize = this.typesize;
        }
        if (this.typestyle) {
            o.typestyle = this.typestyle;
        }
        if (this.alignment) {
            o.alignment = this.alignment;
        }
        return o;
    }

    /**
     * Clones this text element to a new instance
     * @returns Cloned text element
     */
    public clone() {
        const e: TextElement = TextElement.create();
        super.cloneTo(e);
        if (this.text) {
            e.text = this.text;
        }
        if (this.source) {
            e.source = this.source;
        }
        if (this.typeface) {
            e.typeface = this.typeface;
        }
        if (this.typesize) {
            e.typesize = this.typesize;
        }
        if (this.typestyle) {
            e.typestyle = this.typestyle;
        }
        if (this.alignment) {
            e.alignment = this.alignment;
        }
        return e;
    }

    /**
     * Registers referenced resources with resource manager
     * @param rm - Resource manager
     */
    public registerResources(rm: ResourceManager) {
        super.registerResources(rm);
        if (this.source) {
            rm.register(this.source);
        }
    }

    /**
     * Returns list of referenced resource keys
     */
    public getResourceKeys() {
        const keys = super.getResourceKeys();
        if (this.source) {
            keys.push(this.source);
        }
        return keys;
    }

    /**
     * Render text element to canvas context
     * @param c - Rendering context
     */
    public draw(c: CanvasRenderingContext2D): void {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, new Point(bounds.location.x, bounds.location.y));
        }
        c.beginPath();
        c.rect(bounds.location.x, bounds.location.y, bounds.size.width + 10, bounds.size.height);
        c.clip();
        let font = '';
        let fontSize = '10.0';
        if (this.typestyle && this.typestyle.length > 0) {
            const parts = this.typestyle.split(',');
            for (const part of parts) {
                font += part;
                font += ' ';
            }
        }
        if (this.typesize) {
            fontSize = String(this.typesize);
            font += this.typesize + 'px ';
        }
        if (this.typeface) {
            const parts = this.typeface.split(',');
            for (const part of parts) {
                font += part;
                font += ' ';
            }
        }
        else {
            font += 'sans-serif';
        }
        c.font = font;
        let valign = 'top';
        let halign = 'left';
        if (this.alignment) {
            const parts = this.alignment.split(',');
            for (const part of parts) {
                if (part.toLowerCase() === 'start') {
                    c.textAlign = 'start';
                    halign = 'left';
                }
                else if (part.toLowerCase() === 'end') {
                    c.textAlign = 'end';
                    halign = 'right';
                }
                else if (part.toLowerCase() === 'left') {
                    c.textAlign = 'left';
                    halign = 'left';
                }
                else if (part.toLowerCase() === 'right') {
                    c.textAlign = 'right';
                    halign = 'right';
                }
                else if (part.toLowerCase() === 'center') {
                    c.textAlign = 'center';
                    halign = 'center';
                }
                else if (part.toLowerCase() === 'top') {
                    valign = 'top';
                }
                else if (part.toLowerCase() === 'bottom') {
                    valign = 'bottom';
                }
                else if (part.toLowerCase() === 'middle') {
                    valign = 'middle';
                }
            }
        }

        // Resolve text content
        let text: string | undefined;
        if (this.source) {
            const res = model.resourceManager.get(this.source) as TextResource;
            if (res) {
                text = res.text;
            }
        }
        if (!text) {
            text = this.text;
        }
        if (!text) {
            return;
        }

        // Get lines of text
        const lines = this.getLines(c, text, bounds.size.width);

        // Compute total height of text
        const lineHeight: number = parseFloat(fontSize);
        const totalHeight = lineHeight * lines.length;
        let x: number;
        let y: number;

        if (FillFactory.setElementFill(c, this)) {
            const loc = bounds.location;

            // Iterate lines and fill text
            x = bounds.location.x;
            if (halign === 'right') {
                x += bounds.size.width;
            }
            else if (halign === 'center') {
                x += bounds.size.width / 2;
            }
            y = bounds.location.y;
            c.textBaseline = 'top';
            if (valign === 'middle') {
                y = bounds.location.y + bounds.size.height / 2 - totalHeight / 2;
            }
            else if (valign === 'bottom') {
                y = bounds.location.y + bounds.size.height - totalHeight;
            }
            for (const line of lines) {
                if (this.fillOffsetX || this.fillOffsetY) {
                    const fillOffsetX = this.fillOffsetX || 0;
                    const fillOffsetY = this.fillOffsetY || 0;
                    c.translate(loc.x + fillOffsetX, loc.y + fillOffsetY);
                    c.fillText(line, -fillOffsetX + x - loc.x, -fillOffsetY + y - loc.y);
                    c.translate(-(loc.x + fillOffsetX), -(loc.y + fillOffsetY));
                }
                else {
                    c.translate(loc.x, loc.y);
                    c.fillText(line, x - loc.x, y - loc.y);
                    c.translate(-loc.x, -loc.y);
                }
                y += lineHeight;
            }
        }

        if (model.setElementStroke(c, this)) {
            // Iterate lines and stroke text
            x = bounds.location.x;
            if (halign === 'right') {
                x += bounds.size.width;
            }
            else if (halign === 'center') {
                x += bounds.size.width / 2;
            }
            y = bounds.location.y;
            c.textBaseline = 'top';
            if (valign === 'middle') {
                y = bounds.location.y + bounds.size.height / 2 - totalHeight / 2;
            }
            else if (valign === 'bottom') {
                y = bounds.location.y + bounds.size.height - totalHeight;
            }
            for (const line of lines) {
                c.strokeText(line, x, y);
                y += lineHeight;
            }
        }

        c.restore();
    }

    /**
     * Text set accessor.  Clears source property when set.
     * @param text - Text string to render
     * @returns This text element
     */
    public setText(text: string) {
        this.text = text;
        delete this.source;
        return this;
    }

    /**
     * Source set accessor. Clears text property when set.
     * @param source - Text resource key
     * @returns This text element
     */
    public setSource(source: string) {
        this.source = source;
        delete this.text;
        return this;
    }

    /**
     * Typeface set accessor
     * @param typeface - Font typeface
     * @returns This text element
     */
    public setTypeface(typeface: string) {
        this.typeface = typeface;
        return this;
    }

    /**
     * Typeface set accessor
     * @param typesize - Font type size in pixels
     * @returns This text element
     */
    public setTypesize(typesize: number) {
        this.typesize = typesize;
        return this;
    }

    /**
     * Typestyle set accessor
     * @param typestyle - Font typestyle
     * @returns This text element
     */
    public setTypestyle(typestyle: string) {
        this.typestyle = typestyle;
        return this;
    }

    /**
     * Alignment set accessor
     * @param alignment - Text block alignment directives
     * @returns This text element
     */
    public setAlignment(alignment: string) {
        this.alignment = alignment;
        return this;
    }

    /**
     * Splits text to render into lines that will fit into specified
     * element width
     * @param c - Rendering context
     * @param text - Text to render
     * @param lineWidth - Text block width
     * @returns Split text lines
     */
    public getLines(c: CanvasRenderingContext2D, text: string, lineWidth: number): string[] {
        const splitLines = text.split('\n');
        const lines: string[] = [];
        for (const line of splitLines) {
            const words = line.split(' ');
            if (words.length === 1) {
                lines.push(words[0]);
                continue;
            }
            let lastLine = words[0];
            let measure = 0;
            const wl = words.length;
            for (let i = 1; i < wl; i++) {
                const word = words[i];
                measure = c.measureText(lastLine + word).width;
                if (measure < lineWidth) {
                    lastLine += ' ' + word;
                }
                else {
                    lines.push(lastLine);
                    lastLine = word;
                }
                if (i === words.length - 1) {
                    lines.push(lastLine);
                    break;
                }
            }
        }
        return lines;
    }

    /**
     * Can element be stroked
     * @returns Can stroke
     */
    public canStroke(): boolean {
        return true;
    }

    /**
     * Can element be filled
     * @returns Can fill
     */
    public canFill(): boolean {
        return true;
    }
}
