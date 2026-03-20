var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#090d17');

var cx = width / 2;
var cy = height / 2;

var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 560, 560);
bgGrad.stops.push(elise.gradientFillStop('#261833', 0));
bgGrad.stops.push(elise.gradientFillStop('#171328', 0.58));
bgGrad.stops.push(elise.gradientFillStop('#090d17', 1));
bg.setFill(bgGrad);
model.add(bg);

var title = elise.text('Maurer Rose', 16, 14, 260, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#f2ddff');
model.add(title);

var chordCount = 220;
var glowLines = [];
var coreLines = [];
var ringSegments = 180;
var ringLines = [];

for (var li = 0; li < chordCount; li++) {
    var glow = elise.line(cx, cy, cx, cy);
    glow.setStroke('#d089ff20,4');
    model.add(glow);
    glowLines.push(glow);

    var core = elise.line(cx, cy, cx, cy);
    core.setStroke('#ffd4ff,1');
    model.add(core);
    coreLines.push(core);
}

for (var ri = 0; ri < ringSegments; ri++) {
    var ringSeg = elise.line(cx, cy, cx, cy);
    ringSeg.setStroke('#f7c9ff,2');
    model.add(ringSeg);
    ringLines.push(ringSeg);
}

var driver = elise.ellipse(-12, -12, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);

    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime * 0.34;
        var k = 8 + 1.6 * Math.sin(t * 0.22);
        var d = 71 + 19 * Math.sin(t * 0.47);
        var radius = 208;
        var rosePoints = [];

        for (var i = 0; i <= 360; i++) {
            var a = i * Math.PI / 180;
            var r = radius * Math.sin(k * a);
            var px = cx + Math.cos(a + t * 0.09) * r;
            var py = cy + Math.sin(a + t * 0.09) * r;
            rosePoints.push({ x: px, y: py });
        }

        var maxIndex = rosePoints.length;

        function roseAt(index) {
            var idx = ((index % maxIndex) + maxIndex) % maxIndex;
            var p = rosePoints[idx];
            if (!p) {
                return { x: cx, y: cy };
            }
            return p;
        }

        for (var rk = 0; rk < ringSegments; rk++) {
            var aIdx = Math.floor((rk / ringSegments) * maxIndex);
            var bIdx = Math.floor(((rk + 1) / ringSegments) * maxIndex);
            var pa = roseAt(aIdx);
            var pb = roseAt(bIdx);
            ringLines[rk].setP1(elise.point(pa.x, pa.y));
            ringLines[rk].setP2(elise.point(pb.x, pb.y));
        }

        for (var j = 0; j < chordCount; j++) {
            var pIndex = Math.floor((j / chordCount) * maxIndex) % maxIndex;
            var qIndex = Math.floor((j * d) % maxIndex);
            var p = roseAt(pIndex);
            var q = roseAt(qIndex);

            coreLines[j].setP1(elise.point(p.x, p.y));
            coreLines[j].setP2(elise.point(q.x, q.y));
            glowLines[j].setP1(elise.point(p.x, p.y));
            glowLines[j].setP2(elise.point(q.x, q.y));
        }

        var hue = t * 54;
        var rr = Math.floor(180 + 70 * Math.sin(hue * Math.PI / 180));
        var gg = Math.floor(110 + 80 * Math.sin((hue + 130) * Math.PI / 180));
        var bb = Math.floor(215 + 36 * Math.sin((hue + 248) * Math.PI / 180));
        rr = Math.max(0, Math.min(255, rr));
        gg = Math.max(0, Math.min(255, gg));
        bb = Math.max(0, Math.min(255, bb));

        var coreColor = elise.color(150, rr, gg, bb).toHexString() + ',1';
        var glowColor = elise.color(28, rr, gg, bb).toHexString() + ',4';
        for (var si = 0; si < chordCount; si++) {
            coreLines[si].setStroke(coreColor);
            glowLines[si].setStroke(glowColor);
        }
        var ringColor = elise.color(178, bb, rr, gg).toHexString() + ',2';
        for (var rs = 0; rs < ringSegments; rs++) {
            ringLines[rs].setStroke(ringColor);
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
