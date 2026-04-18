import { ErrorMessages } from '../core/error-messages';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { Region } from '../core/region';
import type { SerializedData } from '../core/serialization';
import { Size } from '../core/size';
import { StrokeInfo } from '../core/stroke-info';
import { FillFactory } from '../fill/fill-factory';
import { ResourceManager } from '../resource/resource-manager';
import { TextResource } from '../resource/text-resource';
import { ElementBase } from './element-base';
import { clearGeometryCache, getPathLength, getPointAtLength } from './path-geometry';
import {
    getPathCommandPointAt,
    getPathCommandPointCount,
    parsePathCommandString,
    scalePathCommands,
    setPathCommandPointAt,
    tracePathCommands,
    translatePathCommands,
} from './path-command-utils';
import { commandsBounds } from './primitive-shape-utils';
import type { TextRun } from './text-element';

type PathTextStyle = {
    typeface?: string;
    typesize: number;
    typestyle?: string;
    letterSpacing: number;
    decoration?: string;
};

type TextPathCharacter = {
    character: string;
    width: number;
    advance: number;
    style: PathTextStyle;
};

type TextPathGlyph = {
    character: string;
    width: number;
    point: Point;
    angle: number;
    style: PathTextStyle;
};

const normalizeTextDecoration = (decoration?: string): string | undefined => {
    if (!decoration) {
        return undefined;
    }
    const parts = decoration
        .split(/[\s,]+/)
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 0 && part !== 'none');
    if (parts.length === 0) {
        return undefined;
    }
    const unique: string[] = [];
    for (const part of parts) {
        if (unique.indexOf(part) === -1) {
            unique.push(part);
        }
    }
    return unique.join(',');
};

const cloneTextRuns = (runs: TextRun[]): TextRun[] => {
    return runs.map((run) => ({
        text: run.text,
        typeface: run.typeface,
        typesize: run.typesize,
        typestyle: run.typestyle,
        letterSpacing: run.letterSpacing,
        decoration: normalizeTextDecoration(run.decoration),
    }));
};

const parseDecorationParts = (decoration?: string): string[] => {
    return decoration ? decoration.split(',').map((part) => part.trim()).filter((part) => part.length > 0) : [];
};

/**
 * Element that renders text positioned and rotated along a guide path.
 *
 * TextPathElement keeps path-following text separate from rectangular text
 * layout handled by TextElement. It supports plain text, text resources,
 * rich-text runs, SVG import/export through <textPath>, and animation of the
 * startOffset property.
 */
export class TextPathElement extends ElementBase {
    private _pathCommands?: string[];
    private _bounds?: Region;
    private _textMeasureCache: Map<string, number> = new Map<string, number>();
    private _resolvedPlainTextCache?: string;
    private _resolvedRunsCache?: TextRun[];

    public static create(text?: string | TextResource, pathData?: string): TextPathElement {
        const element = new TextPathElement();
        if (typeof text === 'string') {
            element.text = text;
        }
        else if (text) {
            element.source = text.key;
        }
        if (pathData) {
            element.setPathCommands(pathData);
        }
        return element;
    }

    public static fromSVGPath(pathData: string, text?: string | TextResource): TextPathElement {
        const element = TextPathElement.create(text);
        element._pathCommands = parsePathCommandString(pathData, false);
        element.clearBounds();
        return element;
    }

    public editPoints: boolean = false;

    public text?: string;
    public source?: string;
    public typeface?: string;
    public typesize?: number;
    public typestyle?: string;
    public alignment?: string;
    public letterSpacing: number = 0;
    public textDecoration?: string;
    public richText?: TextRun[];
    public startOffset: number = 0;
    public startOffsetPercent: boolean = false;
    public showPath: boolean = false;
    public side: 'left' | 'right' = 'left';

    constructor() {
        super('textPath');
    }

    get pathCommands(): string | undefined {
        return this._pathCommands ? this._pathCommands.join(' ') : undefined;
    }

    set pathCommands(commandString: string | undefined) {
        if (commandString && commandString.trim().length > 0) {
            this._pathCommands = parsePathCommandString(commandString, true);
        }
        else {
            this._pathCommands = undefined;
        }
        this.clearBounds();
    }

