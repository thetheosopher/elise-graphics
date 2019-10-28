import { ResourceLoaderState } from './resource-loader-state';

export class ResourceState {
    /**
     * Constructs a resource state
     * @classdesc Indicates state of loaded resources
     * @param numberLoaded - Number of resources loaded
     * @param totalResources - Total number of resource to load
     * @param code - Resource loader state enumeration
     * @param status - Status string
     */
    constructor(
        public numberLoaded: number,
        public totalResources: number,
        public code: ResourceLoaderState,
        public status: string
    ) {
        this.toString = this.toString.bind(this);
    }

    /**
     * Describes resource state as string
     * @returns Description
     */
    public toString(): string {
        return '[' + this.numberLoaded + '/' + this.totalResources + '] ' + this.code + '-' + this.status;
    }
}
