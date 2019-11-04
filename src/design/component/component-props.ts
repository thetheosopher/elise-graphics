import {Model} from '../../core/model';
import {ElementCreationProps} from '../../elements/element-creation-props';
import {ElementDragArgs} from '../../elements/element-drag-args';
import {ElementSizeProps} from '../../elements/element-size-props';
import {UploadCompletionProps} from '../../elements/upload-completion-props';
import {UploadProgressProps} from '../../elements/upload-progress-props';
import {LinearGradientFill} from '../../fill/linear-gradient-fill';
import {RadialGradientFill} from '../../fill/radial-gradient-fill';
import {ModelResource} from '../../resource/model-resource';
import {Component} from './component';
import {ComponentElement} from './component-element';
import {ComponentEvent} from './component-event';

export class ComponentProps {
    /**
     * Base image path for image based components
     */
    public static baseImagePath: string;

    /**
     * Standard element creation fill (default - Half transparent Gold #7fffd700)
     */
    public static standardFill = '#7fffd700';

    /**
     * Standard element creation stroke (default - Solid Red)
     */
    public static standardStroke = 'Red';

    /**
     * Name
     */
    public name?: string;

    /**
     * Normal state fill
     */
    public fill?: string | LinearGradientFill | RadialGradientFill;

    /**
     * Normal state stroke
     */
    public stroke?: string;

    /**
     * Selected state fill
     */
    public selectedFill?: string | LinearGradientFill | RadialGradientFill;

    /**
     * Selected state stroke
     */
    public selectedStroke?: string;

    /**
     * True if component accepts file drag and drop
     */
    public acceptsDrag: boolean = false;

    /**
     * Array of file extensions component supports
     */
    public fileExtensions?: string[];

    /**
     * Initialized flag.  True after initialization
     */
    public initialized: boolean = false;

    /**
     * Component element initialization (callback:(success: boolean)=>void)=>void
     */
    public initialize?: (callback: (success: boolean) => void) => void;

    /**
     * Component element creation handler (props: ElementCreationProps)=>ComponentElement
     */
    public create?: (props: ElementCreationProps) => ComponentElement;

    /**
     * Component element set canvas creation fill function (controller: DesignController, c: CanvasRenderingContext2D)
     */
    public setCreationFill?: (c: CanvasRenderingContext2D) => void;

    /**
     * Component element fill image provider function (callback:(image: HTMLImageElement)=>void)=>void
     */
    public getFillImage?: (callback: (image: HTMLImageElement) => void) => void;

    /**
     * Component element selection event
     */
    public select: ComponentEvent<ComponentElement> = new ComponentEvent<ComponentElement>();

    /**
     * Component element deselection event
     */
    public deselect: ComponentEvent<ComponentElement> = new ComponentEvent<ComponentElement>();

    /**
     * Component element drag enter event
     */
    public dragEnter: ComponentEvent<ElementDragArgs> = new ComponentEvent<ElementDragArgs>();

    /**
     * Component element drag leave event
     */
    public dragLeave: ComponentEvent<ElementDragArgs> = new ComponentEvent<ElementDragArgs>();

    /**
     * Component element size event
     */
    public size: ComponentEvent<ElementSizeProps> = new ComponentEvent<ElementSizeProps>();

    /**
     * Component element upload start event
     */
    public uploadStart: ComponentEvent<ComponentElement> = new ComponentEvent<ComponentElement>();

    /**
     * Component element upload complete event
     */
    public uploadComplete: ComponentEvent<UploadCompletionProps> = new ComponentEvent<UploadCompletionProps>();

    /**
     * Component element upload progress event
     */
    public uploadProgress: ComponentEvent<UploadProgressProps> = new ComponentEvent<UploadProgressProps>();

    /**
     * Describes element component design template
     */
    constructor() {
        this.defaultCreate = this.defaultCreate.bind(this);
        this.defaultResize = this.defaultResize.bind(this);
        this.defaultSelect = this.defaultSelect.bind(this);
        this.defaultDeselect = this.defaultDeselect.bind(this);
    }

    /**
     * Default element creation function for elements with simple properties
     * @param props - Element creation props
     * @returns New component element
     */
    public defaultCreate(props: ElementCreationProps) {
        const m = Model.create(props.width, props.height);
        if (this.stroke !== undefined) {
            m.stroke = this.stroke;
        }
        else {
            m.stroke = ComponentProps.standardStroke;
        }
        if (this.fill !== undefined) {
            m.fill = this.fill;
        }
        else {
            m.fill = ComponentProps.standardFill;
        }
        ModelResource.create(props.id, m).addTo(props.model);
        const el = new ComponentElement(props.id, props.left, props.top, props.width, props.height);
        props.model.add(el);
        return el;
    }

    /**
     * Default element resizing function for elements with simple properties
     * @param component - Component
     * @param props - Element resizing properties
     */
    public defaultResize(c: Component, props: ElementSizeProps) {
        if (!props.element || !props.element.model || !props.element.id) {
            return;
        }
        const res = props.element.model.resourceManager.get(props.element.id) as ModelResource;
        if (res.model) {
            res.model.setSize(props.size);
        }
    }

    public defaultSelect(c: Component, el: ComponentElement) {
        if (!el.model || !el.id) {
            return;
        }
        const resource = el.model.resourceManager.get(el.id) as ModelResource;
        const model = resource.model;
        if (!model) {
            return;
        }
        if (c.selectedFill) {
            model.fill = c.selectedFill;
        }
        if (c.selectedStroke) {
            model.stroke = c.selectedStroke;
        }
    }

    public defaultDeselect(c: Component, el: ComponentElement) {
        if (!el.model || !el.id) {
            return;
        }
        const resource = el.model.resourceManager.get(el.id) as ModelResource;
        const model = resource.model;
        if (!model) {
            return;
        }
        model.fill = c.fill;
        model.stroke = c.stroke;
    }
}
