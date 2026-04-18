import { Matrix2D } from '../core/matrix-2d';
import { Point } from '../core/point';
import { PointDepth } from '../core/point-depth';
import { InvalidIndexException } from './invalid-index-exception';

export type PathCommandIterationState = {
    current: Point;
    subpathStart: Point;
    lastCubicControl?: Point;
    lastQuadraticControl?: Point;
    previousCommand: string;
};

export type ResolvedPathCommand =
    | { type: 'm'; start: Point; end: Point; point: Point; raw: string }
    | { type: 'l'; start: Point; end: Point; point: Point; raw: string }
    | { type: 'H'; start: Point; end: Point; x: number; raw: string }
    | { type: 'V'; start: Point; end: Point; y: number; raw: string }
    | { type: 'c'; start: Point; end: Point; cp1: Point; cp2: Point; raw: string }
    | { type: 'S'; start: Point; end: Point; cp1: Point; cp2: Point; raw: string }
    | { type: 'Q'; start: Point; end: Point; controlPoint: Point; raw: string }
    | { type: 'T'; start: Point; end: Point; controlPoint: Point; raw: string }
    | {
        type: 'A';
        start: Point;
        end: Point;
        radiusX: number;
        radiusY: number;
        xAxisRotation: number;
        largeArc: boolean;
        sweep: boolean;
        raw: string;
    }
    | { type: 'z'; start: Point; end: Point; raw: string };

const PATH_COMMAND_TOKEN_REGEX = /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;

const isCommandToken = (value: string): boolean => /^[AaCcHhLlMmQqSsTtVvZz]$/.test(value);

const parseCommandNumbers = (command: string): number[] => {
    const payload = command.substring(1);
    if (payload.length === 0) {
        return [];
    }
    return payload.split(',').map((part) => parseFloat(part));
};

const reflectControl = (origin: Point, control: Point | undefined): Point => {
    if (!control) {
        return origin;
    }
    return new Point(origin.x * 2 - control.x, origin.y * 2 - control.y);
};

const vectorAngle = (ux: number, uy: number, vx: number, vy: number): number => {
    return Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
};

export const arcToCubics = (
    startPoint: Point,
    radiusX: number,
    radiusY: number,
    xAxisRotation: number,
    largeArc: boolean,
    sweep: boolean,
    endPoint: Point,
): Array<[Point, Point, Point]> => {
    let rx = Math.abs(radiusX);
    let ry = Math.abs(radiusY);
    if ((startPoint.x === endPoint.x && startPoint.y === endPoint.y) || rx === 0 || ry === 0) {
        return [];
    }

    const phi = (xAxisRotation * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const dx = (startPoint.x - endPoint.x) / 2;
    const dy = (startPoint.y - endPoint.y) / 2;
    const x1p = cosPhi * dx + sinPhi * dy;
    const y1p = -sinPhi * dx + cosPhi * dy;
    const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);

    if (lambda > 1) {
        const scale = Math.sqrt(lambda);
        rx *= scale;
        ry *= scale;
    }

    const rx2 = rx * rx;
    const ry2 = ry * ry;
    const x1p2 = x1p * x1p;
    const y1p2 = y1p * y1p;
    const numerator = rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2;
    const denominator = rx2 * y1p2 + ry2 * x1p2;
    const factor = denominator === 0 ? 0 : Math.sqrt(Math.max(0, numerator / denominator));
    const sign = largeArc === sweep ? -1 : 1;
    const cxp = sign * factor * ((rx * y1p) / ry);
    const cyp = sign * factor * ((-ry * x1p) / rx);
    const centerX = cosPhi * cxp - sinPhi * cyp + (startPoint.x + endPoint.x) / 2;
    const centerY = sinPhi * cxp + cosPhi * cyp + (startPoint.y + endPoint.y) / 2;
    const startVectorX = (x1p - cxp) / rx;
    const startVectorY = (y1p - cyp) / ry;
    const endVectorX = (-x1p - cxp) / rx;
    const endVectorY = (-y1p - cyp) / ry;
    let startAngle = vectorAngle(1, 0, startVectorX, startVectorY);
    let sweepAngle = vectorAngle(startVectorX, startVectorY, endVectorX, endVectorY);

    if (!sweep && sweepAngle > 0) {
        sweepAngle -= Math.PI * 2;
    }
    else if (sweep && sweepAngle < 0) {
        sweepAngle += Math.PI * 2;
    }

    const segmentCount = Math.ceil(Math.abs(sweepAngle) / (Math.PI / 2));
    const segmentAngle = sweepAngle / segmentCount;
    const curves: Array<[Point, Point, Point]> = [];

    for (let segment = 0; segment < segmentCount; segment++) {
        const theta1 = startAngle;
        const theta2 = theta1 + segmentAngle;
        const delta = theta2 - theta1;
        const alpha = (4 / 3) * Math.tan(delta / 4);
        const cosTheta1 = Math.cos(theta1);
        const sinTheta1 = Math.sin(theta1);
        const cosTheta2 = Math.cos(theta2);
        const sinTheta2 = Math.sin(theta2);

        const p1 = new Point(
            centerX + rx * cosPhi * cosTheta1 - ry * sinPhi * sinTheta1,
            centerY + rx * sinPhi * cosTheta1 + ry * cosPhi * sinTheta1,
        );
        const p2 = new Point(
            centerX + rx * cosPhi * cosTheta2 - ry * sinPhi * sinTheta2,
            centerY + rx * sinPhi * cosTheta2 + ry * cosPhi * sinTheta2,
        );
        const d1 = new Point(
            -rx * cosPhi * sinTheta1 - ry * sinPhi * cosTheta1,
            -rx * sinPhi * sinTheta1 + ry * cosPhi * cosTheta1,
        );
        const d2 = new Point(
            -rx * cosPhi * sinTheta2 - ry * sinPhi * cosTheta2,
            -rx * sinPhi * sinTheta2 + ry * cosPhi * cosTheta2,
        );
        const cp1 = new Point(p1.x + alpha * d1.x, p1.y + alpha * d1.y);
        const cp2 = new Point(p2.x - alpha * d2.x, p2.y - alpha * d2.y);
        curves.push([cp1, cp2, p2]);
        startAngle = theta2;
    }

    return curves;
};

export const createPathCommandIterationState = (): PathCommandIterationState => ({
    current: Point.Origin,
    subpathStart: Point.Origin,
    previousCommand: '',
});

