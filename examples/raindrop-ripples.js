var width = 800;
var height = 600;
var model = elise.model(width, height);

// Dark water background
var bg = elise.rectangle(0, 0, width, height);
var waterGrad = elise.linearGradientFill('400,0', '400,600');
waterGrad.stops.push(elise.gradientFillStop('#0a0a20', 0));
waterGrad.stops.push(elise.gradientFillStop('#0c1225', 0.5));
waterGrad.stops.push(elise.gradientFillStop('#101830', 1.0));
bg.setFill(waterGrad);
model.add(bg);

// --- Ripple system ---
var maxRipples = 12;
var ringsPerRipple = 5;
var ripples = [];
var rippleEls = [];

for (var r = 0; r < maxRipples; r++) {
    var rings = [];
    for (var ring = 0; ring < ringsPerRipple; ring++) {
        var e = elise.ellipse(-50, -50, 1, 0.3);
        e.setStroke('#00000000,1');
        model.add(e);
        rings.push(e);
    }
    rippleEls.push(rings);
    ripples.push({
        active: false,
        x: 0,
        y: 0,
        age: 0,
        maxAge: 3.0,
        maxRadius: 0,
        color: { r: 100, g: 160, b: 220 }
    });
}

// Ticker element drives the simulation
var ticker = elise.rectangle(0, 0, 0, 0);
ticker.timer = 'tick';
ticker.tag = {
    dropTimer: 0,
    dropInterval: 0.4
};
model.add(ticker);

// Subtle ambient light reflections
for (var i = 0; i < 15; i++) {
    var reflX = Math.random() * width;
    var reflY = Math.random() * height;
    var reflRX = 30 + Math.random() * 60;
    var reflRY = 5 + Math.random() * 10;
    var refl = elise.ellipse(reflX, reflY, reflRX, reflRY);
    refl.setFill(elise.color(8, 80, 120, 180).toHexString());
    refl.timer = 'shimmer';
    refl.tag = { baseAlpha: 8, phase: Math.random() * Math.PI * 2 };
    model.add(refl);
}

function spawnRipple() {
    for (var r = 0; r < maxRipples; r++) {
        if (!ripples[r].active) {
            ripples[r].active = true;
            ripples[r].x = 40 + Math.random() * (width - 80);
            ripples[r].y = 40 + Math.random() * (height - 80);
            ripples[r].age = 0;
            ripples[r].maxAge = 2.5 + Math.random() * 1.5;
            ripples[r].maxRadius = 50 + Math.random() * 80;

            // Vary color slightly
            var colorVariant = Math.floor(Math.random() * 3);
            if (colorVariant === 0) {
                ripples[r].color = { r: 100, g: 160, b: 220 };
            } else if (colorVariant === 1) {
                ripples[r].color = { r: 80, g: 180, b: 200 };
            } else {
                ripples[r].color = { r: 120, g: 140, b: 240 };
            }
            return;
        }
    }
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);

    commandHandler.addHandler('shimmer', function (controller, el, command, trigger, parameters) {
        var phase = controller.timerPhase(0.15);
        var tag = el.tag;
        var shimmer = Math.sin(phase * 2 + tag.phase) * 0.5 + 0.5;
        var a = Math.floor(tag.baseAlpha * (0.5 + shimmer));
        el.setFill(elise.color(a, 80, 120, 180).toHexString());
    });

    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var delta = parameters.tickDelta;
        var tag = el.tag;

        // Drop timer
        tag.dropTimer += delta;
        if (tag.dropTimer >= tag.dropInterval) {
            tag.dropTimer = 0;
            tag.dropInterval = 0.3 + Math.random() * 1.2;
            spawnRipple();
        }

        // Update ripples
        for (var r = 0; r < maxRipples; r++) {
            var rip = ripples[r];
            var rings = rippleEls[r];

            if (rip.active) {
                rip.age += delta;
                if (rip.age >= rip.maxAge) {
                    rip.active = false;
                    for (var ring = 0; ring < ringsPerRipple; ring++) {
                        rings[ring].setCenter(elise.point(-50, -50));
                        rings[ring].setStroke('#00000000,1');
                    }
                    continue;
                }

                var progress = rip.age / rip.maxAge;

                for (var ring = 0; ring < ringsPerRipple; ring++) {
                    var ringDelay = ring * 0.12;
                    var ringProgress = Math.max(0, progress - ringDelay);
                    if (ringProgress <= 0) {
                        rings[ring].setCenter(elise.point(-50, -50));
                        continue;
                    }

                    var ringRadius = rip.maxRadius * ringProgress;
                    var ringRY = ringRadius * 0.3; // perspective squash

                    // Fade from bright to transparent
                    var fade = 1 - ringProgress;
                    fade = fade * fade; // quadratic falloff
                    var a = Math.floor(180 * fade);
                    a = Math.max(0, Math.min(255, a));

                    var c = rip.color;
                    var strokeWidth = Math.max(0.5, 2 * fade);

                    rings[ring].setCenter(elise.point(rip.x, rip.y));
                    rings[ring].radiusX = ringRadius;
                    rings[ring].radiusY = ringRY;
                    rings[ring].setStroke(
                        elise.color(a, c.r, c.g, c.b).toHexString() + ',' + strokeWidth.toFixed(1)
                    );
                }
            }
        }
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
