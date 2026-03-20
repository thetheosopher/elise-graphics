var width = 600;
var height = 600;
var model = elise.model(width, height);
model.setFill('#0a0a18');

var cx = width / 2;
var cy = height / 2;
var numSegments = 12;
var sliceAngle = (Math.PI * 2) / numSegments;

// Build symmetrical shapes per slice
var shapes = [];
var shapeCount = 10;

for (var s = 0; s < shapeCount; s++) {
    var dist = 45 + s * 28;
    var baseAngle = s * 0.28;
    var rx = 16 - s * 0.9;
    var ry = 10 + s * 1.8;
    if (rx < 4) rx = 4;

    for (var seg = 0; seg < numSegments; seg++) {
        var angle = seg * sliceAngle + baseAngle;
        var ex = cx + Math.cos(angle) * dist;
        var ey = cy + Math.sin(angle) * dist;
        var e = elise.ellipse(ex, ey, rx, ry);

        // Vary hue by ring
        var hueOffset = s * 45;
        var r = Math.floor(128 + 127 * Math.sin((hueOffset) * Math.PI / 180));
        var g = Math.floor(128 + 127 * Math.sin((hueOffset + 120) * Math.PI / 180));
        var b = Math.floor(128 + 127 * Math.sin((hueOffset + 240) * Math.PI / 180));
        e.setFill(elise.color(200, r, g, b).toHexString());
        e.timer = 'tick';
        e.tag = {
            ring: s,
            segment: seg,
            baseDist: dist,
            baseAngle: baseAngle,
            baseRX: rx,
            baseRY: ry,
            hueOffset: hueOffset
        };
        shapes.push(e);
        model.add(e);
    }
}

// Center jewel
var jewel = elise.ellipse(cx, cy, 22, 22);
var jewelGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 22, 22);
jewelGrad.stops.push(elise.gradientFillStop('#ffffff', 0));
jewelGrad.stops.push(elise.gradientFillStop('#ff66cc', 0.5));
jewelGrad.stops.push(elise.gradientFillStop('#6600cc', 1.0));
jewel.setFill(jewelGrad);
jewel.timer = 'tick';
jewel.tag = { isJewel: true };
model.add(jewel);

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 0.5;
        var tag = el.tag;

        if (tag.isJewel) {
            // Pulse the center
            var pulse = 16 + 8 * Math.sin(phase * 4) + 3 * Math.sin(phase * 9);
            el.radiusX = pulse;
            el.radiusY = pulse;
            controller.invalidate();
            return;
        }

        var s = tag.ring;
        var seg = tag.segment;
        var spinDir = (s % 2 === 0) ? 1 : -1;
        var angle = seg * sliceAngle + tag.baseAngle + phase * (1.6 + s * 0.35) * spinDir;
        angle += Math.sin(phase * 0.9 + seg * 0.6 + s * 0.3) * 0.18;

        // Breathing distance
        var distPulse = Math.sin(phase * 1.4 + s * 0.8) * 68;
        distPulse += Math.cos(phase * 2.8 + seg * 0.7) * 32;
        var dist = tag.baseDist + distPulse;

        var ex = cx + Math.cos(angle) * dist;
        var ey = cy + Math.sin(angle) * dist;
        el.setCenter(elise.point(ex, ey));

        // Morph radii
        var rxPulse = Math.sin(phase * 3.1 + s + seg * 0.7) * 7;
        var ryPulse = Math.cos(phase * 2.4 + s * 2.2 + seg) * 6;
        el.radiusX = Math.max(4, tag.baseRX + rxPulse);
        el.radiusY = Math.max(4, tag.baseRY + ryPulse);

        // Color cycling
        var hue = tag.hueOffset + phase * 90 + s * 12;
        var r = Math.floor(128 + 127 * Math.sin((hue) * Math.PI / 180));
        var g = Math.floor(128 + 127 * Math.sin((hue + 120) * Math.PI / 180));
        var b = Math.floor(128 + 127 * Math.sin((hue + 240) * Math.PI / 180));
        var alphaWave = Math.sin(phase * 1.7 + s + seg * 0.5) * 0.25 + 0.75;
        var a = Math.floor(170 + 75 * alphaWave);
        el.setFill(elise.color(a, r, g, b).toHexString());

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