export const iteratePathCommands = (
    commands: string[] | undefined,
    visitor: (command: ResolvedPathCommand, state: PathCommandIterationState) => void,
): void => {
    if (!commands) {
        return;
    }

    const state = createPathCommandIterationState();
    for (const raw of commands) {
        const type = raw.charAt(0);
        const start = state.current;
        switch (type) {
            case 'm': {
                const point = Point.parse(raw.substring(1));
                visitor({ type: 'm', start, end: point, point, raw }, state);
                state.current = point;
                state.subpathStart = point;
                state.lastCubicControl = undefined;
                state.lastQuadraticControl = undefined;
                break;
            }
            case 'l': {
                const point = Point.parse(raw.substring(1));
                visitor({ type: 'l', start, end: point, point, raw }, state);
                state.current = point;
                state.lastCubicControl = undefined;
                state.lastQuadraticControl = undefined;
                break;
            }
            case 'H': {
                const [x] = parseCommandNumbers(raw);
                const end = new Point(x, state.current.y);
                visitor({ type: 'H', start, end, x, raw }, state);
                state.current = end;
                state.lastCubicControl = undefined;
                state.lastQuadraticControl = undefined;
                break;
            }
            case 'V': {
                const [y] = parseCommandNumbers(raw);
                const end = new Point(state.current.x, y);
                visitor({ type: 'V', start, end, y, raw }, state);
                state.current = end;
                state.lastCubicControl = undefined;
                state.lastQuadraticControl = undefined;
                break;
            }
            case 'c': {
                const parts = parseCommandNumbers(raw);
                const cp1 = new Point(parts[0], parts[1]);
                const cp2 = new Point(parts[2], parts[3]);
                const end = new Point(parts[4], parts[5]);
                visitor({ type: 'c', start, end, cp1, cp2, raw }, state);
                state.current = end;
                state.lastCubicControl = cp2;
                state.lastQuadraticControl = undefined;
                break;
            }
            case 'S': {
                const parts = parseCommandNumbers(raw);
                const cp1 = /[cS]/.test(state.previousCommand) ? reflectControl(state.current, state.lastCubicControl) : state.current;
                const cp2 = new Point(parts[0], parts[1]);
                const end = new Point(parts[2], parts[3]);
                visitor({ type: 'S', start, end, cp1, cp2, raw }, state);
                state.current = end;
                state.lastCubicControl = cp2;
                state.lastQuadraticControl = undefined;
                break;
            }
            case 'Q': {
                const parts = parseCommandNumbers(raw);
                const controlPoint = new Point(parts[0], parts[1]);
                const end = new Point(parts[2], parts[3]);
                visitor({ type: 'Q', start, end, controlPoint, raw }, state);
                state.current = end;
                state.lastQuadraticControl = controlPoint;
                state.lastCubicControl = undefined;
                break;
            }
            case 'T': {
                const parts = parseCommandNumbers(raw);
                const controlPoint = /[QT]/.test(state.previousCommand)
                    ? reflectControl(state.current, state.lastQuadraticControl)
                    : state.current;
                const end = new Point(parts[0], parts[1]);
                visitor({ type: 'T', start, end, controlPoint, raw }, state);
                state.current = end;
                state.lastQuadraticControl = controlPoint;
                state.lastCubicControl = undefined;
                break;
            }
            case 'A': {
                const parts = parseCommandNumbers(raw);
                const end = new Point(parts[5], parts[6]);
                visitor({
                    type: 'A',
                    start,
                    end,
                    radiusX: parts[0],
                    radiusY: parts[1],
                    xAxisRotation: parts[2],
                    largeArc: parts[3] !== 0,
                    sweep: parts[4] !== 0,
                    raw,
                }, state);
                state.current = end;
                state.lastQuadraticControl = undefined;
                state.lastCubicControl = undefined;
                break;
            }
            case 'z': {
                visitor({ type: 'z', start, end: state.subpathStart, raw }, state);
                state.current = state.subpathStart;
                state.lastQuadraticControl = undefined;
                state.lastCubicControl = undefined;
                break;
            }
            default:
                throw new Error('Path string is invalid.');
        }

        state.previousCommand = type;
    }
};

export const normalizePathCommands = (commands: string[] | undefined): string[] => {
    const normalized: string[] = [];
    iteratePathCommands(commands, (command) => {
        switch (command.type) {
            case 'm':
                normalized.push('m' + command.point.toString());
                break;
            case 'l':
                normalized.push('l' + command.point.toString());
                break;
            case 'H':
            case 'V':
                normalized.push('l' + command.end.toString());
                break;
            case 'c':
                normalized.push('c' + command.cp1.toString() + ',' + command.cp2.toString() + ',' + command.end.toString());
                break;
            case 'S':
                normalized.push('c' + command.cp1.toString() + ',' + command.cp2.toString() + ',' + command.end.toString());
                break;
            case 'Q':
                normalized.push('Q' + command.controlPoint.toString() + ',' + command.end.toString());
                break;
            case 'T':
                normalized.push('Q' + command.controlPoint.toString() + ',' + command.end.toString());
                break;
            case 'A': {
                const segments = arcToCubics(
                    command.start,
                    command.radiusX,
                    command.radiusY,
                    command.xAxisRotation,
                    command.largeArc,
                    command.sweep,
                    command.end,
                );
                if (segments.length === 0) {
                    normalized.push('l' + command.end.toString());
                }
                else {
                    for (const [cp1, cp2, end] of segments) {
                        normalized.push('c' + cp1.toString() + ',' + cp2.toString() + ',' + end.toString());
                    }
                }
                break;
            }
            case 'z':
                normalized.push('z');
                break;
        }
    });
    return normalized;
};

export const tracePathCommands = (context: CanvasRenderingContext2D, commands: string[] | undefined): void => {
    iteratePathCommands(commands, (command) => {
        switch (command.type) {
            case 'm':
                context.moveTo(command.point.x, command.point.y);
                break;
            case 'l':
                context.lineTo(command.point.x, command.point.y);
                break;
            case 'H':
            case 'V':
                context.lineTo(command.end.x, command.end.y);
                break;
            case 'c':
            case 'S':
                context.bezierCurveTo(command.cp1.x, command.cp1.y, command.cp2.x, command.cp2.y, command.end.x, command.end.y);
                break;
            case 'Q':
            case 'T':
                context.quadraticCurveTo(command.controlPoint.x, command.controlPoint.y, command.end.x, command.end.y);
                break;
            case 'A': {
                const segments = arcToCubics(
                    command.start,
                    command.radiusX,
                    command.radiusY,
                    command.xAxisRotation,
                    command.largeArc,
                    command.sweep,
                    command.end,
                );
                if (segments.length === 0) {
                    context.lineTo(command.end.x, command.end.y);
                }
                else {
                    for (const [cp1, cp2, end] of segments) {
                        context.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
                    }
                }
                break;
            }
            case 'z':
                context.closePath();
                break;
        }
    });
};

