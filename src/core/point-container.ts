import { Point } from './point';
import { PointDepth } from './point-depth';

export interface IPointContainer {
    /**
     * Returns boolean true if in point editing mode
     */
    editPoints: boolean;

    /**
     * Returns number of points
     * @returns Point count
     */
    pointCount(): number;

    /**
     * Returns point at index
     * @param index - Point index
     * @param depth - Point depth
     * @returns Point at specified index
     */
    getPointAt(index: number, depth?: PointDepth): Point;

    /**
     * Sets point at index
     * @param index - Point index
     * @param value - Point value
     * @param depth - Point depth
     */
    setPointAt(index: number, value: Point, depth: PointDepth): void;
}
