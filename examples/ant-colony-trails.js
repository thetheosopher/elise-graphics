var width = 780;
var height = 620;
var model = elise.model(width, height);
model.setFill('#16120d');

var cols = 52;
var rows = 40;
var cw = width / cols;
var ch = height / rows;

var pher = [];
var cells = [];
for (var y = 0; y < rows; y++) {
    pher[y] = [];
    cells[y] = [];
    for (var x = 0; x < cols; x++) {
        pher[y][x] = 0;
        var rc = elise.rectangle(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw) + 1, Math.ceil(ch) + 1);
        rc.setFill('#18140f');
        model.add(rc);
        cells[y][x] = rc;
    }
}

var nest = { x: 90, y: height - 90 };
var foods = [
    { x: width - 100, y: 100 },
    { x: width - 170, y: 200 },
    { x: width - 260, y: 120 },
    { x: width - 150, y: 300 }
];

var nestEl = elise.ellipse(nest.x, nest.y, 12, 12);
nestEl.setFill('#c58f44');
model.add(nestEl);

for (var fi = 0; fi < foods.length; fi++) {
    var foodEl = elise.ellipse(foods[fi].x, foods[fi].y, 11, 11);
    foodEl.setFill('#8dda58');
    foodEl.setStroke('#6ab64a,1');
    model.add(foodEl);
}

var ants = [];
var antEls = [];
for (var i = 0; i < 110; i++) {
    var a = {
        x: nest.x + (Math.random() - 0.5) * 16,
        y: nest.y + (Math.random() - 0.5) * 16,
        dir: Math.random() * Math.PI * 2,
        carrying: false,
        foodIndex: Math.floor(Math.random() * foods.length)
    };
    ants.push(a);

    var e = elise.ellipse(a.x, a.y, 1.8, 1.8);
    e.setFill('#f5d6a3');
    model.add(e);
    antEls.push(e);
}

var title = elise.text('Ant Colony Trails', 14, 12, 300, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(18);
title.setFill('#f4debb');
model.add(title);

var hud = elise.text('Carrying: 0', 14, 38, 380, 20);
hud.setTypeface('Consolas, monospace');
hud.setTypesize(14);
hud.setFill('#d2c29f');
model.add(hud);

function nearestFoodIndex(x, y) {
    var bestI = 0;
    var bestD = Number.POSITIVE_INFINITY;
    for (var i = 0; i < foods.length; i++) {
        var dx = foods[i].x - x;
        var dy = foods[i].y - y;
        var d2 = dx * dx + dy * dy;
        if (d2 < bestD) {
            bestD = d2;
            bestI = i;
        }
    }
    return bestI;
}

function cellOf(px, py) {
    return {
        x: Math.max(0, Math.min(cols - 1, Math.floor(px / cw))),
        y: Math.max(0, Math.min(rows - 1, Math.floor(py / ch)))
    };
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

        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                pher[y][x] *= 0.985;
            }
        }

        var carrying = 0;

        for (var i = 0; i < ants.length; i++) {
            var a = ants[i];

            if (!a.carrying && Math.random() < 0.01) {
                // Occasionally retarget so the colony explores multiple food sources.
                a.foodIndex = nearestFoodIndex(a.x, a.y);
            }

            var target = a.carrying ? nest : foods[a.foodIndex];
            var tx = target.x - a.x;
            var ty = target.y - a.y;
            var tl = Math.sqrt(tx * tx + ty * ty) || 1;

            var steer = Math.atan2(ty, tx);
            var noise = (Math.random() - 0.5) * 0.8;

            var c = cellOf(a.x, a.y);
            var best = pher[c.y][c.x];
            var bestDir = a.dir;
            for (var k = -2; k <= 2; k++) {
                var ang = a.dir + k * 0.35;
                var sx = a.x + Math.cos(ang) * 10;
                var sy = a.y + Math.sin(ang) * 10;
                var sc = cellOf(sx, sy);
                var pv = pher[sc.y][sc.x];
                if (pv > best) {
                    best = pv;
                    bestDir = ang;
                }
            }

            a.dir = a.dir * 0.62 + bestDir * 0.18 + steer * 0.2 + noise;

            var spd = a.carrying ? 42 : 55;
            a.x += Math.cos(a.dir) * spd * dt;
            a.y += Math.sin(a.dir) * spd * dt;

            if (a.x < 5) { a.x = 5; a.dir = Math.PI - a.dir; }
            if (a.x > width - 5) { a.x = width - 5; a.dir = Math.PI - a.dir; }
            if (a.y < 5) { a.y = 5; a.dir = -a.dir; }
            if (a.y > height - 5) { a.y = height - 5; a.dir = -a.dir; }

            var dFood = Math.sqrt((a.x - target.x) * (a.x - target.x) + (a.y - target.y) * (a.y - target.y));
            var dNest = Math.sqrt((a.x - nest.x) * (a.x - nest.x) + (a.y - nest.y) * (a.y - nest.y));
            if (!a.carrying && dFood < 16) {
                a.carrying = true;
            }
            if (a.carrying && dNest < 16) {
                a.carrying = false;
                a.foodIndex = Math.floor(Math.random() * foods.length);
            }

            var cc = cellOf(a.x, a.y);
            pher[cc.y][cc.x] = Math.min(1, pher[cc.y][cc.x] + (a.carrying ? 0.04 : 0.02));

            antEls[i].setCenter(elise.point(a.x, a.y));
            antEls[i].setFill(a.carrying ? '#fff18e' : '#f5d6a3');

            if (a.carrying) carrying++;
        }

        for (var yy = 0; yy < rows; yy++) {
            for (var xx = 0; xx < cols; xx++) {
                var p = pher[yy][xx];
                var r = Math.floor(22 + p * 50);
                var gcol = Math.floor(18 + p * 180);
                var bcol = Math.floor(14 + p * 80);
                cells[yy][xx].setFill(elise.color(255, r, gcol, bcol).toHexString());
            }
        }

        hud.setText('Carrying: ' + carrying + ' / ' + ants.length + '   Food sources: ' + foods.length);
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
