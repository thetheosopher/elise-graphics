import { Resource } from './resource';

export interface IResourceCreator {
    /**
     * Create a resource
     * @returns New resource
     */
    create(...p: any[]): Resource;
}
