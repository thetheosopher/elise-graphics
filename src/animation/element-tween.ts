import type { IController } from '../controller/controller';
import { Color } from '../core/color';
import { Point } from '../core/point';
import { Size } from '../core/size';
import type { ElementBase } from '../elements/element-base';
import { AnimationEasing, type AnimationEasingFunction, type AnimationEasingName } from './animation-easing';

export type TweenColorValue = string | Color;

/**
 * Property targets supported by `ElementBase.animate(...)`.
 */
export interface TweenTargetValues {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    centerX?: number;
    centerY?: number;
    radiusX?: number;
    radiusY?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    fillScale?: number;
    fillOffsetX?: number;
    fillOffsetY?: number;
    rotation?: number;
    opacity?: number;
    typesize?: number;
    startOffset?: number;
    fill?: TweenColorValue;
    stroke?: TweenColorValue;
}

export type TweenPropertyName = keyof TweenTargetValues;

/**
 * Options used to configure tween timing and lifecycle callbacks.
 */
export interface TweenOptions {
    duration?: number;
    delay?: number;
    easing?: AnimationEasingName | string | AnimationEasingFunction;
    onUpdate?: (element: ElementBase, tween: ElementTween) => void;
    onComplete?: (element: ElementBase, tween: ElementTween) => void;
    onCancel?: (element: ElementBase, tween: ElementTween) => void;
}

type NumericProperty = {
    kind: 'number';
    key: TweenPropertyName;
    from: number;
    to: number;
    apply: (value: number) => void;
};

type ColorProperty = {
    kind: 'color';
    key: TweenPropertyName;
    from: Color;
    to: Color;
    apply: (value: string) => void;
};

type ResolvedProperty = NumericProperty | ColorProperty;

interface CenterLike {
    getCenter(): Point | undefined;
    setCenter(point: Point): unknown;
    radiusX?: number;
    radiusY?: number;
}

interface LineLike {
    getP1(): Point | undefined;
    setP1(point: Point): unknown;
    getP2(): Point | undefined;
    setP2(point: Point): unknown;
}

interface TypesizeLike {
    typesize?: number;
}

interface StartOffsetLike {
    startOffset?: number;
    setStartOffset?: (value: number) => unknown;
}

interface OpacityLike {
    opacity: number;
}

interface RadiusLike {
    radiusX?: number;
    radiusY?: number;
}

function isCenterLike(element: ElementBase): element is ElementBase & CenterLike {
    const candidate = element as unknown as CenterLike;
    return typeof candidate.getCenter === 'function' && typeof candidate.setCenter === 'function';
}

function isLineLike(element: ElementBase): element is ElementBase & LineLike {
    const candidate = element as unknown as LineLike;
    return (
        typeof candidate.getP1 === 'function' &&
        typeof candidate.setP1 === 'function' &&
        typeof candidate.getP2 === 'function' &&
        typeof candidate.setP2 === 'function'
    );
}

function resolveController(element: ElementBase): IController | undefined {
    const modelWithController = element.model as { controller?: IController | undefined } | undefined;
    return modelWithController?.controller;
}

function clampOpacity(value: number): number {
    if (value < 0) {
        return 0;
    }
    if (value > 1) {
        return 1;
    }
    return value;
}

function getRequiredBounds(element: ElementBase, key: TweenPropertyName) {
    const bounds = element.getBounds();
    if (!bounds) {
        throw new Error(`Cannot animate ${key} when bounds are undefined.`);
    }
    return bounds;
}

function getRequiredSize(element: ElementBase, key: TweenPropertyName) {
    const size = element.getSize();
    if (!size) {
        throw new Error(`Cannot animate ${key} when size is undefined.`);
    }
    return size;
}

function getRequiredCenter(element: ElementBase, key: TweenPropertyName): Point {
    if (!isCenterLike(element)) {
        throw new Error(`Cannot animate ${key} on element type ${element.type}.`);
    }
    const center = element.getCenter();
    if (!center) {
        throw new Error(`Cannot animate ${key} when center is undefined.`);
    }
    return center;
}

