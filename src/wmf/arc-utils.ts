import { Point } from '../core/point';

export interface ArcBezierSegment {
    cp1: Point;
    cp2: Point;
    end: Point;
}

const degreesToRadians = (degrees: number): number => degrees * Math.PI / 180;

const normalizeDegrees = (degrees: number): number => {
    let value = degrees % 360;
    if (value < 0) {
        value += 360;
    }
    return value;
};

const ellipseAngle = (cx: number, cy: number, rx: number, ry: number, px: number, py: number): number => {
    if (rx === 0 || ry === 0) {
        return 0;
    }
    return normalizeDegrees(Math.atan2((py - cy) / ry, (px - cx) / rx) * 180 / Math.PI);
};

const ellipsePointAt = (cx: number, cy: number, rx: number, ry: number, angleDegrees: number): Point => {
    const radians = degreesToRadians(angleDegrees);
    return new Point(cx + Math.cos(radians) * rx, cy + Math.sin(radians) * ry);
};

const normalizeCounterClockwiseSweep = (startAngle: number, endAngle: number): number => {
    let sweep = endAngle - startAngle;
    while (sweep > 0) {
        sweep -= 360;
    }
    while (sweep <= -360) {
        sweep += 360;
    }
    return sweep === 0 ? -360 : sweep;
};

const normalizeRect = (left: number, top: number, right: number, bottom: number): { x: number; y: number; width: number; height: number; } => ({
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top),
});

export function arcToBeziers(x: number, y: number, width: number, height: number, startAngle: number, sweepAngle: number): ArcBezierSegment[] {
    if (width === 0 || height === 0 || sweepAngle === 0) {
        return [];
    }

    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = width / 2;
    const ry = height / 2;
    const segments: ArcBezierSegment[] = [];
    const segmentCount = Math.max(1, Math.ceil(Math.abs(sweepAngle) / 90));
    const step = sweepAngle / segmentCount;

    for (let index = 0; index < segmentCount; index++) {
        const start = degreesToRadians(startAngle + step * index);
        const end = degreesToRadians(startAngle + step * (index + 1));
        const delta = end - start;
        const alpha = (4 / 3) * Math.tan(delta / 4);

        const cosStart = Math.cos(start);
        const sinStart = Math.sin(start);
        const cosEnd = Math.cos(end);
        const sinEnd = Math.sin(end);

        segments.push({
            cp1: new Point(cx + (cosStart - alpha * sinStart) * rx, cy + (sinStart + alpha * cosStart) * ry),
            cp2: new Point(cx + (cosEnd + alpha * sinEnd) * rx, cy + (sinEnd - alpha * cosEnd) * ry),
            end: new Point(cx + cosEnd * rx, cy + sinEnd * ry),
        });
    }

    return segments;
}

export function arcPathCommands(left: number, top: number, right: number, bottom: number, startX: number, startY: number, endX: number, endY: number): string[] {
    const rect = normalizeRect(left, top, right, bottom);
    if (rect.width === 0 || rect.height === 0) {
        return [];
    }

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const rx = rect.width / 2;
    const ry = rect.height / 2;
    const startAngle = ellipseAngle(cx, cy, rx, ry, startX, startY);
    const endAngle = ellipseAngle(cx, cy, rx, ry, endX, endY);
    const sweepAngle = normalizeCounterClockwiseSweep(startAngle, endAngle);
    const startPoint = ellipsePointAt(cx, cy, rx, ry, startAngle);
    const commands = ['m' + startPoint.toString()];

    for (const segment of arcToBeziers(rect.x, rect.y, rect.width, rect.height, startAngle, sweepAngle)) {
        commands.push('c' + segment.cp1.toString() + ',' + segment.cp2.toString() + ',' + segment.end.toString());
    }

    return commands;
}

export function chordPathCommands(left: number, top: number, right: number, bottom: number, startX: number, startY: number, endX: number, endY: number): string[] {
    const commands = arcPathCommands(left, top, right, bottom, startX, startY, endX, endY);
    if (commands.length > 0) {
        commands.push('z');
    }
    return commands;
}

export function piePathCommands(left: number, top: number, right: number, bottom: number, startX: number, startY: number, endX: number, endY: number): string[] {
    const rect = normalizeRect(left, top, right, bottom);
    if (rect.width === 0 || rect.height === 0) {
        return [];
    }

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const rx = rect.width / 2;
    const ry = rect.height / 2;
    const startAngle = ellipseAngle(cx, cy, rx, ry, startX, startY);
    const endAngle = ellipseAngle(cx, cy, rx, ry, endX, endY);
    const sweepAngle = normalizeCounterClockwiseSweep(startAngle, endAngle);
    const startPoint = ellipsePointAt(cx, cy, rx, ry, startAngle);
    const commands = ['m' + new Point(cx, cy).toString(), 'l' + startPoint.toString()];

    for (const segment of arcToBeziers(rect.x, rect.y, rect.width, rect.height, startAngle, sweepAngle)) {
        commands.push('c' + segment.cp1.toString() + ',' + segment.cp2.toString() + ',' + segment.end.toString());
    }

    commands.push('z');
    return commands;
}