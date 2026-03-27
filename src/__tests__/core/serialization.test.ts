import { Model } from '../../core/model';
import { RectangleElement } from '../../elements/rectangle-element';
import { EllipseElement } from '../../elements/ellipse-element';
import { LineElement } from '../../elements/line-element';
import { TextElement } from '../../elements/text-element';
import { PathElement } from '../../elements/path-element';
import { PolygonElement } from '../../elements/polygon-element';
import { PolylineElement } from '../../elements/polyline-element';
import { ImageElement } from '../../elements/image-element';
import { ModelElement } from '../../elements/model-element';
import { LinearGradientFill } from '../../fill/linear-gradient-fill';
import { Point } from '../../core/point';

test('model serialize/parse empty model', () => {
    const model = Model.create(800, 600);
    model.setFill('White');
    const json = model.formattedJSON();
    const parsed = Model.parse(json);
    expect(parsed.getSize()!.width).toBe(800);
    expect(parsed.getSize()!.height).toBe(600);
    expect(parsed.fill).toBe('White');
    expect(parsed.elements.length).toBe(0);
});

test('model serialize/parse with rectangle', () => {
    const model = Model.create(400, 300);
    const rect = RectangleElement.create(10, 20, 100, 50);
    rect.setFill('Blue').setStroke('Black,2');
    rect.id = 'myRect';
    model.add(rect);

    const json = model.rawJSON();
    const parsed = Model.parse(json);
    expect(parsed.elements.length).toBe(1);
    const pRect = parsed.elements[0] as RectangleElement;
    expect(pRect.type).toBe('rectangle');
    expect(pRect.id).toBe('myRect');
    expect(pRect.fill).toBe('Blue');
    expect(pRect.stroke).toBe('Black,2');
    expect(pRect.getLocation()!.x).toBe(10);
});

test('model serialize/parse with ellipse', () => {
    const model = Model.create(400, 300);
    const el = EllipseElement.create(200, 150, 80, 50);
    el.setFill('Red');
    model.add(el);

    const json = model.formattedJSON();
    const parsed = Model.parse(json);
    const pEl = parsed.elements[0] as EllipseElement;
    expect(pEl.type).toBe('ellipse');
    expect(pEl.radiusX).toBe(80);
    expect(pEl.radiusY).toBe(50);
    expect(pEl.getCenter()!.x).toBe(200);
    expect(pEl.getCenter()!.y).toBe(150);
});

test('model serialize/parse with line', () => {
    const model = Model.create(400, 300);
    const line = LineElement.create(10, 20, 300, 250);
    line.setStroke('Green,3');
    model.add(line);

    const json = model.rawJSON();
    const parsed = Model.parse(json);
    const pLine = parsed.elements[0] as LineElement;
    expect(pLine.type).toBe('line');
    expect(pLine.getP1()!.x).toBe(10);
    expect(pLine.getP2()!.x).toBe(300);
    expect(pLine.stroke).toBe('Green,3');
});

test('model serialize/parse with text', () => {
    const model = Model.create(400, 300);
    const txt = TextElement.create('Hello World', 10, 10, 200, 50);
    txt.setTypeface('Arial').setTypesize(16).setFill('Black');
    model.add(txt);

    const json = model.formattedJSON();
    const parsed = Model.parse(json);
    const pTxt = parsed.elements[0] as TextElement;
    expect(pTxt.type).toBe('text');
    expect(pTxt.text).toBe('Hello World');
    expect(pTxt.typeface).toBe('Arial');
    expect(pTxt.typesize).toBe(16);
});

test('model serialize/parse with rich text properties', () => {
    const model = Model.create(400, 300);
    const txt = TextElement.create(undefined, 10, 10, 200, 50);
    txt.setTypeface('Arial').setTypesize(16).setFill('Black');
    txt.setLetterSpacing(1.25).setTextDecoration('underline');
    txt.setRichText([
        { text: 'Hello ' },
        { text: 'World', typestyle: 'italic', decoration: 'underline' },
    ]);
    model.add(txt);

    const json = model.formattedJSON();
    const parsed = Model.parse(json);
    const pTxt = parsed.elements[0] as TextElement;
    expect(pTxt.letterSpacing).toBe(1.25);
    expect(pTxt.textDecoration).toBe('underline');
    expect(pTxt.richText).toEqual([
        { text: 'Hello ' },
        { text: 'World', typestyle: 'italic', decoration: 'underline' },
    ]);
});

test('model serialize/parse with path', () => {
    const model = Model.create(400, 300);
    const path = PathElement.create();
    path.add('m(10,20)').add('l(100,20)').add('l(100,100)').add('z');
    path.setFill('Purple');
    model.add(path);

    const json = model.rawJSON();
    const parsed = Model.parse(json);
    const pPath = parsed.elements[0] as PathElement;
    expect(pPath.type).toBe('path');
    expect(pPath.pointCount()).toBe(path.pointCount());
});

test('model serialize/parse with polygon', () => {
    const model = Model.create(400, 300);
    const poly = PolygonElement.create();
    poly.addPoint(Point.create(0, 0));
    poly.addPoint(Point.create(100, 0));
    poly.addPoint(Point.create(50, 80));
    poly.setFill('Yellow');
    model.add(poly);

    const json = model.formattedJSON();
    const parsed = Model.parse(json);
    const pPoly = parsed.elements[0] as PolygonElement;
    expect(pPoly.type).toBe('polygon');
    expect(pPoly.pointCount()).toBe(3);
});

