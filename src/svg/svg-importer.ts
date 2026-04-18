import { Model } from '../core/model';
import { Matrix2D } from '../core/matrix-2d';
import { Point } from '../core/point';
import { Size } from '../core/size';
import { Color } from '../core/color';
import { EllipseElement } from '../elements/ellipse-element';
import { ElementBase, type ElementClipPath } from '../elements/element-base';
import { ImageElement } from '../elements/image-element';
import { LineElement } from '../elements/line-element';
import { ModelElement } from '../elements/model-element';
import { PathElement } from '../elements/path-element';
import { transformPathCommands, translatePathCommands } from '../elements/path-command-utils';
import { PolygonElement } from '../elements/polygon-element';
import { PolylineElement } from '../elements/polyline-element';
import { RectangleElement } from '../elements/rectangle-element';
import { TextElement, type TextRun } from '../elements/text-element';
import { TextPathElement } from '../elements/text-path-element';
import { LinearGradientFill } from '../fill/linear-gradient-fill';
import { RadialGradientFill } from '../fill/radial-gradient-fill';
import { BitmapResource } from '../resource/bitmap-resource';
import { WindingMode } from '../core/winding-mode';

type SVGGradientStop = {
    color: string;
    offset: number;
};

type SVGGradientDefinition = {
    kind: 'linear' | 'radial';
    units: string;
    gradientTransform: Matrix2D;
    stops: SVGGradientStop[];
    x1?: string;
    y1?: string;
    x2?: string;
    y2?: string;
    cx?: string;
    cy?: string;
    fx?: string;
    fy?: string;
    r?: string;
};

type SVGImportContext = {
    fill?: string;
    stroke?: string;
    strokeWidth?: string;
    strokeDasharray?: string;
    strokeLinecap?: string;
    strokeLinejoin?: string;
    strokeMiterlimit?: string;
    fillRule?: string;
    clipPath?: string;
    filter?: string;
    opacity: number;
    visible: boolean;
    transform: Matrix2D;
    fontFamily?: string;
    fontSize?: string;
    fontStyle?: string;
    fontWeight?: string;
    lineHeight?: string;
    letterSpacing?: string;
    textDecoration?: string;
    textAnchor?: string;
    dominantBaseline?: string;
};

type ImportedTextRuns = {
    text: string;
    runs?: TextRun[];
};

type SVGImportState = {
    viewBoxOffsetX: number;
    viewBoxOffsetY: number;
    nextImageResourceId: number;
    gradients: Record<string, SVGGradientDefinition>;
    clipPaths: Record<string, ElementClipPath>;
    namedElements: Record<string, Element>;
};

/**
 * SVG importer for the subset of SVG currently supported by Elise.
 */
export class SVGImporter {
    /**
     * Parses an SVG string into an Elise model.
     * @param svgText - SVG document source
     * @returns Parsed model
     */
    public static parse(svgText: string): Model {
        if (typeof DOMParser === 'undefined') {
            throw new Error('DOMParser is unavailable.');
        }
        const parser = new DOMParser();
        const document = parser.parseFromString(svgText, 'image/svg+xml');
        return SVGImporter.parseDocument(document);
    }

    /**
     * Parses an SVG document into an Elise model.
     * @param document - Parsed SVG document
     * @returns Parsed model
     */
    public static parseDocument(document: Document): Model {
        const root = document.documentElement;
        if (!root || root.nodeName.toLowerCase() !== 'svg') {
            throw new Error('SVG document is invalid.');
        }

        let width = SVGImporter.parseLength(root.getAttribute('width'));
        let height = SVGImporter.parseLength(root.getAttribute('height'));
        let viewBoxOffsetX = 0;
        let viewBoxOffsetY = 0;
        const viewBox = root.getAttribute('viewBox');

        if (viewBox) {
            const parts = viewBox
                .trim()
                .split(/[\s,]+/)
                .map((part) => parseFloat(part));
            if (parts.length === 4 && parts.every((part) => !isNaN(part))) {
                viewBoxOffsetX = parts[0];
                viewBoxOffsetY = parts[1];
                if (width === undefined) {
                    width = parts[2];
                }
                if (height === undefined) {
                    height = parts[3];
                }
            }
        }

        const model = Model.create(width || 0, height || 0);
        const state: SVGImportState = {
            viewBoxOffsetX,
            viewBoxOffsetY,
            nextImageResourceId: 1,
            gradients: SVGImporter.collectGradientDefinitions(root),
            clipPaths: SVGImporter.collectClipPathDefinitions(root, viewBoxOffsetX, viewBoxOffsetY),
            namedElements: SVGImporter.collectNamedElements(root),
        };
        const context: SVGImportContext = {
            opacity: 1,
            visible: true,
            transform: Matrix2D.IDENTITY,
        };

        SVGImporter.importChildren(root, model, context, state);

        return model;
    }

    private static importChildren(parent: Element, model: Model, context: SVGImportContext, state: SVGImportState): void {
        for (let index = 0; index < parent.children.length; index++) {
            const child = parent.children[index];
            SVGImporter.importNode(child, model, context, state);
        }
    }

    private static importNode(element: Element, model: Model, parentContext: SVGImportContext, state: SVGImportState): void {
        const tagName = element.nodeName.toLowerCase();
        const context = SVGImporter.mergeContext(element, parentContext);

        if (tagName === 'g' || tagName === 'svg' || tagName === 'symbol') {
            const importedContainer = SVGImporter.importContainerElement(element, context, state);
            if (importedContainer) {
                model.add(importedContainer);
            }
            return;
        }

        if (tagName === 'defs' || tagName === 'lineargradient' || tagName === 'radialgradient' || tagName === 'stop' || tagName === 'clippath') {
            return;
        }

        if (tagName === 'use') {
            const importedUse = SVGImporter.importUseElement(element, model, parentContext, state);
            if (importedUse) {
                model.add(importedUse);
            }
            return;
        }

        const importedElement = SVGImporter.createElementFromNode(element, model, context, state);
        if (importedElement) {
            model.add(importedElement);
        }
    }

    private static createElementFromNode(
        element: Element,
        model: Model,
        context: SVGImportContext,
        state: SVGImportState,
    ): ElementBase | undefined {
        const tagName = element.nodeName.toLowerCase();
        let imported: ElementBase | undefined;

        switch (tagName) {
            case 'path':
                imported = SVGImporter.importPathElement(element, state);
                break;
            case 'rect':
                imported = SVGImporter.importRectangleElement(element, state);
                break;
            case 'ellipse':
                imported = SVGImporter.importEllipseElement(element, state);
                break;
            case 'circle':
                imported = SVGImporter.importCircleElement(element, state);
                break;
            case 'line':
                imported = SVGImporter.importLineElement(element, state);
                break;
            case 'polygon':
                imported = SVGImporter.importPolygonElement(element, state);
                break;
            case 'polyline':
                imported = SVGImporter.importPolylineElement(element, state);
                break;
            case 'text':
                imported = SVGImporter.importTextElement(element, context, state);
                break;
            case 'image':
                imported = SVGImporter.importImageElement(element, model, state);
                break;
            default:
                return undefined;
        }

        if (!imported) {
            return undefined;
        }

        SVGImporter.applyCommonAttributes(imported, element, context, state);
        return imported;
    }

