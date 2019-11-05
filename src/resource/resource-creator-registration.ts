import { IResourceCreator } from './resource-creator';

export class ResourceCreatorRegistration {
    /**
     * Resource creator registration
     * @param name - Resource type name
     * @param creator - Resource creation function
     */
    constructor(public name: string, public creator: IResourceCreator) {
        this.name = name;
        this.creator = creator;
    }
}
