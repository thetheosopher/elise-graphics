var width = 600;
var height = 600;
var model = elise.model(width, height);
model.setFill('#0a0a18');

var cx = width / 2;
var cy = height / 2;
var radius = 200;

// Shape definitions: regular polygons from 3 to 8 sides, then circle (approximated by 36)
var shapes = [3, 4, 5, 6, 8, 36];
var shapeNames = ['Triangle', 'Square', 'Pentagon', 'Hexagon', 'Octagon', 'Circle'];
var shapeDuration = 3.0; // seconds per shape
var morphDuration = 1.0; // seconds to morph between shapes
var totalCycle = shapes.length * shapeDuration;

// We build a polygon that will be updated each frame
var morphPoly = elise.polygon();
// Start with enough points — we use 36 points always (max resolution)
var numPoints = 36;
for (var i = 0; i < numPoints; i++) {
    var angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
    var px = cx + Math.cos(angle) * radius;
    var py = cy + Math.sin(angle) * radius;
    morphPoly.addPoint(elise.point(px, py));
}
morphPoly.setFill('#4488ff');
morphPoly.setStroke('#88bbff,2');
morphPoly.timer = 'tick';
morphPoly.tag = {};
model.add(morphPoly);

// Glow ring behind
var glowRing = elise.ellipse(cx, cy, radius + 15, radius + 15);
glowRing.setFill(elise.color(15, 100, 150, 255).toHexString());
model.add(glowRing);

// Move morph poly to front
model.remove(morphPoly);
model.add(morphPoly);

// Label
var label = elise.text('Triangle', cx - 100, cy + radius + 30, 200, 40);
label.setAlignment('center,middle');
label.setTypeface('Arial, sans-serif');
label.setTypesize(20);
label.setFill('#8899bb');
label.timer = 'tick';
label.tag = { isLabel: true };
model.add(label);

// Generate points for a regular polygon with n sides on the unit circle
function shapePoints(n, rotOffset) {
    var pts = [];
    for (var i = 0; i < n; i++) {
        var angle = (i / n) * Math.PI * 2 - Math.PI / 2 + rotOffset;
        pts.push({ x: Math.cos(angle), y: Math.sin(angle) });
    }
    return pts;
}

// Interpolate a point along the edges of a polygon at parameter t [0,1]
function samplePolygonEdge(pts, t) {
    var n = pts.length;
    var totalT = t * n;
    var seg = Math.floor(totalT);
    var frac = totalT - seg;
    if (seg >= n) { seg = n - 1; frac = 1; }
    var p1 = pts[seg % n];
    var p2 = pts[(seg + 1) % n];
    return {
        x: p1.x + (p2.x - p1.x) * frac,
        y: p1.y + (p2.y - p1.y) * frac
    };
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var time = parameters.elapsedTime % totalCycle;
        var tag = el.tag;

        if (tag.isLabel) {
            var shapeIdx = Math.floor(time / shapeDuration) % shapes.length;
            var nameInShape = time % shapeDuration;
            var nextIdx = (shapeIdx + 1) % shapes.length;
            if (nameInShape > shapeDuration - morphDuration) {
                el.setText(shapeNames[shapeIdx] + ' \u2192 ' + shapeNames[nextIdx]);
            } else {
                el.setText(shapeNames[shapeIdx]);
            }
            controller.invalidate();
            return;
        }

        var shapeIdx = Math.floor(time / shapeDuration) % shapes.length;
        var timeInShape = time % shapeDuration;
        var nextIdx = (shapeIdx + 1) % shapes.length;

        var fromN = shapes[shapeIdx];
        var toN = shapes[nextIdx];
        var fromPts = shapePoints(fromN, 0);
        var toPts = shapePoints(toN, 0);

        // Calculate morph factor
        var morphFactor = 0;
        if (timeInShape > shapeDuration - morphDuration) {
            morphFactor = (timeInShape - (shapeDuration - morphDuration)) / morphDuration;
            morphFactor = morphFactor * morphFactor * (3 - 2 * morphFactor); // smoothstep
        }

        // Rotation animation
        var rotAngle = time * 0.3;

        // Color cycling
        var hue = time * 30;
        var r = Math.floor(128 + 127 * Math.sin((hue) * Math.PI / 180));
        var g = Math.floor(128 + 127 * Math.sin((hue + 120) * Math.PI / 180));
        var b = Math.floor(128 + 127 * Math.sin((hue + 240) * Math.PI / 180));

        // Scale pulse
        var scalePulse = 1.0 + Math.sin(time * 2) * 0.05;

        // Sample both shapes at numPoints evenly spaced parameters and lerp
        var pointStr = '';
        for (var i = 0; i < numPoints; i++) {
            var t = i / numPoints;
            var fromP = samplePolygonEdge(fromPts, t);
            var toP = samplePolygonEdge(toPts, t);
            var mx = fromP.x + (toP.x - fromP.x) * morphFactor;
            var my = fromP.y + (toP.y - fromP.y) * morphFactor;

            // Apply rotation
            var rx = mx * Math.cos(rotAngle) - my * Math.sin(rotAngle);
            var ry = mx * Math.sin(rotAngle) + my * Math.cos(rotAngle);

            var px = cx + rx * radius * scalePulse;
            var py = cy + ry * radius * scalePulse;
            if (i > 0) pointStr += ' ';
            pointStr += Math.round(px) + ',' + Math.round(py);
        }
        el.setPoints(pointStr);

        // Gradient fill
        var grad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, radius, radius);
        grad.stops.push(elise.gradientFillStop(
            elise.color(220, Math.min(255, r + 60), Math.min(255, g + 60), Math.min(255, b + 60)).toHexString(), 0));
        grad.stops.push(elise.gradientFillStop(
            elise.color(200, r, g, b).toHexString(), 0.6));
        grad.stops.push(elise.gradientFillStop(
            elise.color(150, Math.floor(r * 0.4), Math.floor(g * 0.4), Math.floor(b * 0.4)).toHexString(), 1.0));
        el.setFill(grad);
        el.setStroke(elise.color(200, Math.min(255, r + 80), Math.min(255, g + 80), Math.min(255, b + 80)).toHexString() + ',2');

        // Update glow ring
        glowRing.setFill(elise.color(15, r, g, b).toHexString());

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
