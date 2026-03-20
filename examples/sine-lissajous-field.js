var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#090c15');

var cx = width / 2;
var cy = height / 2;

var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 560, 560);
bgGrad.stops.push(elise.gradientFillStop('#1f1634', 0));
bgGrad.stops.push(elise.gradientFillStop('#141327', 0.62));
bgGrad.stops.push(elise.gradientFillStop('#080b15', 1));
bg.setFill(bgGrad);
model.add(bg);

var title = elise.text('Sine Lissajous Field', 16, 14, 320, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#f0ddff');
model.add(title);

var rows = 8;
var curves = [];
var glows = [];

for (var i = 0; i < rows; i++) {
    var glow = elise.polyline();
    glow.smoothPoints = true;
    glow.addPoint(elise.point(30, cy));
    glow.addPoint(elise.point(width / 2, cy));
    glow.addPoint(elise.point(width - 30, cy));
    glow.setStroke('#f084ff18,4');
    model.add(glow);
    glows.push(glow);

    var curve = elise.polyline();
    curve.smoothPoints = true;
    curve.addPoint(elise.point(30, cy));
    curve.addPoint(elise.point(width / 2, cy));
    curve.addPoint(elise.point(width - 30, cy));
    curve.setStroke('#ffd8ff,2');
    model.add(curve);
    curves.push(curve);
}

var driver = elise.ellipse(-12, -12, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);

    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime * 0.52;

        for (var i = 0; i < rows; i++) {
            var yBase = 90 + i * ((height - 170) / (rows - 1));
            var a = 2 + i * 0.7;
            var b = 3 + i * 0.9;
            var points = '';

            for (var x = 22; x <= width - 22; x += 3) {
                var nx = (x - 22) / (width - 44);
                var lx = Math.sin(nx * Math.PI * a + t * (0.7 + i * 0.06));
                var ly = Math.sin(nx * Math.PI * b - t * (0.9 + i * 0.04));
                var y = yBase + lx * (18 + i * 3) + ly * (16 + i * 2);

                if (x > 22) points += ' ';
                points += x + ',' + Math.round(y);
            }

            curves[i].setPoints(points);
            glows[i].setPoints(points);

            var hue = t * 46 + i * 33;
            var rr = Math.floor(165 + 74 * Math.sin(hue * Math.PI / 180));
            var gg = Math.floor(95 + 78 * Math.sin((hue + 120) * Math.PI / 180));
            var bb = Math.floor(205 + 45 * Math.sin((hue + 240) * Math.PI / 180));
            rr = Math.max(0, Math.min(255, rr));
            gg = Math.max(0, Math.min(255, gg));
            bb = Math.max(0, Math.min(255, bb));

            curves[i].setStroke(elise.color(170, rr, gg, bb).toHexString() + ',2');
            glows[i].setStroke(elise.color(30, rr, gg, bb).toHexString() + ',4');
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
