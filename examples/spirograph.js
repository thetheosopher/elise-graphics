var width = 700;
var height = 700;
var model = elise.model(width, height);
model.setFill('#0a0a18');

var cx = width / 2;
var cy = height / 2;

// Spirograph parameters: multiple patterns drawn simultaneously
var patterns = [
    { R: 230, r: 63, d: 120, color: { r: 80, g: 200, b: 255 }, alpha: 180, speed: 1.0 },
    { R: 200, r: 52, d: 80, color: { r: 255, g: 100, b: 150 }, alpha: 150, speed: 0.8 },
    { R: 220, r: 71, d: 112, color: { r: 100, g: 255, b: 120 }, alpha: 130, speed: 1.2 }
];

// Each pattern is drawn as a polyline that grows over time
var trailLength = 600; // max points per trail
var patternEls = [];
var patternGlows = [];

for (var p = 0; p < patterns.length; p++) {
    // Glow trail (wider, more transparent)
    var glow = elise.polyline();
    glow.smoothPoints = true;
    glow.addPoint(elise.point(cx, cy));
    glow.addPoint(elise.point(cx, cy));
    glow.addPoint(elise.point(cx, cy));
    var gc = patterns[p].color;
    glow.setStroke(elise.color(30, gc.r, gc.g, gc.b).toHexString() + ',6');
    glow.timer = 'tick';
    glow.tag = { patternIndex: p, isGlow: true };
    patternGlows.push(glow);
    model.add(glow);

    // Main trail
    var trail = elise.polyline();
    trail.smoothPoints = true;
    trail.addPoint(elise.point(cx, cy));
    trail.addPoint(elise.point(cx, cy));
    trail.addPoint(elise.point(cx, cy));
    trail.setStroke(elise.color(patterns[p].alpha, gc.r, gc.g, gc.b).toHexString() + ',1.5');
    trail.timer = 'tick';
    trail.tag = { patternIndex: p, isGlow: false };
    patternEls.push(trail);
    model.add(trail);
}

// Drawing pen indicators
var pens = [];
for (var p = 0; p < patterns.length; p++) {
    var pen = elise.ellipse(cx, cy, 4, 4);
    var pc = patterns[p].color;
    pen.setFill(elise.color(255, pc.r, pc.g, pc.b).toHexString());
    pen.timer = 'tick';
    pen.tag = { patternIndex: p, isPen: true };
    pens.push(pen);
    model.add(pen);
}

// Accumulated points for each pattern
var allPoints = [];
for (var p = 0; p < patterns.length; p++) {
    allPoints.push([]);
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 3.0;
        var tag = el.tag;
        var p = tag.patternIndex;
        var pat = patterns[p];

        // Spirograph formula: x = (R-r)*cos(t) + d*cos((R-r)/r * t)
        //                     y = (R-r)*sin(t) - d*sin((R-r)/r * t)
        var t = phase * pat.speed;

        if (tag.isPen) {
            // Add multiple points per tick for fast drawing
            var pts = allPoints[p];
            var stepsPerTick = 20;
            var dt = 0.05;
            for (var s = 0; s < stepsPerTick; s++) {
                var tt = t - (stepsPerTick - 1 - s) * dt;
                var px = cx + (pat.R - pat.r) * Math.cos(tt) + pat.d * Math.cos((pat.R - pat.r) / pat.r * tt);
                var py = cy + (pat.R - pat.r) * Math.sin(tt) - pat.d * Math.sin((pat.R - pat.r) / pat.r * tt);
                pts.push({ x: Math.round(px), y: Math.round(py) });
            }

            // Limit trail length
            while (pts.length > trailLength) {
                pts.shift();
            }

            var lastPt = pts[pts.length - 1];
            el.setCenter(elise.point(lastPt.x, lastPt.y));

            controller.invalidate();
            return;
        }

        // Rebuild polyline from accumulated points
        var pts = allPoints[p];
        if (pts.length < 2) return;

        // Downsample for performance — keep every Nth point
        var step = pts.length > 300 ? 2 : 1;
        var pointStr = '';
        var first = true;
        for (var i = 0; i < pts.length; i += step) {
            if (!first) pointStr += ' ';
            pointStr += pts[i].x + ',' + pts[i].y;
            first = false;
        }
        // Always include the last point
        if ((pts.length - 1) % step !== 0) {
            pointStr += ' ' + pts[pts.length - 1].x + ',' + pts[pts.length - 1].y;
        }
        el.setPoints(pointStr);

        // Animate color cycling
        var hueShift = phase * 10 + p * 120;
        var c = pat.color;
        var cr = Math.floor(Math.max(0, Math.min(255, c.r + Math.sin(hueShift) * 40)));
        var cg = Math.floor(Math.max(0, Math.min(255, c.g + Math.sin(hueShift + 2) * 40)));
        var cb = Math.floor(Math.max(0, Math.min(255, c.b + Math.sin(hueShift + 4) * 40)));
        var a = tag.isGlow ? 30 : pat.alpha;
        var sw = tag.isGlow ? 6 : 1.5;
        el.setStroke(elise.color(a, cr, cg, cb).toHexString() + ',' + sw);

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
