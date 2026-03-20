var width = 700;
var height = 700;
var model = elise.model(width, height);
model.setFill('#020208');

var cx = width / 2;
var cy = height / 2;

// Background nebula clouds
for (var n = 0; n < 8; n++) {
    var nx = Math.random() * width;
    var ny = Math.random() * height;
    var nrx = 60 + Math.random() * 120;
    var nry = 40 + Math.random() * 80;
    var nebula = elise.ellipse(nx, ny, nrx, nry);
    var nr = Math.floor(Math.random() * 30);
    var ng = Math.floor(Math.random() * 15);
    var nb = Math.floor(20 + Math.random() * 40);
    nebula.setFill(elise.color(8, nr, ng, nb).toHexString());
    model.add(nebula);
}

// Spiral arms — each arm is a collection of star particles
var armCount = 3;
var starsPerArm = 100;
var starEls = [];
var maxSpiral = 280;

for (var arm = 0; arm < armCount; arm++) {
    var armOffset = (arm / armCount) * Math.PI * 2;

    for (var s = 0; s < starsPerArm; s++) {
        var t = s / starsPerArm;
        var spiralAngle = armOffset + t * Math.PI * 3;
        var dist = t * maxSpiral + (Math.random() - 0.5) * 40;
        var spread = (Math.random() - 0.5) * (20 + t * 40);
        var sx = cx + Math.cos(spiralAngle) * dist + Math.cos(spiralAngle + Math.PI / 2) * spread;
        var sy = cy + Math.sin(spiralAngle) * dist + Math.sin(spiralAngle + Math.PI / 2) * spread;
        var sr = 0.5 + Math.random() * 2;

        var star = elise.ellipse(sx, sy, sr, sr);

        // Color: white/blue core, reddish outskirts
        var coreT = 1 - t;
        var r2 = Math.floor(180 + coreT * 75);
        var g = Math.floor(180 + coreT * 75);
        var b = Math.floor(200 + coreT * 55);
        if (t > 0.6) {
            r2 = Math.floor(200 + (t - 0.6) * 137);
            g = Math.floor(150 + (1 - t) * 150);
            b = Math.floor(120 + (1 - t) * 180);
        }
        var a = Math.floor(100 + Math.random() * 155);
        star.setFill(elise.color(a, r2, g, b).toHexString());
        star.timer = 'tick';
        star.tag = {
            arm: arm,
            t: t,
            dist: dist,
            spread: spread,
            baseAngle: spiralAngle,
            armOffset: armOffset,
            alpha: a,
            twinklePhase: Math.random() * Math.PI * 2
        };
        starEls.push(star);
        model.add(star);
    }
}

// Galactic core
var coreGlow3 = elise.ellipse(cx, cy, 60, 60);
coreGlow3.setFill(elise.color(15, 200, 180, 100).toHexString());
model.add(coreGlow3);

var coreGlow2 = elise.ellipse(cx, cy, 35, 35);
coreGlow2.setFill(elise.color(40, 255, 230, 150).toHexString());
model.add(coreGlow2);

var coreGlow1 = elise.ellipse(cx, cy, 15, 15);
var coreGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 15, 15);
coreGrad.stops.push(elise.gradientFillStop('#ffffee', 0));
coreGrad.stops.push(elise.gradientFillStop('#ffddaa', 0.5));
coreGrad.stops.push(elise.gradientFillStop('#886633', 1.0));
coreGlow1.setFill(coreGrad);
model.add(coreGlow1);

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime;
        var tag = el.tag;

        // Rotate the entire galaxy slowly
        var rotSpeed = 0.15;
        var rot = phase * rotSpeed;

        var spiralAngle = tag.armOffset + tag.t * Math.PI * 3 + rot;
        var sx = cx + Math.cos(spiralAngle) * tag.dist + Math.cos(spiralAngle + Math.PI / 2) * tag.spread;
        var sy = cy + Math.sin(spiralAngle) * tag.dist + Math.sin(spiralAngle + Math.PI / 2) * tag.spread;
        el.setCenter(elise.point(sx, sy));

        // Twinkle
        var twinkle = Math.sin(phase * 3 + tag.twinklePhase) * 0.3 + 0.7;
        var a = Math.floor(tag.alpha * twinkle);
        a = Math.max(20, Math.min(255, a));
        // Keep the original fill color but update alpha
        var t = tag.t;
        var coreT = 1 - t;
        var r2 = Math.floor(180 + coreT * 75);
        var g = Math.floor(180 + coreT * 75);
        var b = Math.floor(200 + coreT * 55);
        if (t > 0.6) {
            r2 = Math.floor(200 + (t - 0.6) * 137);
            g = Math.floor(150 + (1 - t) * 150);
            b = Math.floor(120 + (1 - t) * 180);
        }
        el.setFill(elise.color(a, r2, g, b).toHexString());

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
