import { EllipseElement } from '../../elements/ellipse-element';
import { LineElement } from '../../elements/line-element';
import { PathElement } from '../../elements/path-element';
import { PolygonElement } from '../../elements/polygon-element';
import { PolylineElement } from '../../elements/polyline-element';
import { RectangleElement } from '../../elements/rectangle-element';
import { WindingMode } from '../../core/winding-mode';
import { WmfImporter } from '../../wmf/wmf-importer';
import { WmfParser } from '../../wmf/wmf-parser';
import { GdiBrushStyle, GdiPenStyle, GdiPolyFillMode, WmfRecordType } from '../../wmf/wmf-types';

class BinaryWriter {
    private readonly bytes: number[] = [];

    public get length(): number {
        return this.bytes.length;
    }

    public uint8(value: number): void {
        this.bytes.push(value & 0xFF);
    }

    public uint16(value: number): void {
        this.bytes.push(value & 0xFF, (value >>> 8) & 0xFF);
    }

    public int16(value: number): void {
        this.uint16(value < 0 ? 0x10000 + value : value);
    }

    public uint32(value: number): void {
        this.bytes.push(value & 0xFF, (value >>> 8) & 0xFF, (value >>> 16) & 0xFF, (value >>> 24) & 0xFF);
    }

    public bytesArray(values: number[]): void {
        this.bytes.push(...values);
    }

    public toArray(): number[] {
        return this.bytes.slice();
    }

    public toUint8Array(): Uint8Array {
        return Uint8Array.from(this.bytes);
    }
}

const appendColorRef = (writer: BinaryWriter, rgb: [number, number, number]): void => {
    writer.uint8(rgb[0]);
    writer.uint8(rgb[1]);
    writer.uint8(rgb[2]);
    writer.uint8(0);
};

const createRecord = (type: number, writeParameters?: (writer: BinaryWriter) => void): Uint8Array => {
    const parameters = new BinaryWriter();
    if (writeParameters) {
        writeParameters(parameters);
    }
    if (parameters.length % 2 !== 0) {
        parameters.uint8(0);
    }

    const record = new BinaryWriter();
    record.uint32((parameters.length + 6) / 2);
    record.uint16(type);
    record.bytesArray(parameters.toArray());
    return record.toUint8Array();
};

const createSetWindowOrgRecord = (x: number, y: number): Uint8Array => createRecord(WmfRecordType.SetWindowOrg, (writer) => {
    writer.int16(y);
    writer.int16(x);
});

const createSetWindowExtRecord = (xExtent: number, yExtent: number): Uint8Array => createRecord(WmfRecordType.SetWindowExt, (writer) => {
    writer.int16(yExtent);
    writer.int16(xExtent);
});

const createCreateBrushIndirectRecord = (style: number, rgb: [number, number, number]): Uint8Array => createRecord(WmfRecordType.CreateBrushIndirect, (writer) => {
    writer.uint16(style);
    appendColorRef(writer, rgb);
    writer.uint16(0);
});

const createCreatePenIndirectRecord = (style: number, width: number, rgb: [number, number, number]): Uint8Array => createRecord(WmfRecordType.CreatePenIndirect, (writer) => {
    writer.uint16(style);
    writer.int16(width);
    writer.int16(0);
    appendColorRef(writer, rgb);
});

const createSelectObjectRecord = (index: number): Uint8Array => createRecord(WmfRecordType.SelectObject, (writer) => {
    writer.uint16(index);
});

const createMoveToRecord = (x: number, y: number): Uint8Array => createRecord(WmfRecordType.MoveTo, (writer) => {
    writer.int16(y);
    writer.int16(x);
});

const createLineToRecord = (x: number, y: number): Uint8Array => createRecord(WmfRecordType.LineTo, (writer) => {
    writer.int16(y);
    writer.int16(x);
});

const createRectangleRecord = (left: number, top: number, right: number, bottom: number): Uint8Array => createRecord(WmfRecordType.Rectangle, (writer) => {
    writer.int16(bottom);
    writer.int16(right);
    writer.int16(top);
    writer.int16(left);
});

const createPolygonRecord = (points: Array<[number, number]>): Uint8Array => createRecord(WmfRecordType.Polygon, (writer) => {
    writer.uint16(points.length);
    for (const [x, y] of points) {
        writer.int16(x);
        writer.int16(y);
    }
});