export const translatePathCommands = (commands: string[] | undefined, offsetX: number, offsetY: number): string[] => {
    if (!commands) {
        return [];
    }

    return commands.map((command) => {
        const type = command.charAt(0);
        if (type === 'm' || type === 'l') {
            return type + Point.translate(Point.parse(command.substring(1)), offsetX, offsetY).toString();
        }
        if (type === 'H') {
            const [x] = parseCommandNumbers(command);
            return 'H' + (x + offsetX);
        }
        if (type === 'V') {
            const [y] = parseCommandNumbers(command);
            return 'V' + (y + offsetY);
        }
        if (type === 'c') {
            const parts = parseCommandNumbers(command);
            const cp1 = Point.translate(new Point(parts[0], parts[1]), offsetX, offsetY);
            const cp2 = Point.translate(new Point(parts[2], parts[3]), offsetX, offsetY);
            const end = Point.translate(new Point(parts[4], parts[5]), offsetX, offsetY);
            return 'c' + cp1.toString() + ',' + cp2.toString() + ',' + end.toString();
        }
        if (type === 'S') {
            const parts = parseCommandNumbers(command);
            const cp2 = Point.translate(new Point(parts[0], parts[1]), offsetX, offsetY);
            const end = Point.translate(new Point(parts[2], parts[3]), offsetX, offsetY);
            return 'S' + cp2.toString() + ',' + end.toString();
        }
        if (type === 'Q') {
            const parts = parseCommandNumbers(command);
            const controlPoint = Point.translate(new Point(parts[0], parts[1]), offsetX, offsetY);
            const end = Point.translate(new Point(parts[2], parts[3]), offsetX, offsetY);
            return 'Q' + controlPoint.toString() + ',' + end.toString();
        }
        if (type === 'T') {
            const parts = parseCommandNumbers(command);
            return 'T' + Point.translate(new Point(parts[0], parts[1]), offsetX, offsetY).toString();
        }
        if (type === 'A') {
            const parts = parseCommandNumbers(command);
            const end = Point.translate(new Point(parts[5], parts[6]), offsetX, offsetY);
            return 'A' + [parts[0], parts[1], parts[2], parts[3], parts[4], end.x, end.y].join(',');
        }
        return command;
    });
};

const scaleNumber = (value: number, scale: number, origin: number): number => {
    return (value - origin) * scale + origin;
};

export const scalePathCommands = (
    commands: string[] | undefined,
    scaleX: number,
    scaleY: number,
    originX: number,
    originY: number,
): string[] => {
    if (!commands) {
        return [];
    }

    const scaled: string[] = [];
    iteratePathCommands(commands, (command) => {
        switch (command.type) {
            case 'm': {
                const point = Point.scale(command.point, scaleX, scaleY, originX, originY);
                scaled.push('m' + point.toString());
                break;
            }
            case 'l': {
                const point = Point.scale(command.point, scaleX, scaleY, originX, originY);
                scaled.push('l' + point.toString());
                break;
            }
            case 'H':
                scaled.push('H' + scaleNumber(command.x, scaleX, originX));
                break;
            case 'V':
                scaled.push('V' + scaleNumber(command.y, scaleY, originY));
                break;
            case 'c': {
                const cp1 = Point.scale(command.cp1, scaleX, scaleY, originX, originY);
                const cp2 = Point.scale(command.cp2, scaleX, scaleY, originX, originY);
                const end = Point.scale(command.end, scaleX, scaleY, originX, originY);
                scaled.push('c' + cp1.toString() + ',' + cp2.toString() + ',' + end.toString());
                break;
            }
            case 'S': {
                const cp2 = Point.scale(command.cp2, scaleX, scaleY, originX, originY);
                const end = Point.scale(command.end, scaleX, scaleY, originX, originY);
                scaled.push('S' + cp2.toString() + ',' + end.toString());
                break;
            }
            case 'Q': {
                const controlPoint = Point.scale(command.controlPoint, scaleX, scaleY, originX, originY);
                const end = Point.scale(command.end, scaleX, scaleY, originX, originY);
                scaled.push('Q' + controlPoint.toString() + ',' + end.toString());
                break;
            }
            case 'T': {
                const end = Point.scale(command.end, scaleX, scaleY, originX, originY);
                scaled.push('T' + end.toString());
                break;
            }
            case 'A': {
                const end = Point.scale(command.end, scaleX, scaleY, originX, originY);
                if (scaleX > 0 && scaleY > 0 && Math.abs(Math.abs(scaleX) - Math.abs(scaleY)) < 0.000001) {
                    const uniformScale = Math.abs(scaleX);
                    scaled.push(
                        'A' +
                            [
                                command.radiusX * uniformScale,
                                command.radiusY * uniformScale,
                                command.xAxisRotation,
                                command.largeArc ? 1 : 0,
                                command.sweep ? 1 : 0,
                                end.x,
                                end.y,
                            ].join(',')
                    );
                }
                else {
                    const segments = arcToCubics(
                        command.start,
                        command.radiusX,
                        command.radiusY,
                        command.xAxisRotation,
                        command.largeArc,
                        command.sweep,
                        command.end,
                    );
                    if (segments.length === 0) {
                        scaled.push('l' + end.toString());
                    }
                    else {
                        for (const [cp1, cp2, segmentEnd] of segments) {
                            const scaledCp1 = Point.scale(cp1, scaleX, scaleY, originX, originY);
                            const scaledCp2 = Point.scale(cp2, scaleX, scaleY, originX, originY);
                            const scaledEnd = Point.scale(segmentEnd, scaleX, scaleY, originX, originY);
                            scaled.push('c' + scaledCp1.toString() + ',' + scaledCp2.toString() + ',' + scaledEnd.toString());
                        }
                    }
                }
                break;
            }
            case 'z':
                scaled.push('z');
                break;
        }
    });

    return scaled;
};

export const transformPathCommands = (commands: string[] | undefined, matrix: Matrix2D): string[] => {
    const normalized = normalizePathCommands(commands);
    return normalized.map((command) => {
        const type = command.charAt(0);
        if (type === 'm' || type === 'l') {
            const point = matrix.transformPoint(Point.parse(command.substring(1)));
            return type + point.toString();
        }
        if (type === 'c') {
            const parts = parseCommandNumbers(command);
            const c1 = matrix.transformPoint(new Point(parts[0], parts[1]));
            const c2 = matrix.transformPoint(new Point(parts[2], parts[3]));
            const end = matrix.transformPoint(new Point(parts[4], parts[5]));
            return 'c' + [c1.x, c1.y, c2.x, c2.y, end.x, end.y].join(',');
        }
        if (type === 'Q') {
            const parts = parseCommandNumbers(command);
            const controlPoint = matrix.transformPoint(new Point(parts[0], parts[1]));
            const end = matrix.transformPoint(new Point(parts[2], parts[3]));
            return 'Q' + controlPoint.toString() + ',' + end.toString();
        }
        return command;
    });
};

