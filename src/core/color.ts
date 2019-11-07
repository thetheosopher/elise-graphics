import { ErrorMessages } from './error-messages';
import { NamedColor } from './named-color';

export class Color {
    public static Transparent = new Color(0, 255, 255, 255);
    public static AliceBlue = new Color(255, 240, 248, 255);
    public static AntiqueWhite = new Color(255, 250, 235, 215);
    public static Aqua = new Color(255, 0, 255, 255);
    public static Aquamarine = new Color(255, 127, 255, 212);
    public static Azure = new Color(255, 240, 255, 255);
    public static Beige = new Color(255, 245, 245, 220);
    public static Bisque = new Color(255, 255, 228, 196);
    public static Black = new Color(255, 0, 0, 0);
    public static BlanchedAlmond = new Color(255, 255, 235, 205);
    public static Blue = new Color(255, 0, 0, 255);
    public static BlueViolet = new Color(255, 138, 43, 226);
    public static Brown = new Color(255, 165, 42, 42);
    public static BurlyWood = new Color(255, 222, 184, 135);
    public static CadetBlue = new Color(255, 95, 158, 160);
    public static Chartreuse = new Color(255, 127, 255, 0);
    public static Chocolate = new Color(255, 210, 105, 30);
    public static Coral = new Color(255, 255, 127, 80);
    public static CornflowerBlue = new Color(255, 100, 149, 237);
    public static Cornsilk = new Color(255, 255, 248, 220);
    public static Crimson = new Color(255, 220, 20, 60);
    public static Cyan = new Color(255, 0, 255, 255);
    public static DarkBlue = new Color(255, 0, 0, 139);
    public static DarkCyan = new Color(255, 0, 139, 139);
    public static DarkGoldenrod = new Color(255, 184, 134, 11);
    public static DarkGray = new Color(255, 169, 169, 169);
    public static DarkGreen = new Color(255, 0, 100, 0);
    public static DarkKhaki = new Color(255, 189, 183, 107);
    public static DarkMagenta = new Color(255, 139, 0, 139);
    public static DarkOliveGreen = new Color(255, 85, 107, 47);
    public static DarkOrange = new Color(255, 255, 140, 0);
    public static DarkOrchid = new Color(255, 153, 50, 204);
    public static DarkRed = new Color(255, 139, 0, 0);
    public static DarkSalmon = new Color(255, 233, 150, 122);
    public static DarkSeaGreen = new Color(255, 143, 188, 139);
    public static DarkSlateBlue = new Color(255, 72, 61, 139);
    public static DarkSlateGray = new Color(255, 47, 79, 79);
    public static DarkTurquoise = new Color(255, 0, 206, 209);
    public static DarkViolet = new Color(255, 148, 0, 211);
    public static DeepPink = new Color(255, 255, 20, 147);
    public static DeepSkyBlue = new Color(255, 0, 191, 255);
    public static DimGray = new Color(255, 105, 105, 105);
    public static DodgerBlue = new Color(255, 30, 144, 255);
    public static Firebrick = new Color(255, 178, 34, 34);
    public static FloralWhite = new Color(255, 255, 250, 240);
    public static ForestGreen = new Color(255, 34, 139, 34);
    public static Fuchsia = new Color(255, 255, 0, 255);
    public static Gainsboro = new Color(255, 220, 220, 220);
    public static GhostWhite = new Color(255, 248, 248, 255);
    public static Gold = new Color(255, 255, 215, 0);
    public static Goldenrod = new Color(255, 218, 165, 32);
    public static Gray = new Color(255, 128, 128, 128);
    public static Green = new Color(255, 0, 128, 0);
    public static GreenYellow = new Color(255, 173, 255, 47);
    public static Honeydew = new Color(255, 240, 255, 240);
    public static HotPink = new Color(255, 255, 105, 180);
    public static IndianRed = new Color(255, 205, 92, 92);
    public static Indigo = new Color(255, 75, 0, 130);
    public static Ivory = new Color(255, 255, 255, 240);
    public static Khaki = new Color(255, 240, 230, 140);
    public static Lavender = new Color(255, 230, 230, 250);
    public static LavenderBlush = new Color(255, 255, 240, 245);
    public static LawnGreen = new Color(255, 124, 252, 0);
    public static LemonChiffon = new Color(255, 255, 250, 205);
    public static LightBlue = new Color(255, 173, 216, 230);
    public static LightCoral = new Color(255, 240, 128, 128);
    public static LightCyan = new Color(255, 224, 255, 255);
    public static LightGoldenrodYellow = new Color(255, 250, 250, 210);
    public static LightGray = new Color(255, 211, 211, 211);
    public static LightGreen = new Color(255, 144, 238, 144);
    public static LightPink = new Color(255, 255, 182, 193);
    public static LightSalmon = new Color(255, 255, 160, 122);
    public static LightSeaGreen = new Color(255, 32, 178, 170);
    public static LightSkyBlue = new Color(255, 135, 206, 250);
    public static LightSlateGray = new Color(255, 119, 136, 153);
    public static LightSteelBlue = new Color(255, 176, 196, 222);
    public static LightYellow = new Color(255, 255, 255, 224);
    public static Lime = new Color(255, 0, 255, 0);
    public static LimeGreen = new Color(255, 50, 205, 50);
    public static Linen = new Color(255, 250, 240, 230);
    public static Magenta = new Color(255, 255, 0, 255);
    public static Maroon = new Color(255, 128, 0, 0);
    public static MediumAquamarine = new Color(255, 102, 205, 170);
    public static MediumBlue = new Color(255, 0, 0, 205);
    public static MediumOrchid = new Color(255, 186, 85, 211);
    public static MediumPurple = new Color(255, 147, 112, 219);
    public static MediumSeaGreen = new Color(255, 60, 179, 113);
    public static MediumSlateBlue = new Color(255, 123, 104, 238);
    public static MediumSpringGreen = new Color(255, 0, 250, 154);
    public static MediumTurquoise = new Color(255, 72, 209, 204);
    public static MediumVioletRed = new Color(255, 199, 21, 133);
    public static MidnightBlue = new Color(255, 25, 25, 112);
    public static MintCream = new Color(255, 245, 255, 250);
    public static MistyRose = new Color(255, 255, 228, 225);
    public static Moccasin = new Color(255, 255, 228, 181);
    public static NavajoWhite = new Color(255, 255, 222, 173);
    public static Navy = new Color(255, 0, 0, 128);
    public static OldLace = new Color(255, 253, 245, 230);
    public static Olive = new Color(255, 128, 128, 0);
    public static OliveDrab = new Color(255, 107, 142, 35);
    public static Orange = new Color(255, 255, 165, 0);
    public static OrangeRed = new Color(255, 255, 69, 0);
    public static Orchid = new Color(255, 218, 112, 214);
    public static PaleGoldenrod = new Color(255, 238, 232, 170);
    public static PaleGreen = new Color(255, 152, 251, 152);
    public static PaleTurquoise = new Color(255, 175, 238, 238);
    public static PaleVioletRed = new Color(255, 219, 112, 147);
    public static PapayaWhip = new Color(255, 255, 239, 213);
    public static PeachPuff = new Color(255, 255, 218, 185);
    public static Peru = new Color(255, 205, 133, 63);
    public static Pink = new Color(255, 255, 192, 203);
    public static Plum = new Color(255, 221, 160, 221);
    public static PowderBlue = new Color(255, 176, 224, 230);
    public static Purple = new Color(255, 128, 0, 128);
    public static Red = new Color(255, 255, 0, 0);
    public static RosyBrown = new Color(255, 188, 143, 143);
    public static RoyalBlue = new Color(255, 65, 105, 225);
    public static SaddleBrown = new Color(255, 139, 69, 19);
    public static Salmon = new Color(255, 250, 128, 114);
    public static SandyBrown = new Color(255, 244, 164, 96);
    public static SeaGreen = new Color(255, 46, 139, 87);
    public static SeaShell = new Color(255, 255, 245, 238);
    public static Sienna = new Color(255, 160, 82, 45);
    public static Silver = new Color(255, 192, 192, 192);
    public static SkyBlue = new Color(255, 135, 206, 235);
    public static SlateBlue = new Color(255, 106, 90, 205);
    public static SlateGray = new Color(255, 112, 128, 144);
    public static Snow = new Color(255, 255, 250, 250);
    public static SpringGreen = new Color(255, 0, 255, 127);
    public static SteelBlue = new Color(255, 70, 130, 180);
    public static Tan = new Color(255, 210, 180, 140);
    public static Teal = new Color(255, 0, 128, 128);
    public static Thistle = new Color(255, 216, 191, 216);
    public static Tomato = new Color(255, 255, 99, 71);
    public static Turquoise = new Color(255, 64, 224, 208);
    public static Violet = new Color(255, 238, 130, 238);
    public static Wheat = new Color(255, 245, 222, 179);
    public static White = new Color(255, 255, 255, 255);
    public static WhiteSmoke = new Color(255, 245, 245, 245);
    public static Yellow = new Color(255, 255, 255, 0);
    public static YellowGreen = new Color(255, 154, 205, 50);