const createPolyPolygonRecord = (polygons: Array<Array<[number, number]>>): Uint8Array => createRecord(WmfRecordType.PolyPolygon, (writer) => {
    writer.uint16(polygons.length);
    for (const polygon of polygons) {
        writer.uint16(polygon.length);
    }
    for (const polygon of polygons) {
        for (const [x, y] of polygon) {
            writer.int16(x);
            writer.int16(y);
        }
    }
});

const createSetPolyFillModeRecord = (mode: number): Uint8Array => createRecord(WmfRecordType.SetPolyFillMode, (writer) => {
    writer.uint16(mode);
});

const createArcLikeRecord = (
    type: WmfRecordType.Arc | WmfRecordType.Chord | WmfRecordType.Pie,
    left: number,
    top: number,
    right: number,
    bottom: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
): Uint8Array => createRecord(type, (writer) => {
    writer.int16(endY);
    writer.int16(endX);
    writer.int16(startY);
    writer.int16(startX);
    writer.int16(bottom);
    writer.int16(right);
    writer.int16(top);
    writer.int16(left);
});

const createPlaceableHeader = (left: number, top: number, right: number, bottom: number, inch: number = 1440): Uint8Array => {
    const header = new BinaryWriter();
    header.uint32(0x9AC6CDD7);
    header.uint16(0);
    header.int16(left);
    header.int16(top);
    header.int16(right);
    header.int16(bottom);
    header.uint16(inch);
    header.uint32(0);

    const checksumWords = new DataView(header.toUint8Array().buffer);
    let checksum = 0;
    for (let index = 0; index < 10; index++) {
        checksum ^= checksumWords.getUint16(index * 2, true);
    }
    header.uint16(checksum);
    return header.toUint8Array();
};

const concatArrays = (chunks: Uint8Array[]): Uint8Array => {
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
};

const buildWmf = (records: Uint8Array[], bounds: { left: number; top: number; right: number; bottom: number; }): ArrayBuffer => {
    const eof = createRecord(WmfRecordType.EOF);
    const allRecords = records.concat(eof);
    const recordsBytes = allRecords.reduce((sum, record) => sum + record.length, 0);
    const header = new BinaryWriter();
    header.uint16(1);
    header.uint16(9);
    header.uint16(0x0300);
    header.uint32((18 + recordsBytes) / 2);
    header.uint16(16);
    header.uint32(Math.max(...allRecords.map((record) => record.length / 2)));
    header.uint16(0);

    const bytes = concatArrays([
        createPlaceableHeader(bounds.left, bounds.top, bounds.right, bounds.bottom),
        header.toUint8Array(),
        ...allRecords,
    ]);

    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
};

test('WmfParser reads placeable WMF headers and records', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(0, 0),
        createSetWindowExtRecord(120, 80),
    ], { left: 0, top: 0, right: 120, bottom: 80 });

    const parser = new WmfParser(buffer);
    const records = Array.from(parser.iterateRecords());

    expect(parser.placeableHeader).toBeDefined();
    expect(parser.placeableHeader!.boundingBox.right).toBe(120);
    expect(parser.header.headerSize).toBe(9);
    expect(records.map((record) => record.type)).toEqual([
        WmfRecordType.SetWindowOrg,
        WmfRecordType.SetWindowExt,
        WmfRecordType.EOF,
    ]);
});

test('WmfImporter parses rectangle and line elements using selected brush and pen objects', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(0, 0),
        createSetWindowExtRecord(120, 80),
        createCreateBrushIndirectRecord(GdiBrushStyle.Solid, [255, 0, 0]),
        createSelectObjectRecord(0),
        createCreatePenIndirectRecord(GdiPenStyle.Solid, 2, [0, 0, 255]),
        createSelectObjectRecord(1),
        createRectangleRecord(20, 10, 60, 50),
        createMoveToRecord(20, 10),
        createLineToRecord(100, 30),
    ], { left: 0, top: 0, right: 120, bottom: 80 });

    const model = WmfImporter.parse(buffer);
    const rectangle = model.elements[0] as RectangleElement;
    const line = model.elements[1] as any;

    expect(model.getSize()!.width).toBe(120);
    expect(model.getSize()!.height).toBe(80);
    expect(model.elements).toHaveLength(2);
    expect(rectangle.fill).toBe('#FF0000');
    expect(rectangle.stroke).toBe('#0000FF, 2');
    expect(rectangle.location).toBe('20,10');
    expect(rectangle.size).toBe('40x40');
    expect(line.stroke).toBe('#0000FF, 2');
    expect(line.getP1()!.toString()).toBe('20,10');
    expect(line.getP2()!.toString()).toBe('100,30');
});

