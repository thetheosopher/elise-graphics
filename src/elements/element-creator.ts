import { ElementBase } from './element-base';

/**
 * Element creator interface
 */
export interface IElementCreator {
    /**
     * Create element given supplied properties
     */
    create(...p: any[]): ElementBase;
}
