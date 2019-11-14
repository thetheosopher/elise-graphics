/**
 * Represents sprite element frame
 */
export class SpriteFrame {
    /**
     * Clones a sprite frame
     * @param source SpriteFrame to clone
     */
    public static clone(source: SpriteFrame): SpriteFrame {
        const clone = new SpriteFrame(
            source.source,
            source.x,
            source.y,
            source.width,
            source.height,
            source.duration,
            source.transition,
            source.transitionDuration,
            source.opacity
        );
        return clone;
    }

    /**
     * Sprite Frame factory function
     * @param source - Bitmap resource key
     * @param x - Bitmap resource image region X coordinate
     * @param y - Bitmap resource image region Y coordinate
     * @param width - Bitmap resource image region Width
     * @param height - Bitmap resource image region Height
     * @param duration - Frame duration in seconds
     * @param transition - To frame visual transition
     * @param transitionDuration - To frame transition duration
     * @param opacity - Frame opacity in the range of 0-1
     */
    public static create(
        source: string,
        x: number,
        y: number,
        width: number,
        height: number,
        duration: number,
        transition: string,
        transitionDuration: number,
        opacity?: number
    ): SpriteFrame {
        return new SpriteFrame(source, x, y, width, height, duration, transition, transitionDuration, opacity);
    }

    /**
     * Bitmap resource key
     */
    public source: string;

    /**
     * X coordinate of bitmap resource region
     */
    public x: number;

    /**
     * Y coordinate of bitmap resource region
     */
    public y: number;

    /**
     * Width of bitmap resource region
     */
    public width: number;

    /**
     * Height of bitmap resource region
     */
    public height: number;

    /**
     * Frame duration in seconds
     */
    public duration: number;

    /**
     * Frame visual transition
     */
    public transition: string;

    /**
     * Frame transition duration in seconds
     */
    public transitionDuration: number;

    /**
     * Frame opacity in the range of 0-1
     */
    public opacity: number = 1;

    /**
     * @param source - Bitmap resource key
     * @param x - Bitmap resource image region X coordinate
     * @param y - Bitmap resource image region Y coordinate
     * @param width - Bitmap resource image region Width
     * @param height - Bitmap resource image region Height
     * @param duration - Frame duration in seconds
     * @param transition - Frame visual transition
     * @param transitionDuration - Frame transition duration
     * @param opacity - Optional frame opacity in the range of 0-1
     */
    constructor(
        source: string,
        x: number,
        y: number,
        width: number,
        height: number,
        duration: number,
        transition: string,
        transitionDuration: number,
        opacity?: number
    ) {
        this.source = source;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.duration = duration;
        this.transition = transition;
        this.transitionDuration = transitionDuration;
        if (opacity !== undefined) {
            this.opacity = opacity;
        }
    }
}