    public static NamedColors: NamedColor[] = [];

    /**
     * Color factory function
     * @param a - Alpha component (0-255)
     * @param r - Red component (0-255)
     * @param g - Green component (0-255)
     * @param b - Blue component (0-255)
     * @returns New color
     */
    public static create(a: number, r: number, g: number, b: number): Color {
        return new Color(a, r, g, b);
    }

    /**
     * Parses a string representation of a color into a color instance,
     * handling known color names and hex formatted color strings
     * @param color - String representation of color
     * @returns Parsed color instance
     */
    public static parse(color: string): Color {
        let a: number;
        let r: number;
        let g: number;
        let b: number;

        // Parse hex prefixed color
        if (color.charAt(0) === '#') {
            switch (color.length) {
                // Six digits
                case 7:
                    r = parseInt(color.substring(1, 3), 16);
                    g = parseInt(color.substring(3, 5), 16);
                    b = parseInt(color.substring(5, 7), 16);
                    return new Color(255, r, g, b);

                // Eight digits - with alpha
                case 9:
                    a = parseInt(color.substring(1, 3), 16);
                    r = parseInt(color.substring(3, 5), 16);
                    g = parseInt(color.substring(5, 7), 16);
                    b = parseInt(color.substring(7, 9), 16);
                    return new Color(a, r, g, b);

                default:
                    throw new Error(ErrorMessages.InvalidColorString + ': ' + color);
            }
        }

        let evalString = color.toLowerCase();
        let alpha = 1;
        if (color.indexOf(';') !== -1) {
            const colorParts = evalString.split(';');
            evalString = colorParts[1];
            alpha = parseFloat(colorParts[0]);
            if (alpha > 1) {
                alpha = 1;
            }
            else if (alpha < 0) {
                alpha = 0;
            }
        }

        // Lookup known color
        if(evalString === 'transparent') {
            return Color.Transparent;
        }
        for (const namedColor of Color.NamedColors) {
            if (namedColor.name.toLowerCase() === evalString) {
                if (alpha === 255) {
                    return namedColor.color;
                }
                else {
                    return new Color(alpha * 255, namedColor.color.r, namedColor.color.g, namedColor.color.b);
                }
            }
        }
        return Color.Transparent;
    }

