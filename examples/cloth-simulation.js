var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#121722');

var bg = elise.rectangle(0, 0, width, height);
var grad = elise.linearGradientFill('0,0', '0,620');
grad.stops.push(elise.gradientFillStop('#2a3142', 0));
grad.stops.push(elise.gradientFillStop('#1c2330', 0.7));
grad.stops.push(elise.gradientFillStop('#151b26', 1));
bg.setFill(grad);
model.add(bg);

var cols = 22;
var rows = 14;
var spacing = 22;
var startX = 140;
var startY = 90;

var points = [];
for (var y = 0; y < rows; y++) {
    points[y] = [];
    for (var x = 0; x < cols; x++) {
        var px = startX + x * spacing;
        var py = startY + y * spacing;
        points[y][x] = {
            x: px, y: py,
            ox: px, oy: py,
            pin: (y === 0 && (x === 0 || x === cols - 1 || x % 5 === 0))
        };
    }
}

var links = [];
for (var y2 = 0; y2 < rows; y2++) {
    for (var x2 = 0; x2 < cols; x2++) {
        if (x2 < cols - 1) links.push({ a: [x2, y2], b: [x2 + 1, y2], len: spacing });
        if (y2 < rows - 1) links.push({ a: [x2, y2], b: [x2, y2 + 1], len: spacing });
    }
}

var lineEls = [];
for (var i = 0; i < links.length; i++) {
    var l = elise.line(0, 0, 0, 0);
    l.setStroke('#8ab0ff,1');
    model.add(l);
    lineEls.push(l);
}

var pinEls = [];
for (var x3 = 0; x3 < cols; x3++) {
    if (points[0][x3].pin) {
        var p = elise.ellipse(points[0][x3].x, points[0][x3].y, 3, 3);
        p.setFill('#ffd27a');
        model.add(p);
        pinEls.push(p);
    }
}

var title = elise.text('Cloth Simulation', 14, 12, 280, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(18);
title.setFill('#dde7ff');
model.add(title);

var driver = elise.ellipse(-10, -10, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);
    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var dt = Math.max(0.01, Math.min(0.033, parameters.tickDelta));
        var wind = Math.sin(parameters.elapsedTime * 1.5) * 18;

        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                var p = points[y][x];
                if (p.pin) continue;

                var vx = (p.x - p.ox) * 0.992;
                var vy = (p.y - p.oy) * 0.992;
                p.ox = p.x;
                p.oy = p.y;

                p.x += vx + wind * dt * 0.12 * (y / rows);
                p.y += vy + 560 * dt * dt;
            }
        }

        for (var it = 0; it < 3; it++) {
            for (var k = 0; k < links.length; k++) {
                var a = points[links[k].a[1]][links[k].a[0]];
                var b = points[links[k].b[1]][links[k].b[0]];
                var dx = b.x - a.x;
                var dy = b.y - a.y;
                var d = Math.sqrt(dx * dx + dy * dy) || 1;
                var diff = (d - links[k].len) / d;
                var offx = dx * diff * 0.5;
                var offy = dy * diff * 0.5;

                if (!a.pin) { a.x += offx; a.y += offy; }
                if (!b.pin) { b.x -= offx; b.y -= offy; }
            }

            for (var yb = 0; yb < rows; yb++) {
                for (var xb = 0; xb < cols; xb++) {
                    var pp = points[yb][xb];
                    if (!pp.pin) {
                        if (pp.x < 20) pp.x = 20;
                        if (pp.x > width - 20) pp.x = width - 20;
                        if (pp.y > height - 20) pp.y = height - 20;
                    }
                }
            }
        }

        for (var m = 0; m < links.length; m++) {
            var pa = points[links[m].a[1]][links[m].a[0]];
            var pb = points[links[m].b[1]][links[m].b[0]];
            lineEls[m].setP1(elise.point(pa.x, pa.y));
            lineEls[m].setP2(elise.point(pb.x, pb.y));
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