test('WmfImporter parses PolyPolygon into a compound path with alternate winding', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(0, 0),
        createSetWindowExtRecord(100, 100),
        createCreateBrushIndirectRecord(GdiBrushStyle.Solid, [17, 34, 51]),
        createSelectObjectRecord(0),
        createCreatePenIndirectRecord(GdiPenStyle.Solid, 1, [68, 85, 102]),
        createSelectObjectRecord(1),
        createSetPolyFillModeRecord(GdiPolyFillMode.Alternate),
        createPolyPolygonRecord([
            [[0, 0], [80, 0], [80, 80], [0, 80]],
            [[20, 20], [60, 20], [60, 60], [20, 60]],
        ]),
    ], { left: 0, top: 0, right: 100, bottom: 100 });

    const model = WmfImporter.parse(buffer);
    const path = model.elements[0] as PathElement;

    expect(model.elements).toHaveLength(1);
    expect(path).toBeInstanceOf(PathElement);
    expect(path.fill).toBe('#112233');
    expect(path.stroke).toBe('#445566, 1');
    expect(path.winding).toBe(WindingMode.EvenOdd);
    expect(path.getCommands()).toEqual([
        'm0,0',
        'l80,0',
        'l80,80',
        'l0,80',
        'z',
        'm20,20',
        'l60,20',
        'l60,60',
        'l20,60',
        'z',
    ]);
});

test('WmfImporter converts arc, chord, and pie records into path elements', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(0, 0),
        createSetWindowExtRecord(100, 100),
        createCreateBrushIndirectRecord(GdiBrushStyle.Solid, [170, 85, 34]),
        createSelectObjectRecord(0),
        createCreatePenIndirectRecord(GdiPenStyle.Solid, 3, [0, 0, 0]),
        createSelectObjectRecord(1),
        createArcLikeRecord(WmfRecordType.Arc, 10, 10, 90, 90, 90, 50, 50, 90),
        createArcLikeRecord(WmfRecordType.Chord, 10, 10, 90, 90, 90, 50, 50, 90),
        createArcLikeRecord(WmfRecordType.Pie, 10, 10, 90, 90, 90, 50, 50, 90),
    ], { left: 0, top: 0, right: 100, bottom: 100 });

    const model = WmfImporter.parse(buffer);
    const arc = model.elements[0] as PathElement;
    const chord = model.elements[1] as PathElement;
    const pie = model.elements[2] as PathElement;

    expect(model.elements).toHaveLength(3);
    expect(arc.stroke).toBe('#000000, 3');
    expect(arc.fill).toBeUndefined();
    expect(arc.getCommands()![0].charAt(0)).toBe('m');
    expect(arc.getCommands()!.some((command) => command.charAt(0) === 'c')).toBe(true);
    expect(chord.fill).toBe('#AA5522');
    expect(chord.getCommands()![chord.getCommands()!.length - 1]).toBe('z');
    expect(pie.fill).toBe('#AA5522');
    expect(pie.getCommands()![0]).toBe('m50,50');
    expect(pie.getCommands()![1].charAt(0)).toBe('l');
});

test('WmfImporter respects negative window extents by flipping imported coordinates', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(100, 0),
        createSetWindowExtRecord(-100, 100),
        createCreateBrushIndirectRecord(GdiBrushStyle.Solid, [255, 0, 0]),
        createSelectObjectRecord(0),
        createRectangleRecord(20, 10, 60, 30),
    ], { left: 100, top: 0, right: 0, bottom: 100 });

    const model = WmfImporter.parse(buffer);
    const rectangle = model.elements[0] as RectangleElement;

    expect(model.getSize()!.width).toBe(100);
    expect(rectangle.location).toBe('40,10');
    expect(rectangle.size).toBe('40x20');
});

const createEllipseRecord = (left: number, top: number, right: number, bottom: number): Uint8Array => createRecord(WmfRecordType.Ellipse, (writer) => {
    writer.int16(bottom);
    writer.int16(right);
    writer.int16(top);
    writer.int16(left);
});

const createPolylineRecord = (points: Array<[number, number]>): Uint8Array => createRecord(WmfRecordType.Polyline, (writer) => {
    writer.uint16(points.length);
    for (const [x, y] of points) {
        writer.int16(x);
        writer.int16(y);
    }
});

const createDeleteObjectRecord = (index: number): Uint8Array => createRecord(WmfRecordType.DeleteObject, (writer) => {
    writer.uint16(index);
});

