var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#080a12');

var bg = elise.rectangle(0, 0, width, height);
var grad = elise.radialGradientFill('380,300', '380,300', 520, 520);
grad.stops.push(elise.gradientFillStop('#151b2f', 0));
grad.stops.push(elise.gradientFillStop('#0f1423', 0.65));
grad.stops.push(elise.gradientFillStop('#090d18', 1));
bg.setFill(grad);
model.add(bg);

var title = elise.text('Lorenz Attractor Trails', 18, 16, 340, 28);
title.setTypeface('Consolas, monospace');
title.setTypesize(22);
title.setFill('#d7ddff');
model.add(title);

var subtitle = elise.text('dx/dt = s(y-x), dy/dt = x(r-z)-y, dz/dt = xy-bz', 18, 44, 560, 22);
subtitle.setTypeface('Consolas, monospace');
subtitle.setTypesize(14);
subtitle.setFill('#88a1d5');
model.add(subtitle);

var centerX = width / 2;
var centerY = height / 2 + 35;
var scale = 9.8;

var sigma = 10;
var rho = 28;
var beta = 8 / 3;

var systems = [
    { x: 0.1, y: 1.2, z: 1.05, color: { r: 255, g: 120, b: 130 }, speed: 1.0 },
    { x: 0.2, y: 1.22, z: 1.00, color: { r: 110, g: 215, b: 255 }, speed: 1.03 },
    { x: 0.3, y: 1.18, z: 1.02, color: { r: 160, g: 255, b: 145 }, speed: 0.97 }
];

var trails = [];
var glows = [];
var pens = [];
var points = [];
var maxPoints = 420;

for (var i = 0; i < systems.length; i++) {
    points[i] = [];

    var glow = elise.polyline();
    glow.smoothPoints = true;
    glow.addPoint(elise.point(centerX, centerY));
    glow.addPoint(elise.point(centerX, centerY));
    glow.addPoint(elise.point(centerX, centerY));
    glow.setStroke(elise.color(40, systems[i].color.r, systems[i].color.g, systems[i].color.b).toHexString() + ',6');
    glows.push(glow);
    model.add(glow);

    var trail = elise.polyline();
    trail.smoothPoints = true;
    trail.addPoint(elise.point(centerX, centerY));
    trail.addPoint(elise.point(centerX, centerY));
    trail.addPoint(elise.point(centerX, centerY));
    trail.setStroke(elise.color(200, systems[i].color.r, systems[i].color.g, systems[i].color.b).toHexString() + ',2');
    trails.push(trail);
    model.add(trail);

    var pen = elise.ellipse(centerX, centerY, 2.5, 2.5);
    pen.setFill(elise.color(255, systems[i].color.r, systems[i].color.g, systems[i].color.b).toHexString());
    pens.push(pen);
    model.add(pen);
}

var hud = elise.text('Points: 0', 18, 68, 220, 22);
hud.setTypeface('Consolas, monospace');
hud.setTypesize(14);
hud.setFill('#92daff');
model.add(hud);

var driver = elise.ellipse(-20, -20, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
driver.tag = { kind: 'driver' };
model.add(driver);

function project(sys, t) {
    var spin = t * 0.18;
    var sx = sys.x * Math.cos(spin) - sys.y * Math.sin(spin);
    var sy = sys.x * Math.sin(spin) + sys.y * Math.cos(spin);

    return {
        x: centerX + sx * scale,
        y: centerY + (sys.z - 26) * 5 + sy * 0.7
    };
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);

    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        if (!el.tag || el.tag.kind !== 'driver') {
            return;
        }

        var t = parameters.elapsedTime;
        var dt = Math.max(0.003, Math.min(0.016, parameters.tickDelta));

        for (var i = 0; i < systems.length; i++) {
            var sys = systems[i];
            var step = dt * sys.speed * 1.35;

            for (var n = 0; n < 2; n++) {
                var dx = sigma * (sys.y - sys.x);
                var dy = sys.x * (rho - sys.z) - sys.y;
                var dz = sys.x * sys.y - beta * sys.z;

                sys.x += dx * step;
                sys.y += dy * step;
                sys.z += dz * step;
            }

            // Reset this branch if it diverges numerically.
            if (!isFinite(sys.x) || !isFinite(sys.y) || !isFinite(sys.z) || Math.abs(sys.x) > 120 || Math.abs(sys.y) > 120 || Math.abs(sys.z) > 120) {
                sys.x = 0.1 + i * 0.12;
                sys.y = 1.2 + i * 0.02;
                sys.z = 1.05 + i * 0.03;
                points[i] = [];
            }

            var p = project(sys, t + i * 0.2);
            if (isFinite(p.x) && isFinite(p.y)) {
                points[i].push({ x: Math.round(p.x), y: Math.round(p.y) });
                while (points[i].length > maxPoints) {
                    points[i].shift();
                }
            }

            if (points[i].length > 0) {
                var last = points[i][points[i].length - 1];
                pens[i].setCenter(elise.point(last.x, last.y));
            }

            var arr = points[i];
            if (arr.length >= 3) {
                var pointStr = '';
                var stepDraw = arr.length > 300 ? 2 : 1;
                for (var j = 0; j < arr.length; j += stepDraw) {
                    if (j > 0) pointStr += ' ';
                    pointStr += arr[j].x + ',' + arr[j].y;
                }
                if ((arr.length - 1) % stepDraw !== 0) {
                    pointStr += ' ' + arr[arr.length - 1].x + ',' + arr[arr.length - 1].y;
                }

                trails[i].setPoints(pointStr);
                glows[i].setPoints(pointStr);
            }

            var c = systems[i].color;
            var shimmer = Math.sin(t * 3 + i) * 0.5 + 0.5;
            trails[i].setStroke(elise.color(Math.floor(145 + shimmer * 90), c.r, c.g, c.b).toHexString() + ',2');
            glows[i].setStroke(elise.color(Math.floor(24 + shimmer * 36), c.r, c.g, c.b).toHexString() + ',6');
        }

        hud.setText('Points: ' + points[0].length + ' / ' + maxPoints + '   sigma=10 rho=28 beta=2.667');
        controller.invalidate();
    });

    controller.startTimer();
});

return model;
