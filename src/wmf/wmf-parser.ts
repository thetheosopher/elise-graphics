import {
    type ColorRef,
    type LogBrush,
    type LogFont,
    type LogPen,
    type WmfHeader,
    type WmfPlaceableHeader,
    WmfRecordType,
} from './wmf-types';

export interface WmfRecord {
    offset: number;
    sizeWords: number;
    type: WmfRecordType | number;
    parameters: DataView;
}

const PLACEABLE_KEY = 0x9AC6CDD7;

const decodeNullTerminatedAnsi = (view: DataView, offset: number, length: number): string => {
    const chars: string[] = [];
    for (let index = 0; index < length; index++) {
        const value = view.getUint8(offset + index);
        if (value === 0) {
            break;
        }
        chars.push(String.fromCharCode(value));
    }
    return chars.join('').trim();
};

export class WmfParameterReader {
    private offset: number;

    constructor(private readonly view: DataView, startOffset: number = 0) {
        this.offset = startOffset;
    }

    public get remainingBytes(): number {
        return this.view.byteLength - this.offset;
    }

    private ensureAvailable(bytes: number): void {
        if (this.offset + bytes > this.view.byteLength) {
            throw new Error('WMF record parameters are truncated.');
        }
    }

    public readInt16(): number {
        this.ensureAvailable(2);
        const value = this.view.getInt16(this.offset, true);
        this.offset += 2;
        return value;
    }

    public readUint16(): number {
        this.ensureAvailable(2);
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    public readInt32(): number {
        this.ensureAvailable(4);
        const value = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    public readUint32(): number {
        this.ensureAvailable(4);
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }
}

export function readInt16(view: DataView, offset: number = 0): number {
    return view.getInt16(offset, true);
}

export function readUint16(view: DataView, offset: number = 0): number {
    return view.getUint16(offset, true);
}

export function readInt32(view: DataView, offset: number = 0): number {
    return view.getInt32(offset, true);
}

export function readUint32(view: DataView, offset: number = 0): number {
    return view.getUint32(offset, true);
}

export function readColorRef(view: DataView, offset: number = 0): ColorRef {
    return {
        red: view.getUint8(offset),
        green: view.getUint8(offset + 1),
        blue: view.getUint8(offset + 2),
        reserved: view.getUint8(offset + 3),
    };
}

export function readLogBrush(view: DataView, offset: number = 0): LogBrush {
    return {
        style: readUint16(view, offset),
        color: readColorRef(view, offset + 2),
        hatch: readUint16(view, offset + 6),
    };
}

export function readLogPen(view: DataView, offset: number = 0): LogPen {
    return {
        style: readUint16(view, offset),
        widthX: readInt16(view, offset + 2),
        widthY: readInt16(view, offset + 4),
        color: readColorRef(view, offset + 6),
    };
}

export function readLogFont(view: DataView, offset: number = 0): LogFont {
    return {
        height: readInt16(view, offset),
        width: readInt16(view, offset + 2),
        escapement: readInt16(view, offset + 4),
        orientation: readInt16(view, offset + 6),
        weight: readInt16(view, offset + 8),
        italic: view.getUint8(offset + 10) !== 0,
        underline: view.getUint8(offset + 11) !== 0,
        strikeOut: view.getUint8(offset + 12) !== 0,
        charset: view.getUint8(offset + 13),
        outPrecision: view.getUint8(offset + 14),
        clipPrecision: view.getUint8(offset + 15),
        quality: view.getUint8(offset + 16),
        pitchAndFamily: view.getUint8(offset + 17),
        faceName: decodeNullTerminatedAnsi(view, offset + 18, 32),
    };
}

export class WmfParser {
    private readonly bytes: Uint8Array;
    private readonly view: DataView;
    private readonly contentStart: number;

    public readonly placeableHeader?: WmfPlaceableHeader;
    public readonly header: WmfHeader;
    public readonly recordsOffset: number;

    constructor(buffer: ArrayBuffer | Uint8Array) {
        this.bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);

        let headerOffset = 0;
        if (this.view.byteLength >= 22 && readUint32(this.view, 0) === PLACEABLE_KEY) {
            this.placeableHeader = {
                key: readUint32(this.view, 0),
                handle: readUint16(this.view, 4),
                boundingBox: {
                    left: readInt16(this.view, 6),
                    top: readInt16(this.view, 8),
                    right: readInt16(this.view, 10),
                    bottom: readInt16(this.view, 12),
                },
                inch: readUint16(this.view, 14),
                reserved: readUint32(this.view, 16),
                checksum: readUint16(this.view, 20),
            };
            headerOffset = 22;
        }

        if (this.view.byteLength < headerOffset + 18) {
            throw new Error('WMF header is truncated.');
        }

        this.header = {
            type: readUint16(this.view, headerOffset),
            headerSize: readUint16(this.view, headerOffset + 2),
            version: readUint16(this.view, headerOffset + 4),
            fileSizeWords: readUint32(this.view, headerOffset + 6),
            numberOfObjects: readUint16(this.view, headerOffset + 10),
            maxRecordSizeWords: readUint32(this.view, headerOffset + 12),
            numberOfParameters: readUint16(this.view, headerOffset + 16),
        };

        if (this.header.headerSize < 9) {
            throw new Error('WMF header size is invalid.');
        }

        this.recordsOffset = headerOffset + this.header.headerSize * 2;
        this.contentStart = headerOffset;
    }

    public *iterateRecords(): IterableIterator<WmfRecord> {
        const declaredEnd = this.header.fileSizeWords > 0
            ? Math.min(this.view.byteLength, this.contentStart + this.header.fileSizeWords * 2)
            : this.view.byteLength;
        let offset = this.recordsOffset;

        while (offset + 6 <= declaredEnd) {
            const sizeWords = readUint32(this.view, offset);
            const type = readUint16(this.view, offset + 4);
            if (sizeWords < 3) {
                throw new Error('WMF record size is invalid.');
            }

            const sizeBytes = sizeWords * 2;
            if (offset + sizeBytes > declaredEnd) {
                throw new Error('WMF record extends beyond the declared file size.');
            }

            const parameters = new DataView(this.bytes.buffer, this.bytes.byteOffset + offset + 6, sizeBytes - 6);
            yield {
                offset,
                sizeWords,
                type,
                parameters,
            };

            offset += sizeBytes;
            if (type === WmfRecordType.EOF) {
                break;
            }
        }
    }

    public forEachRecord(visitor: (record: WmfRecord) => void): void {
        for (const record of this.iterateRecords()) {
            visitor(record);
        }
    }
}