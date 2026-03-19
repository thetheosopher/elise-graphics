import { RectangleElement } from '../../elements/rectangle-element';
import { EllipseElement } from '../../elements/ellipse-element';
import { LineElement } from '../../elements/line-element';
import { PathElement } from '../../elements/path-element';
import { PolygonElement } from '../../elements/polygon-element';
import { PolylineElement } from '../../elements/polyline-element';
import { TextElement } from '../../elements/text-element';
import { ImageElement } from '../../elements/image-element';
import { SpriteElement } from '../../elements/sprite-element';
import { ModelElement } from '../../elements/model-element';
import { Point } from '../../core/point';
import { PointDepth } from '../../core/point-depth';
import { Size } from '../../core/size';

// --- RectangleElement ---

test('rectangle create with dimensions', () => {
    const rect = RectangleElement.create(10, 20, 100, 200);
    const loc = rect.getLocation()!;
    const size = rect.getSize();
    expect(loc.x).toBe(10);
    expect(loc.y).toBe(20);
    expect(size!.width).toBe(100);
    expect(size!.height).toBe(200);
});

test('rectangle create default', () => {
    const rect = RectangleElement.create();
    expect(rect.type).toBe('rectangle');
});

test('rectangle capabilities', () => {
    const rect = RectangleElement.create(0, 0, 50, 50);
    expect(rect.canFill()).toBe(true);
    expect(rect.canStroke()).toBe(true);
    expect(rect.canMove()).toBe(true);
    expect(rect.canResize()).toBe(true);
});

test('rectangle serialize/parse round-trip', () => {
    const rect = RectangleElement.create(10, 20, 100, 200);
    rect.setFill('Red').setStroke('Black,2');
    rect.id = 'rect1';
    const serialized = rect.serialize();
    expect(serialized.type).toBe('rectangle');
    expect(serialized.id).toBe('rect1');
    expect(serialized.fill).toBe('Red');
    expect(serialized.stroke).toBe('Black,2');

    const parsed = new RectangleElement();
    parsed.parse(serialized);
    expect(parsed.id).toBe('rect1');
    expect(parsed.fill).toBe('Red');
    expect(parsed.stroke).toBe('Black,2');
    const loc = parsed.getLocation()!;
    expect(loc.x).toBe(10);
    expect(loc.y).toBe(20);
});

test('rectangle clone', () => {
    const rect = RectangleElement.create(10, 20, 100, 200);
    rect.setFill('Blue');
    const cloned = rect.clone() as RectangleElement;
    expect(cloned.fill).toBe('Blue');
    expect(cloned.getLocation()!.x).toBe(10);
    expect(cloned.getSize()!.width).toBe(100);
});

test('rectangle set location and size', () => {
    const rect = RectangleElement.create(0, 0, 50, 50);
    rect.setLocation(Point.create(30, 40));
    rect.setSize({ width: 200, height: 300 } as any);
    expect(rect.getLocation()!.x).toBe(30);
    expect(rect.getLocation()!.y).toBe(40);
    expect(rect.getSize()!.width).toBe(200);
    expect(rect.getSize()!.height).toBe(300);
});

test('rectangle fluent setters', () => {
    const rect = RectangleElement.create(0, 0, 50, 50);
    const result = rect.setFill('Green').setStroke('Red').setInteractive(true);
    expect(result).toBe(rect);
    expect(rect.fill).toBe('Green');
    expect(rect.stroke).toBe('Red');
    expect(rect.interactive).toBe(true);
});

test('rectangle typed locationValue accessor', () => {
    const rect = RectangleElement.create(0, 0, 50, 50);
    rect.locationValue = Point.create(12, 34);
    expect(rect.locationValue!.x).toBe(12);
    expect(rect.locationValue!.y).toBe(34);
    expect(rect.location).toBe('12,34');
});

test('rectangle typed sizeValue accessor', () => {
    const rect = RectangleElement.create(0, 0, 50, 50);
    rect.sizeValue = Size.create(80, 90);
    expect(rect.sizeValue!.width).toBe(80);
    expect(rect.sizeValue!.height).toBe(90);
    expect(rect.size).toBe('80x90');
});

test('rectangle parseFluent', () => {
    const serialized = RectangleElement.create(10, 20, 30, 40).serialize();
    const rect = new RectangleElement().parseFluent(serialized).setFill('Blue');
    expect(rect.getLocation()!.x).toBe(10);
    expect(rect.getLocation()!.y).toBe(20);
    expect(rect.getSize()!.width).toBe(30);
    expect(rect.getSize()!.height).toBe(40);
    expect(rect.fill).toBe('Blue');
});

