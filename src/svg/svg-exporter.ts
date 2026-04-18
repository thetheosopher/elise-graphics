import { Model } from '../core/model';
import { Matrix2D } from '../core/matrix-2d';
import { Point } from '../core/point';
import { StrokeInfo } from '../core/stroke-info';
import { WindingMode } from '../core/winding-mode';
import { ElementBase, type ElementClipPath } from '../elements/element-base';
import { EllipseElement } from '../elements/ellipse-element';
import { ImageElement } from '../elements/image-element';
import { LineElement } from '../elements/line-element';
import { ModelElement } from '../elements/model-element';
import { PathBackedElementBase } from '../elements/path-backed-element-base';
import { PathElement } from '../elements/path-element';
import { iteratePathCommands } from '../elements/path-command-utils';
import { PolygonElement } from '../elements/polygon-element';
import { PolylineElement } from '../elements/polyline-element';
import { RectangleElement } from '../elements/rectangle-element';
import { TextElement, type TextRun } from '../elements/text-element';
import { TextPathElement } from '../elements/text-path-element';
import { Color } from '../core/color';
import { FillInfo } from '../fill/fill-info';
import { LinearGradientFill } from '../fill/linear-gradient-fill';
import { RadialGradientFill } from '../fill/radial-gradient-fill';
import { BitmapResource } from '../resource/bitmap-resource';
import { ModelResource } from '../resource/model-resource';

type SVGExportContext = {
    defs: string[];
    nextGradientId: number;
    nextClipPathId: number;
    nextSymbolId: number;
    nextTextPathId: number;
    symbols: Record<string, string>;
};

/**
 * SVG exporter for Elise models and supported element types.
 */
export class SVGExporter {
    /**
     * Exports an Elise model to SVG markup.
     * @param model - Source model
     * @returns SVG markup string
     */
    public static exportModel(model: Model): string {
        const size = model.getSize();
        if (!size) {
            throw new Error('Size is undefined.');
        }

        const context: SVGExportContext = {
            defs: [],
            nextGradientId: 1,
            nextClipPathId: 1,
            nextSymbolId: 1,
            nextTextPathId: 1,
            symbols: {},
        };

        const body = SVGExporter.exportModelFragment(model, context);

        const svgOpen =
            '<svg xmlns="http://www.w3.org/2000/svg" width="' +
            SVGExporter.formatNumber(size.width) +
            '" height="' +
            SVGExporter.formatNumber(size.height) +
            '" viewBox="0 0 ' +
            SVGExporter.formatNumber(size.width) +
            ' ' +
            SVGExporter.formatNumber(size.height) +
            '">';

        if (body.length === 0) {
            if (context.defs.length > 0) {
                return svgOpen + '\n  <defs>\n    ' + context.defs.join('\n    ') + '\n  </defs>\n</svg>';
            }
            return svgOpen + '</svg>';
        }

        const defs = context.defs.length > 0 ? '\n  <defs>\n    ' + context.defs.join('\n    ') + '\n  </defs>' : '';
        return svgOpen + defs + '\n  ' + body.replace(/\n/g, '\n  ') + '\n</svg>';
    }

    /**
     * Converts a PathElement into SVG path data while preserving
     * simple line and quadratic commands when possible.
     * @param pathElement - Path element to encode
     * @returns SVG path data
     */
    public static exportPathData(pathElement: PathElement): string {
        return SVGExporter.exportPathDataFromCommands(pathElement.getCommands());
    }

    private static exportPathDataFromCommands(commands: string[] | undefined): string {
        if (!commands || commands.length === 0) {
            return '';
        }

        const svgCommands: string[] = [];
        iteratePathCommands(commands, (command) => {
            switch (command.type) {
                case 'm':
                    svgCommands.push('M ' + SVGExporter.pointToString(command.point));
                    break;
                case 'l':
                    if (command.end.y === command.start.y) {
                        svgCommands.push('H ' + SVGExporter.formatNumber(command.end.x));
                    }
                    else if (command.end.x === command.start.x) {
                        svgCommands.push('V ' + SVGExporter.formatNumber(command.end.y));
                    }
                    else {
                        svgCommands.push('L ' + SVGExporter.pointToString(command.point));
                    }
                    break;
                case 'H':
                    svgCommands.push('H ' + SVGExporter.formatNumber(command.x));
                    break;
                case 'V':
                    svgCommands.push('V ' + SVGExporter.formatNumber(command.y));
                    break;
                case 'c':
                    svgCommands.push(
                        'C ' +
                            SVGExporter.pointToString(command.cp1) +
                            ' ' +
                            SVGExporter.pointToString(command.cp2) +
                            ' ' +
                            SVGExporter.pointToString(command.end)
                    );
                    break;
                case 'S':
                    svgCommands.push('S ' + SVGExporter.pointToString(command.cp2) + ' ' + SVGExporter.pointToString(command.end));
                    break;
                case 'Q':
                    svgCommands.push('Q ' + SVGExporter.pointToString(command.controlPoint) + ' ' + SVGExporter.pointToString(command.end));
                    break;
                case 'T':
                    svgCommands.push('T ' + SVGExporter.pointToString(command.end));
                    break;
                case 'A':
                    svgCommands.push(
                        'A ' +
                            SVGExporter.formatNumber(command.radiusX) +
                            ' ' +
                            SVGExporter.formatNumber(command.radiusY) +
                            ' ' +
                            SVGExporter.formatNumber(command.xAxisRotation) +
                            ' ' +
                            (command.largeArc ? '1' : '0') +
                            ' ' +
                            (command.sweep ? '1' : '0') +
                            ' ' +
                            SVGExporter.pointToString(command.end)
                    );
                    break;
                case 'z':
                    svgCommands.push('Z');
                    break;
            }
        });

        return svgCommands.join(' ');
    }

