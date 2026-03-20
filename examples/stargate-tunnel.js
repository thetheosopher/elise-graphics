var width = 700;
var height = 700;
var model = elise.model(width, height);
model.setFill('#000005');

var cx = width / 2;
var cy = height / 2;
var maxRings = 24;
var maxRadius = 380;

// Build concentric polygon rings that zoom toward the viewer
var rings = [];
for (var r = 0; r < maxRings; r++) {
    var sides = 8;
    var ring = elise.polygon();
    var baseRadius = (r / maxRings) * maxRadius;
    for (var s = 0; s < sides; s++) {
        var angle = (s / sides) * Math.PI * 2;
        ring.addPoint(elise.point(
            cx + Math.cos(angle) * baseRadius,
            cy + Math.sin(angle) * baseRadius
        ));
    }
    ring.setStroke('#3366ff,1');
    ring.timer = 'tick';
    ring.tag = {
        index: r,
        sides: sides,
        phaseOffset: r * 0.12
    };
    rings.push(ring);
    model.add(ring);
}

// Central glow
var glow = elise.ellipse(cx, cy, 20, 20);
var glowGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 30, 30);
glowGrad.stops.push(elise.gradientFillStop('#ffffff', 0));
glowGrad.stops.push(elise.gradientFillStop('#6688ff', 0.3));
glowGrad.stops.push(elise.gradientFillStop('#00000000', 1.0));
glow.setFill(glowGrad);
glow.timer = 'tick';
glow.tag = { isGlow: true };
model.add(glow);

// Streaking star particles
var starCount = 40;
for (var i = 0; i < starCount; i++) {
    var angle = Math.random() * Math.PI * 2;
    var dist = Math.random() * maxRadius * 0.8;
    var star = elise.ellipse(
        cx + Math.cos(angle) * dist,
        cy + Math.sin(angle) * dist,
        1.5, 1.5
    );
    star.setFill(elise.color(160, 200, 220, 255).toHexString());
    star.timer = 'tick';
    star.tag = {
        isStar: true,
        angle: angle,
        baseDist: dist,
        speed: 80 + Math.random() * 200
    };
    model.add(star);
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 0.4;
        var delta = parameters.tickDelta;
        var tag = el.tag;

        if (tag.isGlow) {
            var pulse = 15 + Math.sin(phase * 4) * 8;
            el.radiusX = pulse;
            el.radiusY = pulse;
            controller.invalidate();
            return;
        }

        if (tag.isStar) {
            var dist = tag.baseDist + phase * tag.speed;
            dist = dist % maxRadius;
            var sx = cx + Math.cos(tag.angle) * dist;
            var sy = cy + Math.sin(tag.angle) * dist;
            el.setCenter(elise.point(sx, sy));
            var fade = dist / maxRadius;
            var a = Math.floor(200 * fade);
            var size = 0.5 + fade * 2.5;
            el.radiusX = size;
            el.radiusY = size * 0.4;
            el.setFill(elise.color(a, 200, 220, 255).toHexString());
            controller.invalidate();
            return;
        }

        // Ring animation — zoom outward and cycle
        var r = tag.index;
        var t = ((phase * 0.5 + tag.phaseOffset) % 1);
        var radius = t * maxRadius;

        // Rotation increases with distance
        var rotAngle = phase * 0.4 + t * 0.5;

        var sides = tag.sides;
        var pts = '';
        for (var s = 0; s < sides; s++) {
            var angle = (s / sides) * Math.PI * 2 + rotAngle;
            var px = cx + Math.cos(angle) * radius;
            var py = cy + Math.sin(angle) * radius;
            if (s > 0) pts += ' ';
            pts += Math.round(px) + ',' + Math.round(py);
        }
        el.setPoints(pts);

        // Color and opacity shift with distance
        var fade = t;
        var alpha = Math.floor(220 * (1 - fade * 0.7));
        alpha = Math.max(10, Math.min(255, alpha));
        var hue = (r * 25 + phase * 30) % 360;
        var cr = Math.max(0, Math.min(255, Math.floor(80 + 175 * Math.sin(hue * Math.PI / 180))));
        var cg = Math.max(0, Math.min(255, Math.floor(80 + 120 * Math.sin((hue + 120) * Math.PI / 180))));
        var cb = Math.max(0, Math.min(255, Math.floor(150 + 105 * Math.sin((hue + 240) * Math.PI / 180))));
        var strokeW = Math.max(0.5, 2 * (1 - fade));
        el.setStroke(elise.color(alpha, cr, cg, cb).toHexString() + ',' + strokeW.toFixed(1));

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
