var width = 800;
var height = 600;
var model = elise.model(width, height);

// Night sky gradient
var sky = elise.rectangle(0, 0, width, height);
var skyGrad = elise.linearGradientFill('400,0', '400,600');
skyGrad.stops.push(elise.gradientFillStop('#000010', 0));
skyGrad.stops.push(elise.gradientFillStop('#0a0025', 0.6));
skyGrad.stops.push(elise.gradientFillStop('#101030', 1.0));
sky.setFill(skyGrad);
model.add(sky);

// --- City skyline ---
var skyline = elise.polygon();
var skylinePoints = [
    [0, 600], [0, 500], [30, 500], [30, 470], [60, 470], [60, 500],
    [80, 500], [80, 440], [100, 440], [100, 420], [120, 420], [120, 440],
    [140, 440], [140, 500], [160, 500], [160, 460], [200, 460], [200, 430],
    [210, 430], [210, 390], [220, 390], [220, 430], [240, 430], [240, 460],
    [280, 460], [280, 500], [300, 500], [300, 470], [320, 470], [320, 440],
    [340, 440], [340, 370], [350, 370], [350, 360], [360, 360], [360, 370],
    [380, 370], [380, 440], [400, 440], [400, 480], [440, 480], [440, 500],
    [460, 500], [460, 420], [480, 420], [480, 400], [500, 400], [500, 420],
    [520, 420], [520, 500], [540, 500], [540, 460], [580, 460], [580, 430],
    [600, 430], [600, 460], [620, 460], [620, 500], [650, 500], [650, 450],
    [680, 450], [680, 480], [720, 480], [720, 500], [750, 500], [750, 470],
    [780, 470], [780, 500], [800, 500], [800, 600]
];
for (var i = 0; i < skylinePoints.length; i++) {
    skyline.addPoint(elise.point(skylinePoints[i][0], skylinePoints[i][1]));
}
skyline.setFill('#080810');
model.add(skyline);

// Some lit windows
var windowPositions = [
    [90, 448], [110, 448], [90, 458], [170, 468], [185, 468], [170, 478],
    [215, 400], [215, 410], [310, 380], [310, 392], [330, 380],
    [345, 365], [365, 380], [470, 408], [490, 408], [470, 425],
    [555, 440], [570, 440], [590, 440], [660, 460], [660, 472],
    [760, 478], [760, 488]
];
for (var w = 0; w < windowPositions.length; w++) {
    var win = elise.rectangle(windowPositions[w][0], windowPositions[w][1], 6, 6);
    win.setFill(elise.color(180, 255, 220, 80).toHexString());
    model.add(win);
}

// --- Fireworks system ---
// We use a single timer element to manage all fireworks state
var ticker = elise.rectangle(0, 0, 0, 0);
ticker.timer = 'tick';

// Firework state arrays
var maxRockets = 4;
var maxSparks = 30;
var rockets = [];
var sparks = [];
var rocketEls = [];
var sparkEls = [];
var trailEls = [];

// Pre-create rocket elements (lines)
for (var r = 0; r < maxRockets; r++) {
    var rocketLine = elise.line(0, height, 0, height);
    rocketLine.setStroke('#ffffff,2');
    rocketLine.tag = { visible: false };
    rocketEls.push(rocketLine);
    model.add(rocketLine);

    rockets.push({
        active: false,
        x: 0, y: 0,
        targetY: 0,
        speed: 0,
        timer: 0,
        launchX: 0
    });
}

// Pre-create spark elements (ellipses)
for (var s = 0; s < maxRockets * maxSparks; s++) {
    var spark = elise.ellipse(-10, -10, 3, 3);
    spark.setFill('#00000000');
    sparkEls.push(spark);
    model.add(spark);

    sparks.push({
        active: false,
        x: -10, y: -10,
        dx: 0, dy: 0,
        life: 0,
        maxLife: 0,
        r: 255, g: 255, b: 255,
        gravity: 80
    });
}

// Pre-create trail elements (smaller ellipses for spark trails)
for (var t = 0; t < maxRockets * maxSparks; t++) {
    var trail = elise.ellipse(-10, -10, 1.5, 1.5);
    trail.setFill('#00000000');
    trailEls.push(trail);
    model.add(trail);
}

ticker.tag = {
    launchTimer: 0,
    launchInterval: 0.8
};
model.add(ticker);

