import { Model } from '../core/model';
import { Point } from '../core/point';
import { Size } from '../core/size';
import { WindingMode } from '../core/winding-mode';
import { ElementBase } from '../elements/element-base';
import { EllipseElement } from '../elements/ellipse-element';
import { LineElement } from '../elements/line-element';
import { PathElement } from '../elements/path-element';
import { PolygonElement } from '../elements/polygon-element';
import { PolylineElement } from '../elements/polyline-element';
import { RectangleElement } from '../elements/rectangle-element';
import { arcPathCommands, chordPathCommands, piePathCommands } from './arc-utils';
import { createBrushObject, createFontObject, createPenObject, GdiState } from './gdi-state';
import { readColorRef, readLogBrush, readLogFont, readLogPen, WmfParameterReader, WmfParser } from './wmf-parser';
import { colorRefToString, GdiPolyFillMode, type WmfBounds, WmfRecordType } from './wmf-types';

const setModelSize = (model: Model, width: number, height: number): void => {
    if (width > 0 || height > 0) {
        model.setSize(new Size(Math.max(0, width), Math.max(0, height)));
    }
};

const applyStroke = (element: ElementBase, state: GdiState): void => {
    element.setStroke(state.currentStroke);
    element.setStrokeDash(state.currentStrokeDash ? state.currentStrokeDash.slice() : undefined);
};

const applyFillAndStroke = (element: ElementBase, state: GdiState, allowFill: boolean, allowStroke: boolean): void => {
    if (allowFill) {
        element.setFill(state.currentFill);
    }
    if (allowStroke) {
        applyStroke(element, state);
    }
};

const applyWinding = (element: PathElement | PolygonElement, state: GdiState): void => {
    element.setWinding(state.nonZeroFill ? WindingMode.NonZero : WindingMode.EvenOdd);
};

const fixPoint = (state: GdiState, x: number, y: number): Point => new Point(state.fixX(x), state.fixY(y));

const fixBounds = (state: GdiState, left: number, top: number, right: number, bottom: number): WmfBounds => {
    const p1 = fixPoint(state, left, top);
    const p2 = fixPoint(state, right, bottom);
    return {
        left: Math.min(p1.x, p2.x),
        top: Math.min(p1.y, p2.y),
        right: Math.max(p1.x, p2.x),
        bottom: Math.max(p1.y, p2.y),
    };
};

const createPathElement = (commands: string[], state: GdiState, allowFill: boolean, allowStroke: boolean): PathElement => {
    const path = PathElement.create().setCommands(commands.join(' '));
    if (allowFill) {
        applyWinding(path, state);
    }
    applyFillAndStroke(path, state, allowFill, allowStroke);
    return path;
};

const readPointArray = (reader: WmfParameterReader, count: number, state: GdiState): Point[] => {
    const points: Point[] = [];
    for (let index = 0; index < count; index++) {
        const x = reader.readInt16();
        const y = reader.readInt16();
        points.push(fixPoint(state, x, y));
    }
    return points;
};

const updateModelSizeFromState = (model: Model, state: GdiState): void => {
    const width = state.xRange > 0 ? state.xRange : model.getSize()?.width || 0;
    const height = state.yRange > 0 ? state.yRange : model.getSize()?.height || 0;
    setModelSize(model, width, height);
};

export class WmfImporter {
    public static parse(buffer: ArrayBuffer | Uint8Array): Model {
        const parser = new WmfParser(buffer);
        const initialSize = WmfImporter.getInitialSize(parser);
        const model = Model.create(initialSize.width, initialSize.height);
        const state = new GdiState();

        if (parser.placeableHeader) {
            const bounds = parser.placeableHeader.boundingBox;
            state.initializeFromBounds(bounds.left, bounds.top, bounds.right, bounds.bottom);
        }

        parser.forEachRecord((record) => {
            WmfImporter.handleRecord(record.type, record.parameters, state, model);
        });

        updateModelSizeFromState(model, state);
        return model;
    }

    private static getInitialSize(parser: WmfParser): { width: number; height: number; } {
        if (!parser.placeableHeader) {
            return { width: 0, height: 0 };
        }
        const bounds = parser.placeableHeader.boundingBox;
        return {
            width: Math.abs(bounds.right - bounds.left),
            height: Math.abs(bounds.bottom - bounds.top),
        };
    }

