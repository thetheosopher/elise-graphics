import {Point} from './point';

export class LocationArgs {
    /**
     * Location
     */
    public location?: Point;

    /**
     * Describes a location
     * @param location - Location
     */
    constructor(location?: Point) {
        this.location = location;
    }
}
