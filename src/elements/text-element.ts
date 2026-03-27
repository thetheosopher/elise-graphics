import { ErrorMessages } from '../core/error-messages';
import type { SerializedData } from '../core/serialization';
import { Point } from '../core/point';
import { Size } from '../core/size';
import { FillFactory } from '../fill/fill-factory';
import { ResourceManager } from '../resource/resource-manager';
import { TextResource } from '../resource/text-resource';
import { ElementBase } from './element-base';

export interface TextRun {
    text: string;
    typeface?: string;
    typesize?: number;
    typestyle?: string;
    letterSpacing?: number;
    decoration?: string;
}

interface ResolvedTextRunStyle {
    typeface?: string;
    typesize: number;
    typestyle?: string;
    letterSpacing: number;
    decoration?: string;
}

interface TextLayoutSegment {
    text: string;
    width: number;
    style: ResolvedTextRunStyle;
}

interface TextLayoutLine {
    segments: TextLayoutSegment[];
    width: number;
    height: number;
}

/**
 * Renders a stroked and filled text element
 */
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
     * Additional spacing applied between rendered characters in pixels.
     */
    public letterSpacing: number = 0;

    /**
     * Text decoration directives such as underline, overline, or line-through.
     */
    public textDecoration?: string;

    /**
     * Optional rich text runs for mixed typography within a single text element.
     */
    public richText?: TextRun[];

    constructor() {
        super('text');
    }

    /**
     * Copies properties of another object to this instance
     * @param o - Source element
     */
    public parse(o: SerializedData): void {
        super.parse(o);
        if (o.text) {
            this.text = o.text as string;
        }
        if (o.source) {
            this.source = o.source as string;
        }
        if (o.typeface) {
            this.typeface = o.typeface as string;
        }
        if (o.typesize !== undefined) {
            this.typesize = o.typesize as number;
        }
        if (o.typestyle) {
            this.typestyle = o.typestyle as string;
        }
        if (o.alignment) {
            this.alignment = o.alignment as string;
        }
        if (o.letterSpacing !== undefined) {
            this.letterSpacing = Number(o.letterSpacing) || 0;
        }
        if (o.textDecoration) {
            this.textDecoration = TextElement.normalizeTextDecoration(o.textDecoration as string);
        }
        if (Array.isArray(o.richText)) {
            this.richText = TextElement.cloneTextRuns(o.richText as TextRun[]);
        }
        if (!this._location) {
            this._location = new Point(0, 0);
        }
    }

    /**
     * Serializes persistent properties to new object instance
     * @returns Serialized element
     */
    public serialize(): SerializedData {
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
        if (this.typesize !== undefined) {
            o.typesize = this.typesize;
        }
        if (this.typestyle) {
            o.typestyle = this.typestyle;
        }
        if (this.alignment) {
            o.alignment = this.alignment;
        }
        if (this.letterSpacing !== 0) {
            o.letterSpacing = this.letterSpacing;
        }
        if (this.textDecoration) {
            o.textDecoration = this.textDecoration;
        }
        if (this.richText && this.richText.length > 0) {
            o.richText = TextElement.cloneTextRuns(this.richText);
        }
        return o;
    }

    /**
     * Clones this text element to a new instance
     * @returns Cloned text element
     */
    public clone(): TextElement {
        const e = TextElement.create();
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
        if (this.typesize !== undefined) {
            e.typesize = this.typesize;
        }
        if (this.typestyle) {
            e.typestyle = this.typestyle;
        }
        if (this.alignment) {
            e.alignment = this.alignment;
        }
        e.letterSpacing = this.letterSpacing;
        e.textDecoration = this.textDecoration;
        if (this.richText && this.richText.length > 0) {
            e.richText = TextElement.cloneTextRuns(this.richText);
        }
        return e;
    }

    /**
     * Register text source with resource manager
     * @param rm - Resource manager
     */
    public registerResources(rm: ResourceManager): void {
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
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        this.renderText(c, bounds.location, bounds.size);
    }

    /**
     * Text set accessor.  Clears source property when set.
     * @param text - Text string to render
     * @returns This text element
     */
    public setText(text: string) {
        this.text = text;
        this.source = undefined;
        this.richText = undefined;
        return this;
    }

    /**
     * Source set accessor. Clears text property when set.
     * @param source - Text resource key
     * @returns This text element
     */
    public setSource(source: string) {
        this.source = source;
        this.text = undefined;
        this.richText = undefined;
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
     * Sets additional character spacing in pixels.
     * @param letterSpacing - Character spacing
     * @returns This text element
     */
    public setLetterSpacing(letterSpacing: number) {
        this.letterSpacing = Number(letterSpacing) || 0;
        return this;
    }

    /**
     * Sets text decoration directives.
     * @param decoration - underline, overline, and/or line-through
     * @returns This text element
     */
    public setTextDecoration(decoration?: string) {
        this.textDecoration = TextElement.normalizeTextDecoration(decoration);
        return this;
    }

    /**
     * Sets rich text runs for mixed typography.
     * @param richText - Styled text runs
     * @returns This text element
     */
    public setRichText(richText: TextRun[]) {
        this.richText = TextElement.cloneTextRuns(richText);
        this.text = undefined;
        this.source = undefined;
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
     * Resolves the plain text content for this element.
     * @returns Resolved text content
     */
    public getResolvedText(): string | undefined {
        if (this.richText && this.richText.length > 0) {
            return this.richText.map((run) => run.text).join('');
        }
        if (this.source && this.model) {
            const res = this.model.resourceManager.get(this.source) as TextResource;
            if (res) {
                return res.text;
            }
        }
        return this.text;
    }

    /**
     * Returns the raw rich text runs for this element or a single synthesized run for plain text.
     * @returns Text runs
     */
    public getResolvedTextRuns(): TextRun[] {
        if (this.richText && this.richText.length > 0) {
            return TextElement.cloneTextRuns(this.richText);
        }
        const text = this.getResolvedText();
        if (!text) {
            return [];
        }
        return [{ text }];
    }

    /**
     * Renders text content using the provided location and size.
     * @param c - Rendering context
     * @param location - Render origin
     * @param size - Render size
     */
    public renderText(c: CanvasRenderingContext2D, location: Point, size: Size): void {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        const runs = this.getResolvedTextRuns();
        if (runs.length === 0) {
            return;
        }

        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, new Point(location.x, location.y));
        }
        this.applyRenderOpacity(c);
        this.withClipPath(c, () => {
            c.beginPath();
            c.rect(location.x, location.y, size.width + 10, size.height);
            c.clip();

            const layout = this.layoutRuns(c, runs, size.width);
            if (layout.length === 0) {
                return;
            }

            const alignment = this.resolveAlignment();
            const totalHeight = layout.reduce((sum, line) => sum + line.height, 0);
            let startY = location.y;
            if (alignment.vertical === 'middle') {
                startY = location.y + size.height / 2 - totalHeight / 2;
            }
            else if (alignment.vertical === 'bottom') {
                startY = location.y + size.height - totalHeight;
            }

            c.textBaseline = 'top';
            c.textAlign = 'left';

            const hasFill = FillFactory.setElementFill(c, this);
            const hasStroke = model.setElementStroke(c, this);

            if (hasFill) {
                this.renderLayoutPass(c, layout, location, size, startY, alignment.horizontal, true, false);
            }
            if (hasStroke) {
                this.renderLayoutPass(c, layout, location, size, startY, alignment.horizontal, false, !hasFill);
            }
        });
        c.restore();
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
        return this.layoutRuns(c, [{ text }], lineWidth).map((line) => line.segments.map((segment) => segment.text).join(''));
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

    private layoutRuns(c: CanvasRenderingContext2D, runs: TextRun[], lineWidth: number): TextLayoutLine[] {
        const lines: TextLayoutLine[] = [];
        let currentLine = this.createEmptyLine();

        for (const run of runs) {
            const style = this.resolveRunStyle(run);
            const tokens = TextElement.tokenize(run.text);
            for (const token of tokens) {
                if (token === '\n') {
                    lines.push(currentLine);
                    currentLine = this.createEmptyLine();
                    continue;
                }

                if (token.trim().length === 0 && currentLine.segments.length === 0) {
                    continue;
                }

                const width = this.measureTextWidth(c, token, style);
                if (
                    token.trim().length > 0 &&
                    currentLine.segments.length > 0 &&
                    lineWidth > 0 &&
                    currentLine.width + width > lineWidth
                ) {
                    lines.push(currentLine);
                    currentLine = this.createEmptyLine();
                }

                if (token.trim().length === 0 && currentLine.segments.length === 0) {
                    continue;
                }
                if (token.trim().length === 0 && lineWidth > 0 && currentLine.width + width > lineWidth) {
                    lines.push(currentLine);
                    currentLine = this.createEmptyLine();
                    continue;
                }

                currentLine.segments.push({ text: token, width, style });
                currentLine.width += width;
                currentLine.height = Math.max(currentLine.height, style.typesize);
            }
        }

        if (currentLine.segments.length > 0 || lines.length === 0) {
            lines.push(currentLine);
        }
        return lines;
    }

    private renderLayoutPass(
        c: CanvasRenderingContext2D,
        layout: TextLayoutLine[],
        location: Point,
        size: Size,
        startY: number,
        horizontal: 'left' | 'center' | 'right',
        fill: boolean,
        decorationsOnly: boolean,
    ): void {
        const fillTranslateX = fill ? location.x + (this.fillOffsetX || 0) : 0;
        const fillTranslateY = fill ? location.y + (this.fillOffsetY || 0) : 0;
        if (fill && (this.fillOffsetX || this.fillOffsetY)) {
            c.save();
            c.translate(fillTranslateX, fillTranslateY);
        }

        let y = startY;
        for (const line of layout) {
            let x = location.x;
            if (horizontal === 'center') {
                x += size.width / 2 - line.width / 2;
            }
            else if (horizontal === 'right') {
                x += size.width - line.width;
            }

            for (const segment of line.segments) {
                c.font = this.buildFontString(segment.style);
                const drawX = fill && (this.fillOffsetX || this.fillOffsetY) ? x - fillTranslateX : x;
                const drawY = fill && (this.fillOffsetX || this.fillOffsetY) ? y - fillTranslateY : y;

                if (!decorationsOnly) {
                    this.drawSegmentText(c, segment, drawX, drawY, fill);
                }
                this.drawTextDecorations(c, segment, drawX, drawY, fill, decorationsOnly);
                x += segment.width;
            }
            y += line.height;
        }

        if (fill && (this.fillOffsetX || this.fillOffsetY)) {
            c.restore();
        }
    }

    private drawSegmentText(c: CanvasRenderingContext2D, segment: TextLayoutSegment, x: number, y: number, fill: boolean): void {
        if (segment.style.letterSpacing === 0) {
            if (fill) {
                c.fillText(segment.text, x, y);
            }
            else {
                c.strokeText(segment.text, x, y);
            }
            return;
        }

        let currentX = x;
        for (let index = 0; index < segment.text.length; index++) {
            const character = segment.text.charAt(index);
            if (fill) {
                c.fillText(character, currentX, y);
            }
            else {
                c.strokeText(character, currentX, y);
            }
            currentX += c.measureText(character).width;
            if (index < segment.text.length - 1) {
                currentX += segment.style.letterSpacing;
            }
        }
    }

    private drawTextDecorations(
        c: CanvasRenderingContext2D,
        segment: TextLayoutSegment,
        x: number,
        y: number,
        fill: boolean,
        decorationsOnly: boolean,
    ): void {
        const decorations = TextElement.parseDecorationParts(segment.style.decoration);
        if (decorations.length === 0) {
            return;
        }
        if (decorationsOnly && fill) {
            return;
        }

        const originalLineWidth = c.lineWidth;
        c.lineWidth = Math.max(1, segment.style.typesize / 16);
        c.beginPath();
        for (const decoration of decorations) {
            let decorationY = y + segment.style.typesize * 0.9;
            if (decoration === 'overline') {
                decorationY = y + Math.max(1, segment.style.typesize * 0.08);
            }
            else if (decoration === 'line-through') {
                decorationY = y + segment.style.typesize * 0.5;
            }
            c.moveTo(x, decorationY);
            c.lineTo(x + segment.width, decorationY);
        }
        c.stroke();
        c.lineWidth = originalLineWidth;
    }

    private buildFontString(style: ResolvedTextRunStyle): string {
        let font = '';
        if (style.typestyle) {
            const parts = style.typestyle.split(',');
            for (const part of parts) {
                const trimmed = part.trim();
                if (trimmed.length > 0) {
                    font += trimmed + ' ';
                }
            }
        }
        font += style.typesize + 'px ';
        if (style.typeface) {
            const parts = style.typeface.split(',');
            for (const part of parts) {
                const trimmed = part.trim();
                if (trimmed.length > 0) {
                    font += trimmed + ' ';
                }
            }
        }
        else {
            font += 'sans-serif';
        }
        return font.trim();
    }

    private measureTextWidth(c: CanvasRenderingContext2D, text: string, style: ResolvedTextRunStyle): number {
        if (!text) {
            return 0;
        }
        c.font = this.buildFontString(style);
        const spacing = Math.max(0, text.length - 1) * style.letterSpacing;
        return c.measureText(text).width + spacing;
    }

    private resolveRunStyle(run: TextRun): ResolvedTextRunStyle {
        return {
            typeface: run.typeface !== undefined ? run.typeface : this.typeface,
            typesize: run.typesize !== undefined ? run.typesize : this.typesize !== undefined ? this.typesize : 10,
            typestyle: run.typestyle !== undefined ? run.typestyle : this.typestyle,
            letterSpacing: run.letterSpacing !== undefined ? run.letterSpacing : this.letterSpacing,
            decoration: TextElement.normalizeTextDecoration(run.decoration !== undefined ? run.decoration : this.textDecoration),
        };
    }

    private resolveAlignment(): { horizontal: 'left' | 'center' | 'right'; vertical: 'top' | 'middle' | 'bottom' } {
        let vertical: 'top' | 'middle' | 'bottom' = 'top';
        let horizontal: 'left' | 'center' | 'right' = 'left';
        if (!this.alignment) {
            return { horizontal, vertical };
        }

        const parts = this.alignment.split(',');
        for (const part of parts) {
            const value = part.trim().toLowerCase();
            if (value === 'center') {
                horizontal = 'center';
            }
            else if (value === 'right' || value === 'end') {
                horizontal = 'right';
            }
            else if (value === 'left' || value === 'start') {
                horizontal = 'left';
            }
            else if (value === 'middle') {
                vertical = 'middle';
            }
            else if (value === 'bottom') {
                vertical = 'bottom';
            }
            else if (value === 'top') {
                vertical = 'top';
            }
        }
        return { horizontal, vertical };
    }

    private createEmptyLine(): TextLayoutLine {
        return {
            segments: [],
            width: 0,
            height: this.typesize !== undefined ? this.typesize : 10,
        };
    }

    private static tokenize(text: string): string[] {
        const matches = text.match(/(\n|[^\S\n]+|[^\s\n]+)/g);
        return matches ? matches : [''];
    }

    private static cloneTextRuns(runs: TextRun[]): TextRun[] {
        return runs.map((run) => ({
            text: run.text,
            typeface: run.typeface,
            typesize: run.typesize,
            typestyle: run.typestyle,
            letterSpacing: run.letterSpacing,
            decoration: TextElement.normalizeTextDecoration(run.decoration),
        }));
    }

    private static normalizeTextDecoration(decoration?: string): string | undefined {
        if (!decoration) {
            return undefined;
        }
        const unique = Array.from(new Set(TextElement.parseDecorationParts(decoration)));
        return unique.length > 0 ? unique.join(',') : undefined;
    }

    private static parseDecorationParts(decoration?: string): string[] {
        if (!decoration) {
            return [];
        }
        return decoration
            .split(/[\s,]+/)
            .map((part) => part.trim().toLowerCase())
            .filter((part) => part === 'underline' || part === 'overline' || part === 'line-through');
    }
}