test('WmfImporter parses ellipse record into EllipseElement', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(0, 0),
        createSetWindowExtRecord(200, 200),
        createCreateBrushIndirectRecord(GdiBrushStyle.Solid, [0, 128, 0]),
        createSelectObjectRecord(0),
        createCreatePenIndirectRecord(GdiPenStyle.Solid, 1, [0, 0, 0]),
        createSelectObjectRecord(1),
        createEllipseRecord(30, 40, 130, 100),
    ], { left: 0, top: 0, right: 200, bottom: 200 });

    const model = WmfImporter.parse(buffer);
    const ellipse = model.elements[0] as EllipseElement;

    expect(ellipse).toBeInstanceOf(EllipseElement);
    expect(ellipse.getCenter()!.x).toBe(80);
    expect(ellipse.getCenter()!.y).toBe(70);
    expect(ellipse.radiusX).toBe(50);
    expect(ellipse.radiusY).toBe(30);
    expect(ellipse.fill).toBe('#008000');
    expect(ellipse.stroke).toBe('#000000, 1');
});

test('WmfImporter parses polyline record into PolylineElement with stroke only', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(0, 0),
        createSetWindowExtRecord(100, 100),
        createCreatePenIndirectRecord(GdiPenStyle.Solid, 2, [255, 128, 0]),
        createSelectObjectRecord(0),
        createPolylineRecord([[10, 10], [50, 30], [90, 10]]),
    ], { left: 0, top: 0, right: 100, bottom: 100 });

    const model = WmfImporter.parse(buffer);
    const polyline = model.elements[0] as PolylineElement;

    expect(polyline).toBeInstanceOf(PolylineElement);
    expect(polyline.stroke).toBe('#FF8000, 2');
    expect(polyline.fill).toBeUndefined();
    expect(polyline.pointCount()).toBe(3);
});

test('WmfImporter parses polygon record into PolygonElement with fill, stroke, and winding', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(0, 0),
        createSetWindowExtRecord(100, 100),
        createSetPolyFillModeRecord(GdiPolyFillMode.Winding),
        createCreateBrushIndirectRecord(GdiBrushStyle.Solid, [0, 0, 255]),
        createSelectObjectRecord(0),
        createCreatePenIndirectRecord(GdiPenStyle.Solid, 1, [0, 0, 0]),
        createSelectObjectRecord(1),
        createPolygonRecord([[0, 0], [50, 0], [25, 40]]),
    ], { left: 0, top: 0, right: 100, bottom: 100 });

    const model = WmfImporter.parse(buffer);
    const polygon = model.elements[0] as PolygonElement;

    expect(polygon).toBeInstanceOf(PolygonElement);
    expect(polygon.fill).toBe('#0000FF');
    expect(polygon.stroke).toBe('#000000, 1');
    expect(polygon.winding).toBe(WindingMode.NonZero);
    expect(polygon.pointCount()).toBe(3);
});

test('WmfImporter handles DeleteObject by clearing slot and allowing reuse', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(0, 0),
        createSetWindowExtRecord(100, 100),
        createCreateBrushIndirectRecord(GdiBrushStyle.Solid, [255, 0, 0]),
        createCreatePenIndirectRecord(GdiPenStyle.Solid, 1, [0, 0, 0]),
        createSelectObjectRecord(0),
        createSelectObjectRecord(1),
        createDeleteObjectRecord(0),
        createCreateBrushIndirectRecord(GdiBrushStyle.Solid, [0, 255, 0]),
        createSelectObjectRecord(0),
        createRectangleRecord(10, 10, 50, 50),
    ], { left: 0, top: 0, right: 100, bottom: 100 });

    const model = WmfImporter.parse(buffer);
    const rectangle = model.elements[0] as RectangleElement;

    expect(rectangle.fill).toBe('#00FF00');
});

test('WmfImporter produces a hollow pen (no stroke) when PS_NULL is selected', () => {
    const buffer = buildWmf([
        createSetWindowOrgRecord(0, 0),
        createSetWindowExtRecord(100, 100),
        createCreateBrushIndirectRecord(GdiBrushStyle.Solid, [255, 0, 0]),
        createSelectObjectRecord(0),
        createCreatePenIndirectRecord(GdiPenStyle.Null, 1, [0, 0, 0]),
        createSelectObjectRecord(1),
        createRectangleRecord(10, 10, 50, 50),
    ], { left: 0, top: 0, right: 100, bottom: 100 });

    const model = WmfImporter.parse(buffer);
    const rectangle = model.elements[0] as RectangleElement;

    expect(rectangle.fill).toBe('#FF0000');
    expect(rectangle.stroke).toBeUndefined();
});