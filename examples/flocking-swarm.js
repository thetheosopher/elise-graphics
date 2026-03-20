var width = 800;
var height = 600;
var model = elise.model(width, height);
model.setFill('#071018');

var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.radialGradientFill('400,280', '400,280', 520, 520);
bgGrad.stops.push(elise.gradientFillStop('#102236', 0));
bgGrad.stops.push(elise.gradientFillStop('#0a1725', 0.6));
bgGrad.stops.push(elise.gradientFillStop('#060c16', 1.0));
bg.setFill(bgGrad);
model.add(bg);

var boidCount = 90;
var boids = [];
var boidEls = [];

for (var i = 0; i < boidCount; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 40 + Math.random() * 40;
    boids.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
    });

    var b = elise.polygon();
    b.setPoints('0,0 0,0 0,0');
    b.setFill('#88ddff');
    b.setStroke('#ffffff22,1');
    b.timer = 'tick';
    b.tag = { index: i, kind: 'boid' };
    boidEls.push(b);
    model.add(b);
}

var info = elise.text('Boids: 90', 16, 14, 340, 24);
info.setTypeface('Consolas, monospace');
info.setTypesize(16);
info.setFill('#9de3ff');
info.timer = 'tick';
info.tag = { kind: 'info' };
model.add(info);

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);

    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var dt = Math.max(0.01, Math.min(0.04, parameters.tickDelta));
        var phase = parameters.elapsedTime;

        // Update flock once per frame from first boid callback.
        if (el.tag.kind === 'boid' && el.tag.index === 0) {
            var viewR = 85;
            var avoidR = 20;
            var viewR2 = viewR * viewR;
            var avoidR2 = avoidR * avoidR;

            for (var i = 0; i < boidCount; i++) {
                var me = boids[i];
                var alignX = 0;
                var alignY = 0;
                var cohX = 0;
                var cohY = 0;
                var sepX = 0;
                var sepY = 0;
                var neighbors = 0;

                for (var j = 0; j < boidCount; j++) {
                    if (i === j) continue;
                    var other = boids[j];
                    var dx = other.x - me.x;
                    var dy = other.y - me.y;
                    if (dx > width / 2) dx -= width;
                    if (dx < -width / 2) dx += width;
                    if (dy > height / 2) dy -= height;
                    if (dy < -height / 2) dy += height;

                    var d2 = dx * dx + dy * dy;
                    if (d2 < viewR2) {
                        neighbors++;
                        alignX += other.vx;
                        alignY += other.vy;
                        cohX += other.x;
                        cohY += other.y;

                        if (d2 < avoidR2) {
                            sepX -= dx;
                            sepY -= dy;
                        }
                    }
                }

                if (neighbors > 0) {
                    alignX /= neighbors;
                    alignY /= neighbors;
                    cohX /= neighbors;
                    cohY /= neighbors;

                    me.vx += (alignX - me.vx) * 0.018;
                    me.vy += (alignY - me.vy) * 0.018;

                    me.vx += (cohX - me.x) * 0.0024;
                    me.vy += (cohY - me.y) * 0.0024;

                    me.vx += sepX * 0.018;
                    me.vy += sepY * 0.018;
                }

                var cx = width / 2;
                var cy = height / 2;
                me.vx += (cx - me.x) * 0.00028;
                me.vy += (cy - me.y) * 0.00028;

                me.vx += Math.sin(phase * 0.7 + i * 0.3) * 0.22;
                me.vy += Math.cos(phase * 0.6 + i * 0.2) * 0.22;

                var speed = Math.sqrt(me.vx * me.vx + me.vy * me.vy);
                var minSpeed = 35;
                var maxSpeed = 120;
                if (speed < minSpeed) {
                    me.vx = (me.vx / (speed || 1)) * minSpeed;
                    me.vy = (me.vy / (speed || 1)) * minSpeed;
                } else if (speed > maxSpeed) {
                    me.vx = (me.vx / speed) * maxSpeed;
                    me.vy = (me.vy / speed) * maxSpeed;
                }
            }

            for (var k = 0; k < boidCount; k++) {
                boids[k].x += boids[k].vx * dt;
                boids[k].y += boids[k].vy * dt;

                if (boids[k].x < 0) boids[k].x += width;
                if (boids[k].x >= width) boids[k].x -= width;
                if (boids[k].y < 0) boids[k].y += height;
                if (boids[k].y >= height) boids[k].y -= height;
            }
        }

        if (el.tag.kind === 'boid') {
            var b = boids[el.tag.index];
            var heading = Math.atan2(b.vy, b.vx);
            var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            var len = 11;
            var wing = 5;

            var p0x = b.x + Math.cos(heading) * len;
            var p0y = b.y + Math.sin(heading) * len;
            var p1x = b.x + Math.cos(heading + 2.55) * wing;
            var p1y = b.y + Math.sin(heading + 2.55) * wing;
            var p2x = b.x + Math.cos(heading - 2.55) * wing;
            var p2y = b.y + Math.sin(heading - 2.55) * wing;

            el.setPoints(
                Math.round(p0x) + ',' + Math.round(p0y) + ' ' +
                Math.round(p1x) + ',' + Math.round(p1y) + ' ' +
                Math.round(p2x) + ',' + Math.round(p2y)
            );

            var t = clamp((speed - 35) / 85, 0, 1);
            var r = Math.floor(90 + t * 110);
            var g = Math.floor(180 + t * 55);
            var c = Math.floor(255 - t * 85);
            el.setFill(elise.color(225, r, g, c).toHexString());
            controller.invalidate();
            return;
        }

        if (el.tag.kind === 'info') {
            el.setText('Boids: ' + boidCount + '   Speed range: 35-120');
            controller.invalidate();
            return;
        }

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
