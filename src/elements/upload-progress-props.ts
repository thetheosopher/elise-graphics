import { ElementBase } from './element-base';

/**
 * Describes file upload progress
 */
export class UploadProgressProps {
    /**
     * Element associated with upload
     */
    public element: ElementBase;

    /**
     * Percent of upload completion
     */
    public percent: number;

    /**
     * @param element - Element associated with upload
     * @param percent - Percent of upload completed
     */
    constructor(element: ElementBase, percent: number) {
        this.element = element;
        this.percent = percent;
    }
}
