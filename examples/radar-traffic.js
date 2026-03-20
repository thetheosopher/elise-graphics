var width = 700;
var height = 700;
var model = elise.model(width, height);
model.setFill('#020b06');

var cx = width / 2;
var cy = height / 2;
var maxRange = 300;

// Radar backdrop
var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, width / 2, width / 2);
bgGrad.stops.push(elise.gradientFillStop('#032214', 0));
bgGrad.stops.push(elise.gradientFillStop('#02150d', 0.6));
bgGrad.stops.push(elise.gradientFillStop('#010a06', 1.0));
bg.setFill(bgGrad);
model.add(bg);

// Grid rings
for (var r = 1; r <= 6; r++) {
    var rr = (maxRange / 6) * r;
    var ring = elise.ellipse(cx, cy, rr, rr);
    ring.setStroke(elise.color(65, 70, 255, 120).toHexString() + ',1');
    model.add(ring);
}

// Axis spokes
for (var a = 0; a < 12; a++) {
    var angle = (a / 12) * Math.PI * 2;
    var x2 = cx + Math.cos(angle) * maxRange;
    var y2 = cy + Math.sin(angle) * maxRange;
    var spoke = elise.line(cx, cy, x2, y2);
    spoke.setStroke(elise.color(45, 70, 255, 120).toHexString() + ',1');
    model.add(spoke);
}

// Outer bezel
var bezel = elise.ellipse(cx, cy, maxRange + 12, maxRange + 12);
bezel.setStroke('#1c5f3a,3');
model.add(bezel);

function buildSweepSectorCommands(centerX, centerY, radius, angle, halfWidth) {
    var startA = angle - halfWidth;
    var endA = angle + halfWidth;
    var delta = endA - startA;
    var k = (4 / 3) * Math.tan(delta / 4);

    var p0x = centerX + Math.cos(startA) * radius;
    var p0y = centerY + Math.sin(startA) * radius;
    var p3x = centerX + Math.cos(endA) * radius;
    var p3y = centerY + Math.sin(endA) * radius;

    var cp1x = p0x + (-Math.sin(startA)) * radius * k;
    var cp1y = p0y + (Math.cos(startA)) * radius * k;
    var cp2x = p3x - (-Math.sin(endA)) * radius * k;
    var cp2y = p3y - (Math.cos(endA)) * radius * k;

    return (
        'm' + Math.round(centerX) + ',' + Math.round(centerY) + ' ' +
        'l' + Math.round(p0x) + ',' + Math.round(p0y) + ' ' +
        'c' +
            Math.round(cp1x) + ',' + Math.round(cp1y) + ',' +
            Math.round(cp2x) + ',' + Math.round(cp2y) + ',' +
            Math.round(p3x) + ',' + Math.round(p3y) + ' ' +
        'z'
    );
}

// Sweep cone and line
var sweepCone = elise.path();
sweepCone.setCommands(buildSweepSectorCommands(cx, cy, maxRange, 0, 0.24));
sweepCone.setFill(elise.color(40, 80, 255, 130).toHexString());
sweepCone.timer = 'tick';
sweepCone.tag = { kind: 'sweepCone' };
model.add(sweepCone);

var sweepLine = elise.line(cx, cy, cx + maxRange, cy);
sweepLine.setStroke(elise.color(190, 120, 255, 170).toHexString() + ',2');
sweepLine.timer = 'tick';
sweepLine.tag = { kind: 'sweepLine' };
model.add(sweepLine);

var centerDot = elise.ellipse(cx, cy, 4, 4);
centerDot.setFill(elise.color(255, 160, 255, 180).toHexString());
model.add(centerDot);

var readout = elise.text('TRAFFIC 0  |  SWEEP 0\u00b0', 16, 16, 280, 24);
readout.setTypeface('Consolas, monospace');
readout.setTypesize(16);
readout.setFill('#74ffb0');
readout.timer = 'tick';
readout.tag = { kind: 'readout' };
model.add(readout);

var targetCount = 30;
var targets = [];

