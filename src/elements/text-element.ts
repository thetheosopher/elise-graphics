import { ErrorMessages } from '../core/error-messages';
import type { SerializedData } from '../core/serialization';
import { Point } from '../core/point';
import { Region } from '../core/region';
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

export interface TextRunStyle {
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
    startIndex: number;
}

interface TextLayoutLine {
    segments: TextLayoutSegment[];
    width: number;
    height: number;
    advanceHeight: number;
    startIndex: number;
    endIndex: number;
}

interface TextCharacterLayout {
    index: number;
    character: string;
    region: Region;
    lineIndex: number;
}

interface TextInsertionLayout {
    index: number;
    x: number;
    y: number;
    height: number;
    lineIndex: number;
}

interface CachedTextLayout {
    revision: number;
    lineWidth: number;
    layout: TextLayoutLine[];
    alignment: { horizontal: 'left' | 'center' | 'right'; vertical: 'top' | 'middle' | 'bottom' };
    totalHeight: number;
}

/**
 * Renders a stroked and filled text element
 */
export class TextElement extends ElementBase {
    private _textLayoutRevision: number = 0;
    private _layoutCache?: CachedTextLayout;
    private _characterLayoutCache?: { revision: number; x: number; y: number; width: number; height: number; characters: TextCharacterLayout[] };
    private _insertionLayoutCache?: { revision: number; x: number; y: number; width: number; height: number; positions: TextInsertionLayout[] };
    private _textMeasureCache: Map<string, number> = new Map<string, number>();
    private _resolvedPlainTextCache?: string;
    private _resolvedRunsCache?: TextRun[];

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
     * Optional line-height multiplier applied to each laid out line.
     */
    public lineHeight?: number;

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
        if (o.lineHeight !== undefined) {
            const parsedLineHeight = Number(o.lineHeight);
            this.lineHeight = Number.isFinite(parsedLineHeight) && parsedLineHeight > 0 ? parsedLineHeight : undefined;
        }
        if (Array.isArray(o.richText)) {
            this.richText = TextElement.cloneTextRuns(o.richText as TextRun[]);
        }
        if (!this._location) {
            this._location = new Point(0, 0);
        }
        this.invalidateTextLayoutCache();
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
        if (this.lineHeight !== undefined && this.lineHeight !== 1) {
            o.lineHeight = this.lineHeight;
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
        e.lineHeight = this.lineHeight;
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
        this.invalidateTextLayoutCache();
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
        this.invalidateTextLayoutCache();
        return this;
    }

    /**
     * Typeface set accessor
     * @param typeface - Font typeface
     * @returns This text element
     */
    public setTypeface(typeface: string) {
        this.typeface = typeface;
        this.invalidateTextLayoutCache();
        return this;
    }

    /**
     * Typeface set accessor
     * @param typesize - Font type size in pixels
     * @returns This text element
     */
    public setTypesize(typesize: number) {
        this.typesize = typesize;
        this.invalidateTextLayoutCache();
        return this;
    }

    /**
     * Typestyle set accessor
     * @param typestyle - Font typestyle
     * @returns This text element
     */
    public setTypestyle(typestyle: string) {
        this.typestyle = typestyle;
        this.invalidateTextLayoutCache();
        return this;
    }

    /**
     * Sets additional character spacing in pixels.
     * @param letterSpacing - Character spacing
     * @returns This text element
     */
    public setLetterSpacing(letterSpacing: number) {
        this.letterSpacing = Number(letterSpacing) || 0;
        this.invalidateTextLayoutCache();
        return this;
    }

    /**
     * Sets text decoration directives.
     * @param decoration - underline, overline, and/or line-through
     * @returns This text element
     */
    public setTextDecoration(decoration?: string) {
        this.textDecoration = TextElement.normalizeTextDecoration(decoration);
        this.invalidateTextLayoutCache();
        return this;
    }

