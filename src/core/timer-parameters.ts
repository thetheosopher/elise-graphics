export class TimerParameters {
  /**
   * Timer total elapsed time in seconds
   */
  public elapsedTime: number;

  /**
   * Time since last event in seconds
   */
  public tickDelta: number;

  /**
   * Constructs a new timer parameters object
   * @classdesc Timer callback parameters
   * @param elapsedTime - Total elapsed time in seconds
   * @param tickDelta - Time since last callback event in seconds
   */
  constructor(elapsedTime: number, tickDelta: number) {
    this.elapsedTime = elapsedTime;
    this.tickDelta = tickDelta;
  }
}
