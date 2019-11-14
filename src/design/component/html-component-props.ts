import { UploadComponentProps } from './upload-component-props';

/**
 * Encapsulates HTML component creation properties
 */
export class HtmlComponentProps extends UploadComponentProps {
    constructor() {
        super();
        this.imageTag = 'html';
        this.fileExtensions = [ 'zip' ];
    }
}
