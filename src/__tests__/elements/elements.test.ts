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
    rect.setFill('Red').setStroke('Black,2').setVisible(false).setCornerRadius(12);
    rect.setShadow({ color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 4, offsetY: 5 });
    rect.setBlendMode('multiply');
    rect.setFilter('blur(2px) saturate(125%)');
    rect.id = 'rect1';
    const serialized = rect.serialize();
    expect(serialized.type).toBe('rectangle');
    expect(serialized.id).toBe('rect1');
    expect(serialized.fill).toBe('Red');
    expect(serialized.stroke).toBe('Black,2');
    expect(serialized.shadow).toEqual({ color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 4, offsetY: 5 });
    expect(serialized.blendMode).toBe('multiply');
    expect(serialized.filter).toBe('blur(2px) saturate(125%)');
    expect(serialized.visible).toBe(false);
    expect(serialized.cornerRadius).toBe(12);

    const parsed = new RectangleElement();
    parsed.parse(serialized);
    expect(parsed.id).toBe('rect1');
    expect(parsed.fill).toBe('Red');
    expect(parsed.stroke).toBe('Black,2');
    expect(parsed.shadow).toEqual({ color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 4, offsetY: 5 });
    expect(parsed.blendMode).toBe('multiply');
    expect(parsed.filter).toBe('blur(2px) saturate(125%)');
    expect(parsed.visible).toBe(false);
    expect(parsed.cornerRadii).toEqual([12, 12, 12, 12]);
    const loc = parsed.getLocation()!;
    expect(loc.x).toBe(10);
    expect(loc.y).toBe(20);
});

test('rectangle clone', () => {
    const rect = RectangleElement.create(10, 20, 100, 200);
    rect.setFill('Blue').setCornerRadii(10, 8, 6, 4).setVisible(false);
    rect.setShadow({ color: '#000000', blur: 6, offsetX: 2, offsetY: 3 });
    rect.setBlendMode('screen');
    rect.setFilter('sepia(40%)');
    rect.setClipPath({ commands: ['m0,0', 'l1,0', 'l1,1', 'z'], units: 'objectBoundingBox' });
    const cloned = rect.clone() as RectangleElement;
    expect(cloned.fill).toBe('Blue');
    expect(cloned.visible).toBe(false);
    expect(cloned.shadow).toEqual({ color: '#000000', blur: 6, offsetX: 2, offsetY: 3 });
    expect(cloned.blendMode).toBe('screen');
    expect(cloned.filter).toBe('sepia(40%)');
    expect(cloned.cornerRadii).toEqual([10, 8, 6, 4]);
    expect(cloned.clipPath).toBeDefined();
    expect(cloned.clipPath!.commands).toEqual(['m0,0', 'l1,0', 'l1,1', 'z']);
    expect(cloned.getLocation()!.x).toBe(10);
    expect(cloned.getSize()!.width).toBe(100);
});

test('rectangle setCornerRadii clamps overlapping radii to fit bounds', () => {
    const rect = RectangleElement.create(0, 0, 10, 8).setCornerRadii(8, 8, 8, 8);

    expect(rect.getCornerRadii()).toEqual([4, 4, 4, 4]);
});

test('rectangle serialize/parse preserves clip path', () => {
    const rect = RectangleElement.create(10, 20, 100, 200);
    rect.setClipPath({ commands: ['m0,0', 'l1,0', 'l1,1', 'z'], units: 'objectBoundingBox' });

    const serialized = rect.serialize();
    const parsed = new RectangleElement();
    parsed.parse(serialized);

    expect(parsed.clipPath).toBeDefined();
    expect(parsed.clipPath!.commands).toEqual(['m0,0', 'l1,0', 'l1,1', 'z']);
    expect(parsed.clipPath!.units).toBe('objectBoundingBox');
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
    const result = rect.setFill('Green').setStroke('Red').setStrokeDash([4, 2]).setLineCap('round').setLineJoin('bevel').setShadow({ color: '#000000', blur: 8, offsetX: 2, offsetY: 1 }).setBlendMode('multiply').setFilter('grayscale(80%)').setInteractive(true);
    expect(result).toBe(rect);
    expect(rect.fill).toBe('Green');
    expect(rect.stroke).toBe('Red');
    expect(rect.strokeDash).toEqual([4, 2]);
    expect(rect.lineCap).toBe('round');
    expect(rect.lineJoin).toBe('bevel');
    expect(rect.shadow).toEqual({ color: '#000000', blur: 8, offsetX: 2, offsetY: 1 });
    expect(rect.blendMode).toBe('multiply');
    expect(rect.filter).toBe('grayscale(80%)');
    expect(rect.interactive).toBe(true);
});

