var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#1a1022');

var bg = elise.rectangle(0, 0, width, height);
var grad = elise.radialGradientFill('380,320', '380,320', 520, 520);
grad.stops.push(elise.gradientFillStop('#2c1c3a', 0));
grad.stops.push(elise.gradientFillStop('#1f142d', 0.7));
grad.stops.push(elise.gradientFillStop('#160f21', 1));
bg.setFill(grad);
model.add(bg);

function makeBlob(cx, cy, r, verts, color, vx, vy) {
    var pts = [];
    for (var i = 0; i < verts; i++) {
        var a = (i / verts) * Math.PI * 2;
        var x = cx + Math.cos(a) * r;
        var y = cy + Math.sin(a) * r;
        pts.push({ x: x, y: y, ox: x, oy: y, bx: x, by: y });
    }
    return { cx: cx, cy: cy, r: r, pts: pts, color: color, vx: vx, vy: vy };
}

var blobs = [
    makeBlob(260, 290, 82, 26, { r: 120, g: 210, b: 255 }, 65, 42),
    makeBlob(510, 350, 95, 30, { r: 255, g: 140, b: 210 }, -58, -37),
    makeBlob(170, 430, 70, 24, { r: 255, g: 205, b: 120 }, 52, -46),
    makeBlob(610, 220, 66, 22, { r: 165, g: 255, b: 170 }, -54, 48),
    makeBlob(380, 170, 58, 20, { r: 190, g: 180, b: 255 }, 40, 56)
];

var polys = [];
for (var b = 0; b < blobs.length; b++) {
    var p = elise.polygon();
    p.setPoints('0,0 0,0 0,0');
    p.setFill(elise.color(145, blobs[b].color.r, blobs[b].color.g, blobs[b].color.b).toHexString());
    p.setStroke(elise.color(230, blobs[b].color.r, blobs[b].color.g, blobs[b].color.b).toHexString() + ',2');
    model.add(p);
    polys.push(p);
}

var title = elise.text('Soft Body Blobs', 14, 12, 280, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(18);
title.setFill('#ead8ff');
model.add(title);

var driver = elise.ellipse(-10, -10, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);
    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var dt = Math.max(0.01, Math.min(0.03, parameters.tickDelta));
        var t = parameters.elapsedTime;

        for (var bi = 0; bi < blobs.length; bi++) {
            var B = blobs[bi];
            B.cx += B.vx * dt;
            B.cy += B.vy * dt;
            if (B.cx < B.r || B.cx > width - B.r) B.vx *= -1;
            if (B.cy < B.r || B.cy > height - B.r) B.vy *= -1;

            for (var i = 0; i < B.pts.length; i++) {
                var ang = (i / B.pts.length) * Math.PI * 2;
                var wob = 1 + 0.08 * Math.sin(t * 3 + i * 0.7 + bi * 2);
                B.pts[i].bx = B.cx + Math.cos(ang) * B.r * wob;
                B.pts[i].by = B.cy + Math.sin(ang) * B.r * wob;
            }

            for (var j = 0; j < B.pts.length; j++) {
                var pt = B.pts[j];
                var vx = (pt.x - pt.ox) * 0.94;
                var vy = (pt.y - pt.oy) * 0.94;
                pt.ox = pt.x;
                pt.oy = pt.y;

                vx += (pt.bx - pt.x) * 0.16;
                vy += (pt.by - pt.y) * 0.16;

                pt.x += vx;
                pt.y += vy;
            }

            for (var s = 0; s < 2; s++) {
                for (var k = 0; k < B.pts.length; k++) {
                    var p0 = B.pts[k];
                    var p1 = B.pts[(k + 1) % B.pts.length];
                    var dx = p1.x - p0.x;
                    var dy = p1.y - p0.y;
                    var d = Math.sqrt(dx * dx + dy * dy) || 1;
                    var target = (2 * Math.PI * B.r) / B.pts.length;
                    var off = (d - target) / d * 0.48;
                    var ox = dx * off;
                    var oy = dy * off;
                    p0.x += ox; p0.y += oy;
                    p1.x -= ox; p1.y -= oy;
                }
            }

            var pts = '';
            for (var q = 0; q < B.pts.length; q++) {
                if (q > 0) pts += ' ';
                pts += Math.round(B.pts[q].x) + ',' + Math.round(B.pts[q].y);
            }
            polys[bi].setPoints(pts);
        }

        // Soft collision by separating centers across all blob pairs.
        for (var a = 0; a < blobs.length; a++) {
            for (var b = a + 1; b < blobs.length; b++) {
                var dx2 = blobs[b].cx - blobs[a].cx;
                var dy2 = blobs[b].cy - blobs[a].cy;
                var d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                var minD = blobs[a].r + blobs[b].r - 16;
                if (d2 < minD) {
                    var push = (minD - d2) * 0.045;
                    var nx = dx2 / d2;
                    var ny = dy2 / d2;
                    blobs[a].cx -= nx * push;
                    blobs[a].cy -= ny * push;
                    blobs[b].cx += nx * push;
                    blobs[b].cy += ny * push;
                }
            }
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