    private static exportElement(element: ElementBase, context: SVGExportContext): string {
        if (element instanceof ImageElement) {
            return SVGExporter.exportImageElement(element, context);
        }

        if (element instanceof ModelElement) {
            return SVGExporter.exportNestedModelElement(element, context);
        }

        if (element instanceof PathElement) {
            const pathData = SVGExporter.exportPathData(element);
            const attributes = ['d="' + SVGExporter.escapeAttribute(pathData) + '"'];
            SVGExporter.pushCommonAttributes(attributes, element, context, element.getLocation(), true);
            return '<path ' + attributes.join(' ') + ' />';
        }

        if (element instanceof PathBackedElementBase) {
            const pathData = SVGExporter.exportPathDataFromCommands(element.toPathCommands());
            const attributes = ['d="' + SVGExporter.escapeAttribute(pathData) + '"'];
            SVGExporter.pushCommonAttributes(attributes, element, context, element.getLocation(), true, !element.canFill());
            return '<path ' + attributes.join(' ') + ' />';
        }

        if (element instanceof RectangleElement) {
            return SVGExporter.exportRectangleElement(element, context);
        }

        if (element instanceof EllipseElement) {
            const center = element.getCenter();
            if (!center || element.radiusX === undefined || element.radiusY === undefined) {
                return '';
            }
            const attributes = [
                'cx="' + SVGExporter.formatNumber(center.x) + '"',
                'cy="' + SVGExporter.formatNumber(center.y) + '"',
                'rx="' + SVGExporter.formatNumber(element.radiusX) + '"',
                'ry="' + SVGExporter.formatNumber(element.radiusY) + '"',
            ];
            SVGExporter.pushCommonAttributes(
                attributes,
                element,
                context,
                new Point(center.x - element.radiusX, center.y - element.radiusY),
                false,
            );
            return '<ellipse ' + attributes.join(' ') + ' />';
        }

        if (element instanceof LineElement) {
            const p1 = element.getP1();
            const p2 = element.getP2();
            if (!p1 || !p2) {
                return '';
            }
            const attributes = [
                'x1="' + SVGExporter.formatNumber(p1.x) + '"',
                'y1="' + SVGExporter.formatNumber(p1.y) + '"',
                'x2="' + SVGExporter.formatNumber(p2.x) + '"',
                'y2="' + SVGExporter.formatNumber(p2.y) + '"',
            ];
            SVGExporter.pushCommonAttributes(attributes, element, context, p1, false, true);
            return '<line ' + attributes.join(' ') + ' />';
        }

        if (element instanceof PolygonElement) {
            const points = element.getPoints();
            if (!points || points.length === 0) {
                return '';
            }
            const attributes = ['points="' + SVGExporter.escapeAttribute(SVGExporter.pointsToString(points)) + '"'];
            SVGExporter.pushCommonAttributes(attributes, element, context, element.getLocation(), true);
            return '<polygon ' + attributes.join(' ') + ' />';
        }

        if (element instanceof PolylineElement) {
            const points = element.getPoints();
            if (!points || points.length === 0) {
                return '';
            }
            if (element.smoothPoints && points.length > 2) {
                const attributes = ['d="' + SVGExporter.escapeAttribute(SVGExporter.exportSmoothedPolylineData(points)) + '"'];
                SVGExporter.pushCommonAttributes(attributes, element, context, element.getLocation(), false, true);
                return '<path ' + attributes.join(' ') + ' />';
            }
            const attributes = ['points="' + SVGExporter.escapeAttribute(SVGExporter.pointsToString(points)) + '"'];
            SVGExporter.pushCommonAttributes(attributes, element, context, element.getLocation(), false, true);
            return '<polyline ' + attributes.join(' ') + ' />';
        }

        if (element instanceof TextPathElement) {
            return SVGExporter.exportTextPathElement(element, context);
        }

        if (element instanceof TextElement) {
            return SVGExporter.exportTextElement(element, context);
        }

        return '';
    }

    private static exportRectangleElement(element: RectangleElement, context: SVGExportContext): string {
        const location = element.getLocation();
        const size = element.getSize();
        if (!location || !size) {
            return '';
        }

        const radii = element.getCornerRadii(size);
        const uniformRounded = radii[0] > 0 && radii[0] === radii[1] && radii[0] === radii[2] && radii[0] === radii[3];
        const hasAnyRadius = radii.some((radius) => radius > 0);
        if (hasAnyRadius && !uniformRounded) {
            const attributes = ['d="' + SVGExporter.escapeAttribute(SVGExporter.exportRoundedRectanglePathData(location, size, radii)) + '"'];
            SVGExporter.pushCommonAttributes(attributes, element, context, location, false);
            return '<path ' + attributes.join(' ') + ' />';
        }

        const attributes = [
            'x="' + SVGExporter.formatNumber(location.x) + '"',
            'y="' + SVGExporter.formatNumber(location.y) + '"',
            'width="' + SVGExporter.formatNumber(size.width) + '"',
            'height="' + SVGExporter.formatNumber(size.height) + '"',
        ];
        if (uniformRounded) {
            attributes.push('rx="' + SVGExporter.formatNumber(radii[0]) + '"');
            attributes.push('ry="' + SVGExporter.formatNumber(radii[0]) + '"');
        }
        SVGExporter.pushCommonAttributes(attributes, element, context, location, false);
        return '<rect ' + attributes.join(' ') + ' />';
    }