    /**
     * Alpha component (0-255)
     */
    public a: number;

    /**
     * Red component (0-255)
     */
    public r: number;

    /**
     * Green component (0-255)
     */
    public g: number;

    /**
     * Blue component (0-255)
     */
    public b: number;

    /**
     * Color name
     */
    public name?: string;

    /**
     * Creates a new color
     * @param a - Alpha component
     * @param r - Red component
     * @param g - Green component
     * @param b - Blue component
     */
    constructor(a: number, r: number, g: number, b: number) {
        this.a = a;
        this.r = r;
        this.g = g;
        this.b = b;

        this.clone = this.clone.bind(this);
        this.equals = this.equals.bind(this);
        this.equalsHue = this.equalsHue.bind(this);
        this.hexPart = this.hexPart.bind(this);
        this.toHexString = this.toHexString.bind(this);
        this.toStyleString = this.toStyleString.bind(this);
        this.toString = this.toString.bind(this);
        this.isNamedColor = this.isNamedColor.bind(this);
    }

    /**
     * Returns a string representation of this color, returning known color names for
     * color values that equate to known color values or hex formatted string otherwise
     * @returns String representation of color
     */
    public toString(): string {

        // Check for transparent
        if(this.a === 0) {
            return 'Transparent';
        }

        // Check for known color
        for (const namedColor of Color.NamedColors) {
            if (this.equalsHue(namedColor.color)) {
                if (this.a === 255) {
                    return namedColor.name;
                }
                else {
                    return this.a / 255 + ';' + namedColor.name;
                }
            }
        }

        // Not known color, return hex string
        return this.toHexString();
    }

