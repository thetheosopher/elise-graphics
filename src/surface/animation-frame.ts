import { Utility } from '../core/utility';

export class AnimationFrame {
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
   * Constructs an animation frame
   * @classdesc Represents a frame in a timed animation
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
    pauseFrame: boolean,
  ) {
    if (id) {
      this.id = id;
    } else {
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
}