    private static exportRoundedRectanglePathData(location: Point, size: { width: number; height: number }, radii: [number, number, number, number]): string {
        const x = location.x;
        const y = location.y;
        const width = size.width;
        const height = size.height;
        const topLeft = radii[0];
        const topRight = radii[1];
        const bottomRight = radii[2];
        const bottomLeft = radii[3];

        return [
            'M ' + SVGExporter.formatNumber(x + topLeft) + ' ' + SVGExporter.formatNumber(y),
            'L ' + SVGExporter.formatNumber(x + width - topRight) + ' ' + SVGExporter.formatNumber(y),
            topRight > 0
                ? 'Q ' + SVGExporter.formatNumber(x + width) + ' ' + SVGExporter.formatNumber(y) + ' ' + SVGExporter.formatNumber(x + width) + ' ' + SVGExporter.formatNumber(y + topRight)
                : 'L ' + SVGExporter.formatNumber(x + width) + ' ' + SVGExporter.formatNumber(y),
            'L ' + SVGExporter.formatNumber(x + width) + ' ' + SVGExporter.formatNumber(y + height - bottomRight),
            bottomRight > 0
                ? 'Q ' + SVGExporter.formatNumber(x + width) + ' ' + SVGExporter.formatNumber(y + height) + ' ' + SVGExporter.formatNumber(x + width - bottomRight) + ' ' + SVGExporter.formatNumber(y + height)
                : 'L ' + SVGExporter.formatNumber(x + width) + ' ' + SVGExporter.formatNumber(y + height),
            'L ' + SVGExporter.formatNumber(x + bottomLeft) + ' ' + SVGExporter.formatNumber(y + height),
            bottomLeft > 0
                ? 'Q ' + SVGExporter.formatNumber(x) + ' ' + SVGExporter.formatNumber(y + height) + ' ' + SVGExporter.formatNumber(x) + ' ' + SVGExporter.formatNumber(y + height - bottomLeft)
                : 'L ' + SVGExporter.formatNumber(x) + ' ' + SVGExporter.formatNumber(y + height),
            'L ' + SVGExporter.formatNumber(x) + ' ' + SVGExporter.formatNumber(y + topLeft),
            topLeft > 0
                ? 'Q ' + SVGExporter.formatNumber(x) + ' ' + SVGExporter.formatNumber(y) + ' ' + SVGExporter.formatNumber(x + topLeft) + ' ' + SVGExporter.formatNumber(y)
                : 'L ' + SVGExporter.formatNumber(x) + ' ' + SVGExporter.formatNumber(y),
            'Z',
        ].join(' ');
    }

    private static exportModelFragment(model: Model, context: SVGExportContext): string {
        const size = model.getSize();
        const fragments: string[] = [];

        if (size && (model.fill || model.stroke)) {
            const attributes = [
                'x="0"',
                'y="0"',
                'width="' + SVGExporter.formatNumber(size.width) + '"',
                'height="' + SVGExporter.formatNumber(size.height) + '"',
            ];
            SVGExporter.pushFillAttributes(attributes, model, context, false);
            SVGExporter.pushStrokeAttributes(attributes, model);
            fragments.push('<rect ' + attributes.join(' ') + ' />');
        }

        const elementMarkup = model.elements
            .map((element) => SVGExporter.exportElement(element, context))
            .filter((value) => value.length > 0);
        fragments.push(...elementMarkup);

        const body = fragments.join('\n');
        if (body.length === 0) {
            return '';
        }

        const groupAttributes: string[] = [];
        const origin = model.getLocation() || Point.Origin;
        SVGExporter.pushContainerAttributes(groupAttributes, model, origin, context);
        if (groupAttributes.length === 0) {
            return body;
        }

        return '<g ' + groupAttributes.join(' ') + '>' + body + '</g>';
    }

