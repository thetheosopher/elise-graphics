import { ArcElement } from '../../elements/arc-element';
import { ArrowElement } from '../../elements/arrow-element';
import { Model } from '../../core/model';
import { WindingMode } from '../../core/winding-mode';
import { EllipseElement } from '../../elements/ellipse-element';
import { ImageElement } from '../../elements/image-element';
import { LineElement } from '../../elements/line-element';
import { ModelElement } from '../../elements/model-element';
import { PathElement } from '../../elements/path-element';
import { PolygonElement } from '../../elements/polygon-element';
import { PolylineElement } from '../../elements/polyline-element';
import { RegularPolygonElement } from '../../elements/regular-polygon-element';
import { RectangleElement } from '../../elements/rectangle-element';
import { RingElement } from '../../elements/ring-element';
import { TextElement } from '../../elements/text-element';
import { TextPathElement } from '../../elements/text-path-element';
import { WedgeElement } from '../../elements/wedge-element';
import { LinearGradientFill } from '../../fill/linear-gradient-fill';
import { BitmapResource } from '../../resource/bitmap-resource';
import { ModelResource } from '../../resource/model-resource';
import { SVGExporter } from '../../svg/svg-exporter';

test('SVGExporter.exportPathData preserves simple line commands where possible', () => {
    const path = PathElement.create();
    path.setCommands('m(10,20) l(30,20) l(30,40) l(50,60) z');

    const svgPathData = SVGExporter.exportPathData(path);

    expect(svgPathData).toBe('M 10 20 H 30 V 40 L 50 60 Z');
});

test('SVGExporter.exportPathData preserves quadratic commands for quadratic curves', () => {
    const path = PathElement.fromSVGPath('M 0 0 Q 10 10 20 0');

    const svgPathData = SVGExporter.exportPathData(path);

    expect(svgPathData).toBe('M 0 0 Q 10 10 20 0');
});

test('SVGExporter.exportPathData preserves native shorthand and arc commands', () => {
    const path = PathElement.fromSVGPath('M 0 0 H 20 V 10 S 30 20 40 10 T 50 0 A 5 5 0 0 1 60 0 Z');

    const svgPathData = SVGExporter.exportPathData(path);

    expect(svgPathData).toBe('M 0 0 H 20 V 10 S 30 20 40 10 T 50 0 A 5 5 0 0 1 60 0 Z');
});

test('Model.toSVG exports path elements and basic styling', () => {
    const model = Model.create(120, 80);
    const path = PathElement.create();
    path.id = 'path-1';
    path.setCommands('m(10,20) l(30,20) l(30,40) z');
    path.setFill('#112233');
    path.setStroke('#445566, 2');
    path.winding = WindingMode.EvenOdd;
    model.add(path);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">');
    expect(svgMarkup).toContain('<path d="M 10 20 H 30 V 40 Z"');
    expect(svgMarkup).toContain('id="path-1"');
    expect(svgMarkup).toContain('fill="#112233"');
    expect(svgMarkup).toContain('stroke="#445566"');
    expect(svgMarkup).toContain('stroke-width="2"');
    expect(svgMarkup).toContain('fill-rule="evenodd"');
});

