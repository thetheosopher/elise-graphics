import { Matrix2D } from '../../core/matrix-2d';

test('identity matrix', () => {
    const m = Matrix2D.IDENTITY;
    expect(m.m11).toBe(1);
    expect(m.m12).toBe(0);
    expect(m.m21).toBe(0);
    expect(m.m22).toBe(1);
    expect(m.offsetX).toBe(0);
    expect(m.offsetY).toBe(0);
});

test('matrix create', () => {
    const m = Matrix2D.create(2, 0, 0, 3, 10, 20);
    expect(m.m11).toBe(2);
    expect(m.m12).toBe(0);
    expect(m.m21).toBe(0);
    expect(m.m22).toBe(3);
    expect(m.offsetX).toBe(10);
    expect(m.offsetY).toBe(20);
});

test('matrix translate', () => {
    const m = Matrix2D.create(1, 0, 0, 1, 0, 0);
    m.translate(5, 10);
    expect(m.offsetX).toBe(5);
    expect(m.offsetY).toBe(10);
});

test('matrix scale', () => {
    const m = Matrix2D.create(1, 0, 0, 1, 0, 0);
    m.scale(2, 3);
    expect(m.m11).toBe(2);
    expect(m.m22).toBe(3);
});

test('matrix rotate', () => {
    const m = Matrix2D.create(1, 0, 0, 1, 0, 0);
    m.rotate(Math.PI / 2); // 90 degrees
    expect(m.m11).toBeCloseTo(0, 10);
    expect(m.m12).toBeCloseTo(1, 10);
    expect(m.m21).toBeCloseTo(-1, 10);
    expect(m.m22).toBeCloseTo(0, 10);
});

test('matrix multiply', () => {
    const a = Matrix2D.create(2, 0, 0, 2, 0, 0); // scale(2,2)
    const b = Matrix2D.create(1, 0, 0, 1, 10, 20); // translate(10,20)
    const result = Matrix2D.multiply(a, b);
    expect(result.m11).toBe(2);
    expect(result.m22).toBe(2);
    expect(result.offsetX).toBe(10);
    expect(result.offsetY).toBe(20);
});

test('matrix cloneFrom', () => {
    const source = Matrix2D.create(2, 3, 4, 5, 6, 7);
    const target = Matrix2D.create(0, 0, 0, 0, 0, 0);
    target.cloneFrom(source);
    expect(target.m11).toBe(2);
    expect(target.m12).toBe(3);
    expect(target.m21).toBe(4);
    expect(target.m22).toBe(5);
    expect(target.offsetX).toBe(6);
    expect(target.offsetY).toBe(7);
});

test('matrix chainable operations', () => {
    const m = Matrix2D.create(1, 0, 0, 1, 0, 0);
    const result = m.scale(2, 2).translate(5, 5);
    expect(result).toBe(m); // chainable returns this
});
