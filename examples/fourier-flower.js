var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#0a0d1a');

var cx = width / 2;
var cy = height / 2;

var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 520, 520);
bgGrad.stops.push(elise.gradientFillStop('#1a1f3b', 0));
bgGrad.stops.push(elise.gradientFillStop('#10152a', 0.66));
bgGrad.stops.push(elise.gradientFillStop('#090d1b', 1));
bg.setFill(bgGrad);
model.add(bg);

var title = elise.text('Fourier Flower', 16, 14, 280, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#d8e2ff');
model.add(title);

var layers = 6;
var glows = [];
var lines = [];

for (var i = 0; i < layers; i++) {
    var glow = elise.polyline();
    glow.smoothPoints = true;
    glow.addPoint(elise.point(cx, cy));
    glow.addPoint(elise.point(cx + 1, cy + 1));
    glow.addPoint(elise.point(cx + 2, cy + 2));
    glow.setStroke('#88aaff33,6');
    model.add(glow);
    glows.push(glow);

    var line = elise.polyline();
    line.smoothPoints = true;
    line.addPoint(elise.point(cx, cy));
    line.addPoint(elise.point(cx + 1, cy + 1));
    line.addPoint(elise.point(cx + 2, cy + 2));
    line.setStroke('#cce0ff,2');
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
        var t = parameters.elapsedTime * 0.35;

        for (var li = 0; li < layers; li++) {
            var base = 62 + li * 26;
            var points = '';

            for (var s = 0; s <= 720; s++) {
                var th = (s / 720) * Math.PI * 2;
                var a = 3 + li;
                var b = 8 + li * 2;
                var r = base * (0.58 + 0.42 * Math.cos(a * th + t * (0.82 + li * 0.06)));
                r += 20 * Math.sin(b * th - t * 1.2 + li * 0.7);

                var spin = t * 0.12 * (li + 1);
                var x = cx + Math.cos(th + spin) * r;
                var y = cy + Math.sin(th + spin) * r;

                if (s > 0) points += ' ';
                points += Math.round(x) + ',' + Math.round(y);
            }

            lines[li].setPoints(points);
            glows[li].setPoints(points);

            var hue = t * 40 + li * 55;
            var rr = Math.floor(120 + 100 * Math.sin(hue * Math.PI / 180));
            var gg = Math.floor(140 + 90 * Math.sin((hue + 120) * Math.PI / 180));
            var bb = Math.floor(220 + 30 * Math.sin((hue + 240) * Math.PI / 180));
            rr = Math.max(0, Math.min(255, rr));
            gg = Math.max(0, Math.min(255, gg));
            bb = Math.max(0, Math.min(255, bb));

            lines[li].setStroke(elise.color(180, rr, gg, bb).toHexString() + ',2');
            glows[li].setStroke(elise.color(36, rr, gg, bb).toHexString() + ',6');
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