    private static importContainerElement(
        element: Element,
        context: SVGImportContext,
        state: SVGImportState,
        sourceElement?: Element,
    ): ModelElement | undefined {
        const inheritedContext = SVGImporter.createContainerChildContext(context);
        const innerModel = SVGImporter.createContainerModel(element, state, sourceElement);
        SVGImporter.importChildren(element, innerModel, inheritedContext, state);
        if (innerModel.elements.length === 0) {
            return undefined;
        }

        const contentBounds = SVGImporter.computeContainerBounds(innerModel);
        if (contentBounds) {
            SVGImporter.normalizeContainerChildren(innerModel, contentBounds.location);
            innerModel.setLocation(Point.Origin);
            innerModel.setSize(new Size(contentBounds.width, contentBounds.height));
        }

        const location = contentBounds ? contentBounds.location : Point.Origin;
        const size = contentBounds ? contentBounds.size : innerModel.getSize();
        const modelElement = ModelElement.create(undefined, location.x, location.y, size?.width || 0, size?.height || 0);
        modelElement.sourceModel = innerModel;
        innerModel.parent = modelElement;
        SVGImporter.applyCommonAttributes(modelElement, sourceElement || element, context, state);
        return modelElement;
    }

    private static computeContainerBounds(model: Model): { location: Point; size: Size; width: number; height: number } | undefined {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        let found = false;

        for (const element of model.elements) {
            const bounds = element.getBounds();
            if (!bounds) {
                continue;
            }
            found = true;
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        }

        if (!found) {
            return undefined;
        }

        const width = maxX - minX;
        const height = maxY - minY;
        return {
            location: new Point(minX, minY),
            size: new Size(width, height),
            width,
            height,
        };
    }

    private static normalizeContainerChildren(model: Model, location: Point): void {
        if (location.x === 0 && location.y === 0) {
            return;
        }

        for (const element of model.elements) {
            element.translate(-location.x, -location.y);
            if (element.clipPath && element.clipPath.units !== 'objectBoundingBox') {
                element.clipPath = {
                    ...element.clipPath,
                    commands: SVGImporter.translatePathCommands(element.clipPath.commands, -location.x, -location.y),
                };
            }
        }
    }

    private static translatePathCommands(commands: string[], offsetX: number, offsetY: number): string[] {
        return translatePathCommands(commands, offsetX, offsetY);
    }

    private static importUseElement(
        element: Element,
        model: Model,
        parentContext: SVGImportContext,
        state: SVGImportState,
    ): ElementBase | undefined {
        const referenceId = SVGImporter.getPaintServerReferenceId(element);
        if (!referenceId) {
            return undefined;
        }

        const referencedElement = state.namedElements[referenceId];
        if (!referencedElement) {
            return undefined;
        }

        const useContext = SVGImporter.applyUseOffsets(SVGImporter.mergeContext(element, parentContext), element);
        const referencedContext = SVGImporter.mergeContext(referencedElement, useContext);
        const tagName = referencedElement.nodeName.toLowerCase();
        const imported = tagName === 'g' || tagName === 'svg' || tagName === 'symbol'
            ? SVGImporter.importContainerElement(referencedElement, referencedContext, state)
            : SVGImporter.createElementFromNode(referencedElement, model, referencedContext, state);

        if (!imported) {
            return undefined;
        }

        if (element.getAttribute('id')) {
            imported.id = element.getAttribute('id') || imported.id;
        }

        return imported;
    }

    private static importPathElement(element: Element, state: SVGImportState): PathElement | undefined {
        const pathData = element.getAttribute('d');
        if (!pathData) {
            return undefined;
        }

        const pathElement = PathElement.fromSVGPath(pathData);
        if (state.viewBoxOffsetX !== 0 || state.viewBoxOffsetY !== 0) {
            pathElement.translate(-state.viewBoxOffsetX, -state.viewBoxOffsetY);
        }
        return pathElement;
    }

    private static importRectangleElement(element: Element, state: SVGImportState): RectangleElement {
        const x = (SVGImporter.parseLength(element.getAttribute('x')) || 0) - state.viewBoxOffsetX;
        const y = (SVGImporter.parseLength(element.getAttribute('y')) || 0) - state.viewBoxOffsetY;
        const width = SVGImporter.parseLength(element.getAttribute('width')) || 0;
        const height = SVGImporter.parseLength(element.getAttribute('height')) || 0;
        const rectangle = RectangleElement.create(x, y, width, height);
        const rx = SVGImporter.parseLength(element.getAttribute('rx'));
        const ry = SVGImporter.parseLength(element.getAttribute('ry'));
        const radius = rx !== undefined && ry !== undefined
            ? Math.min(rx, ry)
            : (rx !== undefined ? rx : ry);
        if (radius !== undefined && radius > 0) {
            rectangle.setCornerRadius(radius);
        }
        return rectangle;
    }

    private static importEllipseElement(element: Element, state: SVGImportState): EllipseElement | undefined {
        const cx = SVGImporter.parseLength(element.getAttribute('cx'));
        const cy = SVGImporter.parseLength(element.getAttribute('cy'));
        const rx = SVGImporter.parseLength(element.getAttribute('rx'));
        const ry = SVGImporter.parseLength(element.getAttribute('ry'));
        if (cx === undefined || cy === undefined || rx === undefined || ry === undefined) {
            return undefined;
        }
        return EllipseElement.create(cx - state.viewBoxOffsetX, cy - state.viewBoxOffsetY, rx, ry);
    }

    private static importCircleElement(element: Element, state: SVGImportState): EllipseElement | undefined {
        const cx = SVGImporter.parseLength(element.getAttribute('cx'));
        const cy = SVGImporter.parseLength(element.getAttribute('cy'));
        const r = SVGImporter.parseLength(element.getAttribute('r'));
        if (cx === undefined || cy === undefined || r === undefined) {
            return undefined;
        }
        return EllipseElement.create(cx - state.viewBoxOffsetX, cy - state.viewBoxOffsetY, r, r);
    }

    private static importLineElement(element: Element, state: SVGImportState): LineElement {
        const x1 = (SVGImporter.parseLength(element.getAttribute('x1')) || 0) - state.viewBoxOffsetX;
        const y1 = (SVGImporter.parseLength(element.getAttribute('y1')) || 0) - state.viewBoxOffsetY;
        const x2 = (SVGImporter.parseLength(element.getAttribute('x2')) || 0) - state.viewBoxOffsetX;
        const y2 = (SVGImporter.parseLength(element.getAttribute('y2')) || 0) - state.viewBoxOffsetY;
        return LineElement.create(x1, y1, x2, y2);
    }

    private static importPolygonElement(element: Element, state: SVGImportState): PolygonElement | undefined {
        const points = SVGImporter.parsePoints(element.getAttribute('points'), state);
        if (!points || points.length === 0) {
            return undefined;
        }
        return PolygonElement.create().setPoints(points);
    }

    private static importPolylineElement(element: Element, state: SVGImportState): PolylineElement | undefined {
        const points = SVGImporter.parsePoints(element.getAttribute('points'), state);
        if (!points || points.length === 0) {
            return undefined;
        }
        return PolylineElement.create().setPoints(points);
    }

    private static importTextElement(element: Element, context: SVGImportContext, state: SVGImportState): TextElement | TextPathElement | undefined {
        const textPathChild = SVGImporter.getFirstChildByTagName(element, 'textPath');
        if (textPathChild) {
            return SVGImporter.importTextPathElement(element, textPathChild, context, state);
        }

        const importedText = SVGImporter.getTextRuns(element, context);
        if (!importedText.text || importedText.text.length === 0) {
            return undefined;
        }

        const x = (SVGImporter.parseLength(element.getAttribute('x')) || 0) - state.viewBoxOffsetX;
        const y = (SVGImporter.parseLength(element.getAttribute('y')) || 0) - state.viewBoxOffsetY;
        const fontSize = SVGImporter.parseLength(context.fontSize) || 10;
        const lines = importedText.text.split('\n');
        const lineHeight = SVGImporter.parseLineHeight(context.lineHeight);
        const estimatedWidth = SVGImporter.parseLength(element.getAttribute('width')) || SVGImporter.estimateTextWidth(lines, fontSize);
        const estimatedHeight = SVGImporter.parseLength(element.getAttribute('height')) || fontSize * lines.length * (lineHeight || 1);
        const textElement = TextElement.create(importedText.text, x, y, estimatedWidth, estimatedHeight);

        if (context.fontFamily) {
            textElement.setTypeface(context.fontFamily);
        }
        textElement.setTypesize(fontSize);

        const typestyle = SVGImporter.buildTypographyStyle(context.fontWeight, context.fontStyle);
        if (typestyle) {
            textElement.setTypestyle(typestyle);
        }

        const letterSpacing = SVGImporter.parseLength(context.letterSpacing);
        if (letterSpacing !== undefined) {
            textElement.setLetterSpacing(letterSpacing);
        }

        if (lineHeight !== undefined) {
            textElement.setLineHeight(lineHeight);
        }

        const textDecoration = SVGImporter.normalizeTextDecoration(context.textDecoration);
        if (textDecoration) {
            textElement.setTextDecoration(textDecoration);
        }

        const alignment = SVGImporter.buildTextAlignment(context.textAnchor, context.dominantBaseline);
        if (alignment) {
            textElement.setAlignment(alignment);
        }

        if (importedText.runs && importedText.runs.length > 0) {
            textElement.setRichText(importedText.runs);
        }

        return textElement;
    }

