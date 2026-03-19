import { Color } from '../../core/color';

test('constructor', () => {
    const color = new Color(255, 254, 253, 252);
    expect(color.a).toBe(255);
    expect(color.r).toBe(254);
    expect(color.g).toBe(253);
    expect(color.b).toBe(252);
});

test('static create', () => {
    const color = Color.create(255, 254, 253, 252);
    expect(color.a).toBe(255);
    expect(color.r).toBe(254);
    expect(color.g).toBe(253);
    expect(color.b).toBe(252);
});

test('parse six digit color', () => {
    const color = Color.parse('#fefdfc');
    expect(color.a).toBe(255);
    expect(color.r).toBe(254);
    expect(color.g).toBe(253);
    expect(color.b).toBe(252);
});

test('parse eight digit color', () => {
    const color = Color.parse('#fefdfcff');
    expect(color.r).toBe(254);
    expect(color.g).toBe(253);
    expect(color.b).toBe(252);
    expect(color.a).toBe(255);
});

test('parse named color transparent', () => {
    const color = Color.parse('Transparent');
    expect(color.a).toBe(0);
    expect(color.r).toBe(255);
    expect(color.g).toBe(255);
    expect(color.b).toBe(255);
});

test('parse named color red', () => {
    const color = Color.parse('Red');
    expect(color.a).toBe(255);
    expect(color.r).toBe(255);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0);
});

test('parse color clones instance', () => {
    const source = Color.create(200, 10, 20, 30);
    const color = Color.parse(source);
    expect(color.equals(source)).toBe(true);
    expect(color).not.toBe(source);
});

test('parse named color translucent red', () => {
    const color = Color.parse('0.5;Red');
    expect(color.a).toBe(128);
    expect(color.r).toBe(255);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0);
});

test('parse three digit hex', () => {
    const color = Color.parse('#f00');
    expect(color.a).toBe(255);
    expect(color.r).toBe(255);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0);
});

test('parse four digit hex', () => {
    const color = Color.parse('#f008');
    expect(color.a).toBe(136);
    expect(color.r).toBe(255);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0);
});

test('parse rgb format', () => {
    const color = Color.parse('rgb(254,253,252)');
    expect(color.a).toBe(255);
    expect(color.r).toBe(254);
    expect(color.g).toBe(253);
    expect(color.b).toBe(252);
});

test('parse rgba format', () => {
    const color = Color.parse('rgba(254,253,252,0.5)');
    expect(color.a).toBe(128);
    expect(color.r).toBe(254);
    expect(color.g).toBe(253);
    expect(color.b).toBe(252);
});

test('parse rgb format with spaces', () => {
    const color = Color.parse('rgb( 254 , 253 , 252 )');
    expect(color.a).toBe(255);
    expect(color.r).toBe(254);
    expect(color.g).toBe(253);
    expect(color.b).toBe(252);
});

test('parse rgba format opaque', () => {
    const color = Color.parse('rgba(255,0,0,1)');
    expect(color.a).toBe(255);
    expect(color.r).toBe(255);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0);
});

test('parse throws on invalid color name', () => {
    expect(() => Color.parse('NotAColor')).toThrow();
});

test('parse throws on invalid hex length', () => {
    expect(() => Color.parse('#12')).toThrow();
});

test('parse Transparent returns new instance', () => {
    const color = Color.parse('Transparent');
    color.a = 128;
    expect(Color.Transparent.a).toBe(0);
});

test('toStyleString round-trips through parse', () => {
    const original = new Color(128, 254, 253, 252);
    const str = original.toStyleString();
    const parsed = Color.parse(str);
    expect(parsed.r).toBe(254);
    expect(parsed.g).toBe(253);
    expect(parsed.b).toBe(252);
    expect(parsed.a).toBe(128);
});

test('toString translucent round-trips through parse', () => {
    const original = new Color(128, 255, 0, 0);
    const str = original.toString();
    const parsed = Color.parse(str);
    expect(parsed.r).toBe(255);
    expect(parsed.g).toBe(0);
    expect(parsed.b).toBe(0);
    expect(parsed.a).toBe(128);
});

test('toString named color', () => {
    const colorString = new Color(255, 255, 0, 0).toString();
    expect(colorString).toBe('Red');
});

test('toString unnamed color 1', () => {
    const colorString = new Color(255, 254, 253, 252).toString();
    expect(colorString).toBe('#fefdfc');
});

test('toString unnamed color 2', () => {
    const colorString = new Color(251, 254, 253, 252).toString();
    expect(colorString).toBe('#fefdfcfb');
});

test('toHexString unnamed color 1', () => {
    const colorString = new Color(255, 254, 253, 252).toHexString();
    expect(colorString).toBe('#fefdfc');
});

test('toHexString unnamed color 2', () => {
    const colorString = new Color(251, 254, 253, 252).toHexString();
    expect(colorString).toBe('#fefdfcfb');
});

test('toStyleString unnamed color 1', () => {
    const colorString = new Color(255, 254, 253, 252).toStyleString();
    expect(colorString).toBe(`rgb(254,253,252)`);
});

test('toStyleString unnamed color 2', () => {
    const colorString = new Color(128, 254, 253, 252).toStyleString();
    expect(colorString).toBe(`rgba(254,253,252,${128 / 255})`);
});

test('equals true', () => {
    const color1 = new Color(255, 254, 253, 252);
    const color2 = new Color(255, 254, 253, 252);
    expect(color1.equals(color2)).toBe(true);
});

test('equals false', () => {
    const color1 = new Color(255, 254, 253, 252);
    const color2 = new Color(255, 254, 253, 251);
    expect(color1.equals(color2)).toBe(false);
});

test('equalsHue true', () => {
    const color1 = new Color(255, 254, 253, 252);
    const color2 = new Color(128, 254, 253, 252);
    expect(color1.equalsHue(color2)).toBe(true);
});

test('equalsHue false', () => {
    const color1 = new Color(255, 254, 253, 252);
    const color2 = new Color(255, 254, 253, 251);
    expect(color1.equalsHue(color2)).toBe(false);
});

test('isNamedColor true', () => {
    const color = new Color(255, 255, 0, 0);
    expect(color.isNamedColor()).toBe(true);
});

test('isNamedColor false', () => {
    const color = new Color(255, 255, 254, 253);
    expect(color.isNamedColor()).toBe(false);
});

test('clone', () => {
    const color1 = new Color(255, 254, 253, 252);
    const color2 = color1.clone();
    expect(color1 === color2).toBe(false);
    expect(color1.equals(color2)).toBe(true);
});

test('named colors', () => {
    for (const namedColor of Color.NamedColors) {
        const color1 = Color.parse(namedColor.name);
        expect(color1.equals(namedColor.color)).toBe(true);
    }
});
