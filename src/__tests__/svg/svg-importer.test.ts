import { Model } from '../../core/model';
import { EllipseElement } from '../../elements/ellipse-element';
import { ImageElement } from '../../elements/image-element';
import { LineElement } from '../../elements/line-element';
import { ModelElement } from '../../elements/model-element';
import { PathElement } from '../../elements/path-element';
import { PolygonElement } from '../../elements/polygon-element';
import { PolylineElement } from '../../elements/polyline-element';
import { RectangleElement } from '../../elements/rectangle-element';
import { TextElement } from '../../elements/text-element';
import { BitmapResource } from '../../resource/bitmap-resource';
import { Color } from '../../core/color';
import { LinearGradientFill } from '../../fill/linear-gradient-fill';
import { RadialGradientFill } from '../../fill/radial-gradient-fill';
import { SVGImporter } from '../../svg/svg-importer';
import { WindingMode } from '../../core/winding-mode';

type FakeElement = {
    nodeName: string;
    children: FakeElement[];
    textContent: string;
    getAttribute: (name: string) => string | null;
    getElementsByTagName: (tagName: string) => FakeElement[];
};

function createFakeElement(
    nodeName: string,
    attributes: Record<string, string> = {},
    children: FakeElement[] = [],
    textContent: string = '',
): FakeElement {
    return {
        nodeName,
        children,
        textContent,
        getAttribute: (name: string) => attributes[name] ?? null,
        getElementsByTagName: (tagName: string) => {
            const matches: FakeElement[] = [];
            const loweredTagName = tagName.toLowerCase();
            const visit = (element: FakeElement): void => {
                if (element.nodeName.toLowerCase() === loweredTagName) {
                    matches.push(element);
                }
                element.children.forEach((child) => visit(child));
            };
            children.forEach((child) => visit(child));
            return matches;
        },
    };
}

function createFakeDocument(root: FakeElement): Document {
    return { documentElement: root } as unknown as Document;
}

test('SVGImporter.parseDocument maps SVG path elements to PathElement.fromSVGPath', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '120', height: '80' }, [
            createFakeElement('path', {
                d: 'M 10 20 h 30 v 10 z',
                id: 'shape-1',
                fill: '#112233',
                stroke: '#445566',
                'stroke-width': '2',
                'fill-rule': 'evenodd',
            }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);

    expect(model.getSize()!.width).toBe(120);
    expect(model.getSize()!.height).toBe(80);
    expect(model.elements).toHaveLength(1);
    const path = model.elements[0] as PathElement;
    expect(path).toBeInstanceOf(PathElement);
    expect(path.id).toBe('shape-1');
    expect(path.fill).toBe('#112233');
    expect(path.stroke).toBe('#445566, 2');
    expect(path.winding).toBe(WindingMode.EvenOdd);
    expect(path.getCommands()).toEqual(['m10,20', 'l40,20', 'l40,30', 'z']);
});

test('SVGImporter.parseDocument imports grouped SVG shapes as a nested model element', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '200', height: '120' }, [
            createFakeElement(
                'g',
                { transform: 'translate(5 6)', fill: '#112233', stroke: '#445566', 'stroke-width': '2', visibility: 'hidden' },
                [
                    createFakeElement('rect', { id: 'rect-1', x: '10', y: '20', width: '30', height: '40', rx: '6', ry: '8' }),
                    createFakeElement('ellipse', { cx: '80', cy: '60', rx: '20', ry: '10' }),
                    createFakeElement('line', { x1: '0', y1: '0', x2: '15', y2: '5' }),
                    createFakeElement('polygon', { points: '0,0 10,0 5,5' }),
                    createFakeElement('polyline', { points: '20,10 30,20 40,10' }),
                ],
            ),
        ]),
    );

    const model = SVGImporter.parseDocument(document);

    expect(model.elements).toHaveLength(1);

    const group = model.elements[0] as ModelElement;
    expect(group).toBeInstanceOf(ModelElement);
    expect(group.visible).toBe(false);
    expect(group.transform).toBe('matrix(1,0,0,1,5,6)');
    expect(group.getLocation()!.x).toBe(0);
    expect(group.getLocation()!.y).toBe(0);
    expect(group.getSize()!.width).toBe(100);
    expect(group.getSize()!.height).toBe(70);

    const innerModel = group.sourceModel as Model;
    expect(innerModel.elements).toHaveLength(5);

    const rectangle = innerModel.elements[0] as RectangleElement;
    expect(rectangle).toBeInstanceOf(RectangleElement);
    expect(rectangle.id).toBe('rect-1');
    expect(rectangle.fill).toBe('#112233');
    expect(rectangle.stroke).toBe('#445566, 2');
    expect(rectangle.cornerRadii).toEqual([6, 6, 6, 6]);

    const ellipse = innerModel.elements[1] as EllipseElement;
    expect(ellipse).toBeInstanceOf(EllipseElement);
    expect(ellipse.fill).toBe('#112233');
    expect(ellipse.stroke).toBe('#445566, 2');

    const line = innerModel.elements[2] as LineElement;
    expect(line).toBeInstanceOf(LineElement);
    expect(line.stroke).toBe('#445566, 2');
    expect(line.fill).toBeUndefined();

    const polygon = innerModel.elements[3] as PolygonElement;
    expect(polygon).toBeInstanceOf(PolygonElement);
    expect(polygon.fill).toBe('#112233');
    expect(polygon.stroke).toBe('#445566, 2');
    expect(polygon.getPoints()!.map((point) => point.toString())).toEqual(['0,0', '10,0', '5,5']);

    const polyline = innerModel.elements[4] as PolylineElement;
    expect(polyline).toBeInstanceOf(PolylineElement);
    expect(polyline.stroke).toBe('#445566, 2');
    expect(polyline.getPoints()!.map((point) => point.toString())).toEqual(['20,10', '30,20', '40,10']);
});

