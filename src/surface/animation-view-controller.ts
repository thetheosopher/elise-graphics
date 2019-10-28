import { Animation } from './animation';
import { SurfaceViewController } from './surface-view-controller';

export class AnimationViewController extends SurfaceViewController {
  /**
   * Controlled animation
   */
  public animation?: Animation;

  /**
   * @classdesc Extends SurfaceViewController to add animation property
   * @extends Elise.Player.SurfaceViewController
   */
  constructor() {
    super();
  }
}