function getRequiredPoint(point: Point | undefined, key: TweenPropertyName): Point {
    if (!point) {
        throw new Error(`Cannot animate ${key} when point data is undefined.`);
    }
    return point;
}

function resolveColorProperty(
    element: ElementBase,
    key: 'fill' | 'stroke',
    target: TweenColorValue
): ColorProperty {
    const current = element[key];
    if (typeof current !== 'string') {
        throw new Error(`Cannot animate ${key} on element type ${element.type} unless the current value is a color string.`);
    }
    return {
        kind: 'color',
        key,
        from: Color.parse(current),
        to: typeof target === 'string' ? Color.parse(target) : Color.parse(target.clone()),
        apply: (value: string) => {
            if (key === 'fill') {
                element.setFill(value);
            } else {
                element.setStroke(value);
            }
        }
    };
}

function resolveNumericProperty(element: ElementBase, key: Exclude<TweenPropertyName, 'fill' | 'stroke'>, target: number): NumericProperty {
    switch (key) {
        case 'x': {
            const bounds = getRequiredBounds(element, key);
            return {
                kind: 'number',
                key,
                from: bounds.x,
                to: target,
                apply: (value: number) => {
                    const currentBounds = getRequiredBounds(element, key);
                    element.translate(value - currentBounds.x, 0);
                }
            };
        }
        case 'y': {
            const bounds = getRequiredBounds(element, key);
            return {
                kind: 'number',
                key,
                from: bounds.y,
                to: target,
                apply: (value: number) => {
                    const currentBounds = getRequiredBounds(element, key);
                    element.translate(0, value - currentBounds.y);
                }
            };
        }
        case 'width': {
            if (isLineLike(element)) {
                const bounds = getRequiredBounds(element, key);
                return {
                    kind: 'number',
                    key,
                    from: bounds.width,
                    to: target,
                    apply: (value: number) => {
                        const currentBounds = getRequiredBounds(element, key);
                        if (currentBounds.width === 0) {
                            throw new Error('Cannot animate width for a line element with zero current width.');
                        }
                        element.scale(value / currentBounds.width, 1);
                    }
                };
            }
            const size = getRequiredSize(element, key);
            return {
                kind: 'number',
                key,
                from: size.width,
                to: target,
                apply: (value: number) => {
                    const currentSize = getRequiredSize(element, key);
                    element.setSize(new Size(value, currentSize.height));
                }
            };
        }
        case 'height': {
            if (isLineLike(element)) {
                const bounds = getRequiredBounds(element, key);
                return {
                    kind: 'number',
                    key,
                    from: bounds.height,
                    to: target,
                    apply: (value: number) => {
                        const currentBounds = getRequiredBounds(element, key);
                        if (currentBounds.height === 0) {
                            throw new Error('Cannot animate height for a line element with zero current height.');
                        }
                        element.scale(1, value / currentBounds.height);
                    }
                };
            }
            const size = getRequiredSize(element, key);
            return {
                kind: 'number',
                key,
                from: size.height,
                to: target,
                apply: (value: number) => {
                    const currentSize = getRequiredSize(element, key);
                    element.setSize(new Size(currentSize.width, value));
                }
            };
        }
        case 'centerX': {
            const center = getRequiredCenter(element, key);
            return {
                kind: 'number',
                key,
                from: center.x,
                to: target,
                apply: (value: number) => {
                    const currentCenter = getRequiredCenter(element, key);
                    (element as unknown as CenterLike).setCenter(new Point(value, currentCenter.y));
                }
            };
        }
        case 'centerY': {
            const center = getRequiredCenter(element, key);
            return {
                kind: 'number',
                key,
                from: center.y,
                to: target,
                apply: (value: number) => {
                    const currentCenter = getRequiredCenter(element, key);
                    (element as unknown as CenterLike).setCenter(new Point(currentCenter.x, value));
                }
            };
        }
        case 'radiusX': {
            const radiusLike = element as unknown as RadiusLike;
            if (radiusLike.radiusX === undefined) {
                throw new Error(`Cannot animate ${key} on element type ${element.type}.`);
            }
            return {
                kind: 'number',
                key,
                from: radiusLike.radiusX,
                to: target,
                apply: (value: number) => {
                    radiusLike.radiusX = value;
                }
            };
        }
        case 'radiusY': {
            const radiusLike = element as unknown as RadiusLike;
            if (radiusLike.radiusY === undefined) {
                throw new Error(`Cannot animate ${key} on element type ${element.type}.`);
            }
            return {
                kind: 'number',
                key,
                from: radiusLike.radiusY,
                to: target,
                apply: (value: number) => {
                    radiusLike.radiusY = value;
                }
            };
        }
        case 'x1': {
            if (!isLineLike(element)) {
                throw new Error(`Cannot animate ${key} on element type ${element.type}.`);
            }
            const p1 = getRequiredPoint(element.getP1(), key);
            return {
                kind: 'number',
                key,
                from: p1.x,
                to: target,
                apply: (value: number) => {
                    const current = getRequiredPoint(element.getP1(), key);
                    element.setP1(new Point(value, current.y));
                }
            };
        }
        case 'y1': {
            if (!isLineLike(element)) {
                throw new Error(`Cannot animate ${key} on element type ${element.type}.`);
            }
            const p1 = getRequiredPoint(element.getP1(), key);
            return {
                kind: 'number',
                key,
                from: p1.y,
                to: target,
                apply: (value: number) => {
                    const current = getRequiredPoint(element.getP1(), key);
                    element.setP1(new Point(current.x, value));
                }
            };
        }
        case 'x2': {
            if (!isLineLike(element)) {
                throw new Error(`Cannot animate ${key} on element type ${element.type}.`);
            }
            const p2 = getRequiredPoint(element.getP2(), key);
            return {
                kind: 'number',
                key,
                from: p2.x,
                to: target,
                apply: (value: number) => {
                    const current = getRequiredPoint(element.getP2(), key);
                    element.setP2(new Point(value, current.y));
                }
            };
        }
        case 'y2': {
            if (!isLineLike(element)) {
                throw new Error(`Cannot animate ${key} on element type ${element.type}.`);
            }
            const p2 = getRequiredPoint(element.getP2(), key);
            return {
                kind: 'number',
                key,
                from: p2.y,
                to: target,
                apply: (value: number) => {
                    const current = getRequiredPoint(element.getP2(), key);
                    element.setP2(new Point(current.x, value));
                }
            };
        }
        case 'fillScale':
            return {
                kind: 'number',
                key,
                from: element.fillScale,
                to: target,
                apply: (value: number) => {
                    element.fillScale = value;
                }
            };
        case 'fillOffsetX':
            return {
                kind: 'number',
                key,
                from: element.fillOffsetX,
                to: target,
                apply: (value: number) => {
                    element.fillOffsetX = value;
                }
            };
        case 'fillOffsetY':
            return {
                kind: 'number',
                key,
                from: element.fillOffsetY,
                to: target,
                apply: (value: number) => {
                    element.fillOffsetY = value;
                }
            };
        case 'rotation': {
            const rotationCenter = element.getRotationCenter();
            return {
                kind: 'number',
                key,
                from: element.getRotation(),
                to: target,
                apply: (value: number) => {
                    if (rotationCenter) {
                        element.setRotation(value, rotationCenter.x, rotationCenter.y);
                    } else {
                        element.setRotation(value);
                    }
                }
            };
        }
        case 'opacity': {
            const opacityLike = element as unknown as OpacityLike;
            return {
                kind: 'number',
                key,
                from: opacityLike.opacity,
                to: clampOpacity(target),
                apply: (value: number) => {
                    if (typeof (element as unknown as { setOpacity?: (opacity: number) => unknown }).setOpacity === 'function') {
                        (element as unknown as { setOpacity: (opacity: number) => unknown }).setOpacity(clampOpacity(value));
                    } else {
                        opacityLike.opacity = clampOpacity(value);
                    }
                }
            };
        }
        case 'typesize': {
            const textLike = element as unknown as TypesizeLike;
            if (textLike.typesize === undefined) {
                throw new Error(`Cannot animate ${key} on element type ${element.type}.`);
            }
            return {
                kind: 'number',
                key,
                from: textLike.typesize,
                to: target,
                apply: (value: number) => {
                    textLike.typesize = value;
                }
            };
        }
        case 'startOffset': {
            const startOffsetLike = element as unknown as StartOffsetLike;
            if (startOffsetLike.startOffset === undefined) {
                throw new Error(`Cannot animate ${key} on element type ${element.type}.`);
            }
            return {
                kind: 'number',
                key,
                from: startOffsetLike.startOffset,
                to: target,
                apply: (value: number) => {
                    if (typeof startOffsetLike.setStartOffset === 'function') {
                        startOffsetLike.setStartOffset(value);
                    }
                    else {
                        startOffsetLike.startOffset = value;
                    }
                }
            };
        }
    }

    const unsupportedKey = key as string;
    throw new Error(`Cannot animate ${unsupportedKey} on element type ${element.type}.`);
}

