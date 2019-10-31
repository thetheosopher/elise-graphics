import { ElementBase } from './element-base';

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
     * Constructs an upload progress props
     * @param element - Element associated with upload
     * @param percent - Percent of upload completed
     */
    constructor(element: ElementBase, percent: number) {
        this.element = element;
        this.percent = percent;
    }
}