test('rectangle cloneToFluent', () => {
    const source = RectangleElement.create(1, 2, 3, 4).setFill('Green');
    const target = source.cloneToFluent(new RectangleElement());
    expect(target.getLocation()!.x).toBe(1);
    expect(target.getLocation()!.y).toBe(2);
    expect(target.getSize()!.width).toBe(3);
    expect(target.getSize()!.height).toBe(4);
    expect(target.fill).toBe('Green');
});

// --- EllipseElement ---

test('ellipse create', () => {
    const el = EllipseElement.create(100, 100, 50, 30);
    expect(el.type).toBe('ellipse');
    expect(el.radiusX).toBe(50);
    expect(el.radiusY).toBe(30);
});

test('ellipse create circle', () => {
    const el = EllipseElement.create(100, 100, 50);
    expect(el.radiusX).toBe(50);
    expect(el.radiusY).toBe(50);
});

test('ellipse center coordinates', () => {
    const el = EllipseElement.create(100, 200, 50, 30);
    const center = el.getCenter()!;
    expect(center.x).toBe(100);
    expect(center.y).toBe(200);
});

test('ellipse bounds', () => {
    const el = EllipseElement.create(100, 100, 50, 30);
    const bounds = el.getBounds()!;
    expect(bounds.x).toBe(50);
    expect(bounds.y).toBe(70);
    expect(bounds.width).toBe(100);
    expect(bounds.height).toBe(60);
});

test('ellipse capabilities', () => {
    const el = EllipseElement.create(100, 100, 50, 30);
    expect(el.canFill()).toBe(true);
    expect(el.canStroke()).toBe(true);
});

test('ellipse serialize/parse round-trip', () => {
    const el = EllipseElement.create(100, 200, 50, 30);
    el.setFill('Red');
    const serialized = el.serialize();
    expect(serialized.type).toBe('ellipse');
    expect(serialized.radiusX).toBe(50);
    expect(serialized.radiusY).toBe(30);

    const parsed = new EllipseElement();
    parsed.parse(serialized);
    expect(parsed.radiusX).toBe(50);
    expect(parsed.radiusY).toBe(30);
    expect(parsed.getCenter()!.x).toBe(100);
    expect(parsed.getCenter()!.y).toBe(200);
});

test('ellipse clone', () => {
    const el = EllipseElement.create(100, 200, 50, 30);
    el.setFill('Blue');
    const cloned = el.clone() as EllipseElement;
    expect(cloned.radiusX).toBe(50);
    expect(cloned.radiusY).toBe(30);
    expect(cloned.fill).toBe('Blue');
});

// --- LineElement ---

test('line create', () => {
    const line = LineElement.create(10, 20, 100, 200);
    expect(line.type).toBe('line');
    expect(line.getP1()!.x).toBe(10);
    expect(line.getP1()!.y).toBe(20);
    expect(line.getP2()!.x).toBe(100);
    expect(line.getP2()!.y).toBe(200);
});

test('line capabilities', () => {
    const line = LineElement.create(0, 0, 100, 100);
    expect(line.canStroke()).toBe(true);
    expect(line.canResize()).toBe(false);
    expect(line.canMovePoint()).toBe(true);
});

test('line point count', () => {
    const line = LineElement.create(0, 0, 100, 100);
    expect(line.pointCount()).toBe(2);
});

test('line get/set points', () => {
    const line = LineElement.create(0, 0, 100, 100);
    line.setPointAt(0, Point.create(5, 10), PointDepth.Simple);
    line.setPointAt(1, Point.create(50, 60), PointDepth.Simple);
    expect(line.getPointAt(0)!.x).toBe(5);
    expect(line.getPointAt(0)!.y).toBe(10);
    expect(line.getPointAt(1)!.x).toBe(50);
    expect(line.getPointAt(1)!.y).toBe(60);
});

test('line invalid point index throws', () => {
    const line = LineElement.create(0, 0, 100, 100);
    expect(() => line.setPointAt(5, Point.create(0, 0), PointDepth.Simple)).toThrow();
});

test('line serialize/parse round-trip', () => {
    const line = LineElement.create(10, 20, 100, 200);
    line.setStroke('Red,3');
    const serialized = line.serialize();
    expect(serialized.type).toBe('line');
    expect(serialized.stroke).toBe('Red,3');

    const parsed = new LineElement();
    parsed.parse(serialized);
    expect(parsed.getP1()!.x).toBe(10);
    expect(parsed.getP1()!.y).toBe(20);
    expect(parsed.getP2()!.x).toBe(100);
    expect(parsed.getP2()!.y).toBe(200);
});