function resolveProperties(element: ElementBase, values: TweenTargetValues): ResolvedProperty[] {
    const properties: ResolvedProperty[] = [];
    const keys = Object.keys(values) as TweenPropertyName[];
    for (const key of keys) {
        const value = values[key];
        if (value === undefined) {
            continue;
        }
        if (key === 'fill' || key === 'stroke') {
            properties.push(resolveColorProperty(element, key, value as TweenColorValue));
            continue;
        }
        properties.push(resolveNumericProperty(element, key, value as number));
    }
    if (properties.length === 0) {
        throw new Error('No tweenable properties were provided.');
    }
    return properties;
}

export class ElementTween {
    public readonly element: ElementBase;
    public readonly propertyNames: TweenPropertyName[];
    public readonly duration: number;
    public readonly delay: number;
    public readonly easing: AnimationEasingFunction;
    public readonly onUpdate?: (element: ElementBase, tween: ElementTween) => void;
    public readonly onComplete?: (element: ElementBase, tween: ElementTween) => void;
    public readonly onCancel?: (element: ElementBase, tween: ElementTween) => void;

    public isRunning: boolean = false;
    public isCompleted: boolean = false;
    public isCancelled: boolean = false;
    public startTime?: number;

    private readonly properties: ResolvedProperty[];

