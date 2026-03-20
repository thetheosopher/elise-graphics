var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#100f1d');

var cx = width / 2;
var cy = height / 2;

var bg = elise.rectangle(0, 0, width, height);
var g = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 520, 520);
g.stops.push(elise.gradientFillStop('#231f3f', 0));
g.stops.push(elise.gradientFillStop('#191633', 0.65));
g.stops.push(elise.gradientFillStop('#100f22', 1));
bg.setFill(g);
model.add(bg);

var title = elise.text('Superformula Bloom', 16, 14, 300, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#eadfff');
model.add(title);

function sf(phi, m, n1, n2, n3, a, b) {
    var t1 = Math.pow(Math.abs(Math.cos((m * phi) / 4) / a), n2);
    var t2 = Math.pow(Math.abs(Math.sin((m * phi) / 4) / b), n3);
    var r = Math.pow(t1 + t2, -1 / n1);
    if (!isFinite(r)) return 0;
    return r;
}

var layerCount = 5;
var lines = [];
var glows = [];
for (var i = 0; i < layerCount; i++) {
    var glow = elise.polyline();
    glow.smoothPoints = true;
    glow.addPoint(elise.point(cx, cy));
    glow.addPoint(elise.point(cx + 1, cy + 1));
    glow.addPoint(elise.point(cx + 2, cy + 2));
    glow.setStroke('#ffffff22,6');
    model.add(glow);
    glows.push(glow);

    var line = elise.polyline();
    line.smoothPoints = true;
    line.addPoint(elise.point(cx, cy));
    line.addPoint(elise.point(cx + 1, cy + 1));
    line.addPoint(elise.point(cx + 2, cy + 2));
    line.setStroke('#ffffffcc,2');
    model.add(line);
    lines.push(line);
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

        for (var i = 0; i < layerCount; i++) {
            var phase = t * (0.35 + i * 0.06) + i * 0.7;
            var m = 5 + Math.sin(phase * 0.7) * 2.2 + i * 0.25;
            var n1 = 0.28 + 0.18 * (Math.sin(phase * 0.9 + 0.4) * 0.5 + 0.5);
            var n2 = 1.1 + 6.0 * (Math.sin(phase * 0.8 + 1.4) * 0.5 + 0.5);
            var n3 = 1.1 + 6.0 * (Math.sin(phase * 0.8 + 2.1) * 0.5 + 0.5);
            var scale = 80 + i * 32;

            var pts = '';
            for (var s = 0; s <= 640; s++) {
                var phi = (s / 640) * Math.PI * 2;
                var r = sf(phi, m, n1, n2, n3, 1, 1);
                var rot = phi + t * 0.15 + i * 0.2;
                var x = cx + Math.cos(rot) * r * scale;
                var y = cy + Math.sin(rot) * r * scale;
                if (s > 0) pts += ' ';
                pts += Math.round(x) + ',' + Math.round(y);
            }

            lines[i].setPoints(pts);
            glows[i].setPoints(pts);

            var hue = t * 45 + i * 66;
            var rr = Math.floor(140 + 90 * Math.sin(hue * Math.PI / 180));
            var gg = Math.floor(110 + 120 * Math.sin((hue + 120) * Math.PI / 180));
            var bb = Math.floor(180 + 75 * Math.sin((hue + 240) * Math.PI / 180));
            rr = Math.max(0, Math.min(255, rr));
            gg = Math.max(0, Math.min(255, gg));
            bb = Math.max(0, Math.min(255, bb));

            lines[i].setStroke(elise.color(170, rr, gg, bb).toHexString() + ',2');
            glows[i].setStroke(elise.color(28, rr, gg, bb).toHexString() + ',6');
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
