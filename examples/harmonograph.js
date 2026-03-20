var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#120d16');

var cx = width / 2;
var cy = height / 2 + 20;

var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 520, 520);
bgGrad.stops.push(elise.gradientFillStop('#2a1933', 0));
bgGrad.stops.push(elise.gradientFillStop('#1b1224', 0.68));
bgGrad.stops.push(elise.gradientFillStop('#100b18', 1));
bg.setFill(bgGrad);
model.add(bg);

var title = elise.text('Harmonograph', 16, 14, 220, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#f2dfff');
model.add(title);

var systems = [
    {
        A1: 145, A2: 110, A3: 135, A4: 95,
        f1: 2.01, f2: 3.03, f3: 2.00, f4: 2.97,
        p1: 0.2, p2: 1.1, p3: 1.8, p4: 0.4,
        d1: 0.0065, d2: 0.0069, d3: 0.0062, d4: 0.0068,
        color: { r: 255, g: 170, b: 220 }
    },
    {
        A1: 120, A2: 95, A3: 118, A4: 88,
        f1: 2.02, f2: 2.98, f3: 2.04, f4: 2.95,
        p1: 1.4, p2: 0.2, p3: 2.2, p4: 1.6,
        d1: 0.0062, d2: 0.0066, d3: 0.0064, d4: 0.0067,
        color: { r: 170, g: 220, b: 255 }
    }
];

var trails = [];
var glows = [];
var penEls = [];
var points = [];
for (var i = 0; i < systems.length; i++) {
    points[i] = [];

    var glow = elise.polyline();
    glow.smoothPoints = true;
    glow.addPoint(elise.point(cx, cy));
    glow.addPoint(elise.point(cx + 1, cy + 1));
    glow.addPoint(elise.point(cx + 2, cy + 2));
    glow.setStroke('#ffffff22,6');
    model.add(glow);
    glows.push(glow);

    var trail = elise.polyline();
    trail.smoothPoints = true;
    trail.addPoint(elise.point(cx, cy));
    trail.addPoint(elise.point(cx + 1, cy + 1));
    trail.addPoint(elise.point(cx + 2, cy + 2));
    trail.setStroke('#ffffffcc,2');
    model.add(trail);
    trails.push(trail);

    var pen = elise.ellipse(cx, cy, 2.6, 2.6);
    pen.setFill('#ffffff');
    model.add(pen);
    penEls.push(pen);
}

var simT = 0;
var maxPoints = 2200;

function harmonographPoint(cfg, t) {
    var x = cfg.A1 * Math.sin(cfg.f1 * t + cfg.p1) * Math.exp(-cfg.d1 * t) +
            cfg.A2 * Math.sin(cfg.f2 * t + cfg.p2) * Math.exp(-cfg.d2 * t);
    var y = cfg.A3 * Math.sin(cfg.f3 * t + cfg.p3) * Math.exp(-cfg.d3 * t) +
            cfg.A4 * Math.sin(cfg.f4 * t + cfg.p4) * Math.exp(-cfg.d4 * t);
    return { x: cx + x, y: cy + y };
}

var driver = elise.ellipse(-10, -10, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);

    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var dt = Math.max(0.01, Math.min(0.03, parameters.tickDelta));
        simT += dt * 1.25;

        for (var i = 0; i < systems.length; i++) {
            for (var n = 0; n < 6; n++) {
                var tt = simT + n * 0.045;
                var p = harmonographPoint(systems[i], tt);
                points[i].push({ x: Math.round(p.x), y: Math.round(p.y) });
            }
            while (points[i].length > maxPoints) {
                points[i].shift();
            }

            var arr = points[i];
            if (arr.length > 2) {
                var step = arr.length > 1300 ? 2 : 1;
                var str = '';
                for (var k = 0; k < arr.length; k += step) {
                    if (k > 0) str += ' ';
                    str += arr[k].x + ',' + arr[k].y;
                }
                if ((arr.length - 1) % step !== 0) {
                    str += ' ' + arr[arr.length - 1].x + ',' + arr[arr.length - 1].y;
                }
                trails[i].setPoints(str);
                glows[i].setPoints(str);

                var last = arr[arr.length - 1];
                penEls[i].setCenter(elise.point(last.x, last.y));
            }

            var c = systems[i].color;
            var shimmer = Math.sin(parameters.elapsedTime * 2.8 + i * 0.9) * 0.5 + 0.5;
            trails[i].setStroke(elise.color(Math.floor(165 + shimmer * 80), c.r, c.g, c.b).toHexString() + ',2');
            glows[i].setStroke(elise.color(Math.floor(22 + shimmer * 40), c.r, c.g, c.b).toHexString() + ',6');
            penEls[i].setFill(elise.color(255, c.r, c.g, c.b).toHexString());
        }

        if (simT > 65) {
            simT = 0;
            for (var j = 0; j < points.length; j++) {
                points[j] = [];
            }
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