    constructor(element: ElementBase, values: TweenTargetValues, options?: TweenOptions) {
        this.element = element;
        this.properties = resolveProperties(element, values);
        this.propertyNames = this.properties.map(property => property.key);
        this.duration = Math.max(1, options?.duration ?? 300);
        this.delay = Math.max(0, options?.delay ?? 0);
        this.easing =
            typeof options?.easing === 'function'
                ? options.easing
                : AnimationEasing.get(options?.easing ?? 'easeInOutCubic');
        this.onUpdate = options?.onUpdate;
        this.onComplete = options?.onComplete;
        this.onCancel = options?.onCancel;
    }

    public start(timestamp: number): void {
        this.startTime = timestamp;
        this.isRunning = true;
    }

    public step(timestamp: number): boolean {
        if (!this.isRunning || this.isCompleted || this.isCancelled) {
            return false;
        }
        if (this.startTime === undefined) {
            this.start(timestamp);
        }
        const elapsed = timestamp - (this.startTime as number);
        if (elapsed < this.delay) {
            return false;
        }
        const progress = Math.min(1, (elapsed - this.delay) / this.duration);
        const eased = this.easing(progress);
        for (const property of this.properties) {
            if (property.kind === 'number') {
                property.apply(property.from + (property.to - property.from) * eased);
            } else {
                const next = Color.lerp(property.from, property.to, eased);
                property.apply(next.toStyleString());
            }
        }
        if (this.onUpdate) {
            this.onUpdate(this.element, this);
        }
        if (progress >= 1) {
            this.isCompleted = true;
            this.isRunning = false;
            if (this.onComplete) {
                this.onComplete(this.element, this);
            }
        }
        return true;
    }

    public cancel(): void {
        if (this.isCompleted || this.isCancelled) {
            return;
        }
        this.isCancelled = true;
        this.isRunning = false;
        if (this.onCancel) {
            this.onCancel(this.element, this);
        }
    }