test('Model.toSVG exports basic shape elements', () => {
    const model = Model.create(200, 150);
    const rectangle = RectangleElement.create(10, 20, 30, 40)
        .setFill('#112233')
        .setStroke('#334455,2')
        .setStrokeDash([5, 3])
        .setLineCap('round')
        .setLineJoin('bevel')
        .setMiterLimit(7)
        .setCornerRadius(6)
        .setVisible(false);
    const ellipse = EllipseElement.create(80, 60, 20, 10).setStroke('#445566, 3');
    const line = LineElement.create(5, 6, 25, 30).setStroke('#778899, 2');
    const polygon = PolygonElement.create().setPoints('0,0 20,0 10,15').setFill('#abcdef');
    const polyline = PolylineElement.create().setPoints('40,10 60,20 80,10').setStroke('#123456');
    model.add(rectangle);
    model.add(ellipse);
    model.add(line);
    model.add(polygon);
    model.add(polyline);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<rect x="10" y="20" width="30" height="40" rx="6" ry="6" display="none"');
    expect(svgMarkup).toContain('stroke-dasharray="5 3"');
    expect(svgMarkup).toContain('stroke-linecap="round"');
    expect(svgMarkup).toContain('stroke-linejoin="bevel"');
    expect(svgMarkup).toContain('stroke-miterlimit="7"');
    expect(svgMarkup).toContain('<ellipse cx="80" cy="60" rx="20" ry="10"');
    expect(svgMarkup).toContain('<line x1="5" y1="6" x2="25" y2="30"');
    expect(svgMarkup).toContain('<polygon points="0 0 20 0 10 15"');
    expect(svgMarkup).toContain('<polyline points="40 10 60 20 80 10"');
});

test('Model.toSVG exports new primitive path-backed elements', () => {
    const model = Model.create(220, 160);
    const arc = ArcElement.create(10, 20, 60, 40).setStroke('#112233,2') as ArcElement;
    arc.startAngle = 20;
    arc.endAngle = 220;
    const regularPolygon = RegularPolygonElement.create(80, 10, 50, 50).setFill('#abcdef') as RegularPolygonElement;
    regularPolygon.innerRadiusScale = 0.5;
    const arrow = ArrowElement.create(10, 80, 90, 30).setFill('#ff8800') as ArrowElement;
    const wedge = WedgeElement.create(120, 70, 60, 60).setFill('#0088aa') as WedgeElement;
    wedge.startAngle = 270;
    wedge.endAngle = 30;
    const ring = RingElement.create(160, 10, 50, 50).setFill('#663399') as RingElement;
    ring.innerRadiusScale = 0.4;
    model.add(arc);
    model.add(regularPolygon);
    model.add(arrow);
    model.add(wedge);
    model.add(ring);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('stroke="#112233"');
    expect(svgMarkup).toContain('fill="none"');
    expect(svgMarkup).toContain('fill="#abcdef"');
    expect(svgMarkup).toContain('fill="#ff8800"');
    expect(svgMarkup).toContain('fill="#0088aa"');
    expect(svgMarkup).toContain('fill="#663399"');
    expect(svgMarkup).toContain('<path d="M');
});

test('Model.toSVG exports non-uniform rounded rectangles as paths', () => {
    const model = Model.create(120, 80);
    const rectangle = RectangleElement.create(10, 20, 30, 40).setFill('#112233').setCornerRadii(6, 4, 8, 2);
    model.add(rectangle);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<path d="M 16 20 L 36 20 Q 40 20 40 24 L 40 52 Q 40 60 32 60 L 12 60 Q 10 60 10 58 L 10 26 Q 10 20 16 20 Z"');
});

test('Model.toSVG exports smoothed polylines as paths', () => {
    const model = Model.create(120, 80);
    const polyline = PolylineElement.create().setPoints('10,10 30,30 50,10 70,30').setStroke('#112233');
    polyline.smoothPoints = true;
    model.add(polyline);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<path d="M 10 10 Q 30 30 40 20 L 70 30"');
});

test('Model.toSVG exports text with layout and font attributes', () => {
    const model = Model.create(200, 80);
    const text = TextElement.create('Hello\nWorld', 10, 20, 100, 40)
        .setFill('#112233')
        .setTypeface('Arial, sans-serif')
        .setTypesize(16)
        .setTypestyle('bold,italic')
        .setAlignment('center,middle');
    model.add(text);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<text x="60" y="24" text-anchor="middle" dominant-baseline="text-before-edge" xml:space="preserve"');
    expect(svgMarkup).toContain('font-family="Arial, sans-serif"');
    expect(svgMarkup).toContain('font-size="16"');
    expect(svgMarkup).toContain('font-style="italic"');
    expect(svgMarkup).toContain('font-weight="bold"');
    expect(svgMarkup).toContain('<tspan x="60" y="24">Hello</tspan><tspan x="60" y="40">World</tspan>');
});