    private static exportImageElement(element: ImageElement, context: SVGExportContext): string {
        const location = element.getLocation();
        const size = element.getSize();
        const href = SVGExporter.resolveImageHref(element);
        if (!location || !size || !href) {
            return '';
        }

        const imageAttributes = [
            'x="' + SVGExporter.formatNumber(location.x) + '"',
            'y="' + SVGExporter.formatNumber(location.y) + '"',
            'width="' + SVGExporter.formatNumber(size.width) + '"',
            'height="' + SVGExporter.formatNumber(size.height) + '"',
            'href="' + SVGExporter.escapeAttribute(href) + '"',
            'preserveAspectRatio="none"',
        ];

        const imageMarkup = '<image ' + imageAttributes.join(' ') + ' />';
        if (!element.stroke) {
            const containerAttributes: string[] = [];
            SVGExporter.pushContainerAttributes(containerAttributes, element, location, context);
            if (containerAttributes.length === 0) {
                return imageMarkup;
            }
            return '<g ' + containerAttributes.join(' ') + '>' + imageMarkup + '</g>';
        }

        const strokeAttributes = [
            'x="' + SVGExporter.formatNumber(location.x) + '"',
            'y="' + SVGExporter.formatNumber(location.y) + '"',
            'width="' + SVGExporter.formatNumber(size.width) + '"',
            'height="' + SVGExporter.formatNumber(size.height) + '"',
            'fill="none"',
        ];
        SVGExporter.pushStrokeAttributes(strokeAttributes, element);
        const groupAttributes: string[] = [];
        SVGExporter.pushContainerAttributes(groupAttributes, element, location, context);
        const groupBody = imageMarkup + '<rect ' + strokeAttributes.join(' ') + ' />';
        if (groupAttributes.length === 0) {
            return '<g>' + groupBody + '</g>';
        }
        return '<g ' + groupAttributes.join(' ') + '>' + groupBody + '</g>';
    }

    private static exportNestedModelElement(element: ModelElement, context: SVGExportContext): string {
        const innerModel = SVGExporter.resolveModelElementModel(element);
        const location = element.getLocation();
        if (!innerModel || !location) {
            return '';
        }

        const sourceSize = innerModel.getSize();
        const requestedSize = element.getSize();
        let scaleX = 1;
        let scaleY = 1;
        if (sourceSize && requestedSize && !requestedSize.equals(sourceSize)) {
            scaleX = sourceSize.width === 0 ? 1 : requestedSize.width / sourceSize.width;
            scaleY = sourceSize.height === 0 ? 1 : requestedSize.height / sourceSize.height;
        }

        if (element.source) {
            const symbolId = SVGExporter.registerModelSymbol(element.source, innerModel, context);
            return SVGExporter.exportModelUseElement(element, context, symbolId, location, scaleX, scaleY);
        }

        const innerMarkup = SVGExporter.exportModelFragment(innerModel, context);
        if (innerMarkup.length === 0) {
            return '';
        }

        const innerTransformParts = [
            'translate(' + SVGExporter.formatNumber(location.x) + ' ' + SVGExporter.formatNumber(location.y) + ')',
        ];
        if (scaleX !== 1 || scaleY !== 1) {
            innerTransformParts.push('scale(' + SVGExporter.formatNumber(scaleX) + ' ' + SVGExporter.formatNumber(scaleY) + ')');
        }

        const containerAttributes: string[] = [];
        SVGExporter.pushContainerAttributes(containerAttributes, element, location, context);
        const nestedGroup = '<g transform="' + innerTransformParts.join(' ') + '">' + innerMarkup + '</g>';
        if (containerAttributes.length === 0) {
            return nestedGroup;
        }
        return '<g ' + containerAttributes.join(' ') + '>' + nestedGroup + '</g>';
    }

    private static exportModelUseElement(
        element: ModelElement,
        context: SVGExportContext,
        symbolId: string,
        location: Point,
        scaleX: number,
        scaleY: number,
    ): string {
        const useAttributes = ['href="#' + SVGExporter.escapeAttribute(symbolId) + '"'];
        const transformParts = ['translate(' + SVGExporter.formatNumber(location.x) + ' ' + SVGExporter.formatNumber(location.y) + ')'];
        if (scaleX !== 1 || scaleY !== 1) {
            transformParts.push('scale(' + SVGExporter.formatNumber(scaleX) + ' ' + SVGExporter.formatNumber(scaleY) + ')');
        }
        useAttributes.push('transform="' + transformParts.join(' ') + '"');

        const useMarkup = '<use ' + useAttributes.join(' ') + ' />';
        const containerAttributes: string[] = [];
        SVGExporter.pushContainerAttributes(containerAttributes, element, location, context);
        if (containerAttributes.length === 0) {
            return useMarkup;
        }
        return '<g ' + containerAttributes.join(' ') + '>' + useMarkup + '</g>';
    }

    private static registerModelSymbol(sourceKey: string, model: Model, context: SVGExportContext): string {
        const existingId = context.symbols[sourceKey];
        if (existingId) {
            return existingId;
        }

        const symbolId = 'elise-symbol-' + context.nextSymbolId++;
        context.symbols[sourceKey] = symbolId;
        const body = SVGExporter.exportModelFragment(model, context);
        const size = model.getSize();
        const attributes = ['id="' + symbolId + '"'];
        if (size) {
            attributes.push(
                'viewBox="0 0 ' + SVGExporter.formatNumber(size.width) + ' ' + SVGExporter.formatNumber(size.height) + '"'
            );
        }
        context.defs.push('<symbol ' + attributes.join(' ') + '>' + body + '</symbol>');
        return symbolId;
    }

