import { Region } from '../../core/region';
import { Point } from '../../core/point';

test('region create', () => {
    const r = Region.create(10, 20, 100, 200);
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(r.width).toBe(100);
    expect(r.height).toBe(200);
});

test('region size', () => {
    const r = Region.create(10, 20, 100, 200);
    const size = r.size;
    expect(size.width).toBe(100);
    expect(size.height).toBe(200);
});

test('region location', () => {
    const r = Region.create(10, 20, 100, 200);
    const loc = r.location;
    expect(loc.x).toBe(10);
    expect(loc.y).toBe(20);
});

test('region clone', () => {
    const r = Region.create(10, 20, 100, 200);
    const c = r.clone();
    expect(c.x).toBe(10);
    expect(c.y).toBe(20);
    expect(c.width).toBe(100);
    expect(c.height).toBe(200);
});

test('region withX/withY', () => {
    const r = Region.create(10, 20, 100, 200);
    const moved = r.withX(30).withY(40);
    expect(moved.x).toBe(30);
    expect(moved.y).toBe(40);
    expect(moved.width).toBe(100);
    expect(moved.height).toBe(200);
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
});

test('region withWidth/withHeight', () => {
    const r = Region.create(10, 20, 100, 200);
    const resized = r.withWidth(120).withHeight(220);
    expect(resized.x).toBe(10);
    expect(resized.y).toBe(20);
    expect(resized.width).toBe(120);
    expect(resized.height).toBe(220);
    expect(r.width).toBe(100);
    expect(r.height).toBe(200);
});

test('region withLocation', () => {
    const r = Region.create(10, 20, 100, 200);
    const relocated = r.withLocation(Point.create(1, 2));
    expect(relocated.x).toBe(1);
    expect(relocated.y).toBe(2);
    expect(relocated.width).toBe(100);
    expect(relocated.height).toBe(200);
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
});

test('region withSize', () => {
    const r = Region.create(10, 20, 100, 200);
    const resized = r.withSize(r.size.withWidth(150).withHeight(250));
    expect(resized.x).toBe(10);
    expect(resized.y).toBe(20);
    expect(resized.width).toBe(150);
    expect(resized.height).toBe(250);
    expect(r.width).toBe(100);
    expect(r.height).toBe(200);
});

test('region containsPoint inside', () => {
    const r = Region.create(10, 20, 100, 200);
    expect(r.containsPoint(Point.create(50, 100))).toBe(true);
});

test('region containsPoint outside', () => {
    const r = Region.create(10, 20, 100, 200);
    expect(r.containsPoint(Point.create(5, 100))).toBe(false);
    expect(r.containsPoint(Point.create(50, 5))).toBe(false);
    expect(r.containsPoint(Point.create(200, 100))).toBe(false);
    expect(r.containsPoint(Point.create(50, 300))).toBe(false);
});

test('region containsCoordinate', () => {
    const r = Region.create(0, 0, 100, 100);
    expect(r.containsCoordinate(50, 50)).toBe(true);
    expect(r.containsCoordinate(150, 50)).toBe(false);
});

test('region intersectsWith overlapping', () => {
    const r1 = Region.create(0, 0, 100, 100);
    const r2 = Region.create(50, 50, 100, 100);
    expect(r1.intersectsWith(r2)).toBe(true);
});

test('region intersectsWith non-overlapping', () => {
    const r1 = Region.create(0, 0, 100, 100);
    const r2 = Region.create(200, 200, 100, 100);
    expect(r1.intersectsWith(r2)).toBe(false);
});

test('region containsRegion fully inside', () => {
    const outer = Region.create(0, 0, 200, 200);
    const inner = Region.create(10, 10, 50, 50);
    expect(outer.containsRegion(inner)).toBe(true);
});

test('region containsRegion partially outside', () => {
    const outer = Region.create(0, 0, 100, 100);
    const partial = Region.create(50, 50, 100, 100);
    expect(outer.containsRegion(partial)).toBe(false);
});

test('region containsPoint boundary', () => {
    const r = Region.create(0, 0, 100, 100);
    expect(r.containsPoint(Point.create(0, 0))).toBe(true);
    expect(r.containsPoint(Point.create(100, 100))).toBe(true);
});
