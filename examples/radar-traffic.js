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
bgGrad.stops.push(elise.gradientFillStop('#0a1f13', 0));
bgGrad.stops.push(elise.gradientFillStop('#06160e', 0.62));
bgGrad.stops.push(elise.gradientFillStop('#030b07', 1.0));
bg.setFill(bgGrad);
model.add(bg);

// Grid rings
for (var r = 1; r <= 6; r++) {
    var rr = (maxRange / 6) * r;
    var ring = elise.ellipse(cx, cy, rr, rr);
    ring.setStroke(elise.color(70, 90, 255, 145).toHexString() + ',1');
    model.add(ring);
}

// Axis spokes
for (var a = 0; a < 12; a++) {
    var angle = (a / 12) * Math.PI * 2;
    var x2 = cx + Math.cos(angle) * maxRange;
    var y2 = cy + Math.sin(angle) * maxRange;
    var spoke = elise.line(cx, cy, x2, y2);
    spoke.setStroke(elise.color(42, 80, 220, 120).toHexString() + ',1');
    model.add(spoke);
}

// Outer bezel
var bezel = elise.ellipse(cx, cy, maxRange + 12, maxRange + 12);
bezel.setStroke('#2d7049,3');
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
sweepCone.setCommands(buildSweepSectorCommands(cx, cy, maxRange, 0, 0.12));
sweepCone.setFill(elise.color(38, 95, 255, 130).toHexString());
sweepCone.timer = 'tick';
sweepCone.tag = { kind: 'sweepCone' };
model.add(sweepCone);

var sweepLine = elise.line(cx, cy, cx + maxRange, cy);
sweepLine.setStroke(elise.color(210, 130, 255, 170).toHexString() + ',1.5');
sweepLine.timer = 'tick';
sweepLine.tag = { kind: 'sweepLine' };
model.add(sweepLine);

var centerDot = elise.ellipse(cx, cy, 4, 4);
centerDot.setFill(elise.color(255, 175, 255, 190).toHexString());
model.add(centerDot);

var readout = elise.text('TRAFFIC 0  |  SWEEP 0\u00b0', 16, 16, 280, 24);
readout.setTypeface('Consolas, monospace');
readout.setTypesize(16);
readout.setFill('#9cffbf');
readout.timer = 'tick';
readout.tag = { kind: 'readout' };
model.add(readout);

var targetCount = 5;
var targets = [];

function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
}

function makeTailNumber() {
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return 'N' + randomInt(10, 999) + letters.charAt(randomInt(0, 25)) + letters.charAt(randomInt(0, 25));
}

function makeAircraft() {
    // Spawn near edge and aim mostly inward to emulate traffic crossing the scope.
    var edgeAngle = Math.random() * Math.PI * 2;
    var spawnRange = maxRange + 18;
    var x = cx + Math.cos(edgeAngle) * spawnRange;
    var y = cy + Math.sin(edgeAngle) * spawnRange;

    var inbound = Math.atan2(cy - y, cx - x);
    var heading = inbound + (Math.random() - 0.5) * 0.35;
    var speed = 48 + Math.random() * 36; // px/sec on scope

    return {
        tail: makeTailNumber(),
        flightLevel: randomInt(180, 410),
        groundspeed: randomInt(260, 470),
        x: x,
        y: y,
        prevX: x,
        prevY: y,
        vx: Math.cos(heading) * speed,
        vy: Math.sin(heading) * speed,
        speed: speed
    };
}

function respawnAircraft(index) {
    targets[index] = makeAircraft();
}