    private static exportTextElement(element: TextElement, context: SVGExportContext): string {
        const location = element.getLocation();
        const size = element.getSize();
        const text = SVGExporter.resolveTextContent(element);
        const runs = element.getResolvedTextRuns();
        if (!location || !size || !text || runs.length === 0) {
            return '';
        }

        const lines = text.split('\n');
        const lineHeight = SVGExporter.getTextLineHeight(element);
        const totalHeight = lineHeight * lines.length;
        let anchor = 'start';
        let x = location.x;
        let startY = location.y;

        if (element.alignment) {
            const parts = element.alignment.split(',').map((part) => part.trim().toLowerCase());
            if (parts.indexOf('right') !== -1 || parts.indexOf('end') !== -1) {
                anchor = 'end';
                x = location.x + size.width;
            }
            else if (parts.indexOf('center') !== -1) {
                anchor = 'middle';
                x = location.x + size.width / 2;
            }

            if (parts.indexOf('middle') !== -1) {
                startY = location.y + size.height / 2 - totalHeight / 2;
            }
            else if (parts.indexOf('bottom') !== -1) {
                startY = location.y + size.height - totalHeight;
            }
        }

        const attributes = [
            'x="' + SVGExporter.formatNumber(x) + '"',
            'y="' + SVGExporter.formatNumber(startY) + '"',
            'text-anchor="' + anchor + '"',
            'dominant-baseline="text-before-edge"',
            'xml:space="preserve"',
        ];

        if (element.typeface) {
            attributes.push('font-family="' + SVGExporter.escapeAttribute(element.typeface) + '"');
        }
        if (element.typesize !== undefined) {
            attributes.push('font-size="' + SVGExporter.formatNumber(element.typesize) + '"');
        }
        if (element.typestyle) {
            SVGExporter.pushTextStyleAttributes(attributes, element.typestyle);
        }
        SVGExporter.pushTextExtensionAttributes(attributes, element.letterSpacing, element.textDecoration, element.lineHeight);

        SVGExporter.pushCommonAttributes(attributes, element, context, location, false);

        if (lines.length === 1 && (!element.richText || element.richText.length === 0)) {
            return '<text ' + attributes.join(' ') + '>' + SVGExporter.escapeText(lines[0]) + '</text>';
        }

        const tspans = SVGExporter.exportTextRunsAsTspans(element, runs, x, startY, lineHeight);

        return '<text ' + attributes.join(' ') + '>' + tspans.join('') + '</text>';
    }

    private static exportTextPathElement(element: TextPathElement, context: SVGExportContext): string {
        const pathCommands = element.getPathCommands();
        const text = SVGExporter.resolveTextContent(element);
        const runs = element.getResolvedTextRuns();
        const bounds = element.getBounds();
        if (!pathCommands || pathCommands.length === 0 || !text || runs.length === 0 || !bounds) {
            return '';
        }

        const pathId = 'elise-text-path-' + context.nextTextPathId++;
        context.defs.push('<path id="' + pathId + '" d="' + SVGExporter.escapeAttribute(SVGExporter.exportPathDataFromCommands(pathCommands)) + '" />');

        const attributes = ['xml:space="preserve"'];
        if (element.typeface) {
            attributes.push('font-family="' + SVGExporter.escapeAttribute(element.typeface) + '"');
        }
        if (element.typesize !== undefined) {
            attributes.push('font-size="' + SVGExporter.formatNumber(element.typesize) + '"');
        }
        if (element.typestyle) {
            SVGExporter.pushTextStyleAttributes(attributes, element.typestyle);
        }
        SVGExporter.pushTextExtensionAttributes(attributes, element.letterSpacing, element.textDecoration, undefined);
        SVGExporter.pushCommonAttributes(attributes, element, context, bounds.location, false);

        const textPathAttributes = ['href="#' + pathId + '"'];
        if (element.startOffset !== 0) {
            const startOffset = element.startOffsetPercent
                ? SVGExporter.formatNumber(element.startOffset) + '%'
                : SVGExporter.formatNumber(element.startOffset);
            textPathAttributes.push('startOffset="' + SVGExporter.escapeAttribute(startOffset) + '"');
        }
        if (element.side === 'right') {
            textPathAttributes.push('side="right"');
        }

        const normalizedText = text.replace(/\r\n?/g, '\n').replace(/\n/g, ' ');
        const content = !element.richText || element.richText.length === 0
            ? SVGExporter.escapeText(normalizedText)
            : SVGExporter.exportTextPathRunsAsTspans(element, runs).join('');
        const textMarkup = '<text ' + attributes.join(' ') + '><textPath ' + textPathAttributes.join(' ') + '>' + content + '</textPath></text>';

        if (!element.showPath) {
            return textMarkup;
        }

        const guidePathAttributes = [
            'd="' + SVGExporter.escapeAttribute(SVGExporter.exportPathDataFromCommands(pathCommands)) + '"',
            'fill="none"',
        ];
        SVGExporter.pushContainerAttributes(guidePathAttributes, {
            opacity: element.opacity,
            visible: element.visible,
            transform: element.transform,
            clipPath: element.clipPath,
            filter: element.filter,
        }, bounds.location, context);
        SVGExporter.pushStrokeAttributes(guidePathAttributes, element);
        return '<path ' + guidePathAttributes.join(' ') + ' />' + textMarkup;
    }

    private static pushTextStyleAttributes(attributes: string[], typestyle: string): void {
        const parts = typestyle.split(',').map((part) => part.trim().toLowerCase());
        if (parts.indexOf('italic') !== -1) {
            attributes.push('font-style="italic"');
        }
        if (parts.indexOf('bold') !== -1) {
            attributes.push('font-weight="bold"');
        }
    }

