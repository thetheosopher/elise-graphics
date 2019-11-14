import { Resource } from './resource';
import { IResourceCreator } from './resource-creator';
import { ResourceCreatorRegistration } from './resource-creator-registration';

/**
 * Resource creation factory
 */
export class ResourceFactory {
    /**
     * Array of resource creators
     */
    public static ResourceCreators: ResourceCreatorRegistration[] = [];

    /**
     * Registers a resource creator
     * @param name - Resource type tag
     * @param creator - Resource creation function
     */
    public static registerCreator(name: string, creator: IResourceCreator) {
        ResourceFactory.ResourceCreators.push(new ResourceCreatorRegistration(name, creator));
    }

    /**
     * Creates a new registered resource instance given a type tag
     * @param name - Resource type tag
     * @returns New resource
     */
    public static create(name: string): Resource | undefined {
        for (const rc of ResourceFactory.ResourceCreators) {
            if (rc.name === name) {
                return rc.creator.create();
            }
        }
        return undefined;
    }
}
