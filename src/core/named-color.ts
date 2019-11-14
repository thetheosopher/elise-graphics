import { Color } from './color';

/**
 * Describes a color with a well-known name
 */
export class NamedColor {
    public name: string;
    public color: Color;

    constructor(name: string, color: Color) {
        this.name = name;
        this.color = color;
    }
}
