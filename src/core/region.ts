import { Point } from './point';
import { Size } from './size';

/**
 * Represents a rectangular region in 2D space
 */
export class Region {
    /**
     * Region factory function
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param width - Width
     * @param height - Height
     * @returns New region
     */
    public static create(x: number, y: number, width: number, height: number): Region {
        return new Region(x, y, width, height);
    }

    public readonly x: number;
    public readonly y: number;
    public readonly width: number;
    public readonly height: number;
    public readonly size: Size;
    public readonly location: Point;

    /**
     * @param x - X coordinate
     * @param y - Y coordinate
     * @param width - Width
     * @param height - Height
     */
    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.size = new Size(width, height);
        this.location = new Point(x, y);

        this.clone = this.clone.bind(this);
        this.containsPoint = this.containsPoint.bind(this);
        this.containsCoordinate = this.containsCoordinate.bind(this);
        this.containsRegion = this.containsRegion.bind(this);
        this.intersectsWith = this.intersectsWith.bind(this);
    }

    /**
     * Clones this region into a new instance
     * @returns Cloned region
     */
    public clone(): Region {
        return new Region(this.x, this.y, this.width, this.height);
    }

    /**
     * Determines if this region contains a given point
     * @param point - Point of interest
     * @returns True if point is in this region
     */
    public containsPoint(point: Point): boolean {
        if (
            point.x >= this.x &&
            point.x <= this.x + this.width &&
            point.y >= this.y &&
            point.y <= this.y + this.height
        ) {
            return true;
        }
        return false;
    }

    /**
     * Determines if this region contains a coordinate
     * @param x - X coordinate
     * @param y - Y coordinate
     * @returns True if coordinate is in this region
     */
    public containsCoordinate(x: number, y: number): boolean {
        if (x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height) {
            return true;
        }
        return false;
    }

    /**
     * Determines if this region intersects with a another region
     * @param region - Region of interest
     * @returns True if region of interest intersects with this region
     */
    public intersectsWith(region: Region): boolean {
        const x1 = this.x;
        const x2 = this.x + this.width;
        const y1 = this.y;
        const y2 = this.y + this.height;
        const x3 = region.x;
        const x4 = region.x + region.width;
        const y3 = region.y;
        const y4 = region.y + region.height;
        if (x1 < x4 && x2 > x3 && y1 < y4 && y2 > y3) {
            return true;
        }
        return false;
    }

    /**
     * Determines if this region completely contains another region
     * @param region - Region of interest
     * @returns True if this region completely contains the region of interest
     */
    public containsRegion(region: Region): boolean {
        const x1 = this.x;
        const x2 = this.x + this.width;
        const y1 = this.y;
        const y2 = this.y + this.height;
        const x3 = region.x;
        const x4 = region.x + region.width;
        const y3 = region.y;
        const y4 = region.y + region.height;
        if (x3 >= x1 && x4 <= x2 && y3 >= y1 && y4 <= y2) {
            return true;
        }
        return false;
    }
}
