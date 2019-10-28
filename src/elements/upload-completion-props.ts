import { ElementBase } from './element-base';

export class UploadCompletionProps {
  /**
   * Element for which upload has finished
   */
  public element: ElementBase;

  /**
   * True if upload completed successfully
   */
  public success: boolean;

  /**
   * Constructs an upload completion props
   * @classdesc Describes completion status of an element upload
   * @param element - Element associated with upload
   * @param success - Boolean completion result
   */
  constructor(element: ElementBase, success: boolean) {
    this.element = element;
    this.success = success;
  }
}