    /**
     * Returns a # prefixed hex representation of this color
     * @returns Six or eight digit (alpha <> 255) hex prefixed color string
     */
    public toHexString(): string {
        if (this.a === 255) {
            return '#' + this.hexPart(this.r) + this.hexPart(this.g) + this.hexPart(this.b);
        }
        return '#' + this.hexPart(this.a) + this.hexPart(this.r) + this.hexPart(this.g) + this.hexPart(this.b);
    }

    /**
     * Returns an rgb(r,g,b) or rgba(r,g,b,a) string representation of color
     * @returns rgb() or rgba() (alpha <> 255) string representation.
     */
    public toStyleString(): string {
        if (this.a === 255) {
            return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
        }
        return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a / 255 + ')';
    }

    /**
     * Compares this color to another color for equality
     * @param that - Color of interest
     * @returns True if color of interest equals this
     */
    public equals(that: Color): boolean {
        return that !== null && this.a === that.a && this.r === that.r && this.g === that.g && this.b === that.b;
    }

    /**
     * Compares this color to another color for hue equality
     * @param that - Color of interest
     * @returns True if color of interest equals this without regard to alpha
     */
    public equalsHue(that: Color): boolean {
        return this.r === that.r && this.g === that.g && this.b === that.b;
    }

    /**
     * Determines if this color is a named color hue
     * @returns True if this is a named color hue
     */
    public isNamedColor(): boolean {
        const l = Color.NamedColors.length;
        for (const namedColor of Color.NamedColors) {
            if (this.equalsHue(namedColor.color)) {
                return true;
            }
        }
        return false;
    }

    public clone() {
        return new Color(this.a, this.r, this.g, this.b);
    }

    /**
     * Returns 0-255 encoded as two character hex string
     * @param n - 0-255 color component
     * @returns Two character hex string
     */
    private hexPart(n: number): string {
        if (n < 16) {
            return '0' + n.toString(16);
        }
        return n.toString(16);
    }
}

