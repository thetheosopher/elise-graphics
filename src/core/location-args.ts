import { Point } from './point';

/**
 * Encapsulates a location in event parameters
 */
export class LocationArgs {
    public location?: Point;

    /**
     * @param location - Location
     */
    constructor(location?: Point) {
        this.location = location;
    }
}