export const parsePathCommandString = (commandString: string, legacyLowercaseAbsolute: boolean): string[] => {
    const trimmed = commandString.trim();
    if (trimmed.length === 0) {
        return [];
    }

    const tokens = trimmed.match(PATH_COMMAND_TOKEN_REGEX);
    if (!tokens || tokens.length === 0) {
        throw new Error('Path string is invalid.');
    }

    const commands: string[] = [];
    let index = 0;
    let command = '';
    let current = Point.Origin;
    let subpathStart = Point.Origin;
    let lastCubicControl: Point | undefined;
    let lastQuadraticControl: Point | undefined;
    let previousCommand = '';

    const hasNextNumber = (): boolean => index < tokens.length && !isCommandToken(tokens[index]);
    const readNumber = (): number => {
        if (index >= tokens.length) {
            throw new Error('Path string is invalid.');
        }
        const token = tokens[index++];
        if (isCommandToken(token)) {
            throw new Error('Path string is invalid.');
        }
        const value = parseFloat(token);
        if (isNaN(value)) {
            throw new Error('Path string is invalid.');
        }
        return value;
    };
    const readPoint = (relative: boolean): Point => {
        const x = readNumber();
        const y = readNumber();
        if (relative) {
            return new Point(current.x + x, current.y + y);
        }
        return new Point(x, y);
    };
    const pushMove = (point: Point): void => {
        commands.push('m' + point.toString());
        current = point;
        subpathStart = point;
        lastCubicControl = undefined;
        lastQuadraticControl = undefined;
    };
    const pushLine = (point: Point): void => {
        commands.push('l' + point.toString());
        current = point;
        lastCubicControl = undefined;
        lastQuadraticControl = undefined;
    };
    const pushHorizontal = (x: number): void => {
        commands.push('H' + x);
        current = new Point(x, current.y);
        lastCubicControl = undefined;
        lastQuadraticControl = undefined;
    };
    const pushVertical = (y: number): void => {
        commands.push('V' + y);
        current = new Point(current.x, y);
        lastCubicControl = undefined;
        lastQuadraticControl = undefined;
    };
    const pushCubic = (cp1: Point, cp2: Point, endPoint: Point): void => {
        commands.push('c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString());
        current = endPoint;
        lastCubicControl = cp2;
        lastQuadraticControl = undefined;
    };
    const pushSmoothCubic = (cp1: Point, cp2: Point, endPoint: Point): void => {
        commands.push('S' + cp2.toString() + ',' + endPoint.toString());
        current = endPoint;
        lastCubicControl = cp2;
        lastQuadraticControl = undefined;
    };
    const pushQuadratic = (controlPoint: Point, endPoint: Point): void => {
        commands.push('Q' + controlPoint.toString() + ',' + endPoint.toString());
        current = endPoint;
        lastQuadraticControl = controlPoint;
        lastCubicControl = undefined;
    };
    const pushSmoothQuadratic = (controlPoint: Point, endPoint: Point): void => {
        commands.push('T' + endPoint.toString());
        current = endPoint;
        lastQuadraticControl = controlPoint;
        lastCubicControl = undefined;
    };
    const pushArc = (
        radiusX: number,
        radiusY: number,
        xAxisRotation: number,
        largeArc: boolean,
        sweep: boolean,
        endPoint: Point,
    ): void => {
        commands.push('A' + [radiusX, radiusY, xAxisRotation, largeArc ? 1 : 0, sweep ? 1 : 0, endPoint.x, endPoint.y].join(','));
        current = endPoint;
        lastCubicControl = undefined;
        lastQuadraticControl = undefined;
    };

    while (index < tokens.length) {
        if (isCommandToken(tokens[index])) {
            command = tokens[index++];
        }
        else if (!command) {
            throw new Error('Path string is invalid.');
        }

        switch (command) {
            case 'M':
            case 'm': {
                const relative = command === 'm' && !legacyLowercaseAbsolute;
                let isFirstMove = true;
                while (hasNextNumber()) {
                    const point = readPoint(relative);
                    if (isFirstMove) {
                        pushMove(point);
                        isFirstMove = false;
                    }
                    else {
                        pushLine(point);
                    }
                }
                break;
            }
            case 'L':
            case 'l': {
                const relative = command === 'l' && !legacyLowercaseAbsolute;
                while (hasNextNumber()) {
                    pushLine(readPoint(relative));
                }
                break;
            }
            case 'H':
            case 'h': {
                const relative = command === 'h';
                while (hasNextNumber()) {
                    const x = readNumber();
                    pushHorizontal(relative ? current.x + x : x);
                }
                break;
            }
            case 'V':
            case 'v': {
                const relative = command === 'v';
                while (hasNextNumber()) {
                    const y = readNumber();
                    pushVertical(relative ? current.y + y : y);
                }
                break;
            }
            case 'C':
            case 'c': {
                const relative = command === 'c' && !legacyLowercaseAbsolute;
                while (hasNextNumber()) {
                    const cp1 = readPoint(relative);
                    const cp2 = readPoint(relative);
                    const endPoint = readPoint(relative);
                    pushCubic(cp1, cp2, endPoint);
                }
                break;
            }
            case 'S':
            case 's': {
                const relative = command === 's' && !legacyLowercaseAbsolute;
                while (hasNextNumber()) {
                    const reflected = /[CcSs]/.test(previousCommand) ? reflectControl(current, lastCubicControl) : current;
                    const cp2 = readPoint(relative);
                    const endPoint = readPoint(relative);
                    pushSmoothCubic(reflected, cp2, endPoint);
                }
                break;
            }
            case 'Q':
            case 'q': {
                const relative = command === 'q' && !legacyLowercaseAbsolute;
                while (hasNextNumber()) {
                    const controlPoint = readPoint(relative);
                    const endPoint = readPoint(relative);
                    pushQuadratic(controlPoint, endPoint);
                }
                break;
            }
            case 'T':
            case 't': {
                const relative = command === 't' && !legacyLowercaseAbsolute;
                while (hasNextNumber()) {
                    const controlPoint = /[QqTt]/.test(previousCommand) ? reflectControl(current, lastQuadraticControl) : current;
                    const endPoint = readPoint(relative);
                    pushSmoothQuadratic(controlPoint, endPoint);
                }
                break;
            }
            case 'A':
            case 'a': {
                const relative = command === 'a';
                while (hasNextNumber()) {
                    const radiusX = readNumber();
                    const radiusY = readNumber();
                    const rotation = readNumber();
                    const largeArc = readNumber() !== 0;
                    const sweep = readNumber() !== 0;
                    const endPoint = readPoint(relative);
                    if (radiusX === 0 || radiusY === 0) {
                        pushLine(endPoint);
                    }
                    else {
                        pushArc(radiusX, radiusY, rotation, largeArc, sweep, endPoint);
                    }
                }
                break;
            }
            case 'Z':
            case 'z': {
                commands.push('z');
                current = subpathStart;
                lastCubicControl = undefined;
                lastQuadraticControl = undefined;
                break;
            }
            default:
                throw new Error('Path string is invalid.');
        }

        previousCommand = command;
    }

    return commands;
};

// ---------------------------------------------------------------------------
// Arc edit geometry helpers (promoted from PathElement private statics)
// ---------------------------------------------------------------------------

export type ArcEditGeometry = {
    center: Point;
    radiusX: number;
    radiusY: number;
    xAxisUnit: Point;
    yAxisUnit: Point;
};

export type PathCommandInsertionTarget = {
    commandIndex: number;
    ratio: number;
    insertedPointIndex: number;
};

type PathPointRole = 'move' | 'end' | 'control1' | 'control2' | 'arcRadiusX' | 'arcRadiusY';

type PathPointReference = {
    commandIndex: number;
    command: ResolvedPathCommand;
    role: PathPointRole;
};

type SegmentProjection = {
    distance: number;
    ratio: number;
    point: Point;
};

const lerpPoint = (start: Point, end: Point, t: number): Point => {
    return new Point(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t);
};

const clampRatio = (value: number): number => {
    if (value <= 0) {
        return 0;
    }
    if (value >= 1) {
        return 1;
    }
    return value;
};

const clampInsertionRatio = (value: number): number => {
    return Math.min(0.999, Math.max(0.001, value));
};

const distanceBetweenPoints = (start: Point, end: Point): number => {
    return Math.hypot(end.x - start.x, end.y - start.y);
};

const projectPointToSegment = (point: Point, start: Point, end: Point): SegmentProjection => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) {
        return {
            distance: distanceBetweenPoints(point, start),
            ratio: 0,
            point: start,
        };
    }

    const ratio = clampRatio(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy));
    const projectedPoint = lerpPoint(start, end, ratio);
    return {
        distance: distanceBetweenPoints(point, projectedPoint),
        ratio,
        point: projectedPoint,
    };
};