for (var i = 0; i < targetCount; i++) {
    var baseR = 35 + Math.random() * (maxRange - 45);
    var turn = (Math.random() * 0.42 - 0.21);
    if (Math.abs(turn) < 0.05) {
        turn = turn < 0 ? -0.07 : 0.07;
    }

    var target = {
        id: 'AC' + (100 + i),
        baseR: baseR,
        baseTheta: Math.random() * Math.PI * 2,
        turnRate: turn,
        radialAmp: 8 + Math.random() * 22,
        radialFreq: 0.3 + Math.random() * 1.1,
        wobblePhase: Math.random() * Math.PI * 2,
        blinkFreq: 1.0 + Math.random() * 2.2,
        blinkPhase: Math.random() * Math.PI * 2
    };
    targets.push(target);

    var trail = elise.line(cx, cy, cx, cy);
    trail.setStroke(elise.color(20, 120, 255, 170).toHexString() + ',1');
    trail.timer = 'tick';
    trail.tag = { kind: 'trail', targetIndex: i };
    model.add(trail);

    var glow = elise.ellipse(cx, cy, 10, 10);
    glow.setFill(elise.color(0, 120, 255, 180).toHexString());
    glow.timer = 'tick';
    glow.tag = { kind: 'glow', targetIndex: i };
    model.add(glow);

    var dot = elise.ellipse(cx, cy, 2.5, 2.5);
    dot.setFill(elise.color(255, 170, 255, 200).toHexString());
    dot.timer = 'tick';
    dot.tag = { kind: 'dot', targetIndex: i };
    model.add(dot);
}

function targetPos(index, t) {
    var tr = targets[index];
    var wobble = Math.sin(t * tr.radialFreq + tr.wobblePhase) * 0.17;
    var theta = tr.baseTheta + t * tr.turnRate + wobble;
    var range = tr.baseR + Math.sin(t * tr.radialFreq * 0.65 + tr.wobblePhase * 0.7) * tr.radialAmp;
    var x = cx + Math.cos(theta) * range;
    var y = cy + Math.sin(theta) * range;
    return { x: x, y: y, theta: theta, range: range };
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);

    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime;
        var sweepAngle = (t * 1.45) % (Math.PI * 2);
        var beamWidth = 0.24;
        var tag = el.tag;

        if (tag.kind === 'sweepLine') {
            var sx = cx + Math.cos(sweepAngle) * maxRange;
            var sy = cy + Math.sin(sweepAngle) * maxRange;
            el.setP1(elise.point(cx, cy));
            el.setP2(elise.point(sx, sy));
            controller.invalidate();
            return;
        }

        if (tag.kind === 'sweepCone') {
            el.setCommands(buildSweepSectorCommands(cx, cy, maxRange, sweepAngle, beamWidth));
            controller.invalidate();
            return;
        }

        if (tag.kind === 'readout') {
            var deg = Math.round((sweepAngle * 180) / Math.PI);
            var busy = 0;
            for (var bi = 0; bi < targetCount; bi++) {
                var bp = targetPos(bi, t);
                var bearing = Math.atan2(bp.y - cy, bp.x - cx);
                var delta = Math.abs(Math.atan2(Math.sin(bearing - sweepAngle), Math.cos(bearing - sweepAngle)));
                if (delta < beamWidth * 0.75) {
                    busy++;
                }
            }
            el.setText('TRAFFIC ' + targetCount + '  |  HOT ' + busy + '  |  SWEEP ' + deg + '\u00b0');
            controller.invalidate();
            return;
        }

        var i = tag.targetIndex;
        var now = targetPos(i, t);
        var prev = targetPos(i, t - 0.45);
        var tr = targets[i];

        var bearing = Math.atan2(now.y - cy, now.x - cx);
        var deltaA = Math.abs(Math.atan2(Math.sin(bearing - sweepAngle), Math.cos(bearing - sweepAngle)));
        var lock = Math.max(0, 1 - deltaA / beamWidth);
        var rangeFade = 1 - (now.range / maxRange) * 0.55;
        var flash = lock * lock * rangeFade;
        var ambient = 0.12 + 0.1 * Math.sin(t * tr.blinkFreq + tr.blinkPhase);
        var intensity = Math.max(0.06, Math.min(1, ambient + flash * 1.35));

        if (tag.kind === 'trail') {
            var ta = Math.floor(20 + flash * 160);
            el.setP1(elise.point(prev.x, prev.y));
            el.setP2(elise.point(now.x, now.y));
            el.setStroke(elise.color(ta, 120, 255, 170).toHexString() + ',1');
            controller.invalidate();
            return;
        }

        if (tag.kind === 'glow') {
            var ga = Math.floor(20 + intensity * 95);
            var rad = 8 + intensity * 8;
            el.setCenter(elise.point(now.x, now.y));
            el.radiusX = rad;
            el.radiusY = rad;
            el.setFill(elise.color(ga, 120, 255, 170).toHexString());
            controller.invalidate();
            return;
        }

        if (tag.kind === 'dot') {
            var da = Math.floor(150 + intensity * 105);
            var dr = 2 + intensity * 1.8;
            el.setCenter(elise.point(now.x, now.y));
            el.radiusX = dr;
            el.radiusY = dr;
            el.setFill(elise.color(da, 180, 255, 205).toHexString());
            controller.invalidate();
            return;
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