    /**
     * Sets line-height multiplier applied between laid out lines.
     * @param lineHeight - Line-height multiplier
     * @returns This text element
     */
    public setLineHeight(lineHeight: number | undefined) {
        const normalized = Number(lineHeight);
        this.lineHeight = Number.isFinite(normalized) && normalized > 0 ? normalized : undefined;
        this.invalidateTextLayoutCache();
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
        this.invalidateTextLayoutCache();
        return this;
    }

    /**
     * Alignment set accessor
     * @param alignment - Text block alignment directives
     * @returns This text element
     */
    public setAlignment(alignment: string) {
        this.alignment = alignment;
        this.invalidateTextLayoutCache();
        return this;
    }

    /**
     * Returns the editable text length for this element.
     * @returns Text length
     */
    public getTextLength(): number {
        return (this.getResolvedText() || '').length;
    }

    /**
     * Returns the effective text style at a given character index.
     * @param index - Character index
     * @returns Effective text style
     */
    public getTextStyleAt(index: number): TextRunStyle {
        const characters = this.toStyledCharacters();
        if (characters.length === 0) {
            return TextElement.styleFromRun(this.getResolvedTextRuns()[0]);
        }

        const clampedIndex = Math.max(0, Math.min(index, characters.length - 1));
        return { ...characters[clampedIndex].style };
    }

    /**
     * Replaces a text range with plain text or rich runs.
     * @param start - Start index
     * @param end - End index
     * @param content - Replacement text or runs
     * @param style - Optional style applied when inserting plain text
     * @returns This text element
     */
    public replaceTextRange(start: number, end: number, content: string | TextRun[], style?: TextRunStyle): TextElement {
        const characters = this.toStyledCharacters();
        const normalizedStart = Math.max(0, Math.min(start, characters.length));
        const normalizedEnd = Math.max(normalizedStart, Math.min(end, characters.length));
        const replacement = typeof content === 'string'
            ? TextElement.charactersFromText(content, style)
            : TextElement.charactersFromRuns(content);
        characters.splice(normalizedStart, normalizedEnd - normalizedStart, ...replacement);
        this.applyStyledCharacters(characters);
        return this;
    }

    /**
     * Applies style updates to a text range.
     * @param start - Start index
     * @param end - End index
     * @param style - Style updates
     * @returns This text element
     */
    public applyTextStyle(start: number, end: number, style: TextRunStyle): TextElement {
        const characters = this.toStyledCharacters();
        const normalizedStart = Math.max(0, Math.min(start, characters.length));
        const normalizedEnd = Math.max(normalizedStart, Math.min(end, characters.length));
        for (let index = normalizedStart; index < normalizedEnd; index++) {
            characters[index].style = TextElement.mergeStyles(characters[index].style, style);
        }
        this.applyStyledCharacters(characters);
        return this;
    }

    /**
     * Resolves the text index nearest a rendered point.
     * @param c - Rendering context
     * @param location - Render origin
     * @param size - Render size
     * @param point - Local point to resolve
     * @returns Text index
     */
    public getTextIndexAtPoint(c: CanvasRenderingContext2D, location: Point, size: Size, point: Point): number {
        const positions = this.getInsertionLayout(c, location, size);
        if (positions.length === 0) {
            return 0;
        }

        let nearest = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const position of positions) {
            const centerY = position.y + position.height / 2;
            const distance = Math.abs(point.y - centerY) * 1000 + Math.abs(point.x - position.x);
            if (distance < bestDistance) {
                bestDistance = distance;
                nearest = position.index;
            }
        }

        const last = positions[positions.length - 1];
        if (point.y > last.y + last.height) {
            return this.getTextLength();
        }

