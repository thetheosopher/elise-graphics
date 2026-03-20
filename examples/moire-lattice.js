var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#0a0e18');

var cx = width / 2;
var cy = height / 2;

var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 620, 620);
bgGrad.stops.push(elise.gradientFillStop('#1a243d', 0));
bgGrad.stops.push(elise.gradientFillStop('#111827', 0.6));
bgGrad.stops.push(elise.gradientFillStop('#090e17', 1));
bg.setFill(bgGrad);
model.add(bg);

var title = elise.text('Moire Lattice', 16, 14, 240, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#d8f2ff');
model.add(title);

var bandCount = 9;
var bands = [];
var glows = [];

for (var i = 0; i < bandCount; i++) {
    var glow = elise.polyline();
    glow.smoothPoints = true;
    glow.addPoint(elise.point(0, cy));
    glow.addPoint(elise.point(width / 2, cy));
    glow.addPoint(elise.point(width, cy));
    glow.setStroke('#79d7ff14,5');
    model.add(glow);
    glows.push(glow);

    var line = elise.polyline();
    line.smoothPoints = true;
    line.addPoint(elise.point(0, cy));
    line.addPoint(elise.point(width / 2, cy));
    line.addPoint(elise.point(width, cy));
    line.setStroke('#c9ecff,1');
    model.add(line);
    bands.push(line);
}

var driver = elise.ellipse(-12, -12, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);

    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime * 0.58;

        for (var i = 0; i < bandCount; i++) {
            var phase = t * (0.8 + i * 0.09);
            var points = '';

            for (var x = 0; x <= width; x += 4) {
                var nx = x / width;
                var y = cy;
                y += Math.sin(nx * Math.PI * (8 + i) + phase) * (20 + i * 3);
                y += Math.sin(nx * Math.PI * (14 - i * 0.6) - phase * 0.74) * (12 + i * 2);
                y += Math.cos(nx * Math.PI * 31 + phase * 0.22 + i) * 8;

                if (x > 0) points += ' ';
                points += x + ',' + Math.round(y);
            }

            bands[i].setPoints(points);
            glows[i].setPoints(points);

            var hue = t * 38 + i * 24;
            var rr = Math.floor(92 + 84 * Math.sin(hue * Math.PI / 180));
            var gg = Math.floor(170 + 70 * Math.sin((hue + 118) * Math.PI / 180));
            var bb = Math.floor(220 + 28 * Math.sin((hue + 238) * Math.PI / 180));
            rr = Math.max(0, Math.min(255, rr));
            gg = Math.max(0, Math.min(255, gg));
            bb = Math.max(0, Math.min(255, bb));

            bands[i].setStroke(elise.color(172, rr, gg, bb).toHexString() + ',1');
            glows[i].setStroke(elise.color(26, rr, gg, bb).toHexString() + ',5');
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