test('line translate', () => {
    const line = LineElement.create(10, 20, 100, 200);
    line.translate(5, 10);
    expect(line.getP1()!.x).toBe(15);
    expect(line.getP1()!.y).toBe(30);
    expect(line.getP2()!.x).toBe(105);
    expect(line.getP2()!.y).toBe(210);
});

// --- PathElement ---

test('path create and add commands', () => {
    const path = PathElement.create();
    expect(path.type).toBe('path');
    path.add('m(10,20)').add('l(100,20)').add('l(100,100)').add('z');
    expect(path.pointCount()).toBeGreaterThan(0);
});

test('path capabilities', () => {
    const path = PathElement.create();
    expect(path.canFill()).toBe(true);
    expect(path.canStroke()).toBe(true);
    expect(path.canEditPoints()).toBe(true);
});

test('path serialize/parse round-trip', () => {
    const path = PathElement.create();
    path.add('m(10,20)').add('l(100,20)').add('l(100,100)').add('z');
    path.setFill('Green');
    const serialized = path.serialize();
    expect(serialized.type).toBe('path');
    expect(serialized.commands).toContain('m(10,20)');

    const parsed = new PathElement();
    parsed.parse(serialized);
    expect(parsed.pointCount()).toBe(path.pointCount());
});

test('path setCommands', () => {
    const path = PathElement.create();
    path.setCommands('m(0,0) l(50,0) l(50,50) z');
    expect(path.pointCount()).toBe(3);
});

// --- PolygonElement ---

test('polygon create and add points', () => {
    const poly = PolygonElement.create();
    expect(poly.type).toBe('polygon');
    poly.addPoint(Point.create(0, 0));
    poly.addPoint(Point.create(100, 0));
    poly.addPoint(Point.create(100, 100));
    expect(poly.pointCount()).toBe(3);
});

test('polygon setPoints from string', () => {
    const poly = PolygonElement.create();
    poly.setPoints('0,0 100,0 100,100 0,100');
    expect(poly.pointCount()).toBe(4);
});

test('polygon setPoints from array', () => {
    const poly = PolygonElement.create();
    poly.setPoints([Point.create(0, 0), Point.create(50, 0), Point.create(25, 50)]);
    expect(poly.pointCount()).toBe(3);
});

test('polygon capabilities', () => {
    const poly = PolygonElement.create();
    expect(poly.canFill()).toBe(true);
    expect(poly.canStroke()).toBe(true);
    expect(poly.canEditPoints()).toBe(true);
});

test('polygon serialize/parse round-trip', () => {
    const poly = PolygonElement.create();
    poly.addPoint(Point.create(0, 0));
    poly.addPoint(Point.create(100, 0));
    poly.addPoint(Point.create(50, 80));
    poly.setFill('Yellow');
    const serialized = poly.serialize();
    expect(serialized.type).toBe('polygon');

    const parsed = new PolygonElement();
    parsed.parse(serialized);
    expect(parsed.pointCount()).toBe(3);
});

test('polygon clone', () => {
    const poly = PolygonElement.create();
    poly.addPoint(Point.create(0, 0));
    poly.addPoint(Point.create(100, 0));
    poly.addPoint(Point.create(50, 80));
    poly.setFill('Red');
    const cloned = poly.clone() as PolygonElement;
    expect(cloned.pointCount()).toBe(3);
    expect(cloned.fill).toBe('Red');
});

// --- PolylineElement ---

test('polyline create and add points', () => {
    const pl = PolylineElement.create();
    expect(pl.type).toBe('polyline');
    pl.addPoint(Point.create(0, 0));
    pl.addPoint(Point.create(50, 50));
    pl.addPoint(Point.create(100, 0));
    expect(pl.pointCount()).toBe(3);
});

test('polyline smoothPoints', () => {
    const pl = PolylineElement.create();
    pl.smoothPoints = true;
    expect(pl.smoothPoints).toBe(true);
});

test('polyline capabilities', () => {
    const pl = PolylineElement.create();
    expect(pl.canStroke()).toBe(true);
    expect(pl.canFill()).toBe(false);
});

test('polyline serialize/parse round-trip', () => {
    const pl = PolylineElement.create();
    pl.addPoint(Point.create(0, 0));
    pl.addPoint(Point.create(50, 50));
    pl.smoothPoints = true;
    pl.setStroke('Blue,2');
    const serialized = pl.serialize();
    expect(serialized.type).toBe('polyline');
    expect(serialized.smoothPoints).toBe(true);

    const parsed = new PolylineElement();
    parsed.parse(serialized);
    expect(parsed.pointCount()).toBe(2);
    expect(parsed.smoothPoints).toBe(true);
});