        return Math.max(0, Math.min(nearest, this.getTextLength()));
    }

    /**
     * Returns the caret line for a given text index.
     * @param c - Rendering context
     * @param location - Render origin
     * @param size - Render size
     * @param index - Text index
     * @returns Caret region
     */
    public getCaretRegion(c: CanvasRenderingContext2D, location: Point, size: Size, index: number): Region {
        const positions = this.getInsertionLayout(c, location, size);
        if (positions.length === 0) {
            const lineHeight = this.getLineAdvance(this.typesize || 10);
            return new Region(location.x, location.y, 1, lineHeight);
        }

        const normalizedIndex = Math.max(0, Math.min(index, this.getTextLength()));
        const position = positions[normalizedIndex] || positions[positions.length - 1];
        return new Region(position.x, position.y, 1, position.height);
    }

    /**
     * Returns selection rectangles for a text range.
     * @param c - Rendering context
     * @param location - Render origin
     * @param size - Render size
     * @param start - Range start
     * @param end - Range end
     * @returns Selection rectangles
     */
    public getSelectionRegions(
        c: CanvasRenderingContext2D,
        location: Point,
        size: Size,
        start: number,
        end: number,
    ): Region[] {
        const characters = this.getCharacterLayout(c, location, size);
        const normalizedStart = Math.max(0, Math.min(start, end));
        const normalizedEnd = Math.min(this.getTextLength(), Math.max(normalizedStart, Math.max(start, end)));
        if (normalizedStart >= normalizedEnd) {
            return [];
        }

        const regions: Region[] = [];
        let current: Region | undefined;
        let currentLine = -1;
        for (const character of characters) {
            if (character.index < normalizedStart || character.index >= normalizedEnd) {
                continue;
            }
            if (!current || character.lineIndex !== currentLine) {
                current = new Region(character.region.x, character.region.y, character.region.width, character.region.height);
                regions.push(current);
                currentLine = character.lineIndex;
            }
            else {
                const nextRight = character.region.x + character.region.width;
                current = new Region(
                    current.x,
                    current.y,
                    nextRight - current.x,
                    Math.max(current.height, character.region.height),
                );
                regions[regions.length - 1] = current;
            }
        }
        return regions;
    }

    /**
     * Resolves a caret index one visual line above or below the supplied index.
     * @param c - Rendering context
     * @param location - Render origin
     * @param size - Render size
     * @param index - Current caret index
     * @param direction - -1 for up, 1 for down
     * @param preferredX - Optional preferred horizontal caret coordinate
     * @returns Adjacent line caret index
     */
    public getVerticalTextIndex(
        c: CanvasRenderingContext2D,
        location: Point,
        size: Size,
        index: number,
        direction: -1 | 1,
        preferredX?: number,
    ): number {
        const positions = this.getInsertionLayout(c, location, size);
        if (positions.length === 0) {
            return 0;
        }

        const normalizedIndex = Math.max(0, Math.min(index, this.getTextLength()));
        const currentPosition = positions[normalizedIndex] || positions[positions.length - 1];
        const currentLine = currentPosition.lineIndex;
        const targetLine = currentLine + direction;
        if (targetLine < 0) {
            return 0;
        }

        const targetPositions = positions.filter((position) => position.lineIndex === targetLine);
        if (targetPositions.length === 0) {
            return this.getTextLength();
        }

        const targetX = preferredX !== undefined
            ? preferredX
            : currentPosition.x;
        return this.resolveInsertionIndexForLine(targetPositions, targetX);
    }

    /**
     * Returns the text range for the word or whitespace run at the given index.
     * @param index - Character index
     * @returns Range tuple [start, end)
     */
    public getWordRangeAt(index: number): [number, number] {
        const text = this.getResolvedText() || '';
        if (text.length === 0) {
            return [0, 0];
        }

        let targetIndex = Math.max(0, Math.min(index, text.length - 1));
        if (targetIndex === text.length && text.length > 0) {
            targetIndex = text.length - 1;
        }

        const targetCharacter = text.charAt(targetIndex);
        const isWordCharacter = TextElement.isWordCharacter(targetCharacter);

        let start = targetIndex;
        while (start > 0 && TextElement.isWordCharacter(text.charAt(start - 1)) === isWordCharacter) {
            start--;
        }

        let end = targetIndex + 1;
        while (end < text.length && TextElement.isWordCharacter(text.charAt(end)) === isWordCharacter) {
            end++;
        }

        return [start, end];
    }

    /**
     * Resolves the plain text content for this element.
     * @returns Resolved text content
     */
    public getResolvedText(): string | undefined {
        if (this.source && this.model) {
            const res = this.model.resourceManager.get(this.source) as TextResource;
            if (res) {
                return res.text;
            }
        }
        if (this.richText && this.richText.length > 0) {
            if (this._resolvedPlainTextCache === undefined) {
                this._resolvedPlainTextCache = this.richText.map((run) => run.text).join('');
            }
            return this._resolvedPlainTextCache;
        }
        return this.text;
    }

    /**
     * Returns the raw rich text runs for this element or a single synthesized run for plain text.
     * @returns Text runs
     */
    public getResolvedTextRuns(): TextRun[] {
        const runs = this.getResolvedTextRunsInternal();
        if (runs.length === 0) {
            return [];
        }
        return TextElement.cloneTextRuns(runs);
    }

    private getResolvedTextRunsInternal(): TextRun[] {
        if (this.richText && this.richText.length > 0) {
            return this.richText;
        }
        if (this._resolvedRunsCache) {
            return this._resolvedRunsCache;
        }
        const text = this.getResolvedText();
        if (!text) {
            return [];
        }
        this._resolvedRunsCache = [{ text }];
        return this._resolvedRunsCache;
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

        const runs = this.getResolvedTextRunsInternal();
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

            const textLayout = this.getCachedTextLayout(c, runs, size.width);
            if (textLayout.layout.length === 0) {
                return;
            }

            const alignment = textLayout.alignment;
            const totalHeight = textLayout.totalHeight;
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
                this.renderLayoutPass(c, textLayout.layout, location, size, startY, alignment.horizontal, true, false);
            }
            if (hasStroke) {
                this.renderLayoutPass(c, textLayout.layout, location, size, startY, alignment.horizontal, false, !hasFill);
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
        return this.getCachedTextLayout(c, [{ text }], lineWidth).layout.map((line) => line.segments.map((segment) => segment.text).join(''));
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
        let currentLine = this.createEmptyLine(0);
        let textIndex = 0;

        for (const run of runs) {
            const style = this.resolveRunStyle(run);
            const tokens = TextElement.tokenize(run.text);
            for (const token of tokens) {
                if (token === '\n') {
                    currentLine.endIndex = textIndex;
                    lines.push(currentLine);
                    textIndex += 1;
                    currentLine = this.createEmptyLine(textIndex);
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
                    currentLine.endIndex = textIndex;
                    lines.push(currentLine);
                    currentLine = this.createEmptyLine(textIndex);
                }

                if (token.trim().length === 0 && currentLine.segments.length === 0) {
                    continue;
                }
                if (token.trim().length === 0 && lineWidth > 0 && currentLine.width + width > lineWidth) {
                    lines.push(currentLine);
                    currentLine = this.createEmptyLine(textIndex);
                    continue;
                }

                currentLine.segments.push({ text: token, width, style, startIndex: textIndex });
                currentLine.width += width;
                currentLine.height = Math.max(currentLine.height, style.typesize);
                currentLine.advanceHeight = this.getLineAdvance(currentLine.height);
                textIndex += token.length;
                currentLine.endIndex = textIndex;
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
            y += line.advanceHeight;
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
            currentX += this.measureCharacterWidth(c, character, segment.style);
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
        const font = this.buildFontString(style);
        const spacing = Math.max(0, text.length - 1) * style.letterSpacing;
        return this.measureRawTextWidth(c, text, font) + spacing;
    }

    private measureCharacterWidth(c: CanvasRenderingContext2D, character: string, style: ResolvedTextRunStyle): number {
        return this.measureRawTextWidth(c, character, this.buildFontString(style));
    }

    private measureRawTextWidth(c: CanvasRenderingContext2D, text: string, font: string): number {
        const cacheKey = font + '|' + text;
        const cached = this._textMeasureCache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        c.font = font;
        const width = c.measureText(text).width;
        this._textMeasureCache.set(cacheKey, width);
        return width;
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

    private createEmptyLine(startIndex: number): TextLayoutLine {
        const lineHeight = this.typesize !== undefined ? this.typesize : 10;
        return {
            segments: [],
            width: 0,
            height: lineHeight,
            advanceHeight: this.getLineAdvance(lineHeight),
            startIndex,
            endIndex: startIndex,
        };
    }

    private getCachedTextLayout(c: CanvasRenderingContext2D, runs: TextRun[], lineWidth: number): CachedTextLayout {
        if (this._layoutCache && this._layoutCache.revision === this._textLayoutRevision && this._layoutCache.lineWidth === lineWidth) {
            return this._layoutCache;
        }

        const layout = this.layoutRuns(c, runs, lineWidth);
        const alignment = this.resolveAlignment();
        const totalHeight = layout.reduce((sum, line) => sum + line.advanceHeight, 0);
        this._layoutCache = { revision: this._textLayoutRevision, lineWidth, layout, alignment, totalHeight };
        return this._layoutCache;
    }

    private getLineAdvance(lineHeight: number): number {
        const multiplier = this.lineHeight !== undefined && this.lineHeight > 0 ? this.lineHeight : 1;
        return lineHeight * multiplier;
    }

    private invalidateTextLayoutCache(): void {
        this._textLayoutRevision++;
        this._layoutCache = undefined;
        this._characterLayoutCache = undefined;
        this._insertionLayoutCache = undefined;
        this._textMeasureCache.clear();
        this._resolvedPlainTextCache = undefined;
        this._resolvedRunsCache = undefined;
    }

    private getInsertionLayout(c: CanvasRenderingContext2D, location: Point, size: Size): TextInsertionLayout[] {
        const runs = this.getResolvedTextRunsInternal();
        if (runs.length === 0) {
            return [];
        }

        if (
            this._insertionLayoutCache &&
            this._insertionLayoutCache.revision === this._textLayoutRevision &&
            this._insertionLayoutCache.x === location.x &&
            this._insertionLayoutCache.y === location.y &&
            this._insertionLayoutCache.width === size.width &&
            this._insertionLayoutCache.height === size.height
        ) {
            return this._insertionLayoutCache.positions;
        }

        const textLayout = this.getCachedTextLayout(c, runs, size.width);
        const layout = textLayout.layout;
        if (layout.length === 0) {
            return [];
        }

        const textLength = this.getTextLength();
        const positions: TextInsertionLayout[] = new Array(Math.max(1, textLength + 1));
        const alignment = textLayout.alignment;
        const totalHeight = textLayout.totalHeight;
        let startY = location.y;
        if (alignment.vertical === 'middle') {
            startY = location.y + size.height / 2 - totalHeight / 2;
        }
        else if (alignment.vertical === 'bottom') {
            startY = location.y + size.height - totalHeight;
        }

        let y = startY;
        for (let lineIndex = 0; lineIndex < layout.length; lineIndex++) {
            const line = layout[lineIndex];
            let x = location.x;
            if (alignment.horizontal === 'center') {
                x += size.width / 2 - line.width / 2;
            }
            else if (alignment.horizontal === 'right') {
                x += size.width - line.width;
            }

            positions[line.startIndex] = { index: line.startIndex, x, y, height: line.advanceHeight, lineIndex };
            let currentX = x;
            for (const segment of line.segments) {
                for (let index = 0; index < segment.text.length; index++) {
                    const rawIndex = segment.startIndex + index;
                    const character = segment.text.charAt(index);
                    const characterWidth = this.measureCharacterWidth(c, character, segment.style);
                    const advanceWidth = characterWidth + (index < segment.text.length - 1 ? segment.style.letterSpacing : 0);
                    positions[rawIndex] = { index: rawIndex, x: currentX, y, height: line.advanceHeight, lineIndex };
                    currentX += advanceWidth;
                    positions[rawIndex + 1] = { index: rawIndex + 1, x: currentX, y, height: line.advanceHeight, lineIndex };
                }
            }
            positions[line.endIndex] = { index: line.endIndex, x: currentX, y, height: line.advanceHeight, lineIndex };
            y += line.advanceHeight;
        }

        for (let index = 0; index < positions.length; index++) {
            if (!positions[index]) {
                positions[index] = positions[Math.max(0, index - 1)] || {
                    index,
                    x: location.x,
                    y: startY,
                    height: this.getLineAdvance(this.typesize !== undefined ? this.typesize : 10),
                    lineIndex: 0,
                };
            }
        }

        this._insertionLayoutCache = {
            revision: this._textLayoutRevision,
            x: location.x,
            y: location.y,
            width: size.width,
            height: size.height,
            positions,
        };
        return positions;
    }

    private getCharacterLayout(c: CanvasRenderingContext2D, location: Point, size: Size): TextCharacterLayout[] {
        const runs = this.getResolvedTextRunsInternal();
        if (runs.length === 0) {
            return [];
        }

        const textLayout = this.getCachedTextLayout(c, runs, size.width);
        if (
            this._characterLayoutCache &&
            this._characterLayoutCache.revision === this._textLayoutRevision &&
            this._characterLayoutCache.x === location.x &&
            this._characterLayoutCache.y === location.y &&
            this._characterLayoutCache.width === size.width &&
            this._characterLayoutCache.height === size.height
        ) {
            return this._characterLayoutCache.characters;
        }

        const layout = textLayout.layout;
        if (layout.length === 0) {
            return [];
        }

        const alignment = textLayout.alignment;
        const totalHeight = textLayout.totalHeight;
        let startY = location.y;
        if (alignment.vertical === 'middle') {
            startY = location.y + size.height / 2 - totalHeight / 2;
        }
        else if (alignment.vertical === 'bottom') {
            startY = location.y + size.height - totalHeight;
        }

        const characters: TextCharacterLayout[] = [];
        let y = startY;
        let textIndex = 0;
        for (let lineIndex = 0; lineIndex < layout.length; lineIndex++) {
            const line = layout[lineIndex];
            let x = location.x;
            if (alignment.horizontal === 'center') {
                x += size.width / 2 - line.width / 2;
            }
            else if (alignment.horizontal === 'right') {
                x += size.width - line.width;
            }

            for (const segment of line.segments) {
                for (let index = 0; index < segment.text.length; index++) {
                    const character = segment.text.charAt(index);
                    const characterWidth = this.measureCharacterWidth(c, character, segment.style);
                    const advanceWidth = characterWidth + (index < segment.text.length - 1 ? segment.style.letterSpacing : 0);
                    characters.push({
                        index: segment.startIndex + index,
                        character,
                        region: new Region(x, y, Math.max(advanceWidth, 1), line.advanceHeight),
                        lineIndex,
                    });
                    x += advanceWidth;
                }
            }
            y += line.advanceHeight;
        }

        this._characterLayoutCache = {
            revision: this._textLayoutRevision,
            x: location.x,
            y: location.y,
            width: size.width,
            height: size.height,
            characters,
        };
        return characters;
    }

    private resolveInsertionIndexForLine(positions: TextInsertionLayout[], x: number): number {
        if (positions.length === 0) {
            return 0;
        }

        for (let index = 0; index < positions.length; index++) {
            const current = positions[index];
            const next = positions[index + 1];
            const centerX = next ? current.x + (next.x - current.x) / 2 : current.x;
            if (x <= centerX) {
                return current.index;
            }
        }

        return positions[positions.length - 1].index;
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

    private toStyledCharacters(): Array<{ character: string; style: TextRunStyle }> {
        return TextElement.charactersFromRuns(this.getResolvedTextRunsInternal());
    }

    private applyStyledCharacters(characters: Array<{ character: string; style: TextRunStyle }>): void {
        const runs = TextElement.runsFromCharacters(characters);
        if (runs.length === 0) {
            this.setText('');
            return;
        }

        if (runs.length === 1 && !TextElement.runHasStyle(runs[0])) {
            this.setText(runs[0].text);
            return;
        }

        this.setRichText(runs);
    }

    private static charactersFromRuns(runs: TextRun[]): Array<{ character: string; style: TextRunStyle }> {
        const characters: Array<{ character: string; style: TextRunStyle }> = [];
        for (const run of runs) {
            const style = TextElement.styleFromRun(run);
            for (const character of run.text.split('')) {
                characters.push({ character, style: { ...style } });
            }
        }
        return characters;
    }

    private static charactersFromText(text: string, style?: TextRunStyle): Array<{ character: string; style: TextRunStyle }> {
        return text.split('').map((character) => ({ character, style: { ...(style || {}) } }));
    }

    private static runsFromCharacters(characters: Array<{ character: string; style: TextRunStyle }>): TextRun[] {
        const runs: TextRun[] = [];
        let current: TextRun | undefined;
        for (const item of characters) {
            if (!current || !TextElement.stylesEqual(TextElement.styleFromRun(current), item.style)) {
                current = {
                    text: item.character,
                    typeface: item.style.typeface,
                    typesize: item.style.typesize,
                    typestyle: item.style.typestyle,
                    letterSpacing: item.style.letterSpacing,
                    decoration: TextElement.normalizeTextDecoration(item.style.decoration),
                };
                runs.push(current);
            }
            else {
                current.text += item.character;
            }
        }
        return runs;
    }

    private static styleFromRun(run?: TextRun): TextRunStyle {
        if (!run) {
            return {};
        }
        return {
            typeface: run.typeface,
            typesize: run.typesize,
            typestyle: run.typestyle,
            letterSpacing: run.letterSpacing,
            decoration: TextElement.normalizeTextDecoration(run.decoration),
        };
    }

    private static mergeStyles(base: TextRunStyle, updates: TextRunStyle): TextRunStyle {
        return {
            typeface: updates.typeface !== undefined ? updates.typeface : base.typeface,
            typesize: updates.typesize !== undefined ? updates.typesize : base.typesize,
            typestyle: updates.typestyle !== undefined ? updates.typestyle : base.typestyle,
            letterSpacing: updates.letterSpacing !== undefined ? updates.letterSpacing : base.letterSpacing,
            decoration: updates.decoration !== undefined ? TextElement.normalizeTextDecoration(updates.decoration) : base.decoration,
        };
    }

    private static stylesEqual(a: TextRunStyle, b: TextRunStyle): boolean {
        return (
            (a.typeface || undefined) === (b.typeface || undefined) &&
            a.typesize === b.typesize &&
            (a.typestyle || undefined) === (b.typestyle || undefined) &&
            a.letterSpacing === b.letterSpacing &&
            (TextElement.normalizeTextDecoration(a.decoration) || undefined) === (TextElement.normalizeTextDecoration(b.decoration) || undefined)
        );
    }

    private static runHasStyle(run: TextRun): boolean {
        return Boolean(
            run.typeface !== undefined ||
            run.typesize !== undefined ||
            run.typestyle !== undefined ||
            run.letterSpacing !== undefined ||
            run.decoration !== undefined
        );
    }

    private static isWordCharacter(character: string): boolean {
        return !/\s/.test(character);
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