test('applyRenderOpacity applies opacity, blend mode, filter, and shadow together', () => {
    const rect = RectangleElement.create(0, 0, 50, 50);
    rect.setOpacity(0.5);
    rect.setShadow({ color: 'rgba(0,0,0,0.25)', blur: 12, offsetX: 3, offsetY: 4 });
    rect.setBlendMode('screen');
    rect.setFilter('blur(4px)');
    const context = { globalAlpha: 1, globalCompositeOperation: 'source-over', filter: 'none' } as CanvasRenderingContext2D;

    rect.applyRenderOpacity(context);

    expect(context.globalAlpha).toBe(0.5);
    expect(context.globalCompositeOperation).toBe('screen');
    expect(context.filter).toBe('blur(4px)');
    expect(context.shadowColor).toBe('rgba(0,0,0,' + 64 / 255 + ')');
    expect(context.shadowBlur).toBe(12);
    expect(context.shadowOffsetX).toBe(3);
    expect(context.shadowOffsetY).toBe(4);
});

test('setFilter trims values and clears none-like filters', () => {
    const rect = RectangleElement.create(0, 0, 50, 50);

    rect.setFilter('  contrast(120%)  ');
    expect(rect.filter).toBe('contrast(120%)');

    rect.setFilter('none');
    expect(rect.filter).toBeUndefined();
});

