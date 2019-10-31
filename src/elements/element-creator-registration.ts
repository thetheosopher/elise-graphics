import { IElementCreator } from './element-creator';

export class ElementCreatorRegistration {
    /**
     * Constructs an element creator registration
     * @classdesc Element creator registration
     * @param name - Element type tag
     * @param creator - Element creator
     */
    constructor(public name: string, public creator: IElementCreator) {
        this.name = name;
        this.creator = creator;
    }
}
