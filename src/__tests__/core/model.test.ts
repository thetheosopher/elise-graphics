import { ErrorMessages } from '../../core/error-messages';
import { Model } from '../../core/model';
import { RectangleElement } from '../../elements/rectangle-element';

test('model size', () => {
    const model = Model.create(10, 20);
    expect(model.size).toBe('10x20');
    const size = model.getSize();
    if (size !== undefined) {
        expect(size.width).toBe(10);
        expect(size.height).toBe(20);
    }
    else {
        throw new Error(ErrorMessages.SizeUndefined);
    }
});

test('add model elements', () => {
    const model = Model.create(100, 100);
    const rect1 = RectangleElement.create(0, 0, 50, 50);
    const index1 = model.add(rect1);
    expect(model.elements.length).toBe(1);
    expect(index1).toBe(0);
    const rect2 = RectangleElement.create(10, 10, 50, 50);
    let index2 = model.add(rect2);
    expect(model.elements.length).toBe(2);
    expect(index2).toBe(1);
    const rect3 = RectangleElement.create(20, 20, 50, 50);
    let index3 = model.addBottom(rect3);
    expect(index3).toBe(0);
    index2 = model.elements.indexOf(rect1);
    expect(index2).toBe(1);
    index2 = model.remove(rect2);
    expect(index2).toBe(2);
    index3 = model.elements.indexOf(rect2);
    expect(index3).toBe(-1);
});