test('withClipPath restores drawing transform after objectBoundingBox clipping', () => {
    const rect = RectangleElement.create(10, 20, 100, 200);
    rect.setClipPath({ commands: ['m0.1,0.1', 'l0.9,0.1', 'l0.9,0.9', 'l0.1,0.9', 'z'], units: 'objectBoundingBox' });
    rect.model = {
        resourceManager: { get: jest.fn() },
        add: jest.fn(),
        getSize: jest.fn(),
        getFillScale: jest.fn(),
        setElementStroke: jest.fn(),
        setRenderTransform: jest.fn(),
    } as never;
    const drawAction = jest.fn();
    const context = {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        transform: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        clip: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    (rect as any).withClipPath(context, drawAction);

    expect(context.translate).toHaveBeenCalledWith(10, 20);
    expect(context.scale).toHaveBeenCalledWith(100, 200);
    const inverseArgs = (context.transform as jest.Mock).mock.calls[0];
    expect(inverseArgs[0]).toBeCloseTo(0.01);
    expect(inverseArgs[1]).toBeCloseTo(0);
    expect(inverseArgs[2]).toBeCloseTo(0);
    expect(inverseArgs[3]).toBeCloseTo(0.005);
    expect(inverseArgs[4]).toBeCloseTo(-0.1);
    expect(inverseArgs[5]).toBeCloseTo(-0.1);
    expect((context.transform as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(drawAction.mock.invocationCallOrder[0]);
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
    expect(serialized.commands).toContain('m10,20');

    const parsed = new PathElement();
    parsed.parse(serialized);
    expect(parsed.pointCount()).toBe(path.pointCount());
});

test('path setCommands', () => {
    const path = PathElement.create();
    path.setCommands('m(0,0) l(50,0) l(50,50) z');
    expect(path.pointCount()).toBe(3);
});

test('path fromSVGPath normalizes horizontal, vertical, and close commands', () => {
    const path = PathElement.fromSVGPath('M 10 20 H 30 V 40 z');

    expect(path.getCommands()).toEqual(['m10,20', 'l30,20', 'l30,40', 'z']);
    expect(path.pointCount()).toBe(3);
});

test('path fromSVGPath preserves quadratic commands and expands smooth quadratic commands into explicit quadratics', () => {
    const path = PathElement.fromSVGPath('M 0 0 Q 10 10 20 0 T 40 0');
    const commands = path.getCommands();

    expect(commands).toBeDefined();
    expect(commands![0]).toBe('m0,0');
    expect(commands![1]).toBe('Q10,10,20,0');
    expect(commands![2]).toBe('Q30,-10,40,0');
    expect(path.pointCount()).toBe(5);
});

test('path fromSVGPath normalizes smooth cubic commands into explicit cubics', () => {
    const path = PathElement.fromSVGPath('M 0 0 C 10 0 20 10 30 10 S 50 20 60 0');
    const commands = path.getCommands();

    expect(commands).toBeDefined();
    expect(commands).toHaveLength(3);
    expect(commands![1].charAt(0)).toBe('c');
    expect(commands![2].charAt(0)).toBe('c');
});

test('path fromSVGPath normalizes arcs into cubic segments', () => {
    const path = PathElement.fromSVGPath('M 0 0 A 10 10 0 0 1 20 0');
    const commands = path.getCommands();

    expect(commands).toBeDefined();
    expect(commands![0]).toBe('m0,0');
    expect(commands!.slice(1).every((command) => command.charAt(0) === 'c')).toBe(true);
    expect(path.pointCount()).toBeGreaterThan(1);
});

test('path fromSVGPath normalizes relative arcs into cubic segments', () => {
    const path = PathElement.fromSVGPath('M 5 5 a 10 10 0 0 0 20 0');
    const commands = path.getCommands();

    expect(commands).toBeDefined();
    expect(commands![0]).toBe('m5,5');
    expect(commands!.slice(1).every((command) => command.charAt(0) === 'c')).toBe(true);
});

test('path setCommands normalizes mixed legacy and SVG commands', () => {
    const path = PathElement.create();
    path.setCommands('m(0,0) l(10,0) h 5 q 5 5 10 0 t 10 -5 z');
    const commands = path.getCommands();

    expect(commands).toBeDefined();
    expect(commands![0]).toBe('m0,0');
    expect(commands![1]).toBe('l10,0');
    expect(commands![2]).toBe('l15,0');
    expect(commands![3]).toBe('Q5,5,10,0');
    expect(commands![4]).toBe('Q15,-5,10,-5');
    expect(commands![5]).toBe('z');
});

test('path serialize and parse preserve quadratic commands', () => {
    const path = PathElement.create();
    path.setCommands('m(0,0) q(10,10,20,0) l(30,0) z');

    const serialized = path.serialize();
    const parsed = new PathElement();
    parsed.parse(serialized);

    expect(parsed.getCommands()).toEqual(['m0,0', 'Q10,10,20,0', 'l30,0', 'z']);
});

test('path translate preserves close commands', () => {
    const path = PathElement.fromSVGPath('M 10 20 L 30 20 L 30 40 Z');
    path.translate(5, 5);

    expect(path.getCommands()).toEqual(['m15,25', 'l35,25', 'l35,45', 'z']);
});

test('path scale preserves close commands', () => {
    const path = PathElement.fromSVGPath('M 10 20 L 30 20 L 30 40 Z');
    path.scale(2, 2);

    expect(path.getCommands()).toEqual(['m10,20', 'l50,20', 'l50,60', 'z']);
});

test('path getBounds handles coordinates at zero correctly', () => {
    const path = PathElement.fromSVGPath('M 0 0 L 10 0 L 10 5 L 0 5 Z');
    const bounds = path.getBounds();

    expect(bounds).toBeDefined();
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBe(10);
    expect(bounds!.height).toBe(5);
});

test('path getBounds includes cubic control points in bounding region', () => {
    const path = PathElement.fromSVGPath('M 100 350 Q 250 50 400 350');
    const bounds = path.getBounds();

    expect(bounds).toBeDefined();
    expect(bounds!.x).toBe(100);
    expect(bounds!.y).toBeLessThan(350);
    expect(bounds!.height).toBeGreaterThan(0);
    expect(bounds!.width).toBe(300);
});

test('path setSize does not corrupt commands when bounds height is zero', () => {
    const path = PathElement.fromSVGPath('M 100 200 L 300 200');
    const bounds = path.getBounds();
    expect(bounds!.height).toBe(0);

    path.setSize('100x50');

    const commands = path.getCommands();
    expect(commands).toBeDefined();
    const newBounds = path.getBounds();
    expect(newBounds).toBeDefined();
    expect(newBounds!.width).toBeCloseTo(100, 1);
});

test('path setSize does not corrupt commands when bounds width is zero', () => {
    const path = PathElement.fromSVGPath('M 200 100 L 200 300');
    const bounds = path.getBounds();
    expect(bounds!.width).toBe(0);

    path.setSize('50x100');

    const commands = path.getCommands();
    expect(commands).toBeDefined();
    const newBounds = path.getBounds();
    expect(newBounds).toBeDefined();
    expect(newBounds!.height).toBeCloseTo(100, 1);
});

test('path nudgeSize does not corrupt commands when bounds height is zero', () => {
    const path = PathElement.fromSVGPath('M 100 200 L 300 200');

    path.nudgeSize(10, 10);

    const commands = path.getCommands();
    expect(commands).toBeDefined();
    const bounds = path.getBounds();
    expect(bounds).toBeDefined();
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

test('text serialize/parse preserves letter spacing decoration and rich text', () => {
    const txt = TextElement.create(undefined, 10, 20, 200, 50);
    txt.setTypeface('Arial, sans-serif').setTypesize(16).setTypestyle('bold');
    txt.setLetterSpacing(1.5).setTextDecoration('underline,line-through');
    txt.setRichText([
        { text: 'Hello ', typestyle: 'bold' },
        { text: 'World', typestyle: 'italic', letterSpacing: 2, decoration: 'underline' },
    ]);

    const serialized = txt.serialize();
    expect(serialized.letterSpacing).toBe(1.5);
    expect(serialized.textDecoration).toBe('underline,line-through');
    expect(serialized.richText).toEqual([
        { text: 'Hello ', typestyle: 'bold' },
        { text: 'World', typestyle: 'italic', letterSpacing: 2, decoration: 'underline' },
    ]);

    const parsed = new TextElement();
    parsed.parse(serialized);
    expect(parsed.letterSpacing).toBe(1.5);
    expect(parsed.textDecoration).toBe('underline,line-through');
    expect(parsed.richText).toEqual([
        { text: 'Hello ', typestyle: 'bold' },
        { text: 'World', typestyle: 'italic', letterSpacing: 2, decoration: 'underline' },
    ]);
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

test('text content setters clear rich text', () => {
    const txt = TextElement.create(undefined, 0, 0, 200, 50);
    txt.setRichText([{ text: 'Hello' }, { text: ' world', typestyle: 'italic' }]);
    expect(txt.richText).toEqual([{ text: 'Hello' }, { text: ' world', typestyle: 'italic' }]);

    txt.setText('Plain text');
    expect(txt.richText).toBeUndefined();

    txt.setRichText([{ text: 'From runs' }]);
    txt.setSource('resource-key');
    expect(txt.richText).toBeUndefined();
    expect(txt.source).toBe('resource-key');
});

test('text replaceTextRange applies inserted rich styles', () => {
    const txt = TextElement.create('Hello', 0, 0, 200, 50);

    txt.replaceTextRange(5, 5, ' World', { typestyle: 'italic', decoration: 'underline' });

    expect(txt.getResolvedText()).toBe('Hello World');
    expect(txt.richText).toEqual([
        { text: 'Hello' },
        { text: ' World', typestyle: 'italic', decoration: 'underline' },
    ]);
});

test('text applyTextStyle updates only the selected character range', () => {
    const txt = TextElement.create('Hello world', 0, 0, 200, 50);

    txt.applyTextStyle(6, 11, { typestyle: 'bold', letterSpacing: 1.5 });

    expect(txt.richText).toEqual([
        { text: 'Hello ' },
        { text: 'world', typestyle: 'bold', letterSpacing: 1.5 },
    ]);
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

test('model element draw skips scaling when embedded sourceModel has zero size', () => {
    const mel = ModelElement.create(undefined, 10, 20, 0, 0);
    const innerModel = {
        getSize: jest.fn(() => new Size(0, 0)),
        renderToContext: jest.fn(),
    };
    mel.sourceModel = innerModel;
    mel.model = {
        resourceManager: { get: jest.fn() },
        add: jest.fn(),
        getSize: jest.fn(),
        getFillScale: jest.fn(),
        setElementStroke: jest.fn(),
        setRenderTransform: jest.fn(),
    } as never;
    const context = {
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D;

    mel.draw(context);

    expect(context.scale).not.toHaveBeenCalled();
    expect(innerModel.renderToContext).toHaveBeenCalledWith(context);
});

// --- SpriteElement ---

test('sprite create', () => {
    const spr = SpriteElement.create(10, 20, 64, 64);
    expect(spr.type).toBe('sprite');
    expect(spr.frames!.length).toBe(0);
});
