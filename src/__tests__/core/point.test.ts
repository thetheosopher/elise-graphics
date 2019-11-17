import { Point } from '../../core/point';

test('origin point', () => {
    expect(Point.Origin.equals(new Point(0, 0))).toBe(true);
});

test('point create', () => {
    expect(Point.create(1, 2).equals(new Point(1, 2))).toBe(true);
});

test('point parse string', () => {
    expect(Point.parse('1,2').equals(new Point(1, 2)));
});

test('point parse point', () => {
    expect(Point.parse(Point.create(1, 2)).equals(new Point(1, 2)));
});

test('point parse invalid 1', () => {
    expect(() => Point.parse('abc')).toThrowError(Error);
});

test('point parse invalid 2', () => {
    expect(() => Point.parse('1,2,3')).toThrowError(Error);
});

test('size parse invalid 3', () => {
    expect(() => Point.parse(',2')).toThrowError(Error);
});

test('point scale', () => {
    const point = Point.create(3, 4);
    const scaled = Point.scale(point, 2, 3);
    expect(scaled.x).toBe(6);
    expect(scaled.y).toBe(12);
});

test('point clone', () => {
    const point = Point.create(3, 4);
    const cloned = point.clone();
    expect(cloned.x).toBe(3);
    expect(cloned.y).toBe(4);
});

test('point equals', () => {
    const point1 = Point.create(3, 4);
    const point2 = Point.create(3, 4);
    expect(point1.equals(point2)).toBe(true);
});

test('point not equals 1', () => {
    const point1 = Point.create(3, 4);
    const point2 = Point.create(3, 3);
    expect(point1.equals(point2)).toBe(false);
});

test('point not equals 2', () => {
    const point1 = Point.create(3, 4);
    const point2 = Point.create(4, 4);
    expect(point1.equals(point2)).toBe(false);
});

test('point to string', () => {
    const point = Point.create(3, 4);
    expect(point.toString()).toBe('3,4');
});
