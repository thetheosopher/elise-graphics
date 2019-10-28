export class ControllerEventArgs {
  /**
   * DOM Event
   */
  public event: Event;

  /**
   * @param event - DOM event
   */
  constructor(event: Event) {
    this.event = event;
  }
}
