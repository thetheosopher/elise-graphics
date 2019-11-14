import { ImageBasedComponentProps } from './image-based-component-props';

/**
 * Encapsulates navigation component creation properties
 */
export class NavigateComponentProps extends ImageBasedComponentProps {
    constructor() {
        super();
        this.imageTag = 'navigate';
    }
}
