var width = 800;
var height = 600;
var model = elise.model(width, height);

// Forest night gradient
var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.linearGradientFill('400,0', '400,600');
bgGrad.stops.push(elise.gradientFillStop('#020410', 0));
bgGrad.stops.push(elise.gradientFillStop('#081018', 0.6));
bgGrad.stops.push(elise.gradientFillStop('#050a0a', 1.0));
bg.setFill(bgGrad);
model.add(bg);

// Tree silhouettes
var trees = [
    [[60, 600], [80, 300], [100, 600]],
    [[120, 600], [160, 200], [200, 600]],
    [[250, 600], [270, 250], [280, 350], [300, 180], [320, 350], [330, 250], [350, 600]],
    [[420, 600], [450, 280], [480, 600]],
    [[500, 600], [530, 160], [540, 300], [560, 120], [580, 300], [590, 180], [620, 600]],
    [[660, 600], [690, 320], [720, 600]],
    [[740, 600], [770, 240], [800, 600]],
    [[0, 600], [10, 350], [30, 600]]
];
for (var t = 0; t < trees.length; t++) {
    var tree = elise.polygon();
    for (var p = 0; p < trees[t].length; p++) {
        tree.addPoint(elise.point(trees[t][p][0], trees[t][p][1]));
    }
    tree.setFill('#030608');
    model.add(tree);
}

// Ground
var ground = elise.rectangle(0, 560, width, 40);
ground.setFill('#040808');
model.add(ground);

// Grass tufts
for (var g = 0; g < 30; g++) {
    var gx = Math.random() * width;
    var gy = 555 + Math.random() * 10;
    var grassLine = elise.line(gx, gy, gx + (Math.random() - 0.5) * 10, gy - 8 - Math.random() * 12);
    grassLine.setStroke(elise.color(40, 30, 80, 30).toHexString() + ',1');
    model.add(grassLine);
}

// Moon
var moon = elise.ellipse(650, 80, 25, 25);
var moonGrad = elise.radialGradientFill('650,80', '645,75', 25, 25);
moonGrad.stops.push(elise.gradientFillStop('#ffffee', 0));
moonGrad.stops.push(elise.gradientFillStop('#ddddbb', 0.6));
moonGrad.stops.push(elise.gradientFillStop('#aaaaaa44', 1.0));
moon.setFill(moonGrad);
model.add(moon);

// Moon glow
var moonGlow = elise.ellipse(650, 80, 55, 55);
moonGlow.setFill(elise.color(12, 200, 200, 180).toHexString());
model.add(moonGlow);

// --- Fireflies ---
var fireflyCount = 35;
var fireflies = [];

for (var i = 0; i < fireflyCount; i++) {
    var fx = 40 + Math.random() * (width - 80);
    var fy = 100 + Math.random() * 440;

    // Outer glow
    var glow = elise.ellipse(fx, fy, 12, 12);
    glow.setFill(elise.color(0, 200, 255, 80).toHexString());
    glow.timer = 'tick';
    glow.tag = {
        index: i, isGlow: true,
        baseX: fx, baseY: fy,
        driftPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.3 + Math.random() * 0.5,
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 0.5 + Math.random() * 1.5,
        driftRangeX: 30 + Math.random() * 40,
        driftRangeY: 15 + Math.random() * 25
    };
    model.add(glow);

    // Core
    var core = elise.ellipse(fx, fy, 3, 3);
    core.setFill(elise.color(0, 255, 255, 150).toHexString());
    core.timer = 'tick';
    core.tag = {
        index: i, isCore: true,
        baseX: fx, baseY: fy,
        driftPhase: glow.tag.driftPhase,
        driftSpeed: glow.tag.driftSpeed,
        blinkPhase: glow.tag.blinkPhase,
        blinkSpeed: glow.tag.blinkSpeed,
        driftRangeX: glow.tag.driftRangeX,
        driftRangeY: glow.tag.driftRangeY
    };
    model.add(core);
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 1.5;
        var tag = el.tag;

        // Drift position
        var dx = Math.sin(phase * tag.driftSpeed + tag.driftPhase) * tag.driftRangeX;
        var dy = Math.sin(phase * tag.driftSpeed * 0.7 + tag.driftPhase + 1.5) * tag.driftRangeY;
        var fx = tag.baseX + dx;
        var fy = tag.baseY + dy;

        // Blink pattern: slow fade in/out with occasional bright flashes
        var blink = Math.sin(phase * tag.blinkSpeed + tag.blinkPhase);
        var flash = Math.pow(Math.max(0, Math.sin(phase * tag.blinkSpeed * 3.7 + tag.blinkPhase * 2.1)), 8);
        var brightness = Math.max(0, blink) * 0.6 + flash * 0.4;

        el.setCenter(elise.point(fx, fy));

        if (tag.isGlow) {
            var a = Math.floor(40 * brightness);
            var green = Math.floor(220 + 35 * brightness);
            var red = Math.floor(180 + 75 * brightness);
            el.radiusX = 10 + brightness * 8;
            el.radiusY = 10 + brightness * 8;
            el.setFill(elise.color(a, red, green, 60).toHexString());
        }

        if (tag.isCore) {
            var a = Math.floor(255 * brightness);
            var green = Math.floor(230 + 25 * brightness);
            el.radiusX = 2 + brightness * 2;
            el.radiusY = 2 + brightness * 2;
            el.setFill(elise.color(a, 255, green, 120).toHexString());
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
