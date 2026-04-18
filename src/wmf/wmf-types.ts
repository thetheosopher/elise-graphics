export enum WmfRecordType {
    EOF = 0x0000,
    SetBkMode = 0x0102,
    SetMapMode = 0x0103,
    SetRop2 = 0x0104,
    SetRelAbs = 0x0105,
    SetPolyFillMode = 0x0106,
    SetTextAlign = 0x012E,
    SetBkColor = 0x0201,
    SetTextColor = 0x0209,
    SetWindowOrg = 0x020B,
    SetWindowExt = 0x020C,
    LineTo = 0x0213,
    MoveTo = 0x0214,
    Arc = 0x0817,
    Ellipse = 0x0418,
    Pie = 0x081A,
    Rectangle = 0x041B,
    PatBlt = 0x061D,
    TextOut = 0x0521,
    Polygon = 0x0324,
    Polyline = 0x0325,
    RestoreDc = 0x0127,
    SelectObject = 0x012D,
    Chord = 0x0830,
    ExtTextOut = 0x0A32,
    PolyPolygon = 0x0538,
    DibStretchBlt = 0x0B41,
    StretchDib = 0x0F43,
    DeleteObject = 0x01F0,
    CreatePenIndirect = 0x02FA,
    CreateFontIndirect = 0x02FB,
    CreateBrushIndirect = 0x02FC,
    SaveDc = 0x001E,
}

export enum GdiBrushStyle {
    Solid = 0,
    Hollow = 1,
    Hatched = 2,
    Pattern = 3,
    Indexed = 4,
    DibPattern = 5,
    DibPatternPt = 6,
    Pattern8x8 = 7,
    DibPattern8x8 = 8,
    MonoPattern = 9,
}

export enum GdiPenStyle {
    Solid = 0,
    Dash = 1,
    Dot = 2,
    DashDot = 3,
    DashDotDot = 4,
    Null = 5,
    InsideFrame = 6,
}

export enum GdiHatchStyle {
    Horizontal = 0,
    Vertical = 1,
    FDiagonal = 2,
    BDiagonal = 3,
    Cross = 4,
    DiagCross = 5,
}

export enum GdiBackgroundMode {
    Transparent = 1,
    Opaque = 2,
}

export enum GdiPolyFillMode {
    Alternate = 1,
    Winding = 2,
}

export enum GdiTextAlignFlags {
    TA_NOUPDATECP = 0,
    TA_UPDATECP = 1,
    TA_LEFT = 0,
    TA_RIGHT = 2,
    TA_CENTER = 6,
    TA_TOP = 0,
    TA_BOTTOM = 8,
    TA_BASELINE = 24,
}

export interface ColorRef {
    red: number;
    green: number;
    blue: number;
    reserved?: number;
}

export interface LogBrush {
    style: GdiBrushStyle | number;
    color: ColorRef;
    hatch: GdiHatchStyle | number;
}

export interface LogPen {
    style: GdiPenStyle | number;
    widthX: number;
    widthY: number;
    color: ColorRef;
}

export interface LogFont {
    height: number;
    width: number;
    escapement: number;
    orientation: number;
    weight: number;
    italic: boolean;
    underline: boolean;
    strikeOut: boolean;
    charset: number;
    outPrecision: number;
    clipPrecision: number;
    quality: number;
    pitchAndFamily: number;
    faceName: string;
}

export interface WmfBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface WmfPlaceableHeader {
    key: number;
    handle: number;
    boundingBox: WmfBounds;
    inch: number;
    reserved: number;
    checksum: number;
}

export interface WmfHeader {
    type: number;
    headerSize: number;
    version: number;
    fileSizeWords: number;
    numberOfObjects: number;
    maxRecordSizeWords: number;
    numberOfParameters: number;
}

const byteToHex = (value: number): string => {
    const normalized = Math.max(0, Math.min(255, Math.round(value)));
    return normalized.toString(16).padStart(2, '0').toUpperCase();
};

export function colorRefToString(color: ColorRef): string {
    return '#' + byteToHex(color.red) + byteToHex(color.green) + byteToHex(color.blue);
}