test('Model.toSVG exports letter spacing text decoration and rich text tspans', () => {
    const model = Model.create(200, 80);
    const text = TextElement.create('Seed', 10, 20, 100, 40)
        .setFill('#112233')
        .setTypeface('Arial')
        .setTypesize(16)
        .setLetterSpacing(1.5)
        .setTextDecoration('underline');
    text.setRichText([
        { text: 'Hello ', typestyle: 'bold' },
        { text: 'World', typestyle: 'italic', decoration: 'line-through' },
    ]);
    model.add(text);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('letter-spacing="1.5"');
    expect(svgMarkup).toContain('text-decoration="underline"');
    expect(svgMarkup).toContain('<tspan x="10" y="20" font-weight="bold">Hello </tspan>');
    expect(svgMarkup).toContain('<tspan font-style="italic" text-decoration="line-through">World</tspan>');
});

test('Model.toSVG exports explicit text line height', () => {
    const model = Model.create(200, 100);
    const text = TextElement.create('Hello\nWorld', 10, 20, 120, 60)
        .setFill('#112233')
        .setTypeface('Arial')
        .setTypesize(16)
        .setLineHeight(1.5);
    model.add(text);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('line-height="1.5"');
    expect(svgMarkup).toContain('<tspan x="10" y="20">Hello</tspan><tspan x="10" y="44">World</tspan>');
});

test('Model.toSVG exports textPath elements with defs references and optional guide path', () => {
    const model = Model.create(200, 100);
    const textPath = TextPathElement.create(undefined, 'M 10 40 C 40 0 80 0 110 40')
        .setTypeface('Arial')
        .setTypesize(16)
        .setLetterSpacing(1.5)
        .setStartOffset(50)
        .setStartOffsetPercent(true)
        .setShowPath(true)
        .setFill('#112233')
        .setStroke('#334455,2');
    textPath.setRichText([
        { text: 'Curved ', typestyle: 'bold' },
        { text: 'text', typestyle: 'italic' },
    ]);
    model.add(textPath);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<defs>');
    expect(svgMarkup).toContain('<path id="elise-text-path-1" d="M 10 40 C 40 0 80 0 110 40" />');
    expect(svgMarkup).toContain('<text ');
    expect(svgMarkup).toContain('<textPath href="#elise-text-path-1" startOffset="50%">');
    expect(svgMarkup).toContain('<tspan font-weight="bold">Curved </tspan><tspan font-style="italic">text</tspan>');
    expect(svgMarkup).toContain('<path d="M 10 40 C 40 0 80 0 110 40" fill="none" stroke="#334455" stroke-width="2" />');
});

test('Model.toSVG exports gradients and valid SVG transform matrices', () => {
    const model = Model.create(120, 80);
    const gradient = LinearGradientFill.create('0,0', '20,0');
    gradient.addFillStop('#ff000080', 0);
    gradient.addFillStop('#0000ff', 1);
    const rectangle = RectangleElement.create(10, 20, 30, 40).setFill(gradient);
    rectangle.setTransform('rotate(45(5,10))');
    rectangle.setOpacity(0.5);
    rectangle.setFilter('blur(2px) saturate(120%)');
    model.add(rectangle);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<defs>');
    expect(svgMarkup).toContain('<linearGradient id="elise-gradient-1" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="20" y2="0">');
    expect(svgMarkup).toContain('<stop offset="0%" stop-color="#ff0000" stop-opacity="0.501961" />');
    expect(svgMarkup).toContain('fill="url(#elise-gradient-1)"');
    expect(svgMarkup).toContain('opacity="0.5"');
    expect(svgMarkup).toContain('filter="blur(2px) saturate(120%)"');
    expect(svgMarkup).toContain('transform="matrix(0.707107 0.707107 -0.707107 0.707107 25.606602 -1.819805)"');
});