test('SVGImporter.parseDocument resolves use references to symbol content', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '120', height: '80' }, [
            createFakeElement('defs', {}, [
                createFakeElement('symbol', { id: 'badge', viewBox: '0 0 20 10' }, [
                    createFakeElement('rect', { x: '0', y: '0', width: '20', height: '10', fill: '#112233' }),
                ]),
            ]),
            createFakeElement('use', { id: 'badge-use', href: '#badge', x: '10', y: '15', opacity: '0.5' }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const symbolUse = model.elements[0] as ModelElement;
    const innerModel = symbolUse.sourceModel as Model;

    expect(symbolUse).toBeInstanceOf(ModelElement);
    expect(symbolUse.id).toBe('badge-use');
    expect(symbolUse.opacity).toBe(0.5);
    expect(symbolUse.transform).toBe('matrix(1,0,0,1,10,15)');
    expect(innerModel.elements).toHaveLength(1);
    expect((innerModel.elements[0] as RectangleElement).fill).toBe('#112233');
});

test('SVGImporter.parseDocument imports stroke dash, line cap, and line join styles', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '120', height: '80' }, [
            createFakeElement('rect', {
                x: '10',
                y: '20',
                width: '30',
                height: '40',
                stroke: '#112233',
                'stroke-width': '3',
                'stroke-dasharray': '5 2 1',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'bevel',
            }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const rectangle = model.elements[0] as RectangleElement;

    expect(rectangle.stroke).toBe('#112233, 3');
    expect(rectangle.strokeDash).toEqual([5, 2, 1]);
    expect(rectangle.lineCap).toBe('round');
    expect(rectangle.lineJoin).toBe('bevel');
});

test('SVGImporter.parseDocument imports text and image elements with inherited transform and opacity', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '160', height: '90' }, [
            createFakeElement(
                'g',
                { transform: 'translate(10 5)', opacity: '0.5' },
                [
                    createFakeElement(
                        'text',
                        {
                            id: 'label',
                            x: '20',
                            y: '30',
                            fill: '#112233',
                            'font-family': 'Arial',
                            'font-size': '16',
                            'font-style': 'italic',
                            'font-weight': 'bold',
                            'text-anchor': 'middle',
                            'dominant-baseline': 'middle',
                        },
                        [],
                        'Hello',
                    ),
                    createFakeElement('image', { id: 'logo', x: '40', y: '10', width: '24', height: '18', href: '/images/logo.png' }),
                ],
            ),
        ]),
    );

    const model = SVGImporter.parseDocument(document);

    expect(model.elements).toHaveLength(1);

    const group = model.elements[0] as ModelElement;
    expect(group).toBeInstanceOf(ModelElement);
    expect(group.opacity).toBe(0.5);
    expect(group.transform).toBe('matrix(1,0,0,1,10,5)');

    const innerModel = group.sourceModel as Model;
    expect(innerModel.elements).toHaveLength(2);

    const text = innerModel.elements[0] as TextElement;
    expect(text).toBeInstanceOf(TextElement);
    expect(text.id).toBe('label');
    expect(text.text).toBe('Hello');
    expect(text.fill).toBe('#112233');
    expect(text.typeface).toBe('Arial');
    expect(text.typesize).toBe(16);
    expect(text.typestyle).toBe('bold,italic');
    expect(text.alignment).toBe('center,middle');

    const image = innerModel.elements[1] as ImageElement;
    expect(image).toBeInstanceOf(ImageElement);
    expect(image.id).toBe('logo');
    expect(image.source).toBe('logo-image');
    expect(innerModel.resources).toHaveLength(1);
    const resource = innerModel.resources[0] as BitmapResource;
    expect(resource).toBeInstanceOf(BitmapResource);
    expect(resource.key).toBe('logo-image');
    expect(resource.uri).toBe('/images/logo.png');
    expect(group.getLocation()!.x).toBe(20);
    expect(group.getLocation()!.y).toBe(10);
    expect(group.getSize()!.width).toBe(48);
    expect(group.getSize()!.height).toBe(36);
    expect(text.getLocation()!.x).toBe(0);
    expect(text.getLocation()!.y).toBe(20);
    expect(image.getLocation()!.x).toBe(20);
    expect(image.getLocation()!.y).toBe(0);
});

