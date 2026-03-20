var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#090d16');

var cx = width / 2;
var cy = height / 2;

var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 560, 560);
bgGrad.stops.push(elise.gradientFillStop('#1b2239', 0));
bgGrad.stops.push(elise.gradientFillStop('#101628', 0.62));
bgGrad.stops.push(elise.gradientFillStop('#080c15', 1));
bg.setFill(bgGrad);
model.add(bg);

var title = elise.text('Hypotrochoid Weave', 16, 14, 320, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#d8e8ff');
model.add(title);

var layerCount = 5;
var glowLayers = [];
var lineLayers = [];

for (var i = 0; i < layerCount; i++) {
    var glow = elise.polyline();
    glow.smoothPoints = true;
    glow.addPoint(elise.point(cx, cy));
    glow.addPoint(elise.point(cx + 1, cy + 1));
    glow.addPoint(elise.point(cx + 2, cy + 2));
    glow.setStroke('#88b2ff22,5');
    model.add(glow);
    glowLayers.push(glow);

    var line = elise.polyline();
    line.smoothPoints = true;
    line.addPoint(elise.point(cx, cy));
    line.addPoint(elise.point(cx + 1, cy + 1));
    line.addPoint(elise.point(cx + 2, cy + 2));
    line.setStroke('#c8dcff,2');
    model.add(line);
    lineLayers.push(line);
}

var driver = elise.ellipse(-12, -12, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);

    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime * 0.42;

        for (var li = 0; li < layerCount; li++) {
            var R = 170 + li * 18;
            var r = 34 + li * 6;
            var d = 86 + li * 13;
            var spin = t * (0.07 + li * 0.015);
            var points = '';

            for (var s = 0; s <= 950; s++) {
                var theta = (s / 950) * Math.PI * 2 * (7 + li);
                var k = (R - r) / r;
                var x = (R - r) * Math.cos(theta) + d * Math.cos(k * theta + t * (0.55 + li * 0.08));
                var y = (R - r) * Math.sin(theta) - d * Math.sin(k * theta - t * (0.34 + li * 0.05));

                var rotX = x * Math.cos(spin) - y * Math.sin(spin);
                var rotY = x * Math.sin(spin) + y * Math.cos(spin);

                var px = cx + rotX * 0.9;
                var py = cy + rotY * 0.9;

                if (s > 0) points += ' ';
                points += Math.round(px) + ',' + Math.round(py);
            }

            lineLayers[li].setPoints(points);
            glowLayers[li].setPoints(points);

            var hue = t * 44 + li * 68;
            var rr = Math.floor(120 + 105 * Math.sin(hue * Math.PI / 180));
            var gg = Math.floor(140 + 90 * Math.sin((hue + 112) * Math.PI / 180));
            var bb = Math.floor(215 + 38 * Math.sin((hue + 238) * Math.PI / 180));
            rr = Math.max(0, Math.min(255, rr));
            gg = Math.max(0, Math.min(255, gg));
            bb = Math.max(0, Math.min(255, bb));

            lineLayers[li].setStroke(elise.color(182, rr, gg, bb).toHexString() + ',2');
            glowLayers[li].setStroke(elise.color(38, rr, gg, bb).toHexString() + ',5');
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