    private static importTextPathElement(
        element: Element,
        textPathNode: Element,
        context: SVGImportContext,
        state: SVGImportState,
    ): TextPathElement | undefined {
        const textPathContext = SVGImporter.mergeContext(textPathNode, context);
        const importedText = SVGImporter.getTextRuns(textPathNode, textPathContext);
        if (!importedText.text || importedText.text.length === 0) {
            return undefined;
        }

        const referenceId = SVGImporter.getPaintServerReferenceId(textPathNode);
        if (!referenceId) {
            return undefined;
        }

        const referencedPath = state.namedElements[referenceId];
        if (!referencedPath) {
            return undefined;
        }

        const pathData = referencedPath.getAttribute('d');
        if (!pathData) {
            return undefined;
        }

        const textPath = TextPathElement.fromSVGPath(pathData);
        if (state.viewBoxOffsetX !== 0 || state.viewBoxOffsetY !== 0) {
            textPath.translate(-state.viewBoxOffsetX, -state.viewBoxOffsetY);
        }

        const x = (SVGImporter.parseLength(element.getAttribute('x')) || 0) - state.viewBoxOffsetX;
        const y = (SVGImporter.parseLength(element.getAttribute('y')) || 0) - state.viewBoxOffsetY;
        if (x !== 0 || y !== 0) {
            textPath.translate(x, y);
        }

        if (textPathContext.fontFamily) {
            textPath.setTypeface(textPathContext.fontFamily);
        }
        const fontSize = SVGImporter.parseLength(textPathContext.fontSize) || 10;
        textPath.setTypesize(fontSize);

        const typestyle = SVGImporter.buildTypographyStyle(textPathContext.fontWeight, textPathContext.fontStyle);
        if (typestyle) {
            textPath.setTypestyle(typestyle);
        }

        const letterSpacing = SVGImporter.parseLength(textPathContext.letterSpacing);
        if (letterSpacing !== undefined) {
            textPath.setLetterSpacing(letterSpacing);
        }

        const textDecoration = SVGImporter.normalizeTextDecoration(textPathContext.textDecoration);
        if (textDecoration) {
            textPath.setTextDecoration(textDecoration);
        }

        const alignment = SVGImporter.buildTextPathAlignment(textPathContext.textAnchor);
        if (alignment) {
            textPath.setAlignment(alignment);
        }

        const startOffset = SVGImporter.parseTextPathStartOffset(textPathNode.getAttribute('startOffset'));
        if (startOffset) {
            textPath.setStartOffset(startOffset.value).setStartOffsetPercent(startOffset.percent);
        }

        const side = textPathNode.getAttribute('side');
        if (side && side.toLowerCase() === 'right') {
            textPath.setSide('right');
        }

        if (importedText.runs && importedText.runs.length > 0) {
            textPath.setRichText(importedText.runs.map((run) => ({
                ...run,
                text: run.text.replace(/\r\n?/g, '\n').replace(/\n/g, ' '),
            })));
        }
        else {
            textPath.setText(importedText.text.replace(/\r\n?/g, '\n').replace(/\n/g, ' '));
        }

        return textPath;
    }

    private static importImageElement(element: Element, model: Model, state: SVGImportState): ImageElement | undefined {
        const href = element.getAttribute('href') || element.getAttribute('xlink:href');
        if (!href) {
            return undefined;
        }

        const x = (SVGImporter.parseLength(element.getAttribute('x')) || 0) - state.viewBoxOffsetX;
        const y = (SVGImporter.parseLength(element.getAttribute('y')) || 0) - state.viewBoxOffsetY;
        const width = SVGImporter.parseLength(element.getAttribute('width')) || 0;
        const height = SVGImporter.parseLength(element.getAttribute('height')) || 0;
        const resourceKey = SVGImporter.getImageResourceKey(element, state.nextImageResourceId++);
        model.resourceManager.add(BitmapResource.create(resourceKey, href));
        return ImageElement.create(resourceKey, x, y, width, height);
    }

    private static createContainerChildContext(context: SVGImportContext): SVGImportContext {
        return {
            fill: context.fill,
            stroke: context.stroke,
            strokeWidth: context.strokeWidth,
            strokeDasharray: context.strokeDasharray,
            strokeLinecap: context.strokeLinecap,
            strokeLinejoin: context.strokeLinejoin,
            strokeMiterlimit: context.strokeMiterlimit,
            fillRule: context.fillRule,
            clipPath: undefined,
            filter: undefined,
            opacity: 1,
            visible: true,
            transform: Matrix2D.IDENTITY,
            fontFamily: context.fontFamily,
            fontSize: context.fontSize,
            fontStyle: context.fontStyle,
            fontWeight: context.fontWeight,
            lineHeight: context.lineHeight,
            letterSpacing: context.letterSpacing,
            textDecoration: context.textDecoration,
            textAnchor: context.textAnchor,
            dominantBaseline: context.dominantBaseline,
        };
    }

    private static createContainerModel(element: Element, state: SVGImportState, sourceElement?: Element): Model {
        const sizingElement = sourceElement || element;
        let width = SVGImporter.parseLength(sizingElement.getAttribute('width')) || 0;
        let height = SVGImporter.parseLength(sizingElement.getAttribute('height')) || 0;
        const viewBox = sizingElement.getAttribute('viewBox') || element.getAttribute('viewBox');
        if (viewBox) {
            const parts = viewBox
                .trim()
                .split(/[\s,]+/)
                .map((part) => parseFloat(part));
            if (parts.length === 4 && parts.every((part) => !isNaN(part))) {
                if (width === 0) {
                    width = parts[2];
                }
                if (height === 0) {
                    height = parts[3];
                }
            }
        }

        const model = Model.create(width, height);
        model.setLocation(Point.Origin);
        return model;
    }

    private static applyUseOffsets(context: SVGImportContext, element: Element): SVGImportContext {
        const x = SVGImporter.parseLength(element.getAttribute('x')) || 0;
        const y = SVGImporter.parseLength(element.getAttribute('y')) || 0;
        if (x === 0 && y === 0) {
            return context;
        }

        return {
            ...context,
            transform: Matrix2D.multiply(new Matrix2D(1, 0, 0, 1, x, y), context.transform),
        };
    }