test('SVGImporter.parseDocument imports element filter attributes without inheriting them to children', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '120', height: '80' }, [
            createFakeElement('g', { id: 'group', filter: 'blur(2px)' }, [
                createFakeElement('rect', { id: 'inner-rect', x: '10', y: '12', width: '20', height: '14', fill: '#ff0000' }),
            ]),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const group = model.elements[0] as ModelElement;
    const innerRect = (group.sourceModel as Model).elements[0] as RectangleElement;

    expect(group.filter).toBe('blur(2px)');
    expect(innerRect.filter).toBeUndefined();
});

test('SVGImporter.parseDocument imports text letter spacing decoration and styled tspans', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '160', height: '90' }, [
            createFakeElement('text', {
                x: '20',
                y: '30',
                fill: '#112233',
                'font-family': 'Arial',
                'font-size': '16',
                'letter-spacing': '1.5',
                'text-decoration': 'underline',
            }, [
                createFakeElement('tspan', { 'font-weight': 'bold' }, [], 'Hello '),
                createFakeElement('tspan', { 'font-style': 'italic', 'text-decoration': 'line-through' }, [], 'World'),
            ]),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const text = model.elements[0] as TextElement;

    expect(text.text).toBeUndefined();
    expect(text.getResolvedText()).toBe('Hello World');
    expect(text.letterSpacing).toBe(1.5);
    expect(text.textDecoration).toBe('underline');
    expect(text.richText).toEqual([
        { text: 'Hello ', typeface: 'Arial', typesize: 16, typestyle: 'bold', letterSpacing: 1.5, decoration: 'underline' },
        { text: 'World', typeface: 'Arial', typesize: 16, typestyle: 'italic', letterSpacing: 1.5, decoration: 'line-through' },
    ]);
});

