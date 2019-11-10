import { ErrorMessages } from '../../core/error-messages';
import { Model } from '../../core/model';
import { Size } from '../../core/size';
import { ElementCreationProps } from '../../elements/element-creation-props';
import { ElementSizeProps } from '../../elements/element-size-props';
import { RectangleElement } from '../../elements/rectangle-element';
import { BitmapResource } from '../../resource/bitmap-resource';
import { ModelResource } from '../../resource/model-resource';
import { ComponentElement } from '../component/component-element';
import { Component } from './component';
import { ComponentProps } from './component-props';

export class ImageBasedComponentProps extends ComponentProps {
    public imageTag: string;

    public fillImage?: HTMLImageElement;

    constructor() {
        super();

        this.onCreate = this.onCreate.bind(this);
        this.onInitialize = this.onInitialize.bind(this);
        this.onSetCreationFill = this.onSetCreationFill.bind(this);
        this.onGetFillImage = this.onGetFillImage.bind(this);
        this.onSize = this.onSize.bind(this);

        this.initialize = this.onInitialize;
        this.create = this.onCreate;
        this.setCreationFill = this.onSetCreationFill;
        this.getFillImage = this.onGetFillImage;
        this.size.add(this.onSize);
        this.imageTag = 'push-button';
    }

    protected onCreate(props: ElementCreationProps) {
        const m = Model.create(props.width, props.height);
        BitmapResource.create('navigate', Component.baseImagePath + this.imageTag + '.png').addTo(m);
        m.stroke = 'Black';
        const rect = RectangleElement.create(0, 0, props.width, props.height)
            .setFill('image(0.75;' + this.imageTag + ')')
            .addTo(m);
        rect.id = 'r';
        ModelResource.create(props.id, m).addTo(props.model);
        const el = new ComponentElement(props.id, props.left, props.top, props.width, props.height);
        props.model.add(el);
        return el;
    }

    protected onInitialize(callback: (success: boolean) => void) {
        const self = this;
        const image = new Image();
        image.onload = e => {
            self.fillImage = image;
            if (callback) {
                callback(true);
            }
        };
        image.onerror = e => {
            self.fillImage = undefined;
            if (callback) {
                callback(false);
            }
        };
        if (Component.baseImagePath.substr(0, 1) === ':') {
            image.src = Component.baseImagePath.substr(1) + this.imageTag + '.png';
        }
        else {
            image.src = Component.baseImagePath + this.imageTag + '.png';
        }
    }

    protected onSetCreationFill(c: CanvasRenderingContext2D): void {
        if (this.fillImage) {
            const pattern = c.createPattern(this.fillImage, 'repeat');
            if (pattern) {
                c.fillStyle = pattern;
            }
        }
    }

    protected onGetFillImage(callback: (image: HTMLImageElement) => void) {
        if (this.fillImage) {
            if (callback) {
                callback(this.fillImage);
            }
        }
        else {
            const image = new Image();
            image.onload = e => {
                if (callback) {
                    callback(image);
                }
            };
            if (Component.baseImagePath.substr(0, 1) === ':') {
                image.src = Component.baseImagePath.substr(1) + this.imageTag + '.png';
            }
            else {
                image.src = Component.baseImagePath + this.imageTag + '.png';
            }
        }
    }

    protected onSize(c: Component, props: ElementSizeProps) {
        const el = props.element;
        if (!el.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        if (!el.id) {
            throw new Error(ErrorMessages.ElementIdUndefined);
        }
        const size = props.size;
        const res = el.model.resourceManager.get(el.id) as ModelResource;
        if (!res.model) {
            throw new Error(ErrorMessages.ModelUndefined);
        }
        res.model.setSize(size);
        const r = res.model.elementWithId('r');
        if (r) {
            r.setSize(Size.create(size.width, size.height));
        }
    }
}
