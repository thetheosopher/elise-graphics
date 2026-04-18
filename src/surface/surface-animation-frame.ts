import type { SerializedData } from '../core/serialization';
import { Utility } from '../core/utility';

/**
 * Represents a frame in a timed animation
 */
export class SurfaceAnimationFrame {
    /**
     * Bitmap source
     */
    public source: string;

    /**
     * Animation frame id
     */
    public id: string;

    /**
     * Bitmap source crop x coordinate
     */
    public left: number;

    /**
     * Bitmap source crop y coordinate
     */
    public top: number;

    /**
     * Bitmap source crop width
     */
    public width: number;

    /**
     * Bitmap source crop height
     */
    public height: number;

    /**
     * Frame duration in seconds
     */
    public duration: number;

    /**
     * Frame "to" transition
     */
    public transition: string;

    /**
     * Frame transition duration in seconds
     */
    public transitionDuration: number;

    /**
     * If true, pause frame until tapped
     */
    public pauseFrame: boolean;

    /**
     * @param id - Item id
     * @param left - Source bitmap crop x coordinate
     * @param top - Source bitmap crop y coordinate
     * @param width - Source bitmap crop width
     * @param height - Source bitmap crop height
     * @param source - Bitmap source
     * @param duration - Frame duration in seconds
     * @param transition - Frame "to" transition
     * @param transitionDuration - Transition duration in seconds
     * @param pauseFrame - Pause frame until tapped
     */
    constructor(
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        source: string,
        duration: number,
        transition: string,
        transitionDuration: number,
        pauseFrame: boolean
    ) {
        if (id) {
            this.id = id;
        }
        else {
            this.id = Utility.guid();
        }
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
        this.source = source;
        this.duration = duration;
        this.transition = transition;
        this.transitionDuration = transitionDuration;
        this.pauseFrame = pauseFrame;
    }

    /**
     * Serializes persistent frame properties to a new object
     * @returns Serialized frame data
     */
    public serialize(): SerializedData {
        const o: SerializedData = { type: 'surfaceAnimationFrame' };
        if (this.id) {
            o.id = this.id;
        }
        o.source = this.source;
        if (this.left !== 0) {
            o.left = this.left;
        }
        if (this.top !== 0) {
            o.top = this.top;
        }
        o.width = this.width;
        o.height = this.height;
        if (this.duration !== 1) {
            o.duration = this.duration;
        }
        if (this.transition !== '') {
            o.transition = this.transition;
        }
        if (this.transitionDuration !== 0) {
            o.transitionDuration = this.transitionDuration;
        }
        if (this.pauseFrame) {
            o.pauseFrame = this.pauseFrame;
        }
        return o;
    }

    /**
     * Parses serialized data into frame properties
     * @param o - Serialized frame data
     */
    public parse(o: SerializedData): void {
        if (o.id !== undefined) {
            this.id = o.id as string;
        }
        if (o.source !== undefined) {
            this.source = o.source as string;
        }
        if (o.left !== undefined) {
            this.left = o.left as number;
        }
        if (o.top !== undefined) {
            this.top = o.top as number;
        }
        if (o.width !== undefined) {
            this.width = o.width as number;
        }
        if (o.height !== undefined) {
            this.height = o.height as number;
        }
        if (o.duration !== undefined) {
            this.duration = o.duration as number;
        }
        if (o.transition !== undefined) {
            this.transition = o.transition as string;
        }
        if (o.transitionDuration !== undefined) {
            this.transitionDuration = o.transitionDuration as number;
        }
        if (o.pauseFrame !== undefined) {
            this.pauseFrame = o.pauseFrame as boolean;
        }
    }
}
