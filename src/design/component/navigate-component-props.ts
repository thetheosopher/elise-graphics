import { ImageBasedComponentProps} from './image-based-component-props';

export class NavigateComponentProps extends ImageBasedComponentProps {

    constructor() {
        super();
        this.imageTag = 'navigate';
        console.log(this.imageTag);
    }
}
