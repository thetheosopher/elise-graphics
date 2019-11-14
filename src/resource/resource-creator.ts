import { Resource } from './resource';

/**
 * Resource creator interface
 */
export interface IResourceCreator {
    /**
     * Create a resource
     * @returns New resource
     */
    create(...p: any[]): Resource;
}
