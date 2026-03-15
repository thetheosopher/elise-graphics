interface ColorLike {
    a: number;
    r: number;
    g: number;
    b: number;
}

/**
 * Describes a color with a well-known name
 */
export class NamedColor {
    public name: string;
    public color: ColorLike;

    constructor(name: string, color: ColorLike) {
        this.name = name;
        this.color = color;
    }
}