const quadraticPointAt = (start: Point, control: Point, end: Point, t: number): Point => {
    const p01 = lerpPoint(start, control, t);
    const p12 = lerpPoint(control, end, t);
    return lerpPoint(p01, p12, t);
};

const cubicPointAt = (start: Point, cp1: Point, cp2: Point, end: Point, t: number): Point => {
    const p01 = lerpPoint(start, cp1, t);
    const p12 = lerpPoint(cp1, cp2, t);
    const p23 = lerpPoint(cp2, end, t);
    const p012 = lerpPoint(p01, p12, t);
    const p123 = lerpPoint(p12, p23, t);
    return lerpPoint(p012, p123, t);
};

const approximateCurveProjection = (
    point: Point,
    sample: (t: number) => Point,
    sampleCount: number,
): SegmentProjection => {
    let bestProjection: SegmentProjection | undefined;
    let previousPoint = sample(0);
    let previousRatio = 0;
    for (let step = 1; step <= sampleCount; step++) {
        const currentRatio = step / sampleCount;
        const currentPoint = sample(currentRatio);
        const projection = projectPointToSegment(point, previousPoint, currentPoint);
        const ratio = previousRatio + (currentRatio - previousRatio) * projection.ratio;
        const candidate: SegmentProjection = {
            distance: projection.distance,
            ratio,
            point: sample(ratio),
        };
        if (!bestProjection || candidate.distance < bestProjection.distance) {
            bestProjection = candidate;
        }
        previousPoint = currentPoint;
        previousRatio = currentRatio;
    }

    return bestProjection ?? {
        distance: Number.POSITIVE_INFINITY,
        ratio: 0,
        point,
    };
};

const buildResolvedPathCommands = (commands: string[]): Array<{ commandIndex: number; command: ResolvedPathCommand }> => {
    const resolved: Array<{ commandIndex: number; command: ResolvedPathCommand }> = [];
    let commandIndex = -1;
    iteratePathCommands(commands, (command) => {
        commandIndex++;
        resolved.push({ commandIndex, command });
    });
    return resolved;
};

const countPathAnchorPoints = (commands: string[]): number => {
    let count = 0;
    iteratePathCommands(commands, (command) => {
        if (command.type !== 'z') {
            count++;
        }
    });
    return count;
};

const findPathPointReference = (commands: string[], index: number, depth: PointDepth = PointDepth.Full): PathPointReference | undefined => {
    let current = -1;
    let foundReference: PathPointReference | undefined;
    let commandIndex = -1;
    iteratePathCommands(commands, (command) => {
        if (foundReference) {
            return;
        }

        commandIndex++;
        if (command.type === 'm') {
            current++;
            if (current === index) {
                foundReference = { commandIndex, command, role: 'move' };
            }
            return;
        }

        if (command.type === 'l' || command.type === 'H' || command.type === 'V' || command.type === 'T') {
            current++;
            if (current === index) {
                foundReference = { commandIndex, command, role: 'end' };
            }
            return;
        }

        if (command.type === 'A') {
            current++;
            if (current === index) {
                foundReference = { commandIndex, command, role: 'end' };
                return;
            }
            if (depth === PointDepth.Full) {
                current++;
                if (current === index) {
                    foundReference = { commandIndex, command, role: 'arcRadiusX' };
                    return;
                }
                current++;
                if (current === index) {
                    foundReference = { commandIndex, command, role: 'arcRadiusY' };
                }
            }
            return;
        }

        if (command.type === 'c') {
            current++;
            if (current === index) {
                foundReference = { commandIndex, command, role: 'end' };
                return;
            }
            if (depth === PointDepth.Full) {
                current++;
                if (current === index) {
                    foundReference = { commandIndex, command, role: 'control1' };
                    return;
                }
                current++;
                if (current === index) {
                    foundReference = { commandIndex, command, role: 'control2' };
                }
            }
            return;
        }

        if (command.type === 'Q' || command.type === 'S') {
            current++;
            if (current === index) {
                foundReference = { commandIndex, command, role: 'end' };
                return;
            }
            if (depth === PointDepth.Full) {
                current++;
                if (current === index) {
                    foundReference = { commandIndex, command, role: 'control1' };
                }
            }
        }
    });
    return foundReference;
};