test('model serialize/parse with polyline', () => {
    const model = Model.create(400, 300);
    const pl = PolylineElement.create();
    pl.addPoint(Point.create(0, 0));
    pl.addPoint(Point.create(50, 80));
    pl.addPoint(Point.create(100, 10));
    pl.setStroke('Blue,2');
    pl.smoothPoints = true;
    model.add(pl);

    const json = model.rawJSON();
    const parsed = Model.parse(json);
    const pPl = parsed.elements[0] as PolylineElement;
    expect(pPl.type).toBe('polyline');
    expect(pPl.pointCount()).toBe(3);
    expect(pPl.smoothPoints).toBe(true);
});

test('model serialize/parse with gradient fill', () => {
    const model = Model.create(400, 300);
    const rect = RectangleElement.create(0, 0, 400, 300);
    const grad = LinearGradientFill.create('0,0', '400,0');
    grad.addFillStop('Red', 0);
    grad.addFillStop('Blue', 1);
    rect.fill = grad;
    model.add(rect);

    const json = model.formattedJSON();
    const parsed = Model.parse(json);
    const pRect = parsed.elements[0] as RectangleElement;
    expect(pRect.fill).toBeDefined();
    const pFill = pRect.fill as LinearGradientFill;
    expect(pFill.type).toBe('linearGradient');
    expect(pFill.stops.length).toBe(2);
    expect(pFill.stops[0].color).toBe('Red');
    expect(pFill.stops[1].color).toBe('Blue');
});

test('model serialize/parse with multiple elements preserves order', () => {
    const model = Model.create(400, 300);
    const r1 = RectangleElement.create(0, 0, 100, 100);
    r1.id = 'first';
    const r2 = RectangleElement.create(50, 50, 100, 100);
    r2.id = 'second';
    const r3 = RectangleElement.create(100, 100, 100, 100);
    r3.id = 'third';
    model.add(r1);
    model.add(r2);
    model.add(r3);

    const json = model.rawJSON();
    const parsed = Model.parse(json);
    expect(parsed.elements.length).toBe(3);
    expect(parsed.elements[0].id).toBe('first');
    expect(parsed.elements[1].id).toBe('second');
    expect(parsed.elements[2].id).toBe('third');
});

test('model clone creates independent copy', () => {
    const model = Model.create(400, 300);
    model.setFill('White');
    const rect = RectangleElement.create(10, 20, 100, 50);
    rect.setFill('Red');
    model.add(rect);

    const cloned = model.clone();
    expect(cloned.getSize()!.width).toBe(400);
    expect(cloned.elements.length).toBe(1);
    expect(cloned.elements[0].fill).toBe('Red');

    // Verify independence
    (cloned.elements[0] as RectangleElement).setFill('Green');
    expect(model.elements[0].fill).toBe('Red');
});

test('model elementWithId', () => {
    const model = Model.create(400, 300);
    const rect = RectangleElement.create(0, 0, 100, 100);
    rect.id = 'target';
    model.add(RectangleElement.create(0, 0, 50, 50));
    model.add(rect);
    model.add(RectangleElement.create(0, 0, 50, 50));

    const found = model.elementWithId('target');
    expect(found).toBe(rect);
});

test('model elementWithId not found', () => {
    const model = Model.create(400, 300);
    model.add(RectangleElement.create(0, 0, 50, 50));
    const found = model.elementWithId('nonexistent');
    expect(found).toBeUndefined();
});

test('model add duplicate element throws', () => {
    const model = Model.create(400, 300);
    const rect = RectangleElement.create(0, 0, 50, 50);
    model.add(rect);
    expect(() => model.add(rect)).toThrow();
});

test('model element interaction flags from command tags', () => {
    const model = Model.create(400, 300);
    const rect = RectangleElement.create(0, 0, 100, 100);
    rect.mouseEnter = 'pushFill(Yellow)';
    rect.mouseLeave = 'popFill';
    model.add(rect);

    const json = model.rawJSON();
    const parsed = Model.parse(json);
    const pRect = parsed.elements[0];
    expect(pRect.interactive).toBe(true);
    expect(pRect.mouseEnter).toBe('pushFill(Yellow)');
    expect(pRect.mouseLeave).toBe('popFill');
});

test('model serialize with image element', () => {
    const model = Model.create(400, 300);
    const img = ImageElement.create('logo', 10, 20, 200, 100);
    img.opacity = 0.75;
    model.add(img);

    const json = model.formattedJSON();
    const parsed = Model.parse(json);
    const pImg = parsed.elements[0] as ImageElement;
    expect(pImg.type).toBe('image');
    expect(pImg.source).toBe('logo');
    expect(pImg.opacity).toBe(0.75);
});

test('model serialize with model element', () => {
    const model = Model.create(400, 300);
    const mel = ModelElement.create('submodel', 10, 20, 200, 100);
    model.add(mel);

    const json = model.rawJSON();
    const parsed = Model.parse(json);
    const pMel = parsed.elements[0] as ModelElement;
    expect(pMel.type).toBe('model');
    expect(pMel.source).toBe('submodel');
});

test('model formattedJSON produces indented output', () => {
    const model = Model.create(100, 100);
    const json = model.formattedJSON();
    expect(json).toContain('\n');
    expect(json).toContain(' ');
});

test('model rawJSON produces compact output', () => {
    const model = Model.create(100, 100);
    const json = model.rawJSON();
    expect(json).not.toContain('\n');
});
