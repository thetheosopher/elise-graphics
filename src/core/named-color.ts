import { Color } from './color';

export class NamedColor {
    public name: string;
    public color: Color;

    constructor(name: string, color: Color) {
        this.name = name;
        this.color = color;
    }
}