export const resolveArcEditGeometry = (
    startPoint: Point,
    radiusX: number,
    radiusY: number,
    xAxisRotation: number,
    largeArc: boolean,
    sweep: boolean,
    endPoint: Point,
): ArcEditGeometry => {
    const absoluteRadiusX = Math.max(1, Math.abs(radiusX) || 1);
    const absoluteRadiusY = Math.max(1, Math.abs(radiusY) || 1);
    const phi = (xAxisRotation * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const xAxisUnit = new Point(cosPhi, sinPhi);
    const yAxisUnit = new Point(-sinPhi, cosPhi);

    if (startPoint.x === endPoint.x && startPoint.y === endPoint.y) {
        return {
            center: new Point(startPoint.x, startPoint.y),
            radiusX: absoluteRadiusX,
            radiusY: absoluteRadiusY,
            xAxisUnit,
            yAxisUnit,
        };
    }

    let adjustedRadiusX = absoluteRadiusX;
    let adjustedRadiusY = absoluteRadiusY;
    const dx = (startPoint.x - endPoint.x) / 2;
    const dy = (startPoint.y - endPoint.y) / 2;
    const x1p = cosPhi * dx + sinPhi * dy;
    const y1p = -sinPhi * dx + cosPhi * dy;
    const lambda = (x1p * x1p) / (adjustedRadiusX * adjustedRadiusX) + (y1p * y1p) / (adjustedRadiusY * adjustedRadiusY);

    if (lambda > 1) {
        const scale = Math.sqrt(lambda);
        adjustedRadiusX *= scale;
        adjustedRadiusY *= scale;
    }

    const radiusXSquared = adjustedRadiusX * adjustedRadiusX;
    const radiusYSquared = adjustedRadiusY * adjustedRadiusY;
    const x1pSquared = x1p * x1p;
    const y1pSquared = y1p * y1p;
    const numerator = radiusXSquared * radiusYSquared - radiusXSquared * y1pSquared - radiusYSquared * x1pSquared;
    const denominator = radiusXSquared * y1pSquared + radiusYSquared * x1pSquared;

    if (denominator === 0) {
        return {
            center: new Point((startPoint.x + endPoint.x) / 2, (startPoint.y + endPoint.y) / 2),
            radiusX: adjustedRadiusX,
            radiusY: adjustedRadiusY,
            xAxisUnit,
            yAxisUnit,
        };
    }

    const factor = Math.sqrt(Math.max(0, numerator / denominator));
    const sign = largeArc === sweep ? -1 : 1;
    const cxp = sign * factor * ((adjustedRadiusX * y1p) / adjustedRadiusY);
    const cyp = sign * factor * ((-adjustedRadiusY * x1p) / adjustedRadiusX);
    const center = new Point(
        cosPhi * cxp - sinPhi * cyp + (startPoint.x + endPoint.x) / 2,
        sinPhi * cxp + cosPhi * cyp + (startPoint.y + endPoint.y) / 2,
    );

    return {
        center,
        radiusX: adjustedRadiusX,
        radiusY: adjustedRadiusY,
        xAxisUnit,
        yAxisUnit,
    };
};

export const getArcAxisHandlePoint = (geometry: ArcEditGeometry, axis: 'x' | 'y'): Point => {
    if (axis === 'x') {
        return new Point(
            geometry.center.x + geometry.xAxisUnit.x * geometry.radiusX,
            geometry.center.y + geometry.xAxisUnit.y * geometry.radiusX,
        );
    }

    return new Point(
        geometry.center.x + geometry.yAxisUnit.x * geometry.radiusY,
        geometry.center.y + geometry.yAxisUnit.y * geometry.radiusY,
    );
};

export const resolveArcHandleRadius = (center: Point, axisUnit: Point, value: Point): number => {
    const projection = (value.x - center.x) * axisUnit.x + (value.y - center.y) * axisUnit.y;
    return Math.max(1, Math.abs(projection));
};

// ---------------------------------------------------------------------------
// Shared path-command point utilities
// ---------------------------------------------------------------------------

export const getPathCommandPointCount = (commands: string[]): number => {
    let count = 0;
    iteratePathCommands(commands, (command) => {
        if (command.type === 'm' || command.type === 'l' || command.type === 'H' || command.type === 'V' || command.type === 'T' || command.type === 'A') {
            count++;
        }
        else if (command.type === 'c' || command.type === 'Q' || command.type === 'S') {
            count += 2;
            if (command.type === 'c') {
                count++;
            }
        }
    });
    return count;
};

export const getPathCommandPointAt = (commands: string[], index: number, depth?: PointDepth): Point => {
    let current = -1;
    let foundPoint: Point | undefined;
    iteratePathCommands(commands, (command) => {
        if (foundPoint) {
            return;
        }
        if (command.type === 'm' || command.type === 'l' || command.type === 'H' || command.type === 'V' || command.type === 'T' || command.type === 'A') {
            current++;
            if (current === index) {
                foundPoint = command.end;
            }
            if (command.type === 'A' && depth === PointDepth.Full) {
                const geometry = resolveArcEditGeometry(
                    command.start,
                    command.radiusX,
                    command.radiusY,
                    command.xAxisRotation,
                    command.largeArc,
                    command.sweep,
                    command.end,
                );
                current++;
                if (current === index) {
                    foundPoint = getArcAxisHandlePoint(geometry, 'x');
                }
                current++;
                if (current === index) {
                    foundPoint = getArcAxisHandlePoint(geometry, 'y');
                }
            }
            return;
        }
        if (command.type === 'c') {
            current++;
            if (current === index) {
                foundPoint = command.end;
            }
            if (depth === PointDepth.Full) {
                current++;
                if (current === index) {
                    foundPoint = command.cp1;
                }
                current++;
                if (current === index) {
                    foundPoint = command.cp2;
                }
            }
            return;
        }
        if (command.type === 'Q' || command.type === 'S') {
            current++;
            if (current === index) {
                foundPoint = command.end;
            }
            if (depth === PointDepth.Full) {
                current++;
                if (current === index) {
                    foundPoint = command.type === 'Q' ? command.controlPoint : command.cp2;
                }
            }
        }
    });
    if (foundPoint) {
        return foundPoint;
    }
    throw new InvalidIndexException(index);
};

export const setPathCommandPointAt = (commands: string[], index: number, value: Point, depth: PointDepth): void => {
    let current = -1;
    let currentPoint = Point.Origin;
    const cl = commands.length;
    for (let i = 0; i < cl; i++) {
        const command = commands[i];
        if (command.charAt(0) === 'm') {
            current++;
            if (current === index) {
                commands[i] = 'm' + value.toString();
                return;
            }
            currentPoint = Point.parse(command.substring(1, command.length));
        }
        else if (command.charAt(0) === 'l') {
            current++;
            if (current === index) {
                commands[i] = 'l' + value.toString();
                return;
            }
            currentPoint = Point.parse(command.substring(1, command.length));
        }
        else if (command.charAt(0) === 'H') {
            current++;
            if (current === index) {
                commands[i] = value.y === currentPoint.y ? 'H' + value.x : 'l' + value.toString();
                return;
            }
            currentPoint = new Point(parseFloat(command.substring(1, command.length)), currentPoint.y);
        }
        else if (command.charAt(0) === 'V') {
            current++;
            if (current === index) {
                commands[i] = value.x === currentPoint.x ? 'V' + value.y : 'l' + value.toString();
                return;
            }
            currentPoint = new Point(currentPoint.x, parseFloat(command.substring(1, command.length)));
        }
        else if (command.charAt(0) === 'c') {
            const parts = command.substring(1, command.length).split(',');
            let cp1 = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
            let cp2 = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
            let endPoint = new Point(parseFloat(parts[4]), parseFloat(parts[5]));
            current++;
            if (current === index) {
                endPoint = value;
                commands[i] = 'c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString();
                return;
            }
            if (depth === PointDepth.Full) {
                current++;
                if (current === index) {
                    cp1 = value;
                    commands[i] = 'c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString();
                    return;
                }
                current++;
                if (current === index) {
                    cp2 = value;
                    commands[i] = 'c' + cp1.toString() + ',' + cp2.toString() + ',' + endPoint.toString();
                    return;
                }
            }
            currentPoint = endPoint;
        }
        else if (command.charAt(0) === 'S') {
            const parts = command.substring(1, command.length).split(',');
            let cp2 = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
            let endPoint = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
            current++;
            if (current === index) {
                endPoint = value;
                commands[i] = 'S' + cp2.toString() + ',' + endPoint.toString();
                return;
            }
            if (depth === PointDepth.Full) {
                current++;
                if (current === index) {
                    cp2 = value;
                    commands[i] = 'S' + cp2.toString() + ',' + endPoint.toString();
                    return;
                }
            }
            currentPoint = endPoint;
        }
        else if (command.charAt(0) === 'q' || command.charAt(0) === 'Q') {
            const parts = command.substring(1, command.length).split(',');
            let controlPoint = new Point(parseFloat(parts[0]), parseFloat(parts[1]));
            let endPoint = new Point(parseFloat(parts[2]), parseFloat(parts[3]));
            current++;
            if (current === index) {
                endPoint = value;
                commands[i] = 'Q' + controlPoint.toString() + ',' + endPoint.toString();
                return;
            }
            if (depth === PointDepth.Full) {
                current++;
                if (current === index) {
                    controlPoint = value;
                    commands[i] = 'Q' + controlPoint.toString() + ',' + endPoint.toString();
                    return;
                }
            }
            currentPoint = endPoint;
        }
        else if (command.charAt(0) === 'T') {
            const endPoint = Point.parse(command.substring(1, command.length));
            current++;
            if (current === index) {
                commands[i] = 'T' + value.toString();
                return;
            }
            currentPoint = endPoint;
        }
        else if (command.charAt(0) === 'A') {
            const parts = command.substring(1, command.length).split(',');
            let radiusX = parseFloat(parts[0]);
            let radiusY = parseFloat(parts[1]);
            const rotation = parseFloat(parts[2]);
            const largeArc = parts[3] !== '0';
            const sweep = parts[4] !== '0';
            let endPoint = new Point(parseFloat(parts[5]), parseFloat(parts[6]));
            current++;
            if (current === index) {
                commands[i] = 'A' + [radiusX, radiusY, rotation, largeArc ? 1 : 0, sweep ? 1 : 0, value.x, value.y].join(',');
                return;
            }
            if (depth === PointDepth.Full) {
                const geometry = resolveArcEditGeometry(currentPoint, radiusX, radiusY, rotation, largeArc, sweep, endPoint);
                current++;
                if (current === index) {
                    radiusX = resolveArcHandleRadius(geometry.center, geometry.xAxisUnit, value);
                    commands[i] = 'A' + [radiusX, radiusY, rotation, largeArc ? 1 : 0, sweep ? 1 : 0, endPoint.x, endPoint.y].join(',');
                    return;
                }
                current++;
                if (current === index) {
                    radiusY = resolveArcHandleRadius(geometry.center, geometry.yAxisUnit, value);
                    commands[i] = 'A' + [radiusX, radiusY, rotation, largeArc ? 1 : 0, sweep ? 1 : 0, endPoint.x, endPoint.y].join(',');
                    return;
                }
            }
            currentPoint = endPoint;
        }
        else if (command.charAt(0) === 'z') {
            const normalized = normalizePathCommands(commands.slice(0, i + 1));
            const lastMove = normalized
                .slice()
                .reverse()
                .find((entry) => entry.charAt(0) === 'm');
            if (lastMove) {
                currentPoint = Point.parse(lastMove.substring(1));
            }
        }
    }
    throw new InvalidIndexException(index);
};

export const findPathCommandInsertionTarget = (
    commands: string[],
    point: Point,
    tolerance: number,
): PathCommandInsertionTarget | undefined => {
    let bestTarget: (PathCommandInsertionTarget & { distance: number }) | undefined;
    let handleIndex = -1;
    let commandIndex = -1;

    const considerTarget = (projection: SegmentProjection | undefined, insertedPointIndex: number): void => {
        if (!projection || projection.distance > tolerance) {
            return;
        }

        if (!bestTarget || projection.distance < bestTarget.distance) {
            bestTarget = {
                commandIndex,
                ratio: projection.ratio,
                insertedPointIndex,
                distance: projection.distance,
            };
        }
    };

    iteratePathCommands(commands, (command) => {
        commandIndex++;
        switch (command.type) {
            case 'm':
                handleIndex++;
                break;

            case 'l':
            case 'H':
            case 'V':
            case 'T': {
                handleIndex++;
                considerTarget(projectPointToSegment(point, command.start, command.end), handleIndex);
                break;
            }

            case 'Q': {
                handleIndex++;
                considerTarget(
                    approximateCurveProjection(point, (t) => quadraticPointAt(command.start, command.controlPoint, command.end, t), 24),
                    handleIndex,
                );
                handleIndex++;
                break;
            }

            case 'S': {
                handleIndex++;
                considerTarget(
                    approximateCurveProjection(point, (t) => cubicPointAt(command.start, command.cp1, command.cp2, command.end, t), 32),
                    handleIndex,
                );
                handleIndex++;
                break;
            }

            case 'c': {
                handleIndex++;
                considerTarget(
                    approximateCurveProjection(point, (t) => cubicPointAt(command.start, command.cp1, command.cp2, command.end, t), 32),
                    handleIndex,
                );
                handleIndex += 2;
                break;
            }

            case 'A':
                handleIndex += 3;
                break;

            case 'z':
                considerTarget(projectPointToSegment(point, command.start, command.end), handleIndex + 1);
                break;
        }
    });

    if (!bestTarget) {
        return undefined;
    }

    return {
        commandIndex: bestTarget.commandIndex,
        ratio: bestTarget.ratio,
        insertedPointIndex: bestTarget.insertedPointIndex,
    };
};

export const insertPathCommandPoint = (commands: string[], commandIndex: number, ratio: number): Point => {
    const resolvedCommands = buildResolvedPathCommands(commands);
    const resolvedEntry = resolvedCommands.find((entry) => entry.commandIndex === commandIndex);
    if (!resolvedEntry) {
        throw new InvalidIndexException(commandIndex);
    }

    const command = resolvedEntry.command;
    const t = clampInsertionRatio(ratio);

    if (command.type === 'l' || command.type === 'H' || command.type === 'V') {
        const insertedPoint = lerpPoint(command.start, command.end, t);
        commands.splice(commandIndex, 1, 'l' + insertedPoint.toString(), 'l' + command.end.toString());
        return insertedPoint;
    }

    if (command.type === 'z') {
        const insertedPoint = lerpPoint(command.start, command.end, t);
        commands.splice(commandIndex, 1, 'l' + insertedPoint.toString(), 'z');
        return insertedPoint;
    }

    if (command.type === 'Q' || command.type === 'T') {
        const p01 = lerpPoint(command.start, command.controlPoint, t);
        const p12 = lerpPoint(command.controlPoint, command.end, t);
        const insertedPoint = lerpPoint(p01, p12, t);
        commands.splice(
            commandIndex,
            1,
            'Q' + p01.toString() + ',' + insertedPoint.toString(),
            'Q' + p12.toString() + ',' + command.end.toString(),
        );
        return insertedPoint;
    }

    if (command.type === 'c' || command.type === 'S') {
        const p01 = lerpPoint(command.start, command.cp1, t);
        const p12 = lerpPoint(command.cp1, command.cp2, t);
        const p23 = lerpPoint(command.cp2, command.end, t);
        const p012 = lerpPoint(p01, p12, t);
        const p123 = lerpPoint(p12, p23, t);
        const insertedPoint = lerpPoint(p012, p123, t);
        commands.splice(
            commandIndex,
            1,
            'c' + p01.toString() + ',' + p012.toString() + ',' + insertedPoint.toString(),
            'c' + p123.toString() + ',' + p23.toString() + ',' + command.end.toString(),
        );
        return insertedPoint;
    }

    throw new Error('Path segment does not support point insertion.');
};

export const insertPathCommandBezierPoint = (commands: string[], commandIndex: number, ratio: number): Point => {
    const resolvedCommands = buildResolvedPathCommands(commands);
    const resolvedEntry = resolvedCommands.find((entry) => entry.commandIndex === commandIndex);
    if (!resolvedEntry) {
        throw new InvalidIndexException(commandIndex);
    }

    const command = resolvedEntry.command;
    const t = clampInsertionRatio(ratio);

    if (command.type === 'l' || command.type === 'H' || command.type === 'V' || command.type === 'z') {
        const insertedPoint = lerpPoint(command.start, command.end, t);
        const firstControl1 = lerpPoint(command.start, insertedPoint, 1 / 3);
        const firstControl2 = lerpPoint(command.start, insertedPoint, 2 / 3);
        const secondControl1 = lerpPoint(insertedPoint, command.end, 1 / 3);
        const secondControl2 = lerpPoint(insertedPoint, command.end, 2 / 3);
        const replacement = [
            'c' + firstControl1.toString() + ',' + firstControl2.toString() + ',' + insertedPoint.toString(),
            'c' + secondControl1.toString() + ',' + secondControl2.toString() + ',' + command.end.toString(),
        ];

        if (command.type === 'z') {
            replacement.push('z');
        }

        commands.splice(commandIndex, 1, ...replacement);
        return insertedPoint;
    }

    return insertPathCommandPoint(commands, commandIndex, t);
};

export const canRemovePathCommandPoint = (
    commands: string[],
    index: number,
    depth: PointDepth = PointDepth.Full,
): boolean => {
    if (countPathAnchorPoints(commands) <= 2) {
        return false;
    }

    const reference = findPathPointReference(commands, index, depth);
    if (!reference) {
        return false;
    }

    if (reference.role === 'control1' || reference.role === 'control2' || reference.role === 'arcRadiusX' || reference.role === 'arcRadiusY') {
        return false;
    }

    if (reference.role === 'move') {
        const resolvedCommands = buildResolvedPathCommands(commands);
        const nextCommand = resolvedCommands[reference.commandIndex + 1]?.command;
        return !!nextCommand && nextCommand.type !== 'm' && nextCommand.type !== 'z';
    }

    return true;
};

export const removePathCommandPoint = (
    commands: string[],
    index: number,
    depth: PointDepth = PointDepth.Full,
): void => {
    if (!canRemovePathCommandPoint(commands, index, depth)) {
        throw new InvalidIndexException(index);
    }

    const reference = findPathPointReference(commands, index, depth);
    if (!reference) {
        throw new InvalidIndexException(index);
    }

    if (reference.role === 'move') {
        const resolvedCommands = buildResolvedPathCommands(commands);
        const nextCommand = resolvedCommands[reference.commandIndex + 1]?.command;
        if (!nextCommand || nextCommand.type === 'm' || nextCommand.type === 'z') {
            throw new InvalidIndexException(index);
        }
        commands[reference.commandIndex] = 'm' + nextCommand.end.toString();
        commands.splice(reference.commandIndex + 1, 1);
        return;
    }

    commands.splice(reference.commandIndex, 1);
};