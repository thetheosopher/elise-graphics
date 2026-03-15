import { Model } from '../../core/model';
import { ModelEvent } from '../../core/model-event';

test('model event', () => {
    const evt = new ModelEvent<number>();
    const testmodel = Model.create(1, 1);
    testmodel.id = 'test';
    let output1: number | undefined = 0;
    let output2: number | undefined = 0;
    let model1: unknown;
    let model2: unknown;
    const handler1 = (model: unknown, value?: number) => {
        output1 = value;
        model1 = model;
    };
    const handler2 = (model: unknown, value?: number) => {
        output2 = value;
        model2 = model;
    };
    evt.add(handler1);
    evt.add(handler2);
    evt.trigger(testmodel, 1);
    expect(output1).toBe(1);
    expect(model1).toBe(testmodel);
    expect(output2).toBe(1);
    expect(model2).toBe(testmodel);
    evt.remove(handler1);
    evt.trigger(testmodel, 2);
    expect(output1).toBe(1);
    expect(output2).toBe(2);
    evt.clear();
});