    public getPathCommands(): string[] | undefined {
        return this._pathCommands;
    }

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
            this.textDecoration = normalizeTextDecoration(o.textDecoration as string);
        }
        if (Array.isArray(o.richText)) {
            this.richText = cloneTextRuns(o.richText as TextRun[]);
        }
        if (o.pathCommands) {
            this._pathCommands = parsePathCommandString(String(o.pathCommands), true);
        }
        if (o.startOffset !== undefined) {
            this.startOffset = Number(o.startOffset) || 0;
        }
        this.startOffsetPercent = Boolean(o.startOffsetPercent);
        this.showPath = Boolean(o.showPath);
        this.side = o.side === 'right' ? 'right' : 'left';
        this.clearBounds();
        this.invalidateTextCaches();
    }

    public serialize(): SerializedData {
        const o = super.serialize();
        o.location = undefined;
        o.size = undefined;
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
        if (this.alignment && this.alignment !== 'left') {
            o.alignment = this.alignment;
        }
        if (this.letterSpacing !== 0) {
            o.letterSpacing = this.letterSpacing;
        }
        if (this.textDecoration) {
            o.textDecoration = this.textDecoration;
        }
        if (this.richText && this.richText.length > 0) {
            o.richText = cloneTextRuns(this.richText);
        }
        if (this._pathCommands && this._pathCommands.length > 0) {
            o.pathCommands = this._pathCommands.join(' ');
        }
        if (this.startOffset !== 0) {
            o.startOffset = this.startOffset;
        }
        if (this.startOffsetPercent) {
            o.startOffsetPercent = true;
        }
        if (this.showPath) {
            o.showPath = true;
        }
        if (this.side === 'right') {
            o.side = 'right';
        }
        return o;
    }

    public clone(): TextPathElement {
        const element = TextPathElement.create();
        super.cloneTo(element);
        element.text = this.text;
        element.source = this.source;
        element.typeface = this.typeface;
        element.typesize = this.typesize;
        element.typestyle = this.typestyle;
        element.alignment = this.alignment;
        element.letterSpacing = this.letterSpacing;
        element.textDecoration = this.textDecoration;
        element.richText = this.richText ? cloneTextRuns(this.richText) : undefined;
        element._pathCommands = this._pathCommands ? this._pathCommands.slice() : undefined;
        element.startOffset = this.startOffset;
        element.startOffsetPercent = this.startOffsetPercent;
        element.showPath = this.showPath;
        element.side = this.side;
        element.clearBounds();
        return element;
    }

    public registerResources(rm: ResourceManager): void {
        super.registerResources(rm);
        if (this.source) {
            rm.register(this.source);
        }
    }

    public getResourceKeys() {
        const keys = super.getResourceKeys();
        if (this.source) {
            keys.push(this.source);
        }
        return keys;
    }

    public getResolvedText(): string | undefined {
        if (this.source && this.model) {
            const resource = this.model.resourceManager.get(this.source) as TextResource;
            if (resource) {
                return resource.text;
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

    public getResolvedTextRuns(): TextRun[] {
        const runs = this.getResolvedTextRunsInternal();
        return runs.length > 0 ? cloneTextRuns(runs) : [];
    }

    public setText(text: string) {
        this.text = text;
        this.source = undefined;
        this.richText = undefined;
        this.invalidateTextCaches();
        return this;
    }

    public setSource(source: string) {
        this.source = source;
        this.text = undefined;
        this.richText = undefined;
        this.invalidateTextCaches();
        return this;
    }

    public setTypeface(typeface: string) {
        this.typeface = typeface;
        this.invalidateTextCaches();
        return this;
    }

    public setTypesize(typesize: number) {
        this.typesize = typesize;
        this.clearBounds();
        this.invalidateTextCaches();
        return this;
    }

    public setTypestyle(typestyle: string) {
        this.typestyle = typestyle;
        this.invalidateTextCaches();
        return this;
    }

    public setAlignment(alignment: string) {
        this.alignment = alignment;
        return this;
    }

    public setLetterSpacing(letterSpacing: number) {
        this.letterSpacing = Number(letterSpacing) || 0;
        this.clearBounds();
        this.invalidateTextCaches();
        return this;
    }

    public setTextDecoration(decoration?: string) {
        this.textDecoration = normalizeTextDecoration(decoration);
        return this;
    }

    public setRichText(richText: TextRun[]) {
        this.richText = cloneTextRuns(richText);
        this.text = undefined;
        this.source = undefined;
        this.clearBounds();
        this.invalidateTextCaches();
        return this;
    }

    public setPathCommands(pathData: string) {
        this._pathCommands = parsePathCommandString(pathData, false);
        this.clearBounds();
        return this;
    }

    public setStartOffset(startOffset: number) {
        this.startOffset = Number(startOffset) || 0;
        return this;
    }

    public setStartOffsetPercent(startOffsetPercent: boolean) {
        this.startOffsetPercent = Boolean(startOffsetPercent);
        return this;
    }

    public setShowPath(showPath: boolean) {
        this.showPath = Boolean(showPath);
        return this;
    }

    public setSide(side: 'left' | 'right') {
        this.side = side === 'right' ? 'right' : 'left';
        return this;
    }

    public canFill(): boolean {
        return true;
    }

    public canStroke(): boolean {
        return true;
    }

    public canMove(): boolean {
        return true;
    }

    public canResize(): boolean {
        return !this.editPoints;
    }

    public canEditPoints(): boolean {
        return true;
    }

    public canMovePoint(): boolean {
        return this.editPoints;
    }

    public pointCount(): number {
        return this._pathCommands ? getPathCommandPointCount(this._pathCommands) : 0;
    }

    public getPointAt(index: number, depth?: PointDepth): Point {
        if (!this._pathCommands) {
            throw new Error(ErrorMessages.NoCommandsAreDefined);
        }
        return getPathCommandPointAt(this._pathCommands, index, depth);
    }

    public setPointAt(index: number, value: Point, depth: PointDepth) {
        if (!this._pathCommands) {
            throw new Error(ErrorMessages.NoCommandsAreDefined);
        }
        setPathCommandPointAt(this._pathCommands, index, value, depth);
        clearGeometryCache(this._pathCommands);
        this.clearBounds();
        return this;
    }

    public getCommands(): string[] | undefined {
        return this._pathCommands;
    }

    public getLocation(): Point | undefined {
        return this.getBounds()?.location;
    }

    public getSize(): Size | undefined {
        return this.getBounds()?.size;
    }

    public setLocation(pointSource: string | Point) {
        const target = typeof pointSource === 'string' ? Point.parse(pointSource) : Point.parse(pointSource);
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        return this.translate(target.x - bounds.x, target.y - bounds.y);
    }

    public setSize(sizeSource: string | Size) {
        const size = typeof sizeSource === 'string' ? Size.parse(sizeSource) : Size.parse(sizeSource);
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        const scaleX = bounds.width === 0 ? 1 : size.width / bounds.width;
        const scaleY = bounds.height === 0 ? 1 : size.height / bounds.height;
        return this.scale(scaleX, scaleY);
    }

    public translate(offsetX: number, offsetY: number) {
        if (!this._pathCommands) {
            throw new Error(ErrorMessages.NoCommandsAreDefined);
        }
        this._pathCommands = translatePathCommands(this._pathCommands, offsetX, offsetY);
        this.clearBounds();
        return this;
    }

    public scale(scaleX: number, scaleY: number) {
        if (!this._pathCommands) {
            throw new Error(ErrorMessages.NoCommandsAreDefined);
        }
        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }
        this._pathCommands = scalePathCommands(this._pathCommands, scaleX, scaleY, bounds.x, bounds.y);
        const typographyScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
        if (this.typesize !== undefined) {
            this.typesize *= typographyScale;
        }
        this.letterSpacing *= typographyScale;
        if (!this.startOffsetPercent) {
            this.startOffset *= typographyScale;
        }
        this.clearBounds();
        this.invalidateTextCaches();
        return this;
    }

    public clearBounds() {
        this._bounds = undefined;
    }

    public getPathLength(): number {
        return getPathLength(this._pathCommands);
    }

    public getBounds(): Region | undefined {
        if (this._bounds) {
            return this._bounds;
        }
        if (!this._pathCommands || this._pathCommands.length === 0) {
            return undefined;
        }

        const baseBounds = commandsBounds(this._pathCommands);
        if (!baseBounds) {
            return undefined;
        }

        const strokeWidth = this.stroke ? StrokeInfo.parseStroke(this.stroke).width : 0;
        const padding = Math.max(this.getMaximumTypesize(), 10) + strokeWidth;
        this._bounds = new Region(
            baseBounds.x - padding,
            baseBounds.y - padding,
            baseBounds.width + padding * 2,
            baseBounds.height + padding * 2,
        );
        return this._bounds;
    }

    public draw(c: CanvasRenderingContext2D): void {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!this._pathCommands || this._pathCommands.length === 0) {
            throw new Error(ErrorMessages.NoCommandsAreDefined);
        }

        const bounds = this.getBounds();
        if (!bounds) {
            throw new Error(ErrorMessages.BoundsAreUndefined);
        }

        const glyphs = this.buildGlyphLayout(c);
        if (glyphs.length === 0) {
            return;
        }

        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, bounds.location);
        }
        this.applyRenderOpacity(c);
        this.withClipPath(c, () => {
            c.textBaseline = 'alphabetic';
            c.textAlign = 'center';

            const hasFill = FillFactory.setElementFill(c, this);
            const hasStroke = model.setElementStroke(c, this);

            if (hasFill) {
                this.renderGlyphs(c, glyphs, true, bounds.location);
            }
            if (hasStroke) {
                this.renderGlyphs(c, glyphs, false, bounds.location);
            }
            if (this.showPath && hasStroke) {
                c.beginPath();
                tracePathCommands(c, this._pathCommands);
                c.stroke();
            }
        });
        c.restore();
    }

    public hitTest(c: CanvasRenderingContext2D, tx: number, ty: number): boolean {
        const model = this.model;
        if (!model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }

        const bounds = this.getBounds();
        if (!bounds) {
            return false;
        }

        const glyphs = this.buildGlyphLayout(c);
        if (glyphs.length === 0) {
            return false;
        }

        c.save();
        if (this.transform) {
            model.setRenderTransform(c, this.transform, bounds.location);
        }

        let hit = false;
        for (const glyph of glyphs) {
            const glyphHeight = glyph.style.typesize * 1.2;
            c.save();
            c.translate(glyph.point.x, glyph.point.y);
            c.rotate(this.side === 'right' ? glyph.angle + Math.PI : glyph.angle);
            c.beginPath();
            c.rect(-glyph.width / 2, -glyph.style.typesize, glyph.width, glyphHeight);
            hit = c.isPointInPath(tx, ty);
            c.restore();
            if (hit) {
                break;
            }
        }

        c.restore();
        if (!hit) {
            return false;
        }
        return this.isPointWithinClipPath(c, tx, ty);
    }

    private renderGlyphs(c: CanvasRenderingContext2D, glyphs: TextPathGlyph[], fill: boolean, fillOrigin: Point): void {
        const shouldOffsetFill = fill && (this.fillOffsetX || this.fillOffsetY);
        const translateX = fillOrigin.x + (this.fillOffsetX || 0);
        const translateY = fillOrigin.y + (this.fillOffsetY || 0);
        if (shouldOffsetFill) {
            c.save();
            c.translate(translateX, translateY);
        }

        for (const glyph of glyphs) {
            const drawX = shouldOffsetFill ? glyph.point.x - translateX : glyph.point.x;
            const drawY = shouldOffsetFill ? glyph.point.y - translateY : glyph.point.y;
            c.save();
            c.translate(drawX, drawY);
            c.rotate(this.side === 'right' ? glyph.angle + Math.PI : glyph.angle);
            c.font = this.buildFontString(glyph.style);
            if (fill) {
                c.fillText(glyph.character, 0, 0);
            }
            else {
                c.strokeText(glyph.character, 0, 0);
            }
            this.drawGlyphDecorations(c, glyph);
            c.restore();
        }

        if (shouldOffsetFill) {
            c.restore();
        }
    }

    private drawGlyphDecorations(c: CanvasRenderingContext2D, glyph: TextPathGlyph): void {
        const decorations = parseDecorationParts(glyph.style.decoration);
        if (decorations.length === 0) {
            return;
        }

        const originalLineWidth = c.lineWidth;
        c.lineWidth = Math.max(1, glyph.style.typesize / 16);
        c.beginPath();
        for (const decoration of decorations) {
            let y = glyph.style.typesize * 0.1;
            if (decoration === 'overline') {
                y = -glyph.style.typesize * 0.9;
            }
            else if (decoration === 'line-through') {
                y = -glyph.style.typesize * 0.35;
            }
            c.moveTo(-glyph.width / 2, y);
            c.lineTo(glyph.width / 2, y);
        }
        c.stroke();
        c.lineWidth = originalLineWidth;
    }

    private buildGlyphLayout(c: CanvasRenderingContext2D): TextPathGlyph[] {
        if (!this._pathCommands || this._pathCommands.length === 0) {
            return [];
        }

        const characters = this.buildCharacterSequence(c);
        if (characters.length === 0) {
            return [];
        }

        const pathLength = getPathLength(this._pathCommands);
        if (pathLength <= 0) {
            return [];
        }

        const totalAdvance = characters.reduce((sum, character) => sum + character.advance, 0);
        let offset = this.startOffsetPercent ? pathLength * (this.startOffset / 100) : this.startOffset;
        const alignment = (this.alignment || 'left').trim().toLowerCase();
        if (alignment === 'center') {
            offset += (pathLength - totalAdvance) / 2;
        }
        else if (alignment === 'right' || alignment === 'end') {
            offset += pathLength - totalAdvance;
        }

        const glyphs: TextPathGlyph[] = [];
        let cursor = offset;
        for (const character of characters) {
            const centerDistance = cursor + character.width / 2;
            if (centerDistance >= 0 && centerDistance <= pathLength) {
                const position = getPointAtLength(this._pathCommands, centerDistance);
                glyphs.push({
                    character: character.character,
                    width: character.width,
                    point: position.point,
                    angle: position.angle,
                    style: character.style,
                });
            }
            cursor += character.advance;
        }

        return glyphs;
    }

    private buildCharacterSequence(c: CanvasRenderingContext2D): TextPathCharacter[] {
        const runs = this.getResolvedTextRunsInternal();
        if (runs.length === 0) {
            return [];
        }

        const sequence: TextPathCharacter[] = [];
        for (const run of runs) {
            const style = this.resolveRunStyle(run);
            const normalizedText = run.text.replace(/\r\n?/g, '\n').replace(/\n/g, ' ');
            for (let index = 0; index < normalizedText.length; index++) {
                const character = normalizedText.charAt(index);
                const width = this.measureCharacterWidth(c, character, style);
                sequence.push({
                    character,
                    width,
                    advance: width,
                    style,
                });
            }
        }

        for (let index = 0; index < sequence.length - 1; index++) {
            sequence[index].advance += sequence[index].style.letterSpacing;
        }
        return sequence;
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

    private resolveRunStyle(run: TextRun): PathTextStyle {
        return {
            typeface: run.typeface !== undefined ? run.typeface : this.typeface,
            typesize: run.typesize !== undefined ? run.typesize : this.typesize !== undefined ? this.typesize : 10,
            typestyle: run.typestyle !== undefined ? run.typestyle : this.typestyle,
            letterSpacing: run.letterSpacing !== undefined ? run.letterSpacing : this.letterSpacing,
            decoration: normalizeTextDecoration(run.decoration !== undefined ? run.decoration : this.textDecoration),
        };
    }

    private buildFontString(style: PathTextStyle): string {
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

    private measureCharacterWidth(c: CanvasRenderingContext2D, character: string, style: PathTextStyle): number {
        const font = this.buildFontString(style);
        const cacheKey = font + '|' + character;
        const cached = this._textMeasureCache.get(cacheKey);
        if (cached !== undefined) {
            return cached;
        }

        c.font = font;
        const width = c.measureText(character).width;
        this._textMeasureCache.set(cacheKey, width);
        return width;
    }

    private invalidateTextCaches(): void {
        this._textMeasureCache.clear();
        this._resolvedPlainTextCache = undefined;
        this._resolvedRunsCache = undefined;
    }

    private getMaximumTypesize(): number {
        const runs = this.getResolvedTextRunsInternal();
        let maximum = this.typesize !== undefined ? this.typesize : 10;
        for (const run of runs) {
            if (run.typesize !== undefined) {
                maximum = Math.max(maximum, run.typesize);
            }
        }
        return maximum;
    }
}