for (var i = 0; i < targetCount; i++) {
    targets.push(makeAircraft());

    var trail = elise.line(cx, cy, cx, cy);
    trail.setStroke(elise.color(14, 105, 245, 150).toHexString() + ',1');
    trail.timer = 'tick';
    trail.tag = { kind: 'trail', targetIndex: i };
    model.add(trail);

    var glow = elise.ellipse(cx, cy, 8, 8);
    glow.setFill(elise.color(0, 115, 235, 150).toHexString());
    glow.timer = 'tick';
    glow.tag = { kind: 'glow', targetIndex: i };
    model.add(glow);

    var dot = elise.ellipse(cx, cy, 2.2, 2.2);
    dot.setFill(elise.color(255, 185, 255, 215).toHexString());
    dot.timer = 'tick';
    dot.tag = { kind: 'dot', targetIndex: i };
    model.add(dot);

    var label = elise.text('', cx + 6, cy - 14, 180, 16);
    label.setTypeface('Consolas, monospace');
    label.setTypesize(11);
    label.setFill('#a8ffca');
    label.timer = 'tick';
    label.tag = { kind: 'label', targetIndex: i };
    model.add(label);
}

var driver = elise.ellipse(-20, -20, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
driver.tag = { kind: 'driver' };
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);

    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime;
        var sweepAngle = (t * 0.92) % (Math.PI * 2);
        var beamWidth = 0.12;
        var tag = el.tag;

        if (tag.kind === 'driver') {
            var dt = Math.max(0.01, Math.min(0.04, parameters.tickDelta));
            for (var ai = 0; ai < targetCount; ai++) {
                var ac = targets[ai];
                ac.prevX = ac.x;
                ac.prevY = ac.y;
                ac.x += ac.vx * dt;
                ac.y += ac.vy * dt;

                var dxOut = ac.x - cx;
                var dyOut = ac.y - cy;
                var rOut = Math.sqrt(dxOut * dxOut + dyOut * dyOut);
                if (rOut > maxRange + 26) {
                    respawnAircraft(ai);
                }
            }
            controller.invalidate();
            return;
        }

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
                var bp = targets[bi];
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
        var tr = targets[i];
        var now = { x: tr.x, y: tr.y };
        var prev = { x: tr.prevX, y: tr.prevY };

        var dxr = now.x - cx;
        var dyr = now.y - cy;
        var range = Math.sqrt(dxr * dxr + dyr * dyr);

        var bearing = Math.atan2(dyr, dxr);
        var deltaA = Math.abs(Math.atan2(Math.sin(bearing - sweepAngle), Math.cos(bearing - sweepAngle)));
        var lock = Math.max(0, 1 - deltaA / beamWidth);
        var rangeFade = 1 - (range / maxRange) * 0.55;
        var flash = lock * lock * rangeFade;
        var ambient = 0.03;
        var intensity = Math.max(0.03, Math.min(1, ambient + flash * 1.1));

        if (tag.kind === 'trail') {
            var ta = Math.floor(12 + flash * 120);
            el.setP1(elise.point(prev.x, prev.y));
            el.setP2(elise.point(now.x, now.y));
            el.setStroke(elise.color(ta, 105, 245, 155).toHexString() + ',1');
            controller.invalidate();
            return;
        }

        if (tag.kind === 'glow') {
            var ga = Math.floor(10 + intensity * 78);
            var rad = 5 + intensity * 7;
            el.setCenter(elise.point(now.x, now.y));
            el.radiusX = rad;
            el.radiusY = rad;
            el.setFill(elise.color(ga, 115, 240, 160).toHexString());
            controller.invalidate();
            return;
        }

        if (tag.kind === 'dot') {
            var da = Math.floor(110 + intensity * 125);
            var dr = 1.8 + intensity * 1.6;
            el.setCenter(elise.point(now.x, now.y));
            el.radiusX = dr;
            el.radiusY = dr;
            el.setFill(elise.color(da, 170, 255, 198).toHexString());
            controller.invalidate();
            return;
        }

        if (tag.kind === 'label') {
            var la = Math.floor(50 + flash * 180);
            el.setLocation(elise.point(now.x + 8, now.y - 13));
            el.setText(tr.tail + ' FL' + tr.flightLevel + ' ' + tr.groundspeed + 'KT');
            el.setFill(elise.color(la, 175, 255, 202).toHexString());
            controller.invalidate();
            return;
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