Color.NamedColors.push(new NamedColor('Transparent', Color.Transparent));
Color.NamedColors.push(new NamedColor('AliceBlue', Color.AliceBlue));
Color.NamedColors.push(new NamedColor('AntiqueWhite', Color.AntiqueWhite));
Color.NamedColors.push(new NamedColor('Aqua', Color.Aqua));
Color.NamedColors.push(new NamedColor('Aquamarine', Color.Aquamarine));
Color.NamedColors.push(new NamedColor('Azure', Color.Azure));
Color.NamedColors.push(new NamedColor('Beige', Color.Beige));
Color.NamedColors.push(new NamedColor('Bisque', Color.Bisque));
Color.NamedColors.push(new NamedColor('Black', Color.Black));
Color.NamedColors.push(new NamedColor('BlanchedAlmond', Color.BlanchedAlmond));
Color.NamedColors.push(new NamedColor('Blue', Color.Blue));
Color.NamedColors.push(new NamedColor('BlueViolet', Color.BlueViolet));
Color.NamedColors.push(new NamedColor('Brown', Color.Brown));
Color.NamedColors.push(new NamedColor('BurlyWood', Color.BurlyWood));
Color.NamedColors.push(new NamedColor('CadetBlue', Color.CadetBlue));
Color.NamedColors.push(new NamedColor('Chartreuse', Color.Chartreuse));
Color.NamedColors.push(new NamedColor('Chocolate', Color.Chocolate));
Color.NamedColors.push(new NamedColor('Coral', Color.Coral));
Color.NamedColors.push(new NamedColor('CornflowerBlue', Color.CornflowerBlue));
Color.NamedColors.push(new NamedColor('Cornsilk', Color.Cornsilk));
Color.NamedColors.push(new NamedColor('Crimson', Color.Crimson));
Color.NamedColors.push(new NamedColor('Cyan', Color.Cyan));
Color.NamedColors.push(new NamedColor('DarkBlue', Color.DarkBlue));
Color.NamedColors.push(new NamedColor('DarkCyan', Color.DarkCyan));
Color.NamedColors.push(new NamedColor('DarkGoldenrod', Color.DarkGoldenrod));
Color.NamedColors.push(new NamedColor('DarkGray', Color.DarkGray));
Color.NamedColors.push(new NamedColor('DarkGreen', Color.DarkGreen));
Color.NamedColors.push(new NamedColor('DarkKhaki', Color.DarkKhaki));
Color.NamedColors.push(new NamedColor('DarkMagenta', Color.DarkMagenta));
Color.NamedColors.push(new NamedColor('DarkOliveGreen', Color.DarkOliveGreen));
Color.NamedColors.push(new NamedColor('DarkOrange', Color.DarkOrange));
Color.NamedColors.push(new NamedColor('DarkOrchid', Color.DarkOrchid));
Color.NamedColors.push(new NamedColor('DarkRed', Color.DarkRed));
Color.NamedColors.push(new NamedColor('DarkSalmon', Color.DarkSalmon));
Color.NamedColors.push(new NamedColor('DarkSeaGreen', Color.DarkSeaGreen));
Color.NamedColors.push(new NamedColor('DarkSlateBlue', Color.DarkSlateBlue));
Color.NamedColors.push(new NamedColor('DarkSlateGray', Color.DarkSlateGray));
Color.NamedColors.push(new NamedColor('DarkTurquoise', Color.DarkTurquoise));
Color.NamedColors.push(new NamedColor('DarkViolet', Color.DarkViolet));
Color.NamedColors.push(new NamedColor('DeepPink', Color.DeepPink));
Color.NamedColors.push(new NamedColor('DeepSkyBlue', Color.DeepSkyBlue));
Color.NamedColors.push(new NamedColor('DimGray', Color.DimGray));
Color.NamedColors.push(new NamedColor('DodgerBlue', Color.DodgerBlue));
Color.NamedColors.push(new NamedColor('Firebrick', Color.Firebrick));
Color.NamedColors.push(new NamedColor('FloralWhite', Color.FloralWhite));
Color.NamedColors.push(new NamedColor('ForestGreen', Color.ForestGreen));
Color.NamedColors.push(new NamedColor('Fuchsia', Color.Fuchsia));
Color.NamedColors.push(new NamedColor('Gainsboro', Color.Gainsboro));
Color.NamedColors.push(new NamedColor('GhostWhite', Color.GhostWhite));
Color.NamedColors.push(new NamedColor('Gold', Color.Gold));
Color.NamedColors.push(new NamedColor('Goldenrod', Color.Goldenrod));
Color.NamedColors.push(new NamedColor('Gray', Color.Gray));
Color.NamedColors.push(new NamedColor('Green', Color.Green));
Color.NamedColors.push(new NamedColor('GreenYellow', Color.GreenYellow));
Color.NamedColors.push(new NamedColor('Honeydew', Color.Honeydew));
Color.NamedColors.push(new NamedColor('HotPink', Color.HotPink));
Color.NamedColors.push(new NamedColor('IndianRed', Color.IndianRed));
Color.NamedColors.push(new NamedColor('Indigo', Color.Indigo));
Color.NamedColors.push(new NamedColor('Ivory', Color.Ivory));
Color.NamedColors.push(new NamedColor('Khaki', Color.Khaki));
Color.NamedColors.push(new NamedColor('Lavender', Color.Lavender));
Color.NamedColors.push(new NamedColor('LavenderBlush', Color.LavenderBlush));
Color.NamedColors.push(new NamedColor('LawnGreen', Color.LawnGreen));
Color.NamedColors.push(new NamedColor('LemonChiffon', Color.LemonChiffon));
Color.NamedColors.push(new NamedColor('LightBlue', Color.LightBlue));
Color.NamedColors.push(new NamedColor('LightCoral', Color.LightCoral));
Color.NamedColors.push(new NamedColor('LightCyan', Color.LightCyan));
Color.NamedColors.push(new NamedColor('LightGoldenrodYellow', Color.LightGoldenrodYellow));
Color.NamedColors.push(new NamedColor('LightGray', Color.LightGray));
Color.NamedColors.push(new NamedColor('LightGreen', Color.LightGreen));
Color.NamedColors.push(new NamedColor('LightPink', Color.LightPink));
Color.NamedColors.push(new NamedColor('LightSalmon', Color.LightSalmon));
Color.NamedColors.push(new NamedColor('LightSeaGreen', Color.LightSeaGreen));
Color.NamedColors.push(new NamedColor('LightSkyBlue', Color.LightSkyBlue));
Color.NamedColors.push(new NamedColor('LightSlateGray', Color.LightSlateGray));
Color.NamedColors.push(new NamedColor('LightSteelBlue', Color.LightSteelBlue));
Color.NamedColors.push(new NamedColor('LightYellow', Color.LightYellow));
Color.NamedColors.push(new NamedColor('Lime', Color.Lime));
Color.NamedColors.push(new NamedColor('LimeGreen', Color.LimeGreen));
Color.NamedColors.push(new NamedColor('Linen', Color.Linen));
Color.NamedColors.push(new NamedColor('Magenta', Color.Magenta));
Color.NamedColors.push(new NamedColor('Maroon', Color.Maroon));
Color.NamedColors.push(new NamedColor('MediumAquamarine', Color.MediumAquamarine));
Color.NamedColors.push(new NamedColor('MediumBlue', Color.MediumBlue));
Color.NamedColors.push(new NamedColor('MediumOrchid', Color.MediumOrchid));
Color.NamedColors.push(new NamedColor('MediumPurple', Color.MediumPurple));
Color.NamedColors.push(new NamedColor('MediumSeaGreen', Color.MediumSeaGreen));
Color.NamedColors.push(new NamedColor('MediumSlateBlue', Color.MediumSlateBlue));
Color.NamedColors.push(new NamedColor('MediumSpringGreen', Color.MediumSpringGreen));
Color.NamedColors.push(new NamedColor('MediumTurquoise', Color.MediumTurquoise));
Color.NamedColors.push(new NamedColor('MediumVioletRed', Color.MediumVioletRed));
Color.NamedColors.push(new NamedColor('MidnightBlue', Color.MidnightBlue));
Color.NamedColors.push(new NamedColor('MintCream', Color.MintCream));
Color.NamedColors.push(new NamedColor('MistyRose', Color.MistyRose));
Color.NamedColors.push(new NamedColor('Moccasin', Color.Moccasin));
Color.NamedColors.push(new NamedColor('NavajoWhite', Color.NavajoWhite));
Color.NamedColors.push(new NamedColor('Navy', Color.Navy));
Color.NamedColors.push(new NamedColor('OldLace', Color.OldLace));
Color.NamedColors.push(new NamedColor('Olive', Color.Olive));
Color.NamedColors.push(new NamedColor('OliveDrab', Color.OliveDrab));
Color.NamedColors.push(new NamedColor('Orange', Color.Orange));
Color.NamedColors.push(new NamedColor('OrangeRed', Color.OrangeRed));
Color.NamedColors.push(new NamedColor('Orchid', Color.Orchid));
Color.NamedColors.push(new NamedColor('PaleGoldenrod', Color.PaleGoldenrod));
Color.NamedColors.push(new NamedColor('PaleGreen', Color.PaleGreen));
Color.NamedColors.push(new NamedColor('PaleTurquoise', Color.PaleTurquoise));
Color.NamedColors.push(new NamedColor('PaleVioletRed', Color.PaleVioletRed));
Color.NamedColors.push(new NamedColor('PapayaWhip', Color.PapayaWhip));
Color.NamedColors.push(new NamedColor('PeachPuff', Color.PeachPuff));
Color.NamedColors.push(new NamedColor('Peru', Color.Peru));
Color.NamedColors.push(new NamedColor('Pink', Color.Pink));
Color.NamedColors.push(new NamedColor('Plum', Color.Plum));
Color.NamedColors.push(new NamedColor('PowderBlue', Color.PowderBlue));
Color.NamedColors.push(new NamedColor('Purple', Color.Purple));
Color.NamedColors.push(new NamedColor('Red', Color.Red));
Color.NamedColors.push(new NamedColor('RosyBrown', Color.RosyBrown));
Color.NamedColors.push(new NamedColor('RoyalBlue', Color.RoyalBlue));
Color.NamedColors.push(new NamedColor('SaddleBrown', Color.SaddleBrown));
Color.NamedColors.push(new NamedColor('Salmon', Color.Salmon));
Color.NamedColors.push(new NamedColor('SandyBrown', Color.SandyBrown));
Color.NamedColors.push(new NamedColor('SeaGreen', Color.SeaGreen));
Color.NamedColors.push(new NamedColor('SeaShell', Color.SeaShell));
Color.NamedColors.push(new NamedColor('Sienna', Color.Sienna));
Color.NamedColors.push(new NamedColor('Silver', Color.Silver));
Color.NamedColors.push(new NamedColor('SkyBlue', Color.SkyBlue));
Color.NamedColors.push(new NamedColor('SlateBlue', Color.SlateBlue));
Color.NamedColors.push(new NamedColor('SlateGray', Color.SlateGray));
Color.NamedColors.push(new NamedColor('Snow', Color.Snow));
Color.NamedColors.push(new NamedColor('SpringGreen', Color.SpringGreen));
Color.NamedColors.push(new NamedColor('SteelBlue', Color.SteelBlue));
Color.NamedColors.push(new NamedColor('Tan', Color.Tan));
Color.NamedColors.push(new NamedColor('Teal', Color.Teal));
Color.NamedColors.push(new NamedColor('Thistle', Color.Thistle));
Color.NamedColors.push(new NamedColor('Tomato', Color.Tomato));
Color.NamedColors.push(new NamedColor('Turquoise', Color.Turquoise));
Color.NamedColors.push(new NamedColor('Violet', Color.Violet));
Color.NamedColors.push(new NamedColor('Wheat', Color.Wheat));
Color.NamedColors.push(new NamedColor('White', Color.White));
Color.NamedColors.push(new NamedColor('WhiteSmoke', Color.WhiteSmoke));
Color.NamedColors.push(new NamedColor('Yellow', Color.Yellow));
Color.NamedColors.push(new NamedColor('YellowGreen', Color.Yellow));