    private static mergeContext(element: Element, parentContext: SVGImportContext): SVGImportContext {
        const opacity = SVGImporter.parseOpacity(SVGImporter.getLocalStyleValue(element, 'opacity'));
        const localTransform = SVGImporter.parseSVGTransform(SVGImporter.getLocalStyleValue(element, 'transform'));
        const display = SVGImporter.getLocalStyleValue(element, 'display');
        const visibility = SVGImporter.getInheritedStyleValue(element, 'visibility', parentContext.visible ? 'visible' : 'hidden');
        return {
            fill: SVGImporter.getInheritedStyleValue(element, 'fill', parentContext.fill),
            stroke: SVGImporter.getInheritedStyleValue(element, 'stroke', parentContext.stroke),
            strokeWidth: SVGImporter.getInheritedStyleValue(element, 'stroke-width', parentContext.strokeWidth),
            strokeDasharray: SVGImporter.getInheritedStyleValue(element, 'stroke-dasharray', parentContext.strokeDasharray),
            strokeLinecap: SVGImporter.getInheritedStyleValue(element, 'stroke-linecap', parentContext.strokeLinecap),
            strokeLinejoin: SVGImporter.getInheritedStyleValue(element, 'stroke-linejoin', parentContext.strokeLinejoin),
            strokeMiterlimit: SVGImporter.getInheritedStyleValue(element, 'stroke-miterlimit', parentContext.strokeMiterlimit),
            fillRule: SVGImporter.getInheritedStyleValue(element, 'fill-rule', parentContext.fillRule),
            clipPath: SVGImporter.getInheritedStyleValue(element, 'clip-path', parentContext.clipPath),
            filter: SVGImporter.getLocalStyleValue(element, 'filter') || undefined,
            opacity: parentContext.opacity * opacity,
            visible: parentContext.visible && display?.toLowerCase() !== 'none' && visibility?.toLowerCase() !== 'hidden',
            transform: Matrix2D.multiply(localTransform, parentContext.transform),
            fontFamily: SVGImporter.getInheritedStyleValue(element, 'font-family', parentContext.fontFamily),
            fontSize: SVGImporter.getInheritedStyleValue(element, 'font-size', parentContext.fontSize),
            fontStyle: SVGImporter.getInheritedStyleValue(element, 'font-style', parentContext.fontStyle),
            fontWeight: SVGImporter.getInheritedStyleValue(element, 'font-weight', parentContext.fontWeight),
            lineHeight: SVGImporter.getInheritedStyleValue(element, 'line-height', parentContext.lineHeight),
            letterSpacing: SVGImporter.getInheritedStyleValue(element, 'letter-spacing', parentContext.letterSpacing),
            textDecoration: SVGImporter.getInheritedStyleValue(element, 'text-decoration', parentContext.textDecoration),
            textAnchor: SVGImporter.getInheritedStyleValue(element, 'text-anchor', parentContext.textAnchor),
            dominantBaseline: SVGImporter.getInheritedStyleValue(element, 'dominant-baseline', parentContext.dominantBaseline),
        };
    }

    private static applyCommonAttributes(
        element: ElementBase,
        sourceElement: Element,
        context: SVGImportContext,
        state: SVGImportState,
    ): void {
        const id = sourceElement.getAttribute('id');
        if (id) {
            element.id = id;
        }

        SVGImporter.applyFill(element, context.fill, state);
        SVGImporter.applyStroke(
            element,
            context.stroke,
            context.strokeWidth,
            context.strokeDasharray,
            context.strokeLinecap,
            context.strokeLinejoin,
            context.strokeMiterlimit,
        );
        if (context.filter) {
            element.setFilter(context.filter);
        }

        if (context.fillRule && context.fillRule.toLowerCase() === 'evenodd') {
            if (element instanceof PathElement || element instanceof PolygonElement) {
                element.winding = WindingMode.EvenOdd;
            }
        }

        if (context.opacity !== 1) {
            element.setOpacity(context.opacity);
        }

        if (!context.visible) {
            element.setVisible(false);
        }

        if (!SVGImporter.isIdentityMatrix(context.transform)) {
            element.setTransform(SVGImporter.matrixToTransformString(context.transform));
        }

        if (context.clipPath && context.clipPath.toLowerCase() !== 'none') {
            const clipPathId = SVGImporter.getPaintServerReferenceId(context.clipPath);
            if (clipPathId) {
                const clipPath = state.clipPaths[clipPathId];
                if (clipPath) {
                    element.setClipPath(clipPath);
                }
            }
        }
    }

    private static applyFill(element: ElementBase, fill: string | undefined, state: SVGImportState): void {
        if (!element.canFill()) {
            return;
        }
        if (!fill || fill.toLowerCase() === 'inherit') {
            element.setFill('#000000');
            return;
        }
        if (fill.toLowerCase() === 'none') {
            return;
        }
        if (fill.toLowerCase().startsWith('url(')) {
            const gradientFill = SVGImporter.resolveGradientFill(fill, element, state);
            if (gradientFill) {
                element.setFill(gradientFill);
            }
            return;
        }
        element.setFill(fill);
    }

    private static applyStroke(
        element: ElementBase,
        stroke: string | undefined,
        strokeWidth: string | undefined,
        strokeDasharray?: string,
        strokeLinecap?: string,
        strokeLinejoin?: string,
        strokeMiterlimit?: string,
    ): void {
        if (!element.canStroke()) {
            return;
        }
        if (!stroke || stroke.toLowerCase() === 'none' || stroke.toLowerCase() === 'inherit') {
            return;
        }

        const width = SVGImporter.parseLength(strokeWidth);
        if (width !== undefined) {
            element.setStroke(stroke + ', ' + width);
        }
        else {
            element.setStroke(stroke);
        }

        if (strokeDasharray && strokeDasharray.toLowerCase() !== 'none') {
            const dashPattern = strokeDasharray
                .split(/[\s,]+/)
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value >= 0);
            if (dashPattern.length > 0) {
                element.setStrokeDash(dashPattern);
            }
        }

        if (strokeLinecap === 'butt' || strokeLinecap === 'round' || strokeLinecap === 'square') {
            element.setLineCap(strokeLinecap);
        }

        if (strokeLinejoin === 'bevel' || strokeLinejoin === 'miter' || strokeLinejoin === 'round') {
            element.setLineJoin(strokeLinejoin);
        }