    private static pushTextExtensionAttributes(
        attributes: string[],
        letterSpacing: number | undefined,
        textDecoration: string | undefined,
        lineHeight?: number,
    ): void {
        if (letterSpacing !== undefined && letterSpacing !== 0) {
            attributes.push('letter-spacing="' + SVGExporter.formatNumber(letterSpacing) + '"');
        }
        if (textDecoration) {
            attributes.push('text-decoration="' + SVGExporter.escapeAttribute(textDecoration.replace(/,/g, ' ')) + '"');
        }
        if (lineHeight !== undefined && lineHeight !== 1) {
            attributes.push('line-height="' + SVGExporter.formatNumber(lineHeight) + '"');
        }
    }

    private static getTextLineHeight(element: TextElement): number {
        const baseLineHeight = element.typesize || 10;
        const multiplier = element.lineHeight !== undefined && element.lineHeight > 0 ? element.lineHeight : 1;
        return baseLineHeight * multiplier;
    }

    private static exportTextRunsAsTspans(
        element: TextElement,
        runs: TextRun[],
        x: number,
        startY: number,
        lineHeight: number,
    ): string[] {
        const tspans: string[] = [];
        let lineIndex = 0;
        let firstSegmentOnLine = true;

        for (const run of runs) {
            const parts = run.text.split('\n');
            for (let index = 0; index < parts.length; index++) {
                const content = parts[index];
                if (content.length > 0 || firstSegmentOnLine) {
                    const attributes: string[] = [];
                    if (firstSegmentOnLine) {
                        attributes.push('x="' + SVGExporter.formatNumber(x) + '"');
                        attributes.push('y="' + SVGExporter.formatNumber(startY + lineIndex * lineHeight) + '"');
                    }
                    if (run.typeface && run.typeface !== element.typeface) {
                        attributes.push('font-family="' + SVGExporter.escapeAttribute(run.typeface) + '"');
                    }
                    if (run.typesize !== undefined && run.typesize !== element.typesize) {
                        attributes.push('font-size="' + SVGExporter.formatNumber(run.typesize) + '"');
                    }
                    if (run.typestyle && run.typestyle !== element.typestyle) {
                        SVGExporter.pushTextStyleAttributes(attributes, run.typestyle);
                    }
                    SVGExporter.pushTextExtensionAttributes(
                        attributes,
                        run.letterSpacing !== undefined && run.letterSpacing !== element.letterSpacing ? run.letterSpacing : undefined,
                        run.decoration !== undefined && run.decoration !== element.textDecoration ? run.decoration : undefined,
                    );
                    tspans.push(
                        '<tspan ' + attributes.join(' ') + '>' + SVGExporter.escapeText(content) + '</tspan>'
                    );
                    firstSegmentOnLine = false;
                }

                if (index < parts.length - 1) {
                    lineIndex++;
                    firstSegmentOnLine = true;
                }
            }
        }

        return tspans;
    }

    private static exportTextPathRunsAsTspans(element: TextPathElement, runs: TextRun[]): string[] {
        const tspans: string[] = [];
        for (const run of runs) {
            const content = run.text.replace(/\r\n?/g, '\n').replace(/\n/g, ' ');
            const attributes: string[] = [];
            if (run.typeface && run.typeface !== element.typeface) {
                attributes.push('font-family="' + SVGExporter.escapeAttribute(run.typeface) + '"');
            }
            if (run.typesize !== undefined && run.typesize !== element.typesize) {
                attributes.push('font-size="' + SVGExporter.formatNumber(run.typesize) + '"');
            }
            if (run.typestyle && run.typestyle !== element.typestyle) {
                SVGExporter.pushTextStyleAttributes(attributes, run.typestyle);
            }
            SVGExporter.pushTextExtensionAttributes(
                attributes,
                run.letterSpacing !== undefined && run.letterSpacing !== element.letterSpacing ? run.letterSpacing : undefined,
                run.decoration !== undefined && run.decoration !== element.textDecoration ? run.decoration : undefined,
            );
            tspans.push('<tspan ' + attributes.join(' ') + '>' + SVGExporter.escapeText(content) + '</tspan>');
        }
        return tspans;
    }

    private static pushContainerAttributes(
        attributes: string[],
        element: { id?: string; opacity?: number; visible?: boolean; transform?: string; clipPath?: ElementClipPath; filter?: string },
        origin: Point | undefined,
        context: SVGExportContext,
    ): void {
        if (element.id) {
            attributes.push('id="' + SVGExporter.escapeAttribute(element.id) + '"');
        }

        if (element.visible === false) {
            attributes.push('display="none"');
        }

        if (element.opacity !== undefined && element.opacity >= 0 && element.opacity < 1) {
            attributes.push('opacity="' + SVGExporter.formatNumber(element.opacity) + '"');
        }

        if (element.filter) {
            attributes.push('filter="' + SVGExporter.escapeAttribute(element.filter) + '"');
        }

        if (element.transform && origin) {
            attributes.push('transform="' + SVGExporter.escapeAttribute(SVGExporter.toSVGTransform(element.transform, origin)) + '"');
        }

        if (element.clipPath) {
            const clipPathId = SVGExporter.registerClipPath(element.clipPath, context);
            attributes.push('clip-path="url(#' + clipPathId + ')"');
        }
    }

