import { Point } from './point';

export class LocationArgs {
    /**
     * Location
     */
    public location?: Point;

    /**
     * Constructs a location args
     * @classdesc Describes a location
     * @param location - Location
     */
    constructor(location?: Point) {
        this.location = location;
    }
}
