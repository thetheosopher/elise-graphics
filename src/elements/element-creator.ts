import { ElementBase } from './element-base';

export interface IElementCreator {
  /**
   * Create element given supplied properties
   */
  create(...p: any[]): ElementBase;
}
