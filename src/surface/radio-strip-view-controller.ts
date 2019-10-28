import { ViewController } from '../view/view-controller';
import { RadioStrip } from './radio-strip';
import { Surface } from './surface';

export class RadioStripViewController extends ViewController {
  /**
   * Associated radio strip
   */
  public strip?: RadioStrip;

  /**
   * Radio strip surface
   */
  public surface?: Surface;

  /**
   * @classdesc Extends ViewController to add radio strip properties
   * @extends Elise.Drawing.ViewController
   */
  constructor() {
    super();
  }
}
