import { Matrix2D } from '../core/matrix-2d';
import { Point } from '../core/point';

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