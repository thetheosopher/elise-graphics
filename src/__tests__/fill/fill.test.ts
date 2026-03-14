import { LinearGradientFill } from '../../fill/linear-gradient-fill';
import { RadialGradientFill } from '../../fill/radial-gradient-fill';
import { GradientFillStop } from '../../fill/gradient-fill-stop';

// --- GradientFillStop ---

test('gradient stop create', () => {
    const stop = GradientFillStop.create('Red', 0.5);
    expect(stop.color).toBe('Red');
    expect(stop.offset).toBe(0.5);
});

test('gradient stop clone', () => {
    const stop = GradientFillStop.create('Blue', 0.3);
    const cloned = stop.clone();
    expect(cloned.color).toBe('Blue');
    expect(cloned.offset).toBe(0.3);
});

test('gradient stop cloneStops', () => {
    const stops = [
        GradientFillStop.create('Red', 0),
        GradientFillStop.create('Green', 0.5),
        GradientFillStop.create('Blue', 1),
    ];
    const cloned = GradientFillStop.cloneStops(stops);
    expect(cloned.length).toBe(3);
    expect(cloned[0].color).toBe('Red');
    expect(cloned[1].offset).toBe(0.5);
    expect(cloned[2].color).toBe('Blue');
});

// --- LinearGradientFill ---

test('linear gradient create', () => {
    const lg = LinearGradientFill.create('0,0', '100,0');
    expect(lg.type).toBe('linearGradient');
    expect(lg.start).toBe('0,0');
    expect(lg.end).toBe('100,0');
    expect(lg.stops.length).toBe(0);
});

test('linear gradient add stops', () => {
    const lg = LinearGradientFill.create('0,0', '100,0');
    lg.addFillStop('Red', 0);
    lg.addFillStop('Blue', 1);
    expect(lg.stops.length).toBe(2);
    expect(lg.stops[0].color).toBe('Red');
    expect(lg.stops[0].offset).toBe(0);
    expect(lg.stops[1].color).toBe('Blue');
    expect(lg.stops[1].offset).toBe(1);
});

test('linear gradient clone', () => {
    const lg = LinearGradientFill.create('0,0', '200,0');
    lg.addFillStop('White', 0);
    lg.addFillStop('Black', 1);
    const cloned = lg.clone();
    expect(cloned.type).toBe('linearGradient');
    expect(cloned.start).toBe('0,0');
    expect(cloned.end).toBe('200,0');
    expect(cloned.stops.length).toBe(2);
    expect(cloned.stops[0].color).toBe('White');
    // Verify deep clone
    cloned.stops[0].color = 'Red';
    expect(lg.stops[0].color).toBe('White');
});

// --- RadialGradientFill ---

test('radial gradient create', () => {
    const rg = RadialGradientFill.create('100,100', '80,80', 50, 50);
    expect(rg.type).toBe('radialGradient');
    expect(rg.center).toBe('100,100');
    expect(rg.focus).toBe('80,80');
    expect(rg.radiusX).toBe(50);
    expect(rg.radiusY).toBe(50);
});

test('radial gradient add stops', () => {
    const rg = RadialGradientFill.create('100,100', '100,100', 50, 50);
    rg.addFillStop('White', 0);
    rg.addFillStop('Black', 1);
    expect(rg.stops.length).toBe(2);
});

test('radial gradient clone', () => {
    const rg = RadialGradientFill.create('100,100', '80,80', 50, 30);
    rg.addFillStop('Yellow', 0);
    rg.addFillStop('Red', 1);
    const cloned = rg.clone();
    expect(cloned.center).toBe('100,100');
    expect(cloned.focus).toBe('80,80');
    expect(cloned.radiusX).toBe(50);
    expect(cloned.radiusY).toBe(30);
    expect(cloned.stops.length).toBe(2);
    // Verify deep clone
    cloned.stops[0].color = 'Green';
    expect(rg.stops[0].color).toBe('Yellow');
});
