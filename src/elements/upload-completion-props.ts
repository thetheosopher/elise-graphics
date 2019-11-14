import { ElementBase } from './element-base';

/**
 * Describes file upload completion results
 */
export class UploadCompletionProps {
    /**
     * Element for which upload has finished
     */
    public element: ElementBase;

    /**
     * True if upload completed successfully
     */
    public success: boolean;

    /**
     * @param element - Element associated with upload
     * @param success - Boolean completion result
     */
    constructor(element: ElementBase, success: boolean) {
        this.element = element;
        this.success = success;
    }
}
