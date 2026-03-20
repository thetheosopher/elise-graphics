var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#090d16');

var cx = width / 2;
var cy = height / 2;

var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 560, 560);
bgGrad.stops.push(elise.gradientFillStop('#1e2a41', 0));
bgGrad.stops.push(elise.gradientFillStop('#131a2f', 0.57));
bgGrad.stops.push(elise.gradientFillStop('#090d16', 1));
bg.setFill(bgGrad);
model.add(bg);

var title = elise.text('Polar Harmonic Mesh', 16, 14, 320, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#d9eeff');
model.add(title);

var layers = 7;
var lines = [];
var glows = [];

for (var i = 0; i < layers; i++) {
    var glow = elise.polyline();
    glow.smoothPoints = true;
    glow.addPoint(elise.point(cx, cy));
    glow.addPoint(elise.point(cx + 1, cy + 1));
    glow.addPoint(elise.point(cx + 2, cy + 2));
    glow.setStroke('#7bc8ff14,5');
    model.add(glow);
    glows.push(glow);

    var line = elise.polyline();
    line.smoothPoints = true;
    line.addPoint(elise.point(cx, cy));
    line.addPoint(elise.point(cx + 1, cy + 1));
    line.addPoint(elise.point(cx + 2, cy + 2));
    line.setStroke('#bde3ff,2');
    model.add(line);
    lines.push(line);
}

var driver = elise.ellipse(-12, -12, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);

    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime * 0.39;

        for (var li = 0; li < layers; li++) {
            var points = '';
            var radial = 92 + li * 28;

            for (var s = 0; s <= 840; s++) {
                var th = (s / 840) * Math.PI * 2;
                var r = radial;
                r += 28 * Math.sin((4 + li) * th + t * (0.7 + li * 0.05));
                r += 22 * Math.cos((9 - li * 0.4) * th - t * 0.92 + li * 0.6);
                r += 16 * Math.sin((13 + li) * th + t * 1.3);

                var warp = 1 + 0.08 * Math.sin(t * 0.8 + li);
                var x = cx + Math.cos(th + t * 0.09) * r * warp;
                var y = cy + Math.sin(th - t * 0.05) * r / warp;

                if (s > 0) points += ' ';
                points += Math.round(x) + ',' + Math.round(y);
            }

            lines[li].setPoints(points);
            glows[li].setPoints(points);

            var hue = t * 36 + li * 42;
            var rr = Math.floor(90 + 95 * Math.sin(hue * Math.PI / 180));
            var gg = Math.floor(160 + 78 * Math.sin((hue + 108) * Math.PI / 180));
            var bb = Math.floor(220 + 30 * Math.sin((hue + 234) * Math.PI / 180));
            rr = Math.max(0, Math.min(255, rr));
            gg = Math.max(0, Math.min(255, gg));
            bb = Math.max(0, Math.min(255, bb));

            lines[li].setStroke(elise.color(168, rr, gg, bb).toHexString() + ',2');
            glows[li].setStroke(elise.color(30, rr, gg, bb).toHexString() + ',5');
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
