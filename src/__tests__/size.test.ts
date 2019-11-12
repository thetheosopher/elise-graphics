import { Size } from '../core/size';

test('empty size', () => {
    expect(Size.Empty.equals(new Size(0, 0))).toBeTruthy();
});

test('size create', () => {
    expect(Size.create(1, 2).equals(new Size(1, 2))).toBeTruthy();
});

test('size parse string', () => {
    expect(Size.parse('1x2').equals(new Size(1, 2)));
})

test('size parse size', () => {
    expect(Size.parse(Size.create(1, 2)).equals(new Size(1, 2)));
})

test('size parse invalid 1', () => {
    expect(() => Size.parse('abc')).toThrowError(Error);
});

test('size parse invalid 2', () => {
    expect(() => Size.parse('1x2x3')).toThrowError(Error);
});

test('size parse invalid 3', () => {
    expect(() => Size.parse('x2')).toThrowError(Error);
});