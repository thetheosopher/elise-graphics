import { EliseException } from '../../core/elise-exception';
import { Model } from '../../core/model';
import { Component } from './component';
import { ComponentElement } from './component-element';
import { ComponentProps } from './component-props';

export class ComponentRegistry {
    /**
     * Registered component array
     */
    public static components: Component[] = [];

    public static initializeAllCallback?: (success: boolean) => void;

    /**
     * Registers a component type
     * @param name - Component type name
     * @param props - Component template props
     */
    public static registerComponent(name: string, props: ComponentProps) {
        ComponentRegistry.unregisterComponent(name);
        const component = new Component(name, props);
        ComponentRegistry.components.push(component);
    }

    /**
     * Unregisters a component type
     * @param name - Component type name
     */
    public static unregisterComponent(name: string) {
        const index = ComponentRegistry.getComponentIndex(name);
        if (index !== -1) {
            ComponentRegistry.components.splice(index, 1);
        }
    }

    /**
     * Retrieves index of registered component name or -1 if not found
     * @param name - Component type name
     * @returns Component index or -1 if not found
     */
    public static getComponentIndex(name: string): number {
        for (let i = 0; i < ComponentRegistry.components.length; i++) {
            if (ComponentRegistry.components[i].name === name) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Retrieves component by type name
     * @param name - Component type name
     * @returns Component or undefined if not found
     */
    public static getComponent(name: string): Component | undefined {
        const index = ComponentRegistry.getComponentIndex(name);
        if (index !== -1) {
            return ComponentRegistry.components[index];
        }
        return undefined;
    }

    /**
     * Determines if component type name is registered
     * @param name - Component type name
     * @returns True if component type name is registered
     */
    public static isComponentRegistered(name: string): boolean {
        return ComponentRegistry.getComponentIndex(name) !== -1;
    }

    /**
     * Creates element of a component type
     * @param model - Target model for element
     * @param type - Component type name
     * @param id - New element ID
     * @param left - X coordinate
     * @param top - Y coordinate
     * @param width - Width
     * @param height - Height
     * @param props - Extra element properties
     */
    public static createComponentElement(
        model: Model,
        type: string,
        id: string,
        left: number,
        top: number,
        width: number,
        height: number,
        props: any
    ): ComponentElement {
        const component = ComponentRegistry.getComponent(type);
        if (!component) {
            throw new Error(`Component type ${type} not registered.`);
        }
        const el = component.CreateElement(model, id, left, top, width, height, props);
        return el;
    }

    /**
     * Calls fill image retrieval function to retrieve fill image
     * @param type - Component type name
     * @param callback - Image callback function (image: HTMLImageElement)
     */
    public static getComponentFillImage(type: string, callback: (image: HTMLImageElement) => void): void {
        const component = ComponentRegistry.getComponent(type);
        if (!component) {
            throw new Error(`Component type ${type} not registered.`);
        }
        component.GetFillImage(callback);
    }

    public static initializeAll(callback?: (success: boolean) => void) {
        ComponentRegistry.initializeAllCallback = callback;

        for (const component of ComponentRegistry.components) {
            if (!component.initialized && component.initialize) {
                component.initialize((success) => {
                    if (success) {
                        component.initialized = true;
                        ComponentRegistry.initializeAll(ComponentRegistry.initializeAllCallback);
                    }
                    else {
                        if (ComponentRegistry.initializeAllCallback) {
                            ComponentRegistry.initializeAllCallback(false);
                            ComponentRegistry.initializeAllCallback = undefined;
                        }
                    }
                });
                return;
            }
        }

        if (ComponentRegistry.initializeAllCallback) {
            ComponentRegistry.initializeAllCallback(true);
            ComponentRegistry.initializeAllCallback = undefined;
        }
    }
}
