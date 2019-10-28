import { UploadComponentProps } from './upload-component-props';

export class HtmlComponentProps extends UploadComponentProps {

   constructor() {
       super();
       this.imageTag = 'html';
       this.fileExtensions = ['zip'];
   }
}