test('Model.toSVG exports image elements using resolved bitmap resources', () => {
    const model = Model.create(120, 80);
    model.resourceManager.add(BitmapResource.create('logo', '/images/logo.png'));
    const image = ImageElement.create('logo', 10, 20, 30, 40).setStroke('#445566, 2');
    image.id = 'image-1';
    image.setOpacity(0.5);
    image.setTransform('rotate(15(0,0))');
    model.add(image);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<g id="image-1" opacity="0.5" transform="matrix(0.965926 0.258819 -0.258819 0.965926 5.517123 -1.906707)">');
    expect(svgMarkup).toContain('<image x="10" y="20" width="30" height="40" href="/images/logo.png" preserveAspectRatio="none" />');
    expect(svgMarkup).toContain('<rect x="10" y="20" width="30" height="40" fill="none" stroke="#445566" stroke-width="2" />');
});

test('Model.toSVG exports nested model elements with scaling', () => {
    const innerModel = Model.create(20, 10);
    innerModel.setFill('#ffeeaa');
    innerModel.add(RectangleElement.create(1, 2, 3, 4).setFill('#112233'));

    const outerModel = Model.create(100, 80);
    const modelElement = ModelElement.create();
    modelElement.setLocation('10,20');
    modelElement.setSize('40x20');
    modelElement.sourceModel = innerModel;
    outerModel.add(modelElement);

    const svgMarkup = outerModel.toSVG();

    expect(svgMarkup).toContain('<g transform="translate(10 20) scale(2 2)">');
    expect(svgMarkup).toContain('<rect x="0" y="0" width="20" height="10" fill="#ffeeaa" stroke="none" />');
    expect(svgMarkup).toContain('<rect x="1" y="2" width="3" height="4" fill="#112233" stroke="none" />');
});

test('Model.toSVG exports reusable model resources as symbol use references', () => {
    const innerModel = Model.create(20, 10);
    innerModel.add(RectangleElement.create(1, 2, 3, 4).setFill('#112233'));

    const outerModel = Model.create(100, 80);
    outerModel.resourceManager.add(ModelResource.create('badge', innerModel));

    const first = ModelElement.create('badge', 10, 20, 40, 20);
    const second = ModelElement.create('badge', 50, 20, 20, 10);
    outerModel.add(first);
    outerModel.add(second);

    const svgMarkup = outerModel.toSVG();

    expect(svgMarkup).toContain('<symbol id="elise-symbol-1" viewBox="0 0 20 10">');
    expect(svgMarkup).toContain('<use href="#elise-symbol-1" transform="translate(10 20) scale(2 2)" />');
    expect(svgMarkup).toContain('<use href="#elise-symbol-1" transform="translate(50 20)" />');
});

test('Model.toSVG exports model-level background fill and stroke', () => {
    const model = Model.create(50, 30);
    model.setFill('#abcdef');
    model.setStroke('#123456, 2');

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<rect x="0" y="0" width="50" height="30" fill="#abcdef" stroke="#123456" stroke-width="2" />');
});

test('Model.toSVG exports clip-path defs and element references', () => {
    const model = Model.create(120, 80);
    const rectangle = RectangleElement.create(10, 20, 30, 40).setFill('#112233');
    rectangle.setClipPath({
        commands: ['m15,40', 'c15,34.477152,19.477152,30,25,30', 'c30.522848,30,35,34.477152,35,40', 'c35,45.522848,30.522848,50,25,50', 'c19.477152,50,15,45.522848,15,40', 'z'],
        units: 'userSpaceOnUse',
    });
    model.add(rectangle);

    const svgMarkup = model.toSVG();

    expect(svgMarkup).toContain('<clipPath id="elise-clip-path-1" clipPathUnits="userSpaceOnUse">');
    expect(svgMarkup).toContain('<path d="M 15 40 C 15 34.477152 19.477152 30 25 30 C 30.522848 30 35 34.477152 35 40 C 35 45.522848 30.522848 50 25 50 C 19.477152 50 15 45.522848 15 40 Z" />');
    expect(svgMarkup).toContain('clip-path="url(#elise-clip-path-1)"');
});