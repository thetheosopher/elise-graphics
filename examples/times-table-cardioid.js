var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#0d131f');

var cx = width / 2;
var cy = height / 2 + 10;
var radius = 240;

var bg = elise.rectangle(0, 0, width, height);
var grad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 520, 520);
grad.stops.push(elise.gradientFillStop('#1a2740', 0));
grad.stops.push(elise.gradientFillStop('#121d32', 0.66));
grad.stops.push(elise.gradientFillStop('#0b1324', 1));
bg.setFill(grad);
model.add(bg);

var ring = elise.ellipse(cx, cy, radius + 8, radius + 8);
ring.setStroke('#6f86b2,2');
ring.setFill('#00000000');
model.add(ring);

var n = 220;
var pts = [];
for (var i = 0; i < n; i++) {
    var a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
}

var lines = [];
for (var li = 0; li < n; li++) {
    var l = elise.line(cx, cy, cx, cy);
    l.setStroke('#a4d5ff44,1');
    model.add(l);
    lines.push(l);
}

var title = elise.text('Times Table Cardioid', 16, 14, 340, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#d8e7ff');
model.add(title);

var hud = elise.text('Multiplier: 2.00', 16, 40, 280, 20);
hud.setTypeface('Consolas, monospace');
hud.setTypesize(14);
hud.setFill('#9bbdff');
model.add(hud);

function mixPoint(p0, p1, t) {
    return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
}

var driver = elise.ellipse(-10, -10, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);

    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime;
        var mult = 2 + 18 * (Math.sin(t * 0.22) * 0.5 + 0.5);

        for (var i = 0; i < n; i++) {
            var jFloat = (i * mult) % n;
            var j0 = Math.floor(jFloat);
            var j1 = (j0 + 1) % n;
            var f = jFloat - j0;

            var pA = pts[i];
            var pB = mixPoint(pts[j0], pts[j1], f);
            lines[i].setP1(elise.point(pA.x, pA.y));
            lines[i].setP2(elise.point(pB.x, pB.y));

            var hue = (i / n) * 360 + t * 24;
            var rr = Math.floor(100 + 90 * Math.sin(hue * Math.PI / 180));
            var gg = Math.floor(130 + 100 * Math.sin((hue + 120) * Math.PI / 180));
            var bb = Math.floor(210 + 45 * Math.sin((hue + 240) * Math.PI / 180));
            rr = Math.max(0, Math.min(255, rr));
            gg = Math.max(0, Math.min(255, gg));
            bb = Math.max(0, Math.min(255, bb));

            lines[i].setStroke(elise.color(72, rr, gg, bb).toHexString() + ',1');
        }

        hud.setText('Multiplier: ' + mult.toFixed(2));
        controller.invalidate();
    });

    controller.startTimer();
});

return model;