// --- TextElement ---

test('text create with text', () => {
    const txt = TextElement.create('Hello', 10, 20, 200, 50);
    expect(txt.type).toBe('text');
    expect(txt.text).toBe('Hello');
});

test('text fluent setters', () => {
    const txt = TextElement.create('Hello', 0, 0, 200, 50);
    txt.setTypeface('Arial').setTypesize(16).setTypestyle('bold').setAlignment('center,middle');
    expect(txt.typeface).toBe('Arial');
    expect(txt.typesize).toBe(16);
    expect(txt.typestyle).toBe('bold');
    expect(txt.alignment).toBe('center,middle');
});

test('text capabilities', () => {
    const txt = TextElement.create('Hello', 0, 0, 200, 50);
    expect(txt.canFill()).toBe(true);
    expect(txt.canStroke()).toBe(true);
});

test('text serialize/parse round-trip', () => {
    const txt = TextElement.create('Hello World', 10, 20, 200, 50);
    txt.setTypeface('Arial, sans-serif').setTypesize(16).setTypestyle('bold,italic');
    txt.setAlignment('center,middle');
    txt.setFill('Black');
    const serialized = txt.serialize();
    expect(serialized.type).toBe('text');
    expect(serialized.text).toBe('Hello World');
    expect(serialized.typeface).toBe('Arial, sans-serif');
    expect(serialized.typesize).toBe(16);

    const parsed = new TextElement();
    parsed.parse(serialized);
    expect(parsed.text).toBe('Hello World');
    expect(parsed.typeface).toBe('Arial, sans-serif');
    expect(parsed.typesize).toBe(16);
    expect(parsed.typestyle).toBe('bold,italic');
    expect(parsed.alignment).toBe('center,middle');
});

test('text setText clears source', () => {
    const txt = TextElement.create(undefined, 0, 0, 200, 50);
    txt.setSource('my-resource');
    expect(txt.source).toBe('my-resource');
    txt.setText('Direct text');
    expect(txt.text).toBe('Direct text');
    expect(txt.source).toBeUndefined();
});

test('text setSource clears text', () => {
    const txt = TextElement.create('Hello', 0, 0, 200, 50);
    txt.setSource('my-resource');
    expect(txt.source).toBe('my-resource');
    expect(txt.text).toBeUndefined();
});

// --- ImageElement ---

test('image create', () => {
    const img = ImageElement.create('my-bitmap', 10, 20, 200, 150);
    expect(img.type).toBe('image');
    expect(img.source).toBe('my-bitmap');
    expect(img.opacity).toBe(1);
});

test('image capabilities', () => {
    const img = ImageElement.create('test', 0, 0, 100, 100);
    expect(img.canStroke()).toBe(true);
    expect(img.canFill()).toBe(false);
});

test('image serialize/parse round-trip', () => {
    const img = ImageElement.create('my-bitmap', 10, 20, 200, 150);
    img.opacity = 0.5;
    const serialized = img.serialize();
    expect(serialized.type).toBe('image');
    expect(serialized.source).toBe('my-bitmap');
    expect(serialized.opacity).toBe(0.5);

    const parsed = new ImageElement();
    parsed.parse(serialized);
    expect(parsed.source).toBe('my-bitmap');
    expect(parsed.opacity).toBe(0.5);
});

test('image opacity default not serialized', () => {
    const img = ImageElement.create('test', 0, 0, 100, 100);
    const serialized = img.serialize();
    expect(serialized.opacity).toBeUndefined();
});

test('image resource keys', () => {
    const img = ImageElement.create('my-bitmap', 0, 0, 100, 100);
    const keys = img.getResourceKeys();
    expect(keys).toContain('my-bitmap');
});

// --- ModelElement ---

test('model element create', () => {
    const mel = ModelElement.create('my-model', 10, 20, 400, 300);
    expect(mel.type).toBe('model');
    expect(mel.source).toBe('my-model');
});

test('model element serialize/parse round-trip', () => {
    const mel = ModelElement.create('my-model', 10, 20, 400, 300);
    mel.opacity = 0.8;
    const serialized = mel.serialize();
    expect(serialized.type).toBe('model');
    expect(serialized.source).toBe('my-model');
    expect(serialized.opacity).toBe(0.8);

    const parsed = new ModelElement();
    parsed.parse(serialized);
    expect(parsed.source).toBe('my-model');
    expect(parsed.opacity).toBe(0.8);
});

// --- SpriteElement ---

test('sprite create', () => {
    const spr = SpriteElement.create(10, 20, 64, 64);
    expect(spr.type).toBe('sprite');
    expect(spr.frames!.length).toBe(0);
});