    private static pushCommonAttributes(
        attributes: string[],
        element: ElementBase,
        context: SVGExportContext,
        origin: Point | undefined,
        supportsFillRule: boolean,
        forceNoFill: boolean = false,
    ): void {
        SVGExporter.pushContainerAttributes(attributes, element, origin, context);
        SVGExporter.pushFillAttributes(attributes, element, context, forceNoFill);
        SVGExporter.pushStrokeAttributes(attributes, element);

        if (supportsFillRule && (element as PathElement | PolygonElement).winding === WindingMode.EvenOdd) {
            attributes.push('fill-rule="evenodd"');
        }
    }

    private static pushFillAttributes(
        attributes: string[],
        element: ElementBase,
        context: SVGExportContext,
        forceNoFill: boolean,
    ): void {
        if (forceNoFill) {
            attributes.push('fill="none"');
            return;
        }

        const fillInfo = FillInfo.getFillInfo(element);
        if (!fillInfo) {
            attributes.push('fill="none"');
            return;
        }
        if (fillInfo.type === 'none') {
            attributes.push('fill="none"');
            return;
        }

        if (fillInfo.type === 'color' && fillInfo.color) {
            const fillColor = Color.parse(fillInfo.color);
            attributes.push('fill="' + SVGExporter.escapeAttribute(SVGExporter.toSVGColor(fillColor)) + '"');
            if (fillInfo.opacity !== undefined && fillInfo.opacity < 255) {
                attributes.push('fill-opacity="' + SVGExporter.formatOpacity(fillInfo.opacity) + '"');
            }
            return;
        }

        if (element.fill instanceof LinearGradientFill || element.fill instanceof RadialGradientFill) {
            const gradientId = SVGExporter.registerGradient(element.fill, context);
            attributes.push('fill="url(#' + gradientId + ')"');
            return;
        }

        attributes.push('fill="none"');
    }

    private static pushStrokeAttributes(attributes: string[], element: ElementBase): void {
        if (!element.stroke) {
            attributes.push('stroke="none"');
            return;
        }

        const parsedStroke = StrokeInfo.parseStroke(element.stroke);
        attributes.push('stroke="' + SVGExporter.escapeAttribute(SVGExporter.toSVGColor(parsedStroke.color)) + '"');
        attributes.push('stroke-width="' + SVGExporter.formatNumber(parsedStroke.width) + '"');
        if (element.strokeDash && element.strokeDash.length > 0) {
            attributes.push('stroke-dasharray="' + element.strokeDash.map((value) => SVGExporter.formatNumber(value)).join(' ') + '"');
        }
        if (element.lineCap) {
            attributes.push('stroke-linecap="' + element.lineCap + '"');
        }
        if (element.lineJoin) {
            attributes.push('stroke-linejoin="' + element.lineJoin + '"');
        }
        if (element.miterLimit !== undefined && element.miterLimit > 0) {
            attributes.push('stroke-miterlimit="' + SVGExporter.formatNumber(element.miterLimit) + '"');
        }
        if (parsedStroke.color.a < 255) {
            attributes.push('stroke-opacity="' + SVGExporter.formatOpacity(parsedStroke.color.a) + '"');
        }
    }

    private static registerGradient(fill: LinearGradientFill | RadialGradientFill, context: SVGExportContext): string {
        const gradientId = 'elise-gradient-' + context.nextGradientId++;
        if (fill instanceof LinearGradientFill) {
            const start = Point.parse(fill.start);
            const end = Point.parse(fill.end);
            context.defs.push(
                '<linearGradient id="' +
                    gradientId +
                    '" gradientUnits="userSpaceOnUse" x1="' +
                    SVGExporter.formatNumber(start.x) +
                    '" y1="' +
                    SVGExporter.formatNumber(start.y) +
                    '" x2="' +
                    SVGExporter.formatNumber(end.x) +
                    '" y2="' +
                    SVGExporter.formatNumber(end.y) +
                    '">' +
                    SVGExporter.exportGradientStops(fill.stops) +
                    '</linearGradient>'
            );
            return gradientId;
        }

        const center = Point.parse(fill.center);
        const focus = Point.parse(fill.focus);
        const scaleY = fill.radiusX === 0 ? 1 : fill.radiusY / fill.radiusX;
        const gradientTransform =
            scaleY !== 1
                ? ' gradientTransform="translate(' +
                  SVGExporter.formatNumber(center.x) +
                  ' ' +
                  SVGExporter.formatNumber(center.y) +
                  ') scale(1 ' +
                  SVGExporter.formatNumber(scaleY) +
                  ') translate(' +
                  SVGExporter.formatNumber(-center.x) +
                  ' ' +
                  SVGExporter.formatNumber(-center.y) +
                  ')"'
                : '';
        context.defs.push(
            '<radialGradient id="' +
                gradientId +
                '" gradientUnits="userSpaceOnUse" cx="' +
                SVGExporter.formatNumber(center.x) +
                '" cy="' +
                SVGExporter.formatNumber(center.y) +
                '" fx="' +
                SVGExporter.formatNumber(focus.x) +
                '" fy="' +
                SVGExporter.formatNumber(focus.y) +
                '" r="' +
                SVGExporter.formatNumber(fill.radiusX) +
                '"' +
                gradientTransform +
                '>' +
                SVGExporter.exportGradientStops(fill.stops) +
                '</radialGradient>'
        );
        return gradientId;
    }

