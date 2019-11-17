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
    const color = Color.parse('#fffefdfc');
    expect(color.a).toBe(255);
    expect(color.r).toBe(254);
    expect(color.g).toBe(253);
    expect(color.b).toBe(252);
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

test('parse named color translucent red', () => {
    const color = Color.parse('0.5;Red');
    expect(color.a).toBeCloseTo(255 * 0.5);
    expect(color.r).toBe(255);
    expect(color.g).toBe(0);
    expect(color.b).toBe(0);
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
    const colorString = new Color(254, 254, 253, 252).toString();
    expect(colorString).toBe('#fefefdfc');
});

test('toHexString unnamed color 1', () => {
    const colorString = new Color(255, 254, 253, 252).toHexString();
    expect(colorString).toBe('#fefdfc');
});

test('toHexString unnamed color 2', () => {
    const colorString = new Color(254, 254, 253, 252).toHexString();
    expect(colorString).toBe('#fefefdfc');
});

test('toStyleString unnamed color 1', () => {
    const colorString = new Color(255, 254, 253, 252).toStyleString();
    expect(colorString).toBe(`rgb(254,253,252)`);
});

test('toStyleString unnamed color 2', () => {
    const colorString = new Color(128, 254, 253, 252).toStyleString();
    expect(colorString).toBe(`rgba(254,253,252,${128/255})`);
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
    for(const namedColor of Color.NamedColors) {
        const color1 = Color.parse(namedColor.name);
        expect(color1.equals(namedColor.color)).toBe(true);
    }
});