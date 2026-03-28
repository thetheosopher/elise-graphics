import { ElementBase } from './element-base';
import { IElementCreator } from './element-creator';
import { ElementCreatorRegistration } from './element-creator-registration';
import { ArcElement } from './arc-element';
import { ArrowElement } from './arrow-element';
import { EllipseElement } from './ellipse-element';
import { ImageElement } from './image-element';
import { LineElement } from './line-element';
import { ModelElement } from './model-element';
import { PathElement } from './path-element';
import { PolygonElement } from './polygon-element';
import { PolylineElement } from './polyline-element';
import { RegularPolygonElement } from './regular-polygon-element';
import { RectangleElement } from './rectangle-element';
import { RingElement } from './ring-element';
import { SpriteElement } from './sprite-element';
import { TextElement } from './text-element';
import { WedgeElement } from './wedge-element';

/**
 * Central element creator registry
 */
export class ElementFactory {
    /**
     * Element creators
     */
    public static ElementCreators: ElementCreatorRegistration[] = [];

    /**
     * Register a new element creator
     * @param name - Name
     * @param creator - Element creator
     */
    public static registerCreator(name: string, creator: IElementCreator) {
        ElementFactory.ElementCreators.push(new ElementCreatorRegistration(name, creator));
    }

    /**
     * Create a new element given its type tag
     * @param name - Element type tag
     * @returns New element
     */
    public static create(name: string): ElementBase | undefined {
        for (const creatorRegistration of ElementFactory.ElementCreators) {
            if (creatorRegistration.name === name) {
                return creatorRegistration.creator.create();
            }
        }
        return undefined;
    }
}

/* Register element creators */
ElementFactory.registerCreator('image', ImageElement);
ElementFactory.registerCreator('sprite', SpriteElement);
ElementFactory.registerCreator('rectangle', RectangleElement);
ElementFactory.registerCreator('line', LineElement);
ElementFactory.registerCreator('polyline', PolylineElement);
ElementFactory.registerCreator('polygon', PolygonElement);
ElementFactory.registerCreator('path', PathElement);
ElementFactory.registerCreator('arc', ArcElement);
ElementFactory.registerCreator('regularPolygon', RegularPolygonElement);
ElementFactory.registerCreator('arrow', ArrowElement);
ElementFactory.registerCreator('wedge', WedgeElement);
ElementFactory.registerCreator('ring', RingElement);
ElementFactory.registerCreator('ellipse', EllipseElement);
ElementFactory.registerCreator('text', TextElement);
ElementFactory.registerCreator('model', ModelElement);
