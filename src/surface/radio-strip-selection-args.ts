import { RadioStrip } from './radio-strip';
import { RadioStripItem } from './radio-strip-item';

/*
 RadioStripSelectionArgs
*/
export class RadioStripSelectionArgs {
  /**
   * Radio strip
   */
  public strip: RadioStrip;

  /**
   * Radio strip item
   */
  public item: RadioStripItem;

  /**
   * Constructs a radio strip selection args
   * @classdesc Contains arguments for radio strip onSelect event
   * @param strip - Radio strip
   * @param item - Radio strip item
   */
  constructor(strip: RadioStrip, item: RadioStripItem) {
    this.strip = strip;
    this.item = item;
  }
}
