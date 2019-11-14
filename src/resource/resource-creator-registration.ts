import { IResourceCreator } from './resource-creator';

/**
 * Resource creator registration
 */
export class ResourceCreatorRegistration {
    /**
     * @param name - Resource type name
     * @param creator - Resource creation function
     */
    constructor(public name: string, public creator: IResourceCreator) {
        this.name = name;
        this.creator = creator;
    }
}
