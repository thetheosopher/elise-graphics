export type AnimationEasingFunction = (t: number) => number;

export const animationEasingNames = [
    'easeLinear',
    'easeInQuad',
    'easeOutQuad',
    'easeInOutQuad',
    'easeInCubic',
    'easeOutCubic',
    'easeInOutCubic',
    'easeInQuart',
    'easeOutQuart',
    'easeInOutQuart',
    'easeInQuint',
    'easeOutQuint',
    'easeInOutQuint',
    'easeInSine',
    'easeOutSine',
    'easeInOutSine',
    'easeInExpo',
    'easeOutExpo',
    'easeInOutExpo',
    'easeInCirc',
    'easeOutCirc',
    'easeInOutCirc',
    'easeInBack',
    'easeOutBack',
    'easeInOutBack',
    'easeInElastic',
    'easeOutElastic',
    'easeInOutElastic',
    'easeInBounce',
    'easeOutBounce',
    'easeInOutBounce',
] as const;

/**
 * Names of the built-in easing functions available to element tweens.
 */
export type AnimationEasingName = typeof animationEasingNames[number];

const BACK_OVERSHOOT = 1.70158;
const BACK_OVERSHOOT_IN_OUT = BACK_OVERSHOOT * 1.525;
const ELASTIC_PERIOD = (2 * Math.PI) / 3;
const ELASTIC_PERIOD_IN_OUT = (2 * Math.PI) / 4.5;

const animationEasingLookup: Partial<Record<AnimationEasingName, AnimationEasingFunction>> = {};

/**
 * Collection of easing functions used by element property tweens.
 */
export class AnimationEasing {
    public static easeLinear(t: number): number {
        return t;
    }

    public static easeInQuad(t: number): number {
        return t * t;
    }

    public static easeOutQuad(t: number): number {
        return t * (2 - t);
    }

    public static easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    public static easeInCubic(t: number): number {
        return t * t * t;
    }

    public static easeOutCubic(t: number): number {
        const p = t - 1;
        return p * p * p + 1;
    }

    public static easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    public static easeInQuart(t: number): number {
        return t * t * t * t;
    }

    public static easeOutQuart(t: number): number {
        const p = t - 1;
        return 1 - p * p * p * p;
    }

    public static easeInOutQuart(t: number): number {
        return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * Math.pow(t - 1, 4);
    }

    public static easeInQuint(t: number): number {
        return t * t * t * t * t;
    }

    public static easeOutQuint(t: number): number {
        const p = t - 1;
        return 1 + p * p * p * p * p;
    }

    public static easeInOutQuint(t: number): number {
        return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * Math.pow(t - 1, 5);
    }

    public static easeInSine(t: number): number {
        return 1 - Math.cos((t * Math.PI) / 2);
    }

    public static easeOutSine(t: number): number {
        return Math.sin((t * Math.PI) / 2);
    }

    public static easeInOutSine(t: number): number {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    public static easeInExpo(t: number): number {
        return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
    }

    public static easeOutExpo(t: number): number {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    public static easeInOutExpo(t: number): number {
        if (t === 0) {
            return 0;
        }
        if (t === 1) {
            return 1;
        }
        return t < 0.5
            ? Math.pow(2, 20 * t - 10) / 2
            : (2 - Math.pow(2, -20 * t + 10)) / 2;
    }

    public static easeInCirc(t: number): number {
        return 1 - Math.sqrt(1 - t * t);
    }

    public static easeOutCirc(t: number): number {
        return Math.sqrt(1 - Math.pow(t - 1, 2));
    }

    public static easeInOutCirc(t: number): number {
        return t < 0.5
            ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
            : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
    }

    public static easeInBack(t: number): number {
        return t * t * ((BACK_OVERSHOOT + 1) * t - BACK_OVERSHOOT);
    }

    public static easeOutBack(t: number): number {
        const p = t - 1;
        return 1 + p * p * ((BACK_OVERSHOOT + 1) * p + BACK_OVERSHOOT);
    }

    public static easeInOutBack(t: number): number {
        return t < 0.5
            ? (Math.pow(2 * t, 2) * (((BACK_OVERSHOOT_IN_OUT + 1) * 2 * t) - BACK_OVERSHOOT_IN_OUT)) / 2
            : (Math.pow(2 * t - 2, 2) * (((BACK_OVERSHOOT_IN_OUT + 1) * (2 * t - 2)) + BACK_OVERSHOOT_IN_OUT) + 2) / 2;
    }

    public static easeInElastic(t: number): number {
        if (t === 0) {
            return 0;
        }
        if (t === 1) {
            return 1;
        }
        return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ELASTIC_PERIOD);
    }

    public static easeOutElastic(t: number): number {
        if (t === 0) {
            return 0;
        }
        if (t === 1) {
            return 1;
        }
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_PERIOD) + 1;
    }

    public static easeInOutElastic(t: number): number {
        if (t === 0) {
            return 0;
        }
        if (t === 1) {
            return 1;
        }
        return t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ELASTIC_PERIOD_IN_OUT)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ELASTIC_PERIOD_IN_OUT)) / 2 + 1;
    }

    public static easeInBounce(t: number): number {
        return 1 - AnimationEasing.easeOutBounce(1 - t);
    }

    public static easeOutBounce(t: number): number {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        }
        if (t < 2 / d1) {
            const p = t - 1.5 / d1;
            return n1 * p * p + 0.75;
        }
        if (t < 2.5 / d1) {
            const p = t - 2.25 / d1;
            return n1 * p * p + 0.9375;
        }
        const p = t - 2.625 / d1;
        return n1 * p * p + 0.984375;
    }

    public static easeInOutBounce(t: number): number {
        return t < 0.5
            ? (1 - AnimationEasing.easeOutBounce(1 - 2 * t)) / 2
            : (1 + AnimationEasing.easeOutBounce(2 * t - 1)) / 2;
    }

    /**
     * Resolves an easing name to a concrete easing function.
     * Falls back to `easeInOutCubic` when the name is unknown.
     * @param name - Built-in easing name
     * @returns Easing function
     */
    public static get(name: AnimationEasingName | string): AnimationEasingFunction {
        const easing = animationEasingLookup[name as AnimationEasingName];
        if (easing) {
            return easing;
        }
        return AnimationEasing.easeInOutCubic;
    }
}

for (const name of animationEasingNames) {
    animationEasingLookup[name] = AnimationEasing[name];
}
