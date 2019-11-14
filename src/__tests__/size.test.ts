import { Size } from '../core/size';

test('empty size', () => {
    expect(Size.Empty.equals(new Size(0, 0))).toBe(true);
});

test('size create', () => {
    expect(Size.create(1, 2).equals(new Size(1, 2))).toBe(true);
});

test('size parse string', () => {
    expect(Size.parse('1x2').equals(new Size(1, 2)));
});

test('size parse size', () => {
    expect(Size.parse(Size.create(1, 2)).equals(new Size(1, 2)));
});

test('size parse invalid 1', () => {
    expect(() => Size.parse('abc')).toThrowError(Error);
});

test('size parse invalid 2', () => {
    expect(() => Size.parse('1x2x3')).toThrowError(Error);
});

test('size parse invalid 3', () => {
    expect(() => Size.parse('x2')).toThrowError(Error);
});

test('size scale', () => {
    const size = Size.create(3, 4);
    const scaled = Size.scale(size, 2, 3);
    expect(scaled.width).toBe(6);
    expect(scaled.height).toBe(12);
});

test('size clone', () => {
    const size = Size.create(3, 4);
    const cloned = size.clone();
    expect(cloned.width).toBe(3);
    expect(cloned.height).toBe(4);
});

test('size equals', () => {
    const size1 = Size.create(3, 4);
    const size2 = Size.create(3, 4);
    expect(size1.equals(size2)).toBe(true);
});

test('size not equals 1', () => {
    const size1 = Size.create(3, 4);
    const size2 = Size.create(3, 3);
    expect(size1.equals(size2)).toBe(false);
});

test('size not equals 2', () => {
    const size1 = Size.create(3, 4);
    const size2 = Size.create(4, 4);
    expect(size1.equals(size2)).toBe(false);
});

test('size to string', () => {
    const size1 = Size.create(3, 4);
    expect(size1.toString()).toBe('3x4');
});