function launchRocket() {
    for (var r = 0; r < maxRockets; r++) {
        if (!rockets[r].active) {
            var rx = 100 + Math.random() * (width - 200);
            rockets[r].active = true;
            rockets[r].x = rx;
            rockets[r].y = height;
            rockets[r].launchX = rx;
            rockets[r].targetY = 120 + Math.random() * 180;
            rockets[r].speed = 300 + Math.random() * 200;
            return;
        }
    }
}

function explodeRocket(rIndex) {
    var rx = rockets[rIndex].x;
    var ry = rockets[rIndex].y;
    var baseColor = Math.floor(Math.random() * 5);
    var colors = [
        { r: 255, g: 80, b: 80 },
        { r: 80, g: 255, b: 80 },
        { r: 80, g: 150, b: 255 },
        { r: 255, g: 200, b: 50 },
        { r: 255, g: 100, b: 255 }
    ];
    var c = colors[baseColor];
    var sparkBase = rIndex * maxSparks;

    for (var s = 0; s < maxSparks; s++) {
        var angle = Math.random() * Math.PI * 2;
        var speed = 40 + Math.random() * 160;
        var si = sparkBase + s;
        sparks[si].active = true;
        sparks[si].x = rx;
        sparks[si].y = ry;
        sparks[si].dx = Math.cos(angle) * speed;
        sparks[si].dy = Math.sin(angle) * speed;
        sparks[si].life = 0;
        sparks[si].maxLife = 1.2 + Math.random() * 1.0;
        sparks[si].r = Math.min(255, c.r + Math.floor(Math.random() * 60 - 30));
        sparks[si].g = Math.min(255, c.g + Math.floor(Math.random() * 60 - 30));
        sparks[si].b = Math.min(255, c.b + Math.floor(Math.random() * 60 - 30));
    }
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var delta = parameters.tickDelta;
        var tag = el.tag;

        // Launch timer
        tag.launchTimer += delta;
        if (tag.launchTimer >= tag.launchInterval) {
            tag.launchTimer = 0;
            tag.launchInterval = 0.5 + Math.random() * 1.5;
            launchRocket();
        }

        // Update rockets
        for (var r = 0; r < maxRockets; r++) {
            var rk = rockets[r];
            if (rk.active) {
                rk.y -= rk.speed * delta;
                // Slight drift
                rk.x = rk.launchX + Math.sin(rk.y * 0.05) * 5;
                rocketEls[r].setP1(elise.point(rk.x, rk.y));
                rocketEls[r].setP2(elise.point(rk.x, rk.y + 15));
                rocketEls[r].setStroke('#ffffaa,2');

                if (rk.y <= rk.targetY) {
                    rk.active = false;
                    rocketEls[r].setP1(elise.point(-10, -10));
                    rocketEls[r].setP2(elise.point(-10, -10));
                    explodeRocket(r);
                }
            }
        }

        // Update sparks
        for (var s = 0; s < maxRockets * maxSparks; s++) {
            var sp = sparks[s];
            if (sp.active) {
                sp.life += delta;
                if (sp.life >= sp.maxLife) {
                    sp.active = false;
                    sparkEls[s].setCenter(elise.point(-10, -10));
                    sparkEls[s].setFill('#00000000');
                    trailEls[s].setCenter(elise.point(-10, -10));
                    trailEls[s].setFill('#00000000');
                    continue;
                }
                // Save old position for trail
                var oldX = sp.x;
                var oldY = sp.y;

                sp.dy += sp.gravity * delta;
                sp.dx *= 0.99;
                sp.x += sp.dx * delta;
                sp.y += sp.dy * delta;

                var fade = 1 - (sp.life / sp.maxLife);
                var a = Math.floor(255 * fade);
                a = Math.max(0, Math.min(255, a));
                sparkEls[s].setCenter(elise.point(sp.x, sp.y));
                sparkEls[s].setFill(
                    elise.color(a, sp.r, sp.g, sp.b).toHexString()
                );
                sparkEls[s].radiusX = 2 + fade * 2;
                sparkEls[s].radiusY = 2 + fade * 2;

                // Trail
                var ta = Math.floor(a * 0.4);
                trailEls[s].setCenter(elise.point(oldX, oldY));
                trailEls[s].setFill(
                    elise.color(ta, sp.r, sp.g, sp.b).toHexString()
                );
            }
        }
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