    private static registerClipPath(clipPath: ElementClipPath, context: SVGExportContext): string {
        const clipPathId = 'elise-clip-path-' + context.nextClipPathId++;
        const attributes = ['id="' + clipPathId + '"'];
        if (clipPath.units === 'objectBoundingBox') {
            attributes.push('clipPathUnits="objectBoundingBox"');
        }
        else {
            attributes.push('clipPathUnits="userSpaceOnUse"');
        }

        const pathAttributes = ['d="' + SVGExporter.escapeAttribute(SVGExporter.exportPathDataFromCommands(clipPath.commands)) + '"'];
        if (clipPath.winding === WindingMode.EvenOdd) {
            pathAttributes.push('clip-rule="evenodd"');
        }
        if (clipPath.transform) {
            pathAttributes.push('transform="' + SVGExporter.escapeAttribute(SVGExporter.toSVGTransform(clipPath.transform, Point.Origin)) + '"');
        }

        context.defs.push('<clipPath ' + attributes.join(' ') + '><path ' + pathAttributes.join(' ') + ' /></clipPath>');
        return clipPathId;
    }

    private static exportGradientStops(stops: Array<{ color: string; offset: number }>): string {
        return stops
            .map((stop) => {
                const color = Color.parse(stop.color);
                const attributes = [
                    'offset="' + SVGExporter.formatNumber(stop.offset * 100) + '%"',
                    'stop-color="' + SVGExporter.escapeAttribute(SVGExporter.toSVGColor(color)) + '"',
                ];
                if (color.a < 255) {
                    attributes.push('stop-opacity="' + SVGExporter.formatOpacity(color.a) + '"');
                }
                return '<stop ' + attributes.join(' ') + ' />';
            })
            .join('');
    }

    private static pointsToString(points: Point[]): string {
        return points.map((point) => SVGExporter.pointToString(point)).join(' ');
    }

    private static exportSmoothedPolylineData(points: Point[]): string {
        const commands = ['M ' + SVGExporter.pointToString(points[0])];
        let index = 1;
        for (; index < points.length - 2; index++) {
            const controlPoint = points[index];
            const nextPoint = points[index + 1];
            const midPoint = new Point((controlPoint.x + nextPoint.x) / 2, (controlPoint.y + nextPoint.y) / 2);
            commands.push('Q ' + SVGExporter.pointToString(controlPoint) + ' ' + SVGExporter.pointToString(midPoint));
        }
        commands.push('L ' + SVGExporter.pointToString(points[index + 1]));
        return commands.join(' ');
    }

    private static resolveTextContent(element: { getResolvedText(): string | undefined }): string | undefined {
        return element.getResolvedText();
    }

    private static resolveImageHref(element: ImageElement): string | undefined {
        if (element.source && element.model && element.model.resourceManager) {
            const resource = element.model.resourceManager.get(element.source) as BitmapResource | undefined;
            if (resource) {
                if (resource.image && typeof resource.image.src === 'string' && resource.image.src.length > 0) {
                    return resource.image.currentSrc || resource.image.src;
                }
                if (resource.uri) {
                    return SVGExporter.normalizeResourceUri(resource.uri);
                }
            }
        }

        if (element.source) {
            return SVGExporter.normalizeResourceUri(element.source);
        }

        return undefined;
    }

    private static resolveModelElementModel(element: ModelElement): Model | undefined {
        if (element.sourceModel) {
            return element.sourceModel as Model;
        }

        if (element.source && element.model && element.model.resourceManager) {
            const resource = element.model.resourceManager.get(element.source) as ModelResource | undefined;
            if (resource && resource.model) {
                return resource.model;
            }
        }

        return undefined;
    }

    private static normalizeResourceUri(uri: string): string {
        if (uri.length > 1 && uri.charAt(0) === ':') {
            return uri.substring(1);
        }
        return uri;
    }

    private static toSVGTransform(transform: string, origin: Point): string {
        const matrix = Matrix2D.fromTransformString(transform, origin);
        return (
            'matrix(' +
            SVGExporter.formatNumber(matrix.m11) +
            ' ' +
            SVGExporter.formatNumber(matrix.m12) +
            ' ' +
            SVGExporter.formatNumber(matrix.m21) +
            ' ' +
            SVGExporter.formatNumber(matrix.m22) +
            ' ' +
            SVGExporter.formatNumber(matrix.offsetX) +
            ' ' +
            SVGExporter.formatNumber(matrix.offsetY) +
            ')'
        );
    }

    private static pointToString(point: Point): string {
        return SVGExporter.formatNumber(point.x) + ' ' + SVGExporter.formatNumber(point.y);
    }

    private static formatOpacity(alpha: number): string {
        return SVGExporter.formatNumber(alpha / 255);
    }

    private static toSVGColor(color: Color): string {
        return '#' + color.r.toString(16).padStart(2, '0') + color.g.toString(16).padStart(2, '0') + color.b.toString(16).padStart(2, '0');
    }

    private static formatNumber(value: number): string {
        if (Number.isInteger(value)) {
            return value.toString();
        }
        return parseFloat(value.toFixed(6)).toString();
    }

    private static escapeAttribute(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    private static escapeText(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}