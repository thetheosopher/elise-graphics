import { Point } from '../core/point';
import { Region } from '../core/region';
import { Size } from '../core/size';
import { normalizePathCommands } from './path-command-utils';

export const clampPrimitiveValue = (value: number, min: number, max: number): number => {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
};

export const degreesToRadians = (angle: number): number => (angle * Math.PI) / 180;

export const radiansToDegrees = (angle: number): number => (angle * 180) / Math.PI;

export const normalizeDegrees = (angle: number): number => {
    let normalized = angle % 360;
    if (normalized < 0) {
        normalized += 360;
    }
    return normalized;
};

export const positiveSweepDegrees = (startAngle: number, endAngle: number): number => {
    let sweep = normalizeDegrees(endAngle) - normalizeDegrees(startAngle);
    if (sweep <= 0) {
        sweep += 360;
    }
    return sweep;
};

export const getBoundsCenter = (location: Point, size: Size): Point => new Point(location.x + size.width / 2, location.y + size.height / 2);

export const getBoundsRadii = (size: Size): { radiusX: number; radiusY: number } => ({
    radiusX: Math.max(0, size.width / 2),
    radiusY: Math.max(0, size.height / 2),
});

export const getEllipsePointForBounds = (
    location: Point,
    size: Size,
    angleDegrees: number,
    radiusScale: number = 1,
): Point => {
    const center = getBoundsCenter(location, size);
    const radii = getBoundsRadii(size);
    const angle = degreesToRadians(angleDegrees);
    return new Point(
        center.x + radii.radiusX * radiusScale * Math.cos(angle),
        center.y + radii.radiusY * radiusScale * Math.sin(angle),
    );
};

export const setBoundsFromCenter = (center: Point, radiusX: number, radiusY: number): { location: Point; size: Size } => ({
    location: new Point(center.x - radiusX, center.y - radiusY),
    size: new Size(radiusX * 2, radiusY * 2),
});

export const resolveEllipseHandleSize = (
    center: Point,
    currentSize: Size,
    handleAngleDegrees: number,
    targetPoint: Point,
): Size => {
    const angle = degreesToRadians(handleAngleDegrees);
    const dx = targetPoint.x - center.x;
    const dy = targetPoint.y - center.y;
    const currentRadii = getBoundsRadii(currentSize);
    let radiusX = currentRadii.radiusX;
    let radiusY = currentRadii.radiusY;

    if (Math.abs(Math.cos(angle)) > 0.0001) {
        radiusX = Math.max(1, Math.abs(dx / Math.cos(angle)));
    }
    if (Math.abs(Math.sin(angle)) > 0.0001) {
        radiusY = Math.max(1, Math.abs(dy / Math.sin(angle)));
    }

    return new Size(radiusX * 2, radiusY * 2);
};

export const angleFromEllipsePoint = (center: Point, size: Size, point: Point): number => {
    const radii = getBoundsRadii(size);
    const normalizedX = radii.radiusX > 0 ? (point.x - center.x) / radii.radiusX : 0;
    const normalizedY = radii.radiusY > 0 ? (point.y - center.y) / radii.radiusY : 0;
    return normalizeDegrees(radiansToDegrees(Math.atan2(normalizedY, normalizedX)));
};

export const ellipseScaleForPoint = (center: Point, size: Size, point: Point): number => {
    const radii = getBoundsRadii(size);
    const normalizedX = radii.radiusX > 0 ? (point.x - center.x) / radii.radiusX : 0;
    const normalizedY = radii.radiusY > 0 ? (point.y - center.y) / radii.radiusY : 0;
    return Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
};