        const miterLimit = SVGImporter.parseLength(strokeMiterlimit);
        if (miterLimit !== undefined && miterLimit > 0) {
            element.setMiterLimit(miterLimit);
        }
    }

    private static parseLineHeight(lineHeightValue: string | null | undefined): number | undefined {
        if (!lineHeightValue) {
            return undefined;
        }
        const numericValue = Number(lineHeightValue);
        if (Number.isFinite(numericValue) && numericValue > 0) {
            return numericValue;
        }
        const lengthValue = parseFloat(lineHeightValue);
        if (Number.isFinite(lengthValue) && lengthValue > 0) {
            return lengthValue;
        }
        return undefined;
    }

    private static parseLength(lengthValue: string | null | undefined): number | undefined {
        if (!lengthValue) {
            return undefined;
        }
        const value = parseFloat(lengthValue);
        if (isNaN(value)) {
            return undefined;
        }
        return value;
    }

    private static parsePoints(pointsValue: string | null, state: SVGImportState): Point[] | undefined {
        if (!pointsValue) {
            return undefined;
        }
        const numberMatches = pointsValue.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g);
        if (!numberMatches || numberMatches.length < 2) {
            return undefined;
        }
        const points: Point[] = [];
        for (let index = 0; index + 1 < numberMatches.length; index += 2) {
            points.push(new Point(parseFloat(numberMatches[index]) - state.viewBoxOffsetX, parseFloat(numberMatches[index + 1]) - state.viewBoxOffsetY));
        }
        return points;
    }

    private static getTextRuns(element: Element, context: SVGImportContext): ImportedTextRuns {
        const tspanChildren: Element[] = [];
        for (let index = 0; index < element.children.length; index++) {
            const child = element.children[index];
            if (child.nodeName.toLowerCase() === 'tspan') {
                tspanChildren.push(child);
            }
        }

        if (tspanChildren.length === 0) {
            const text = element.textContent || '';
            return { text };
        }

        const textParts: string[] = [];
        const runs: TextRun[] = [];
        let hasStyledRuns = false;
        for (let index = 0; index < tspanChildren.length; index++) {
            const child = tspanChildren[index];
            const childContext = SVGImporter.mergeContext(child, context);
            const childImported = SVGImporter.getTextRuns(child, childContext);
            if (!childImported.text) {
                continue;
            }

            if (index > 0 && SVGImporter.startsNewTextLine(child)) {
                textParts.push('\n');
                SVGImporter.appendTextToLastRun(runs, '\n');
            }

            textParts.push(childImported.text);
            const childRuns = childImported.runs && childImported.runs.length > 0
                ? childImported.runs.map((run) => SVGImporter.cloneTextRun(run))
                : [SVGImporter.createTextRun(childImported.text, childContext)];
            hasStyledRuns = hasStyledRuns || childImported.runs !== undefined;

            if (!SVGImporter.runsMatchContext(childRuns, context)) {
                hasStyledRuns = true;
            }

            runs.push(...childRuns);
        }

        return {
            text: textParts.join(''),
            runs: hasStyledRuns ? runs : undefined,
        };
    }

    private static createTextRun(text: string, context: SVGImportContext): TextRun {
        const run: TextRun = { text };
        if (context.fontFamily) {
            run.typeface = context.fontFamily;
        }
        const fontSize = SVGImporter.parseLength(context.fontSize);
        if (fontSize !== undefined) {
            run.typesize = fontSize;
        }
        const typestyle = SVGImporter.buildTypographyStyle(context.fontWeight, context.fontStyle);
        if (typestyle) {
            run.typestyle = typestyle;
        }
        const letterSpacing = SVGImporter.parseLength(context.letterSpacing);
        if (letterSpacing !== undefined) {
            run.letterSpacing = letterSpacing;
        }
        const decoration = SVGImporter.normalizeTextDecoration(context.textDecoration);
        if (decoration) {
            run.decoration = decoration;
        }
        return run;
    }

    private static cloneTextRun(run: TextRun): TextRun {
        return {
            text: run.text,
            typeface: run.typeface,
            typesize: run.typesize,
            typestyle: run.typestyle,
            letterSpacing: run.letterSpacing,
            decoration: run.decoration,
        };
    }

    private static runsMatchContext(runs: TextRun[], context: SVGImportContext): boolean {
        const expectedTypeface = context.fontFamily;
        const expectedTypesize = SVGImporter.parseLength(context.fontSize);
        const expectedTypestyle = SVGImporter.buildTypographyStyle(context.fontWeight, context.fontStyle);
        const expectedLetterSpacing = SVGImporter.parseLength(context.letterSpacing);
        const expectedDecoration = SVGImporter.normalizeTextDecoration(context.textDecoration);

        for (const run of runs) {
            if ((run.typeface || undefined) !== expectedTypeface) {
                return false;
            }
            if (run.typesize !== expectedTypesize) {
                return false;
            }
            if ((run.typestyle || undefined) !== expectedTypestyle) {
                return false;
            }
            if (run.letterSpacing !== expectedLetterSpacing) {
                return false;
            }
            if ((run.decoration || undefined) !== expectedDecoration) {
                return false;
            }
        }

        return true;
    }

    private static appendTextToLastRun(runs: TextRun[], value: string): void {
        if (runs.length === 0) {
            runs.push({ text: value });
            return;
        }
        runs[runs.length - 1].text += value;
    }

    private static startsNewTextLine(element: Element): boolean {
        return element.getAttribute('x') !== null || element.getAttribute('y') !== null || element.getAttribute('dy') !== null;
    }

    private static getFirstChildByTagName(element: Element, tagName: string): Element | undefined {
        const lowered = tagName.toLowerCase();
        for (let index = 0; index < element.children.length; index++) {
            const child = element.children[index];
            if (child.nodeName.toLowerCase() === lowered) {
                return child;
            }
        }
        return undefined;
    }

    private static normalizeTextDecoration(value: string | undefined): string | undefined {
        if (!value) {
            return undefined;
        }
        const parts = value
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
    }

    private static estimateTextWidth(lines: string[], fontSize: number): number {
        let maxLineLength = 0;
        for (const line of lines) {
            if (line.length > maxLineLength) {
                maxLineLength = line.length;
            }
        }
        return Math.max(fontSize, maxLineLength * fontSize * 0.6);
    }

    private static buildTypographyStyle(fontWeight: string | undefined, fontStyle: string | undefined): string | undefined {
        const styles: string[] = [];
        if (fontWeight && fontWeight.toLowerCase() !== 'normal') {
            styles.push(fontWeight.toLowerCase());
        }
        if (fontStyle && fontStyle.toLowerCase() !== 'normal') {
            styles.push(fontStyle.toLowerCase());
        }
        return styles.length > 0 ? styles.join(',') : undefined;
    }

    private static buildTextAlignment(textAnchor: string | undefined, dominantBaseline: string | undefined): string | undefined {
        const parts: string[] = [];
        const anchor = textAnchor ? textAnchor.toLowerCase() : '';
        if (anchor === 'middle') {
            parts.push('center');
        }
        else if (anchor === 'end') {
            parts.push('right');
        }
        else if (anchor === 'start' || anchor === 'left') {
            parts.push('left');
        }

        const baseline = dominantBaseline ? dominantBaseline.toLowerCase() : '';
        if (baseline === 'middle' || baseline === 'central') {
            parts.push('middle');
        }
        else if (baseline === 'bottom' || baseline === 'text-after-edge' || baseline === 'ideographic') {
            parts.push('bottom');
        }
        else if (baseline === 'top' || baseline === 'hanging' || baseline === 'text-before-edge') {
            parts.push('top');
        }

        return parts.length > 0 ? parts.join(',') : undefined;
    }

    private static buildTextPathAlignment(textAnchor: string | undefined): string | undefined {
        const anchor = textAnchor ? textAnchor.toLowerCase() : '';
        if (anchor === 'middle') {
            return 'center';
        }
        if (anchor === 'end') {
            return 'right';
        }
        if (anchor === 'start' || anchor === 'left') {
            return 'left';
        }
        return undefined;
    }

    private static parseTextPathStartOffset(value: string | null | undefined): { value: number; percent: boolean } | undefined {
        if (!value) {
            return undefined;
        }
        const trimmed = value.trim();
        if (trimmed.length === 0) {
            return undefined;
        }
        if (trimmed.endsWith('%')) {
            const parsedPercent = parseFloat(trimmed.substring(0, trimmed.length - 1));
            if (isNaN(parsedPercent)) {
                return undefined;
            }
            return { value: parsedPercent, percent: true };
        }
        const parsedValue = SVGImporter.parseLength(trimmed);
        if (parsedValue === undefined) {
            return undefined;
        }
        return { value: parsedValue, percent: false };
    }

    private static getImageResourceKey(element: Element, sequenceNumber: number): string {
        const id = element.getAttribute('id');
        if (id && id.trim().length > 0) {
            return id.trim() + '-image';
        }
        return 'svg-image-' + sequenceNumber;
    }

    private static collectGradientDefinitions(root: Element): Record<string, SVGGradientDefinition> {
        const gradientElements: Record<string, Element> = {};
        const definitions: Record<string, SVGGradientDefinition> = {};

        const visit = (element: Element): void => {
            const tagName = element.nodeName.toLowerCase();
            if (tagName === 'lineargradient' || tagName === 'radialgradient') {
                const id = element.getAttribute('id');
                if (id && id.trim().length > 0) {
                    gradientElements[id.trim()] = element;
                }
            }
            for (let index = 0; index < element.children.length; index++) {
                visit(element.children[index]);
            }
        };

        visit(root);

        const resolving: Record<string, boolean> = {};
        const resolveDefinition = (id: string): SVGGradientDefinition | undefined => {
            if (definitions[id]) {
                return definitions[id];
            }
            if (resolving[id]) {
                return undefined;
            }

            const element = gradientElements[id];
            if (!element) {
                return undefined;
            }

            resolving[id] = true;
            const href = SVGImporter.getPaintServerReferenceId(element);
            const baseDefinition = href ? resolveDefinition(href) : undefined;
            const parsed = SVGImporter.parseGradientDefinition(element, baseDefinition);
            delete resolving[id];

            if (parsed) {
                definitions[id] = parsed;
            }
            return parsed;
        };

        Object.keys(gradientElements).forEach((id) => resolveDefinition(id));
        return definitions;
    }

    private static collectNamedElements(root: Element): Record<string, Element> {
        const namedElements: Record<string, Element> = {};

        const visit = (element: Element): void => {
            const id = element.getAttribute('id');
            if (id && id.trim().length > 0) {
                namedElements[id.trim()] = element;
            }
            for (let index = 0; index < element.children.length; index++) {
                visit(element.children[index]);
            }
        };

        visit(root);
        return namedElements;
    }

    private static collectClipPathDefinitions(
        root: Element,
        viewBoxOffsetX: number,
        viewBoxOffsetY: number,
    ): Record<string, ElementClipPath> {
        const clipPathElements: Record<string, Element> = {};
        const definitions: Record<string, ElementClipPath> = {};

        const visit = (element: Element): void => {
            if (element.nodeName.toLowerCase() === 'clippath') {
                const id = element.getAttribute('id');
                if (id && id.trim().length > 0) {
                    clipPathElements[id.trim()] = element;
                }
            }
            for (let index = 0; index < element.children.length; index++) {
                visit(element.children[index]);
            }
        };

        visit(root);

        const resolving: Record<string, boolean> = {};
        const resolveDefinition = (id: string): ElementClipPath | undefined => {
            if (definitions[id]) {
                return definitions[id];
            }
            if (resolving[id]) {
                return undefined;
            }

            const element = clipPathElements[id];
            if (!element) {
                return undefined;
            }

            resolving[id] = true;
            const href = SVGImporter.getPaintServerReferenceId(element);
            const baseDefinition = href ? resolveDefinition(href) : undefined;
            const parsed = SVGImporter.parseClipPathDefinition(element, baseDefinition, viewBoxOffsetX, viewBoxOffsetY);
            delete resolving[id];

            if (parsed) {
                definitions[id] = parsed;
            }
            return parsed;
        };

        Object.keys(clipPathElements).forEach((id) => resolveDefinition(id));
        return definitions;
    }

    private static parseClipPathDefinition(
        element: Element,
        baseDefinition: ElementClipPath | undefined,
        viewBoxOffsetX: number,
        viewBoxOffsetY: number,
    ): ElementClipPath | undefined {
        const units = (SVGImporter.getLocalStyleValue(element, 'clipPathUnits') || baseDefinition?.units || 'userSpaceOnUse') as 'userSpaceOnUse' | 'objectBoundingBox';
        const rootTransform = SVGImporter.parseSVGTransform(SVGImporter.getLocalStyleValue(element, 'transform'));
        const collected = SVGImporter.collectClipPathContent(element, rootTransform, units, viewBoxOffsetX, viewBoxOffsetY);
        const localWinding = SVGImporter.parseClipPathWinding(element);

        if (collected.commands.length === 0 && !baseDefinition) {
            return undefined;
        }

        return {
            commands: collected.commands.length > 0 ? collected.commands : baseDefinition!.commands.slice(),
            winding: localWinding || (collected.evenOdd ? WindingMode.EvenOdd : baseDefinition?.winding),
            units,
        };
    }

    private static collectClipPathContent(
        parent: Element,
        inheritedTransform: Matrix2D,
        units: 'userSpaceOnUse' | 'objectBoundingBox',
        viewBoxOffsetX: number,
        viewBoxOffsetY: number,
    ): { commands: string[]; evenOdd: boolean } {
        const commands: string[] = [];
        let evenOdd = false;

        for (let index = 0; index < parent.children.length; index++) {
            const child = parent.children[index];
            const localTransform = SVGImporter.parseSVGTransform(SVGImporter.getLocalStyleValue(child, 'transform'));
            const combinedTransform = SVGImporter.isIdentityMatrix(localTransform)
                ? inheritedTransform
                : Matrix2D.multiply(localTransform, inheritedTransform);
            const tagName = child.nodeName.toLowerCase();

            if (tagName === 'g') {
                const nested = SVGImporter.collectClipPathContent(child, combinedTransform, units, viewBoxOffsetX, viewBoxOffsetY);
                commands.push(...nested.commands);
                evenOdd = evenOdd || nested.evenOdd;
                continue;
            }

            const clipCommands = SVGImporter.createClipPathCommandsFromNode(child, units, viewBoxOffsetX, viewBoxOffsetY);
            if (!clipCommands || clipCommands.length === 0) {
                continue;
            }

            const transformedCommands = SVGImporter.isIdentityMatrix(combinedTransform)
                ? clipCommands
                : SVGImporter.transformCommands(clipCommands, combinedTransform);
            commands.push(...transformedCommands);
            if (SVGImporter.parseClipPathWinding(child) === WindingMode.EvenOdd) {
                evenOdd = true;
            }
        }

        return { commands, evenOdd };
    }

    private static parseClipPathWinding(element: Element): WindingMode | undefined {
        const winding = SVGImporter.getLocalStyleValue(element, 'clip-rule') || SVGImporter.getLocalStyleValue(element, 'fill-rule');
        if (!winding) {
            return undefined;
        }
        return winding.toLowerCase() === 'evenodd' ? WindingMode.EvenOdd : undefined;
    }

    private static createClipPathCommandsFromNode(
        element: Element,
        units: 'userSpaceOnUse' | 'objectBoundingBox',
        viewBoxOffsetX: number,
        viewBoxOffsetY: number,
    ): string[] | undefined {
        const tagName = element.nodeName.toLowerCase();
        const offsetX = units === 'objectBoundingBox' ? 0 : viewBoxOffsetX;
        const offsetY = units === 'objectBoundingBox' ? 0 : viewBoxOffsetY;

        switch (tagName) {
            case 'path': {
                const pathData = element.getAttribute('d');
                if (!pathData) {
                    return undefined;
                }
                const path = PathElement.fromSVGPath(pathData);
                if (offsetX !== 0 || offsetY !== 0) {
                    path.translate(-offsetX, -offsetY);
                }
                return path.getCommands();
            }
            case 'rect': {
                const x = (SVGImporter.parseLength(element.getAttribute('x')) || 0) - offsetX;
                const y = (SVGImporter.parseLength(element.getAttribute('y')) || 0) - offsetY;
                const width = SVGImporter.parseLength(element.getAttribute('width')) || 0;
                const height = SVGImporter.parseLength(element.getAttribute('height')) || 0;
                return ['m' + x + ',' + y, 'l' + (x + width) + ',' + y, 'l' + (x + width) + ',' + (y + height), 'l' + x + ',' + (y + height), 'z'];
            }
            case 'circle': {
                const cx = (SVGImporter.parseLength(element.getAttribute('cx')) || 0) - offsetX;
                const cy = (SVGImporter.parseLength(element.getAttribute('cy')) || 0) - offsetY;
                const r = SVGImporter.parseLength(element.getAttribute('r')) || 0;
                return SVGImporter.createEllipseClipCommands(cx, cy, r, r);
            }
            case 'ellipse': {
                const cx = (SVGImporter.parseLength(element.getAttribute('cx')) || 0) - offsetX;
                const cy = (SVGImporter.parseLength(element.getAttribute('cy')) || 0) - offsetY;
                const rx = SVGImporter.parseLength(element.getAttribute('rx')) || 0;
                const ry = SVGImporter.parseLength(element.getAttribute('ry')) || 0;
                return SVGImporter.createEllipseClipCommands(cx, cy, rx, ry);
            }
            case 'polygon': {
                const points = SVGImporter.parsePointsWithOffsets(element.getAttribute('points'), offsetX, offsetY);
                if (!points || points.length === 0) {
                    return undefined;
                }
                const commands = ['m' + points[0].toString()];
                for (let index = 1; index < points.length; index++) {
                    commands.push('l' + points[index].toString());
                }
                commands.push('z');
                return commands;
            }
            default:
                return undefined;
        }
    }

    private static createEllipseClipCommands(cx: number, cy: number, rx: number, ry: number): string[] | undefined {
        if (rx === 0 || ry === 0) {
            return undefined;
        }
        const path = PathElement.fromSVGPath(
            'M ' +
                (cx - rx) +
                ' ' +
                cy +
                ' A ' +
                rx +
                ' ' +
                ry +
                ' 0 1 0 ' +
                (cx + rx) +
                ' ' +
                cy +
                ' A ' +
                rx +
                ' ' +
                ry +
                ' 0 1 0 ' +
                (cx - rx) +
                ' ' +
                cy +
                ' Z'
        );
        return path.getCommands();
    }

    private static parsePointsWithOffsets(pointsValue: string | null, offsetX: number, offsetY: number): Point[] | undefined {
        if (!pointsValue) {
            return undefined;
        }
        const numberMatches = pointsValue.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g);
        if (!numberMatches || numberMatches.length < 2) {
            return undefined;
        }
        const points: Point[] = [];
        for (let index = 0; index + 1 < numberMatches.length; index += 2) {
            points.push(new Point(parseFloat(numberMatches[index]) - offsetX, parseFloat(numberMatches[index + 1]) - offsetY));
        }
        return points;
    }

    private static transformCommands(commands: string[], matrix: Matrix2D): string[] {
        return transformPathCommands(commands, matrix);
    }

    private static parseGradientDefinition(
        element: Element,
        baseDefinition?: SVGGradientDefinition,
    ): SVGGradientDefinition | undefined {
        const tagName = element.nodeName.toLowerCase();
        const inheritedTransform = baseDefinition ? SVGImporter.cloneMatrix(baseDefinition.gradientTransform) : Matrix2D.IDENTITY;
        const localTransformValue = SVGImporter.getLocalStyleValue(element, 'gradientTransform');
        const localTransform = localTransformValue ? SVGImporter.parseSVGTransform(localTransformValue) : undefined;
        const stops = SVGImporter.parseGradientStops(element);

        if (tagName === 'lineargradient') {
            if (baseDefinition && baseDefinition.kind !== 'linear') {
                return undefined;
            }
            return {
                kind: 'linear',
                units: SVGImporter.getLocalStyleValue(element, 'gradientUnits') || baseDefinition?.units || 'objectBoundingBox',
                gradientTransform: localTransform || inheritedTransform,
                stops: stops.length > 0 ? stops : SVGImporter.cloneGradientStops(baseDefinition?.stops),
                x1: SVGImporter.getLocalStyleValue(element, 'x1') || baseDefinition?.x1 || '0%',
                y1: SVGImporter.getLocalStyleValue(element, 'y1') || baseDefinition?.y1 || '0%',
                x2: SVGImporter.getLocalStyleValue(element, 'x2') || baseDefinition?.x2 || '100%',
                y2: SVGImporter.getLocalStyleValue(element, 'y2') || baseDefinition?.y2 || '0%',
            };
        }

        if (tagName === 'radialgradient') {
            if (baseDefinition && baseDefinition.kind !== 'radial') {
                return undefined;
            }
            const cx = SVGImporter.getLocalStyleValue(element, 'cx') || baseDefinition?.cx || '50%';
            const cy = SVGImporter.getLocalStyleValue(element, 'cy') || baseDefinition?.cy || '50%';
            return {
                kind: 'radial',
                units: SVGImporter.getLocalStyleValue(element, 'gradientUnits') || baseDefinition?.units || 'objectBoundingBox',
                gradientTransform: localTransform || inheritedTransform,
                stops: stops.length > 0 ? stops : SVGImporter.cloneGradientStops(baseDefinition?.stops),
                cx,
                cy,
                fx: SVGImporter.getLocalStyleValue(element, 'fx') || baseDefinition?.fx || cx,
                fy: SVGImporter.getLocalStyleValue(element, 'fy') || baseDefinition?.fy || cy,
                r: SVGImporter.getLocalStyleValue(element, 'r') || baseDefinition?.r || '50%',
            };
        }

        return undefined;
    }

    private static parseGradientStops(element: Element): SVGGradientStop[] {
        const stops: SVGGradientStop[] = [];
        for (let index = 0; index < element.children.length; index++) {
            const child = element.children[index];
            if (child.nodeName.toLowerCase() !== 'stop') {
                continue;
            }

            const colorValue = SVGImporter.getLocalStyleValue(child, 'stop-color') || '#000000';
            const stopOpacity = SVGImporter.parseOpacity(SVGImporter.getLocalStyleValue(child, 'stop-opacity'));
            const color = Color.parse(colorValue);
            if (stopOpacity !== 1) {
                color.a = Math.round(color.a * stopOpacity);
            }
            stops.push({
                color: color.toString(),
                offset: SVGImporter.parseGradientOffset(child.getAttribute('offset')),
            });
        }
        return stops;
    }

    private static parseGradientOffset(offsetValue: string | null): number {
        if (!offsetValue) {
            return 0;
        }
        const trimmed = offsetValue.trim();
        if (trimmed.endsWith('%')) {
            const value = parseFloat(trimmed.substring(0, trimmed.length - 1));
            if (isNaN(value)) {
                return 0;
            }
            return Math.max(0, Math.min(1, value / 100));
        }
        const value = parseFloat(trimmed);
        if (isNaN(value)) {
            return 0;
        }
        return Math.max(0, Math.min(1, value));
    }

    private static cloneGradientStops(stops?: SVGGradientStop[]): SVGGradientStop[] {
        if (!stops) {
            return [];
        }
        return stops.map((stop) => ({ color: stop.color, offset: stop.offset }));
    }

    private static cloneMatrix(matrix: Matrix2D): Matrix2D {
        return new Matrix2D(matrix.m11, matrix.m12, matrix.m21, matrix.m22, matrix.offsetX, matrix.offsetY);
    }

    private static resolveGradientFill(
        fill: string,
        element: ElementBase,
        state: SVGImportState,
    ): LinearGradientFill | RadialGradientFill | undefined {
        const gradientId = SVGImporter.getPaintServerReferenceId(fill);
        if (!gradientId) {
            return undefined;
        }

        const definition = state.gradients[gradientId];
        if (!definition) {
            return undefined;
        }

        const bounds = element.getBounds();
        if (!bounds) {
            return undefined;
        }

        const useObjectBoundingBox = definition.units.toLowerCase() !== 'userspaceonuse';

        if (definition.kind === 'linear') {
            let start = new Point(
                SVGImporter.resolveGradientCoordinate(definition.x1, bounds.x, bounds.width, useObjectBoundingBox, state.viewBoxOffsetX),
                SVGImporter.resolveGradientCoordinate(definition.y1, bounds.y, bounds.height, useObjectBoundingBox, state.viewBoxOffsetY),
            );
            let end = new Point(
                SVGImporter.resolveGradientCoordinate(definition.x2, bounds.x, bounds.width, useObjectBoundingBox, state.viewBoxOffsetX),
                SVGImporter.resolveGradientCoordinate(definition.y2, bounds.y, bounds.height, useObjectBoundingBox, state.viewBoxOffsetY),
            );

            if (!SVGImporter.isIdentityMatrix(definition.gradientTransform)) {
                start = definition.gradientTransform.transformPoint(start);
                end = definition.gradientTransform.transformPoint(end);
            }

            const fillValue = LinearGradientFill.create(start.toString(), end.toString());
            definition.stops.forEach((stop) => fillValue.addFillStop(stop.color, stop.offset));
            return fillValue;
        }

        let center = new Point(
            SVGImporter.resolveGradientCoordinate(definition.cx, bounds.x, bounds.width, useObjectBoundingBox, state.viewBoxOffsetX),
            SVGImporter.resolveGradientCoordinate(definition.cy, bounds.y, bounds.height, useObjectBoundingBox, state.viewBoxOffsetY),
        );
        let focus = new Point(
            SVGImporter.resolveGradientCoordinate(definition.fx, bounds.x, bounds.width, useObjectBoundingBox, state.viewBoxOffsetX),
            SVGImporter.resolveGradientCoordinate(definition.fy, bounds.y, bounds.height, useObjectBoundingBox, state.viewBoxOffsetY),
        );
        let radiusX = SVGImporter.resolveGradientRadius(definition.r, bounds.width, useObjectBoundingBox);
        let radiusY = SVGImporter.resolveGradientRadius(definition.r, bounds.height, useObjectBoundingBox);

        if (!SVGImporter.isIdentityMatrix(definition.gradientTransform)) {
            center = definition.gradientTransform.transformPoint(center);
            focus = definition.gradientTransform.transformPoint(focus);
            const transformedRadiusX = definition.gradientTransform.transformVector(radiusX, 0);
            const transformedRadiusY = definition.gradientTransform.transformVector(0, radiusY);
            radiusX = Math.hypot(transformedRadiusX.x, transformedRadiusX.y);
            radiusY = Math.hypot(transformedRadiusY.x, transformedRadiusY.y);
        }

        const fillValue = RadialGradientFill.create(center.toString(), focus.toString(), radiusX, radiusY);
        definition.stops.forEach((stop) => fillValue.addFillStop(stop.color, stop.offset));
        return fillValue;
    }

    private static resolveGradientCoordinate(
        coordinateValue: string | undefined,
        origin: number,
        length: number,
        useObjectBoundingBox: boolean,
        viewBoxOffset: number,
    ): number {
        if (!coordinateValue) {
            return useObjectBoundingBox ? origin : -viewBoxOffset;
        }

        const trimmed = coordinateValue.trim();
        if (useObjectBoundingBox) {
            if (trimmed.endsWith('%')) {
                return origin + (parseFloat(trimmed.substring(0, trimmed.length - 1)) / 100) * length;
            }
            const value = parseFloat(trimmed);
            return isNaN(value) ? origin : origin + value * length;
        }

        const value = parseFloat(trimmed);
        return isNaN(value) ? 0 : value - viewBoxOffset;
    }

    private static resolveGradientRadius(radiusValue: string | undefined, length: number, useObjectBoundingBox: boolean): number {
        if (!radiusValue) {
            return useObjectBoundingBox ? length * 0.5 : 0;
        }

        const trimmed = radiusValue.trim();
        if (useObjectBoundingBox) {
            if (trimmed.endsWith('%')) {
                return (parseFloat(trimmed.substring(0, trimmed.length - 1)) / 100) * length;
            }
            const value = parseFloat(trimmed);
            return isNaN(value) ? 0 : value * length;
        }

        const value = parseFloat(trimmed);
        return isNaN(value) ? 0 : value;
    }

    private static getPaintServerReferenceId(source: string | Element): string | undefined {
        const value = typeof source === 'string'
            ? source
            : source.getAttribute('href') || source.getAttribute('xlink:href') || undefined;
        if (!value) {
            return undefined;
        }

        const match = value.match(/#([^)\s]+)/);
        return match ? match[1] : undefined;
    }

    private static parseOpacity(opacityValue: string | undefined): number {
        if (!opacityValue) {
            return 1;
        }
        const value = parseFloat(opacityValue);
        if (isNaN(value)) {
            return 1;
        }
        if (value < 0) {
            return 0;
        }
        if (value > 1) {
            return 1;
        }
        return value;
    }

    private static parseSVGTransform(transformValue: string | undefined): Matrix2D {
        if (!transformValue || transformValue.trim().length === 0) {
            return Matrix2D.IDENTITY;
        }

        const transform = new Matrix2D(1, 0, 0, 1, 0, 0);
        const commands = transformValue.match(/[a-zA-Z]+\([^)]*\)/g);
        if (!commands) {
            return transform;
        }

        for (const command of commands) {
            const openParen = command.indexOf('(');
            const name = command.substring(0, openParen).toLowerCase();
            const args = command
                .substring(openParen + 1, command.length - 1)
                .trim()
                .split(/[\s,]+/)
                .filter((part) => part.length > 0)
                .map((part) => parseFloat(part));
            if (args.some((value) => isNaN(value))) {
                continue;
            }

            let commandMatrix = Matrix2D.IDENTITY;
            switch (name) {
                case 'matrix':
                    if (args.length === 6) {
                        commandMatrix = new Matrix2D(args[0], args[1], args[2], args[3], args[4], args[5]);
                    }
                    break;
                case 'translate':
                    commandMatrix = new Matrix2D(1, 0, 0, 1, args[0], args.length > 1 ? args[1] : 0);
                    break;
                case 'scale': {
                    const sy = args.length > 1 ? args[1] : args[0];
                    commandMatrix = new Matrix2D(args[0], 0, 0, sy, 0, 0);
                    break;
                }
                case 'rotate': {
                    const angle = (Math.PI / 180) * args[0];
                    const rotation = new Matrix2D(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0);
                    if (args.length > 2) {
                        const cx = args[1];
                        const cy = args[2];
                        commandMatrix = Matrix2D.multiply(new Matrix2D(1, 0, 0, 1, cx, cy), Matrix2D.multiply(rotation, new Matrix2D(1, 0, 0, 1, -cx, -cy)));
                    }
                    else {
                        commandMatrix = rotation;
                    }
                    break;
                }
                case 'skewx': {
                    const angle = (Math.PI / 180) * args[0];
                    commandMatrix = new Matrix2D(1, 0, Math.tan(angle), 1, 0, 0);
                    break;
                }
                case 'skewy': {
                    const angle = (Math.PI / 180) * args[0];
                    commandMatrix = new Matrix2D(1, Math.tan(angle), 0, 1, 0, 0);
                    break;
                }
            }

            transform.cloneFrom(Matrix2D.multiply(commandMatrix, transform));
        }

        return transform;
    }

    private static matrixToTransformString(matrix: Matrix2D): string {
        return 'matrix(' + [matrix.m11, matrix.m12, matrix.m21, matrix.m22, matrix.offsetX, matrix.offsetY].join(',') + ')';
    }

    private static isIdentityMatrix(matrix: Matrix2D): boolean {
        return (
            matrix.m11 === 1 &&
            matrix.m12 === 0 &&
            matrix.m21 === 0 &&
            matrix.m22 === 1 &&
            matrix.offsetX === 0 &&
            matrix.offsetY === 0
        );
    }

    private static getInheritedStyleValue(element: Element, propertyName: string, fallbackValue?: string): string | undefined {
        const localValue = SVGImporter.getLocalStyleValue(element, propertyName);
        return localValue !== undefined ? localValue : fallbackValue;
    }

    private static getLocalStyleValue(element: Element, propertyName: string): string | undefined {
        const attributeValue = element.getAttribute(propertyName);
        if (attributeValue && attributeValue.trim().length > 0) {
            return attributeValue.trim();
        }

        const style = element.getAttribute('style');
        if (!style) {
            return undefined;
        }

        const styleEntries = style.split(';');
        for (const styleEntry of styleEntries) {
            const separatorIndex = styleEntry.indexOf(':');
            if (separatorIndex === -1) {
                continue;
            }
            const key = styleEntry.substring(0, separatorIndex).trim().toLowerCase();
            if (key === propertyName.toLowerCase()) {
                const value = styleEntry.substring(separatorIndex + 1).trim();
                return value.length > 0 ? value : undefined;
            }
        }

        return undefined;
    }
}