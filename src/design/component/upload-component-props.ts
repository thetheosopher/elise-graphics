import { Model } from '../../core/model';
import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { ElementCreationProps } from '../../elements/element-creation-props';
import { ElementSizeProps } from '../../elements/element-size-props';
import { RectangleElement } from '../../elements/rectangle-element';
import { UploadCompletionProps } from '../../elements/upload-completion-props';
import { UploadProgressProps } from '../../elements/upload-progress-props';
import { BitmapResource } from '../../resource/bitmap-resource';
import { ModelResource } from '../../resource/model-resource';
import { Component } from '../component/component';
import { ComponentElement } from './component-element';
import { ImageBasedComponentProps } from './image-based-component-props';
import { ProgressRectangle } from './progress-rectangle';
/**
 * Extends [[ImageBasedComponentProps]] to describe a component supporting uploadable attachments
 */
export class UploadComponentProps extends ImageBasedComponentProps {
    public fileExtensions: string[] = [ '*' ];

    constructor() {
        super();

        this.onCreate = this.onCreate.bind(this);
        this.onSize = this.onSize.bind(this);
        this.onUploadStart = this.onUploadStart.bind(this);
        this.onUploadProgress = this.onUploadProgress.bind(this);
        this.onUploadComplete = this.onUploadComplete.bind(this);

        this.imageTag = 'upload';
        this.acceptsDrag = true;

        this.size.add(this.onSize);
        this.uploadStart.add(this.onUploadStart);
        this.uploadProgress.add(this.onUploadProgress);
        this.uploadComplete.add(this.onUploadComplete);

        this.initialize = this.onInitialize;
        this.create = this.onCreate;
        this.setCreationFill = this.onSetCreationFill;
        this.getFillImage = this.onGetFillImage;
    }

    /**
     * Handles component element creation
     */
    protected onCreate(props: ElementCreationProps) {
        const m = Model.create(props.width, props.height);
        BitmapResource.create(this.imageTag, Component.baseImagePath + this.imageTag + '.png').addTo(m);
        m.stroke = 'Black';
        // m.fill = '#c0ffffff';
        const rect = RectangleElement.create(0, 0, props.width, props.height)
            .setFill('image(0.75;' + this.imageTag + ')')
            .addTo(m);
        rect.id = 'r';

        // Upload indicator
        const upframe = RectangleElement.create(0, props.height - 8, props.width, 8)
            .setFill('#00000000')
            .setStroke('#00000000')
            .addTo(m);
        upframe.id = 'upframe';
        const upind = new ProgressRectangle();
        upind
            .setLocation(Point.create(0, props.height - 8))
            .setSize(Size.create(0, 8))
            .setFill('#00000000')
            .setStroke('#00000000')
            .addTo(m);
        upind.id = 'upind';
        upind.percent = 0;

        ModelResource.create(props.id, m).addTo(props.model);
        const el = new ComponentElement(props.id, props.left, props.top, props.width, props.height);
        props.model.add(el);
        return el;
    }

    protected onSize(c: Component, props: ElementSizeProps) {
        const el = props.element;
        if (!el.model) {
            throw new Error('Model is undefined.');
        }
        if (!el.id) {
            throw new Error('Element ID is undefined.');
        }
        const size = props.size;
        const res = el.model.resourceManager.get(el.id) as ModelResource;
        if (!res.model) {
            throw new Error('Model is undefined.');
        }
        res.model.setSize(size);
        const r = res.model.elementWithId('r');
        if (r) {
            r.setSize(Size.create(size.width, size.height));
        }
        const upframe = res.model.elementWithId('upframe');
        if (upframe) {
            upframe.setSize(Size.create(size.width, 8));
            upframe.setLocation(Point.create(0, size.height - 8));
        }
        const upind = res.model.elementWithId('upind') as ProgressRectangle;
        upind.setSize(Size.create(size.width * upind.percent, 8));
        upind.setLocation(Point.create(0, size.height - 8));
    }

    protected onUploadStart(c: Component, el: ComponentElement) {
        if (!el.model) {
            throw new Error('Model is undefined.');
        }
        if (!el.id) {
            throw new Error('Element ID is undefined.');
        }
        const res = el.model.resourceManager.get(el.id) as ModelResource;
        if (!res.model) {
            throw new Error('Model is undefined.');
        }
        const upframe = res.model.elementWithId('upframe');
        if (upframe) {
            upframe.setStroke('Black').setFill('#80000080');
        }
        const upind = res.model.elementWithId('upind') as ProgressRectangle;
        upind.setSize(Size.create(0, 8));
        upind.setFill('#ffff00');
    }

    protected onUploadComplete(c: Component, props: UploadCompletionProps) {
        const el = props.element;
        if (!el.model) {
            throw new Error('Model is undefined.');
        }
        if (!el.id) {
            throw new Error('Element ID is undefined.');
        }
        const res = el.model.resourceManager.get(el.id) as ModelResource;
        if (!res.model) {
            throw new Error('Model is undefined.');
        }
        const upframe = res.model.elementWithId('upframe');
        if (upframe) {
            upframe.setStroke('#00000000').setFill('#00000000');
        }
        const upind = res.model.elementWithId('upind');
        if (upind) {
            upind.setSize(Size.create(0, 8));
            upind.setFill('#00000000');
        }
    }

    protected onUploadProgress(c: Component, props: UploadProgressProps) {
        const el = props.element;
        if (!el.model || !el.id) {
            throw new Error('Model is undefined.');
        }
        const res = el.model.resourceManager.get(el.id) as ModelResource;
        if (!res.model) {
            throw new Error('Model is undefined.');
        }
        const upind = res.model.elementWithId('upind') as ProgressRectangle;
        const upframe = res.model.elementWithId('upframe');
        upind.percent = props.percent / 100;
        if (upframe) {
            const frameSize = upframe.getSize();
            if (frameSize) {
                upind.setSize(Size.create(frameSize.width * upind.percent, 8));
            }
        }
    }
}
