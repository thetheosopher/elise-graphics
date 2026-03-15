import type { Point } from './point';
import type { ScalingInfo } from './scaling-info';
import type { Size } from './size';
import type { ElementBase } from '../elements/element-base';
import type { Resource } from '../resource/resource';

/**
 * Interface for resource manager used by elements and fill system
 */
export interface IResourceManager {
    get(key: string, localeId?: string): Resource | undefined;
    currentLocaleId?: string;
}

/**
 * Abstraction over Model to break circular dependencies.
 * Used by FillFactory, renderers, and other modules that need
 * Model capabilities without importing the concrete class.
 */
export interface IModel {
    elements: ElementBase[];
    resources: Resource[];
    resourceManager: IResourceManager;
    basePath: string;
    getSize(): Size | undefined;
    getFillScale(el: ElementBase): ScalingInfo;
    setElementStroke(c: CanvasRenderingContext2D, el: ElementBase): boolean;
    setRenderTransform(c: CanvasRenderingContext2D, transform: string, location: Point): void;
    renderToContext(c: CanvasRenderingContext2D, scale?: number): void;
    add(el: ElementBase): number;
}
