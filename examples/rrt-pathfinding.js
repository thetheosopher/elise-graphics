var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#0f1220');

var bg = elise.rectangle(0, 0, width, height);
bg.setFill('#10162a');
model.add(bg);

var obstacles = [];
for (var i = 0; i < 11; i++) {
    var w = 60 + Math.random() * 90;
    var h = 45 + Math.random() * 90;
    var x = 120 + Math.random() * (width - 240 - w);
    var y = 70 + Math.random() * (height - 140 - h);
    obstacles.push({ x: x, y: y, w: w, h: h });

    var o = elise.rectangle(x, y, w, h);
    o.setFill('#27304a');
    o.setStroke('#3d4e77,1');
    model.add(o);
}

var start = { x: 70, y: height - 70 };
var goal = { x: width - 70, y: 70 };

var sEl = elise.ellipse(start.x, start.y, 7, 7);
sEl.setFill('#6aff8d');
model.add(sEl);

var gEl = elise.ellipse(goal.x, goal.y, 7, 7);
gEl.setFill('#ff7b7b');
model.add(gEl);

var nodes = [{ x: start.x, y: start.y, parent: -1 }];
var edges = [];
var found = false;
var goalIndex = -1;

var edgeEls = [];
var pathEls = [];

var title = elise.text('RRT Pathfinding', 14, 12, 260, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(18);
title.setFill('#d4e0ff');
model.add(title);

var hud = elise.text('Nodes: 1', 14, 38, 340, 20);
hud.setTypeface('Consolas, monospace');
hud.setTypesize(14);
hud.setFill('#93b2ff');
model.add(hud);

function dist(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function collides(p) {
    for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        if (p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h) return true;
    }
    return false;
}

function segmentHits(a, b) {
    var steps = Math.ceil(dist(a, b) / 6);
    for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        if (collides(p)) return true;
    }
    return false;
}

var driver = elise.ellipse(-10, -10, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);
    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        if (!found) {
            for (var it = 0; it < 12; it++) {
                var target = Math.random() < 0.18 ? goal : { x: Math.random() * width, y: Math.random() * height };
                var best = 0;
                var bestD = 1e9;
                for (var n = 0; n < nodes.length; n++) {
                    var d = dist(nodes[n], target);
                    if (d < bestD) { bestD = d; best = n; }
                }

                var from = nodes[best];
                var step = 18;
                var dx = target.x - from.x;
                var dy = target.y - from.y;
                var dl = Math.sqrt(dx * dx + dy * dy) || 1;
                var np = { x: from.x + dx / dl * step, y: from.y + dy / dl * step };

                if (np.x < 0 || np.x >= width || np.y < 0 || np.y >= height) continue;
                if (collides(np) || segmentHits(from, np)) continue;

                var ni = nodes.length;
                nodes.push({ x: np.x, y: np.y, parent: best });

                var e = elise.line(from.x, from.y, np.x, np.y);
                e.setStroke('#6f92ff,1');
                edgeEls.push(e);
                model.add(e);

                if (dist(np, goal) < 22 && !segmentHits(np, goal)) {
                    found = true;
                    goalIndex = ni;
                    break;
                }

                if (nodes.length > 2200) {
                    found = true;
                    goalIndex = -1;
                    break;
                }
            }
        } else if (found && pathEls.length === 0 && goalIndex >= 0) {
            var path = [];
            var cur = goalIndex;
            while (cur >= 0) {
                path.push(nodes[cur]);
                cur = nodes[cur].parent;
            }
            for (var p = 0; p < path.length - 1; p++) {
                var pe = elise.line(path[p].x, path[p].y, path[p + 1].x, path[p + 1].y);
                pe.setStroke('#8dff9f,3');
                model.add(pe);
                pathEls.push(pe);
            }
        }

        if (!found) {
            hud.setText('Nodes: ' + nodes.length + '   Searching...');
        } else if (goalIndex >= 0) {
            hud.setText('Nodes: ' + nodes.length + '   Path found');
        } else {
            hud.setText('Nodes: ' + nodes.length + '   No path in budget');
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
