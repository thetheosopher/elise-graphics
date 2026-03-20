var width = 800;
var height = 600;
var model = elise.model(width, height);
model.setFill('#050510');

// --- Starfield ---
for (var i = 0; i < 120; i++) {
    var sx = Math.random() * width;
    var sy = Math.random() * height * 0.65;
    var sr = Math.random() * 1.5 + 0.5;
    var alpha = Math.floor(Math.random() * 180) + 50;
    var star = elise.ellipse(sx, sy, sr, sr);
    star.setFill(elise.color(alpha, 255, 255, 255).toHexString());
    star.timer = 'twinkle';
    star.tag = { baseAlpha: alpha, phase: Math.random() * Math.PI * 2 };
    model.add(star);
}

// --- Mountain silhouette ---
var mountain = elise.polygon();
mountain.addPoint(elise.point(0, height));
mountain.addPoint(elise.point(0, 480));
mountain.addPoint(elise.point(60, 460));
mountain.addPoint(elise.point(120, 420));
mountain.addPoint(elise.point(160, 380));
mountain.addPoint(elise.point(200, 350));
mountain.addPoint(elise.point(260, 370));
mountain.addPoint(elise.point(300, 340));
mountain.addPoint(elise.point(340, 310));
mountain.addPoint(elise.point(380, 330));
mountain.addPoint(elise.point(420, 280));
mountain.addPoint(elise.point(460, 310));
mountain.addPoint(elise.point(500, 340));
mountain.addPoint(elise.point(540, 310));
mountain.addPoint(elise.point(580, 290));
mountain.addPoint(elise.point(620, 320));
mountain.addPoint(elise.point(660, 350));
mountain.addPoint(elise.point(700, 330));
mountain.addPoint(elise.point(740, 370));
mountain.addPoint(elise.point(800, 400));
mountain.addPoint(elise.point(800, height));
mountain.setFill('#0a0a14');
model.add(mountain);

// --- Aurora ribbons ---
var ribbonCount = 5;
var ribbons = [];
var ribbonColors = [
    { r: 50, g: 255, b: 100 },
    { r: 30, g: 200, b: 180 },
    { r: 80, g: 255, b: 80 },
    { r: 120, g: 160, b: 255 },
    { r: 180, g: 80, b: 220 }
];
var segCount = 34;

for (var r = 0; r < ribbonCount; r++) {
    var ribbon = elise.polyline();
    ribbon.smoothPoints = true;
    var baseY = 140 + r * 55;
    var pts = [];
    for (var s = 0; s <= segCount; s++) {
        var px = (s / segCount) * width;
        var py = baseY + Math.sin(s * 0.5 + r * 1.2) * 30;
        pts.push({ x: px, y: py });
        ribbon.addPoint(elise.point(px, py));
    }
    var rc = ribbonColors[r];
    var alpha = 140 - r * 15;
    ribbon.setStroke(elise.color(alpha, rc.r, rc.g, rc.b).toHexString() + ',14');
    ribbon.timer = 'tick';
    ribbon.tag = {
        index: r,
        baseY: baseY,
        color: rc,
        baseAlpha: alpha,
        points: pts,
        driftPhase: Math.random() * Math.PI * 2,
        curtainPhase: Math.random() * Math.PI * 2
    };
    ribbons.push(ribbon);
    model.add(ribbon);

    // Glow layer (wider, more transparent)
    var glow = elise.polyline();
    glow.smoothPoints = true;
    for (var s = 0; s <= segCount; s++) {
        glow.addPoint(elise.point(pts[s].x, pts[s].y));
    }
    glow.setStroke(elise.color(Math.floor(alpha * 0.3), rc.r, rc.g, rc.b).toHexString() + ',40');
    glow.timer = 'tick';
    glow.tag = {
        index: r,
        baseY: baseY,
        color: rc,
        baseAlpha: Math.floor(alpha * 0.3),
        points: pts,
        isGlow: true,
        driftPhase: ribbon.tag.driftPhase,
        curtainPhase: ribbon.tag.curtainPhase
    };
    ribbons.push(glow);
    model.add(glow);
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);

    commandHandler.addHandler('twinkle', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 1.9;
        var tag = el.tag;
        var flicker = Math.sin(phase * 2.5 + tag.phase) * 0.4 + 0.6;
        var a = Math.floor(tag.baseAlpha * flicker);
        a = Math.max(0, Math.min(255, a));
        el.setFill(elise.color(a, 255, 255, 255).toHexString());
    });

    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime;
        var tag = el.tag;
        var r = tag.index;
        var newPoints = [];

        // Real aurora motion is mostly a slow bulk drift with layered curtain ripples.
        var drift = phase * 0.28 + tag.driftPhase;
        var curtain = phase * 0.95 + tag.curtainPhase;

        for (var s = 0; s <= segCount; s++) {
            var nx = s / segCount;
            var pxBase = nx * width;

            // Lateral shearing makes curtains feel like flowing plasma sheets.
            var shear = Math.sin(drift + nx * 7.5 + r * 0.9) * 10;
            var px = pxBase + shear;

            var waveLong = Math.sin(drift + nx * 6.3 + r * 1.2) * 26;
            var waveMid = Math.sin(drift * 1.35 + nx * 12.8 + r * 0.8) * 16;
            var flutter = Math.sin(curtain * 2.0 + nx * 20.0 + r * 1.6) * 7;

            // Vertical curtain droop profile: stronger displacement near middle width.
            var curtainProfile = Math.sin(nx * Math.PI) * Math.sin(nx * Math.PI);
            var droop = Math.sin(curtain + nx * 9.0 + r * 1.1) * (18 * curtainProfile);

            var py = tag.baseY + waveLong + waveMid + flutter + droop;
            newPoints.push({ x: px, y: py });
        }
        tag.points = newPoints;

        // Rebuild point string
        var pointStr = '';
        for (var s = 0; s <= segCount; s++) {
            if (s > 0) pointStr += ' ';
            pointStr += Math.round(newPoints[s].x) + ',' + Math.round(newPoints[s].y);
        }
        el.setPoints(pointStr);

        // Animate color cycling
        var colorShift = Math.sin(drift * 0.55 + r * 0.8) * 0.2;
        var rc = tag.color;
        var cr = Math.floor(Math.max(0, Math.min(255, rc.r + colorShift * 44)));
        var cg = Math.floor(Math.max(0, Math.min(255, rc.g + colorShift * 24)));
        var cb = Math.floor(Math.max(0, Math.min(255, rc.b - colorShift * 28)));
        var alphaWave = Math.sin(drift * 0.7 + r * 1.1) * 0.2 + 0.8;
        var a = Math.floor(tag.baseAlpha * alphaWave);
        a = Math.max(0, Math.min(255, a));

        var strokeWidth = tag.isGlow ? 40 : 14;
        el.setStroke(elise.color(a, cr, cg, cb).toHexString() + ',' + strokeWidth);

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
