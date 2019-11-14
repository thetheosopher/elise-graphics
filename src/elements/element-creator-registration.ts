import { IElementCreator } from './element-creator';

/**
 * Encapsulates named element creation method
 */
export class ElementCreatorRegistration {
    /**
     * Element creator registration
     * @param name - Element type tag
     * @param creator - Element creator
     */
    constructor(public name: string, public creator: IElementCreator) {
        this.name = name;
        this.creator = creator;
    }
}