    private static handleRecord(type: number, parameters: DataView, state: GdiState, model: Model): void {
        const reader = new WmfParameterReader(parameters);

        switch (type) {
            case WmfRecordType.SetWindowOrg: {
                const y = reader.readInt16();
                const x = reader.readInt16();
                state.setWindowOrg(x, y);
                break;
            }
            case WmfRecordType.SetWindowExt: {
                const yExtent = reader.readInt16();
                const xExtent = reader.readInt16();
                state.setWindowExt(xExtent, yExtent);
                updateModelSizeFromState(model, state);
                break;
            }
            case WmfRecordType.SetBkMode:
                state.bkMode = reader.readUint16();
                break;
            case WmfRecordType.SetMapMode:
            case WmfRecordType.SetRop2:
            case WmfRecordType.SetRelAbs:
                reader.readUint16();
                break;
            case WmfRecordType.SetBkColor:
                state.bkColor = colorRefToString(readColorRef(parameters));
                break;
            case WmfRecordType.SetTextColor:
                state.textColor = colorRefToString(readColorRef(parameters));
                break;
            case WmfRecordType.SetTextAlign:
                state.textAlign = reader.readUint16();
                break;
            case WmfRecordType.SetPolyFillMode:
                state.nonZeroFill = reader.readUint16() === GdiPolyFillMode.Winding;
                break;
            case WmfRecordType.CreateBrushIndirect:
                state.addObject(createBrushObject(readLogBrush(parameters)));
                break;
            case WmfRecordType.CreatePenIndirect:
                state.addObject(createPenObject(readLogPen(parameters)));
                break;
            case WmfRecordType.CreateFontIndirect:
                state.addObject(createFontObject(readLogFont(parameters)));
                break;
            case WmfRecordType.SelectObject:
                state.selectObject(reader.readUint16());
                break;
            case WmfRecordType.DeleteObject:
                state.deleteObject(reader.readUint16());
                break;
            case WmfRecordType.MoveTo: {
                const y = reader.readInt16();
                const x = reader.readInt16();
                state.currentX = state.fixX(x);
                state.currentY = state.fixY(y);
                break;
            }
            case WmfRecordType.LineTo: {
                const y = reader.readInt16();
                const x = reader.readInt16();
                const end = fixPoint(state, x, y);
                const line = LineElement.create(state.currentX, state.currentY, end.x, end.y);
                applyStroke(line, state);
                model.add(line);
                state.currentX = end.x;
                state.currentY = end.y;
                break;
            }
            case WmfRecordType.Polygon: {
                const count = reader.readUint16();
                const points = readPointArray(reader, count, state);
                if (points.length === 0) {
                    break;
                }
                const polygon = PolygonElement.create().setPoints(points);
                applyWinding(polygon, state);
                applyFillAndStroke(polygon, state, true, true);
                model.add(polygon);
                break;
            }
            case WmfRecordType.Polyline: {
                const count = reader.readUint16();
                const points = readPointArray(reader, count, state);
                if (points.length === 0) {
                    break;
                }
                const polyline = PolylineElement.create().setPoints(points);
                applyStroke(polyline, state);
                model.add(polyline);
                break;
            }
            case WmfRecordType.PolyPolygon: {
                const polygonCount = reader.readUint16();
                const pointCounts: number[] = [];
                for (let index = 0; index < polygonCount; index++) {
                    pointCounts.push(reader.readUint16());
                }
                const commands: string[] = [];
                for (const pointCount of pointCounts) {
                    const points = readPointArray(reader, pointCount, state);
                    if (points.length === 0) {
                        continue;
                    }
                    commands.push('m' + points[0].toString());
                    for (let index = 1; index < points.length; index++) {
                        commands.push('l' + points[index].toString());
                    }
                    commands.push('z');
                }
                if (commands.length > 0) {
                    model.add(createPathElement(commands, state, true, true));
                }
                break;
            }
            case WmfRecordType.Rectangle: {
                const bottom = reader.readInt16();
                const right = reader.readInt16();
                const top = reader.readInt16();
                const left = reader.readInt16();
                const bounds = fixBounds(state, left, top, right, bottom);
                const rectangle = RectangleElement.create(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
                applyFillAndStroke(rectangle, state, true, true);
                model.add(rectangle);
                break;
            }
            case WmfRecordType.Ellipse: {
                const bottom = reader.readInt16();
                const right = reader.readInt16();
                const top = reader.readInt16();
                const left = reader.readInt16();
                const bounds = fixBounds(state, left, top, right, bottom);
                const ellipse = EllipseElement.create(
                    bounds.left + (bounds.right - bounds.left) / 2,
                    bounds.top + (bounds.bottom - bounds.top) / 2,
                    (bounds.right - bounds.left) / 2,
                    (bounds.bottom - bounds.top) / 2,
                );
                applyFillAndStroke(ellipse, state, true, true);
                model.add(ellipse);
                break;
            }
            case WmfRecordType.Arc:
            case WmfRecordType.Chord:
            case WmfRecordType.Pie: {
                const yEnd = reader.readInt16();
                const xEnd = reader.readInt16();
                const yStart = reader.readInt16();
                const xStart = reader.readInt16();
                const bottom = reader.readInt16();
                const right = reader.readInt16();
                const top = reader.readInt16();
                const left = reader.readInt16();

                const rect = fixBounds(state, left, top, right, bottom);
                const start = fixPoint(state, xStart, yStart);
                const end = fixPoint(state, xEnd, yEnd);

                const commands = type === WmfRecordType.Arc
                    ? arcPathCommands(rect.left, rect.top, rect.right, rect.bottom, start.x, start.y, end.x, end.y)
                    : (type === WmfRecordType.Chord
                        ? chordPathCommands(rect.left, rect.top, rect.right, rect.bottom, start.x, start.y, end.x, end.y)
                        : piePathCommands(rect.left, rect.top, rect.right, rect.bottom, start.x, start.y, end.x, end.y));

                if (commands.length > 0) {
                    model.add(createPathElement(commands, state, type !== WmfRecordType.Arc, true));
                }
                break;
            }
            case WmfRecordType.PatBlt: {
                reader.readUint32();
                const height = reader.readInt16();
                const width = reader.readInt16();
                const y = reader.readInt16();
                const x = reader.readInt16();
                const start = fixPoint(state, x, y);
                const end = fixPoint(state, x + width, y + height);
                const rectangle = RectangleElement.create(
                    Math.min(start.x, end.x),
                    Math.min(start.y, end.y),
                    Math.abs(end.x - start.x),
                    Math.abs(end.y - start.y),
                );
                rectangle.setFill(state.currentFill);
                rectangle.setStroke(undefined);
                model.add(rectangle);
                break;
            }
            case WmfRecordType.TextOut:
            case WmfRecordType.ExtTextOut:
            case WmfRecordType.StretchDib:
            case WmfRecordType.DibStretchBlt:
            case WmfRecordType.SaveDc:
            case WmfRecordType.RestoreDc:
            case WmfRecordType.EOF:
                break;
            default:
                break;
        }
    }
}