test('SVGImporter.parseDocument offsets imported geometry using viewBox origin', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { viewBox: '5 5 20 10' }, [
            createFakeElement('path', { d: 'M 5 5 L 15 5' }),
            createFakeElement('rect', { x: '5', y: '5', width: '10', height: '4' }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const path = model.elements[0] as PathElement;
    const rectangle = model.elements[1] as RectangleElement;

    expect(model.getSize()!.width).toBe(20);
    expect(model.getSize()!.height).toBe(10);
    expect(path.getCommands()).toEqual(['m0,0', 'l10,0']);
    expect(rectangle.location).toBe('0,0');
    expect(rectangle.size).toBe('10x4');
});

test('SVGImporter.parseDocument resolves linear gradient fills from defs using element bounds', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '120', height: '80' }, [
            createFakeElement('defs', {}, [
                createFakeElement('linearGradient', { id: 'grad-1' }, [
                    createFakeElement('stop', { offset: '0%', 'stop-color': '#ff0000' }),
                    createFakeElement('stop', { offset: '100%', style: 'stop-color:#0000ff;stop-opacity:0.5' }),
                ]),
            ]),
            createFakeElement('rect', { x: '10', y: '20', width: '30', height: '40', fill: 'url(#grad-1)' }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const rectangle = model.elements[0] as RectangleElement;

    expect(rectangle.fill).toBeInstanceOf(LinearGradientFill);
    const fill = rectangle.fill as LinearGradientFill;
    expect(fill.start).toBe('10,20');
    expect(fill.end).toBe('40,20');
    expect(fill.stops).toHaveLength(2);
    expect(fill.stops[0].offset).toBe(0);
    expect(fill.stops[1].offset).toBe(1);
    expect(Color.parse(fill.stops[0].color).toHexString().toLowerCase()).toBe('#ff0000');
    expect(Color.parse(fill.stops[1].color).toHexString().toLowerCase()).toBe('#0000ff80');
});

test('SVGImporter.parseDocument resolves radial gradient href inheritance and transforms', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '120', height: '90' }, [
            createFakeElement('defs', {}, [
                createFakeElement('radialGradient', { id: 'radial-base' }, [
                    createFakeElement('stop', { offset: '0%', 'stop-color': '#ffffff' }),
                    createFakeElement('stop', { offset: '1', 'stop-color': '#000000' }),
                ]),
                createFakeElement('radialGradient', {
                    id: 'radial-derived',
                    href: '#radial-base',
                    gradientUnits: 'userSpaceOnUse',
                    cx: '40',
                    cy: '30',
                    fx: '35',
                    fy: '30',
                    r: '10',
                    gradientTransform: 'translate(40 30) scale(1 2) translate(-40 -30)',
                }),
            ]),
            createFakeElement('ellipse', { cx: '40', cy: '30', rx: '15', ry: '20', fill: 'url(#radial-derived)' }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const ellipse = model.elements[0] as EllipseElement;

    expect(ellipse.fill).toBeInstanceOf(RadialGradientFill);
    const fill = ellipse.fill as RadialGradientFill;
    expect(fill.center).toBe('40,30');
    expect(fill.focus).toBe('35,30');
    expect(fill.radiusX).toBe(10);
    expect(fill.radiusY).toBe(20);
    expect(fill.stops).toHaveLength(2);
    expect(Color.parse(fill.stops[0].color).toHexString().toLowerCase()).toBe('#ffffff');
    expect(Color.parse(fill.stops[1].color).toHexString().toLowerCase()).toBe('#000000');
});

test('SVGImporter.parseDocument imports clip-path defs onto supported elements', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '120', height: '80' }, [
            createFakeElement('defs', {}, [
                createFakeElement('clipPath', { id: 'clip-1' }, [
                    createFakeElement('circle', { cx: '25', cy: '40', r: '10' }),
                ]),
            ]),
            createFakeElement('rect', { x: '10', y: '20', width: '30', height: '40', fill: '#112233', 'clip-path': 'url(#clip-1)' }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const rectangle = model.elements[0] as RectangleElement;

    expect(rectangle.clipPath).toBeDefined();
    expect(rectangle.clipPath!.commands.length).toBeGreaterThan(0);
    expect(rectangle.clipPath!.commands[0]).toBe('m15,40');
});

test('SVGImporter.parseDocument preserves close commands when offsetting paths with viewBox origin', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { viewBox: '5 5 20 10' }, [
            createFakeElement('path', { d: 'M 5 5 L 15 5 L 15 15 Z' }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const path = model.elements[0] as PathElement;

    expect(path.getCommands()).toEqual(['m0,0', 'l10,0', 'l10,10', 'z']);
});

test('SVGImporter.parseDocument computes correct bounds for paths at origin', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '100', height: '100' }, [
            createFakeElement('path', { d: 'M 0 0 L 10 0 L 10 10 L 0 10 Z' }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const path = model.elements[0] as PathElement;

    const bounds = path.getBounds();
    expect(bounds).toBeDefined();
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBe(10);
    expect(bounds!.height).toBe(10);
});

test('SVGImporter.parseDocument produces non-zero bounds height for quadratic curve paths', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '450', height: '400' }, [
            createFakeElement('path', { d: 'M 100 350 q 150 -300 300 0' }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);
    const path = model.elements[0] as PathElement;

    const bounds = path.getBounds();
    expect(bounds).toBeDefined();
    expect(bounds!.height).toBeGreaterThan(0);
    expect(bounds!.y).toBeLessThan(350);
    expect(path.getCommands()).toEqual(['m100,350', 'Q250,50,400,350']);
});

test('SVGImporter.parseDocument imported path survives setSize without NaN corruption', () => {
    const document = createFakeDocument(
        createFakeElement('svg', { width: '450', height: '400' }, [
            createFakeElement('path', { d: 'M 100 350 q 150 -300 300 0' }),
            createFakeElement('path', { d: 'M 175 200 l 150 0' }),
        ]),
    );

    const model = SVGImporter.parseDocument(document);

    for (const element of model.elements) {
        const path = element as PathElement;
        const bounds = path.getBounds();
        expect(bounds).toBeDefined();
        path.setSize('100x100');
        const newBounds = path.getBounds();
        expect(newBounds).toBeDefined();
        expect(isNaN(newBounds!.x)).toBe(false);
        expect(isNaN(newBounds!.y)).toBe(false);
    }
});