    public finish(): void {
        if (this.isCompleted || this.isCancelled) {
            return;
        }
        for (const property of this.properties) {
            if (property.kind === 'number') {
                property.apply(property.to);
            } else {
                property.apply(property.to.toStyleString());
            }
        }
        this.isCompleted = true;
        this.isRunning = false;
        if (this.onUpdate) {
            this.onUpdate(this.element, this);
        }
        if (this.onComplete) {
            this.onComplete(this.element, this);
        }
    }
}

/**
 * Static coordinator for all active element tweens.
 */
export class ElementAnimator {
    private static activeTweens: ElementTween[] = [];
    private static animationHandle?: number;

    /**
     * Starts a tween for the provided element.
     * Any active tween on the same element and property names is cancelled first.
     * @param element - Target element
     * @param values - Target property values
     * @param options - Timing and callback options
     * @returns Active tween instance
     */
    public static animate(element: ElementBase, values: TweenTargetValues, options?: TweenOptions): ElementTween {
        const tween = new ElementTween(element, values, options);
        ElementAnimator.cancel(element, tween.propertyNames);
        ElementAnimator.activeTweens.push(tween);
        tween.start(ElementAnimator.now());
        ElementAnimator.ensureRunning();
        return tween;
    }

    /**
     * Cancels active tweens for an element.
     * @param element - Target element
     * @param propertyNames - Optional property subset to cancel
     */
    public static cancel(element: ElementBase, propertyNames?: TweenPropertyName[]): void {
        for (const tween of ElementAnimator.activeTweens) {
            if (tween.element !== element) {
                continue;
            }
            if (!propertyNames || tween.propertyNames.some(name => propertyNames.includes(name))) {
                tween.cancel();
            }
        }
    }

    /**
     * Cancels every active tween across the animator.
     */
    public static stopAll(): void {
        ElementAnimator.activeTweens.forEach(tween => tween.cancel());
        ElementAnimator.activeTweens = [];
        if (ElementAnimator.animationHandle !== undefined) {
            ElementAnimator.cancelFrame(ElementAnimator.animationHandle);
            ElementAnimator.animationHandle = undefined;
        }
    }

    private static ensureRunning(): void {
        if (ElementAnimator.animationHandle !== undefined) {
            return;
        }
        ElementAnimator.animationHandle = ElementAnimator.requestFrame(ElementAnimator.tick);
    }

    private static tick = (timestamp: number): void => {
        ElementAnimator.animationHandle = undefined;
        const controllers = new Set<IController>();
        const nextTweens: ElementTween[] = [];

        for (const tween of ElementAnimator.activeTweens) {
            if (tween.isCancelled || tween.isCompleted) {
                continue;
            }
            const changed = tween.step(timestamp);
            if (!tween.isCancelled && !tween.isCompleted) {
                nextTweens.push(tween);
            }
            if (changed) {
                const controller = resolveController(tween.element);
                if (controller) {
                    controllers.add(controller);
                }
            }
        }

        ElementAnimator.activeTweens = nextTweens;
        controllers.forEach(controller => controller.draw());

        if (ElementAnimator.activeTweens.length > 0) {
            ElementAnimator.animationHandle = ElementAnimator.requestFrame(ElementAnimator.tick);
        }
    };

    private static now(): number {
        if (typeof globalThis.performance?.now === 'function') {
            return globalThis.performance.now();
        }
        return Date.now();
    }

    private static requestFrame(callback: FrameRequestCallback): number {
        if (typeof globalThis.requestAnimationFrame === 'function') {
            return globalThis.requestAnimationFrame(callback);
        }
        if (typeof globalThis.window?.requestAnimationFrame === 'function') {
            return globalThis.window.requestAnimationFrame(callback);
        }
        return setTimeout(() => callback(ElementAnimator.now()), 16) as unknown as number;
    }

    private static cancelFrame(handle: number): void {
        if (typeof globalThis.cancelAnimationFrame === 'function') {
            globalThis.cancelAnimationFrame(handle);
            return;
        }
        if (typeof globalThis.window?.cancelAnimationFrame === 'function') {
            globalThis.window.cancelAnimationFrame(handle);
            return;
        }
        clearTimeout(handle);
    }
}
