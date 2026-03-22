export type AnimationEasingFunction = (t: number) => number;

/**
 * Names of the built-in easing functions available to element tweens.
 */
export type AnimationEasingName =
    | 'easeLinear'
    | 'easeInQuad'
    | 'easeOutQuad'
    | 'easeInOutQuad'
    | 'easeInCubic'
    | 'easeOutCubic'
    | 'easeInOutCubic'
    | 'easeInQuart'
    | 'easeOutQuart'
    | 'easeInOutQuart'
    | 'easeInQuint'
    | 'easeOutQuint'
    | 'easeInOutQuint';

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

    /**
     * Resolves an easing name to a concrete easing function.
     * Falls back to `easeInOutCubic` when the name is unknown.
     * @param name - Built-in easing name
     * @returns Easing function
     */
    public static get(name: AnimationEasingName | string): AnimationEasingFunction {
        switch (name) {
            case 'easeLinear':
                return AnimationEasing.easeLinear;
            case 'easeInQuad':
                return AnimationEasing.easeInQuad;
            case 'easeOutQuad':
                return AnimationEasing.easeOutQuad;
            case 'easeInOutQuad':
                return AnimationEasing.easeInOutQuad;
            case 'easeInCubic':
                return AnimationEasing.easeInCubic;
            case 'easeOutCubic':
                return AnimationEasing.easeOutCubic;
            case 'easeInOutCubic':
                return AnimationEasing.easeInOutCubic;
            case 'easeInQuart':
                return AnimationEasing.easeInQuart;
            case 'easeOutQuart':
                return AnimationEasing.easeOutQuart;
            case 'easeInOutQuart':
                return AnimationEasing.easeInOutQuart;
            case 'easeInQuint':
                return AnimationEasing.easeInQuint;
            case 'easeOutQuint':
                return AnimationEasing.easeOutQuint;
            case 'easeInOutQuint':
                return AnimationEasing.easeInOutQuint;
            default:
                return AnimationEasing.easeInOutCubic;
        }
    }
}
