import { StrokeInfo } from '../../core/stroke-info';
import { RectangleElement } from '../../elements/rectangle-element';

test('stroke info parse color only', () => {
    const el = RectangleElement.create(0, 0, 100, 100);
    el.setStroke('Red');
    const info = StrokeInfo.getStrokeInfo(el);
    expect(info.strokeType).toBe('color');
    expect(info.strokeWidth).toBe(1);
});

test('stroke info parse color with width', () => {
    const el = RectangleElement.create(0, 0, 100, 100);
    el.setStroke('Blue,3');
    const info = StrokeInfo.getStrokeInfo(el);
    expect(info.strokeType).toBe('color');
    expect(info.strokeWidth).toBe(3);
});

test('stroke info parse hex color', () => {
    const el = RectangleElement.create(0, 0, 100, 100);
    el.setStroke('#FF0000');
    const info = StrokeInfo.getStrokeInfo(el);
    expect(info.strokeType).toBe('color');
    expect(info.strokeWidth).toBe(1);
});

test('stroke info parse hex color with width', () => {
    const el = RectangleElement.create(0, 0, 100, 100);
    el.setStroke('#00FF00,2');
    const info = StrokeInfo.getStrokeInfo(el);
    expect(info.strokeType).toBe('color');
    expect(info.strokeWidth).toBe(2);
});

test('stroke info no stroke returns none', () => {
    const el = RectangleElement.create(0, 0, 100, 100);
    const info = StrokeInfo.getStrokeInfo(el);
    expect(info.strokeType).toBe('none');
});

test('stroke info parse rgb color without width', () => {
    const el = RectangleElement.create(0, 0, 100, 100);
    el.setStroke('rgb(95,145,210)');
    const info = StrokeInfo.getStrokeInfo(el);
    expect(info.strokeType).toBe('color');
    expect(info.strokeWidth).toBe(1);
    expect(info.strokeColor).toBe('#5f91d2');
});

test('stroke info parse rgba color without width', () => {
    const el = RectangleElement.create(0, 0, 100, 100);
    el.setStroke('rgba(95,145,210,0.5)');
    const info = StrokeInfo.getStrokeInfo(el);
    expect(info.strokeType).toBe('color');
    expect(info.strokeWidth).toBe(1);
    expect(info.strokeOpacity).toBe(128);
});

test('stroke info parse rgba color with width suffix', () => {
    const el = RectangleElement.create(0, 0, 100, 100);
    el.setStroke('rgba(95,145,210,0.5),4');
    const info = StrokeInfo.getStrokeInfo(el);
    expect(info.strokeType).toBe('color');
    expect(info.strokeWidth).toBe(4);
    expect(info.strokeOpacity).toBe(128);
});
