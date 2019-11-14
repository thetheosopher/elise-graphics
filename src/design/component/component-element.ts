import { Point } from '../../core/point';
import { Size } from '../../core/size';
import { ModelElement } from '../../elements/model-element';
import { Component } from './component';

/**
 * Extends ModelElement class to add Component property
 */
export class ComponentElement extends ModelElement {
    /**
     * Element component
     */
    public component?: Component;

    /**
     * True if component accepts drag/drop
     */
    public acceptsDrag: boolean = false;

    /**
     * Extra, arbitrary component properties
     */
    public props: any;

    /**
     * @param source - Model element ID used as resource key in parent model
     * @param left - Element X coordinate
     * @param top - Element Y coordinate
     * @param width - Element width
     * @param height - Element height
     */
    constructor(source: string, left: number, top: number, width: number, height: number) {
        super();
        this.source = source;
        this.setSize(new Size(width, height));
        this.setLocation(new Point(left, top));
    }
}