export const buildEllipticalArcCommands = (
    location: Point,
    size: Size,
    startAngle: number,
    endAngle: number,
    radiusScale: number = 1,
    clockwise: boolean = true,
    includeMove: boolean = true,
): string[] => {
    const radii = getBoundsRadii(size);
    const radiusX = radii.radiusX * radiusScale;
    const radiusY = radii.radiusY * radiusScale;
    if (radiusX <= 0 || radiusY <= 0) {
        return [];
    }

    const start = normalizeDegrees(startAngle);
    const sweep = clockwise ? positiveSweepDegrees(startAngle, endAngle) : positiveSweepDegrees(endAngle, startAngle);
    const delta = clockwise ? sweep : -sweep;
    const startPoint = getEllipsePointForBounds(location, size, start, radiusScale);
    const commands: string[] = [];

    if (includeMove) {
        commands.push('m' + startPoint.toString());
    }

    if (sweep >= 359.999) {
        const midpoint = getEllipsePointForBounds(location, size, start + delta / 2, radiusScale);
        commands.push('A' + [radiusX, radiusY, 0, 0, clockwise ? 1 : 0, midpoint.x, midpoint.y].join(','));
        commands.push('A' + [radiusX, radiusY, 0, 0, clockwise ? 1 : 0, startPoint.x, startPoint.y].join(','));
        return commands;
    }

    const endPoint = getEllipsePointForBounds(location, size, start + delta, radiusScale);
    commands.push('A' + [radiusX, radiusY, 0, sweep > 180 ? 1 : 0, clockwise ? 1 : 0, endPoint.x, endPoint.y].join(','));
    return commands;
};

export const commandsBounds = (commands: string[]): Region | undefined => {
    let minX: number | undefined;
    let minY: number | undefined;
    let maxX: number | undefined;
    let maxY: number | undefined;

    for (const command of normalizePathCommands(commands)) {
        let point: Point | undefined;
        if (command.charAt(0) === 'm' || command.charAt(0) === 'l') {
            point = Point.parse(command.substring(1));
        }
        else if (command.charAt(0) === 'c') {
            const parts = command.substring(1).split(',');
            for (let index = 0; index < 6; index += 2) {
                const x = parseFloat(parts[index]);
                const y = parseFloat(parts[index + 1]);
                minX = minX === undefined ? x : Math.min(minX, x);
                minY = minY === undefined ? y : Math.min(minY, y);
                maxX = maxX === undefined ? x : Math.max(maxX, x);
                maxY = maxY === undefined ? y : Math.max(maxY, y);
            }
        }
        else if (command.charAt(0) === 'Q') {
            const parts = command.substring(1).split(',');
            for (let index = 0; index < 4; index += 2) {
                const x = parseFloat(parts[index]);
                const y = parseFloat(parts[index + 1]);
                minX = minX === undefined ? x : Math.min(minX, x);
                minY = minY === undefined ? y : Math.min(minY, y);
                maxX = maxX === undefined ? x : Math.max(maxX, x);
                maxY = maxY === undefined ? y : Math.max(maxY, y);
            }
        }

        if (point) {
            minX = minX === undefined ? point.x : Math.min(minX, point.x);
            minY = minY === undefined ? point.y : Math.min(minY, point.y);
            maxX = maxX === undefined ? point.x : Math.max(maxX, point.x);
            maxY = maxY === undefined ? point.y : Math.max(maxY, point.y);
        }
    }

    if (minX === undefined || minY === undefined || maxX === undefined || maxY === undefined) {
        return undefined;
    }

    return new Region(minX, minY, maxX - minX, maxY - minY);
};

export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;
        const intersects = (yi > point.y) !== (yj > point.y)
            && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1) + xi;
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
};

export const pointToSegmentDistance = (point: Point, start: Point, end: Point): number => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) {
        return Math.hypot(point.x - start.x, point.y - start.y);
    }
    const t = clampPrimitiveValue(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
    const projectedX = start.x + t * dx;
    const projectedY = start.y + t * dy;
    return Math.hypot(point.x - projectedX, point.y - projectedY);
};

export const pointToPolylineDistance = (point: Point, polyline: Point[]): number => {
    if (polyline.length === 0) {
        return Number.POSITIVE_INFINITY;
    }
    if (polyline.length === 1) {
        return Math.hypot(point.x - polyline[0].x, point.y - polyline[0].y);
    }
    let minDistance = Number.POSITIVE_INFINITY;
    for (let index = 1; index < polyline.length; index++) {
        minDistance = Math.min(minDistance, pointToSegmentDistance(point, polyline[index - 1], polyline[index]));
    }
    return minDistance;
};

export const sampleEllipticalArc = (
    location: Point,
    size: Size,
    startAngle: number,
    endAngle: number,
    segments: number,
): Point[] => {
    const points: Point[] = [];
    const sweep = positiveSweepDegrees(startAngle, endAngle);
    const step = sweep / Math.max(1, segments);
    for (let index = 0; index <= segments; index++) {
        points.push(getEllipsePointForBounds(location, size, startAngle + step * index));
    }
    return points;
};