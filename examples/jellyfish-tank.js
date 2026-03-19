var width = 800;
var height = 600;
var model = elise.model(width, height);

// Ocean gradient background
var bg = elise.rectangle(0, 0, width, height);
var oceanGrad = elise.linearGradientFill('400,0', '400,600');
oceanGrad.stops.push(elise.gradientFillStop('#000820', 0));
oceanGrad.stops.push(elise.gradientFillStop('#001040', 0.4));
oceanGrad.stops.push(elise.gradientFillStop('#002060', 0.8));
oceanGrad.stops.push(elise.gradientFillStop('#003070', 1.0));
bg.setFill(oceanGrad);
model.add(bg);

// --- Bubbles ---
var bubbles = [];
for (var i = 0; i < 40; i++) {
    var br = Math.random() * 3 + 1;
    var bx = Math.random() * width;
    var by = Math.random() * height;
    var bubble = elise.ellipse(bx, by, br, br);
    bubble.setFill(elise.color(40, 180, 220, 255).toHexString());
    bubble.timer = 'tick';
    bubble.tag = {
        isBubble: true,
        dx: (Math.random() - 0.5) * 15,
        dy: -(Math.random() * 30 + 20),
        baseR: br
    };
    bubbles.push(bubble);
    model.add(bubble);
}

// --- Jellyfish ---
var jellyfishCount = 5;
var jellyConfigs = [
    { x: 160, y: 400, bellRX: 50, bellRY: 30, color: { r: 200, g: 100, b: 255 }, tentacles: 7, phase: 0 },
    { x: 400, y: 250, bellRX: 65, bellRY: 38, color: { r: 100, g: 200, b: 255 }, tentacles: 9, phase: 1.5 },
    { x: 600, y: 350, bellRX: 45, bellRY: 25, color: { r: 255, g: 140, b: 180 }, tentacles: 6, phase: 3.0 },
    { x: 280, y: 150, bellRX: 55, bellRY: 32, color: { r: 140, g: 255, b: 200 }, tentacles: 8, phase: 4.2 },
    { x: 700, y: 480, bellRX: 40, bellRY: 22, color: { r: 255, g: 200, b: 100 }, tentacles: 5, phase: 5.5 }
];

for (var j = 0; j < jellyfishCount; j++) {
    var cfg = jellyConfigs[j];
    var c = cfg.color;

    // Bell (main body)
    var bell = elise.ellipse(cfg.x, cfg.y, cfg.bellRX, cfg.bellRY);
    var bellGrad = elise.radialGradientFill(
        cfg.x + ',' + cfg.y, cfg.x + ',' + (cfg.y - 5),
        cfg.bellRX, cfg.bellRY);
    bellGrad.stops.push(elise.gradientFillStop(elise.color(160, c.r, c.g, c.b).toHexString(), 0));
    bellGrad.stops.push(elise.gradientFillStop(elise.color(60, c.r, c.g, c.b).toHexString(), 1.0));
    bell.setFill(bellGrad);
    bell.timer = 'tick';
    bell.tag = {
        isJellyfish: true,
        jellyIndex: j,
        isBell: true,
        cfg: cfg,
        baseX: cfg.x,
        baseY: cfg.y
    };
    model.add(bell);

    // Inner glow
    var innerGlow = elise.ellipse(cfg.x, cfg.y - 5, cfg.bellRX * 0.5, cfg.bellRY * 0.5);
    innerGlow.setFill(elise.color(80, 255, 255, 255).toHexString());
    innerGlow.timer = 'tick';
    innerGlow.tag = {
        isJellyfish: true,
        jellyIndex: j,
        isGlow: true,
        cfg: cfg,
        baseX: cfg.x,
        baseY: cfg.y - 5
    };
    model.add(innerGlow);

    // Tentacles (smooth polylines)
    for (var t = 0; t < cfg.tentacles; t++) {
        var tentacle = elise.polyline();
        tentacle.smoothPoints = true;
        var tentStartAngle = Math.PI * 0.2 + (Math.PI * 0.6) * (t / (cfg.tentacles - 1));
        var tx = cfg.x + Math.cos(tentStartAngle) * cfg.bellRX * 0.8;
        var tentLen = 5;
        for (var seg = 0; seg < tentLen; seg++) {
            var sy = cfg.y + cfg.bellRY * 0.5 + seg * 22;
            var sx = tx + Math.sin(seg * 0.8 + t) * 10;
            tentacle.addPoint(elise.point(sx, sy));
        }
        var tAlpha = 120 - t * 8;
        tentacle.setStroke(elise.color(tAlpha, c.r, c.g, c.b).toHexString() + ',2');
        tentacle.timer = 'tick';
        tentacle.tag = {
            isJellyfish: true,
            jellyIndex: j,
            isTentacle: true,
            tentIndex: t,
            tentStartAngle: tentStartAngle,
            tentLen: tentLen,
            cfg: cfg,
            baseX: cfg.x,
            baseY: cfg.y,
            tAlpha: tAlpha
        };
        model.add(tentacle);
    }
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = controller.timerPhase(0.025);
        var tag = el.tag;

        // Bubble animation
        if (tag.isBubble) {
            var delta = parameters.tickDelta;
            var center = el.getCenter();
            var bx = center.x + tag.dx * delta;
            var by = center.y + tag.dy * delta;
            if (by < -10) {
                by = height + 10;
                bx = Math.random() * width;
            }
            if (bx < 0) bx = width;
            if (bx > width) bx = 0;
            el.setCenter(elise.point(bx, by));
            var wobble = Math.sin(phase * 3 + bx) * 0.5;
            el.radiusX = tag.baseR + wobble;
            el.radiusY = tag.baseR - wobble * 0.5;
            controller.invalidate();
            return;
        }

        if (!tag.isJellyfish) return;

        var cfg = tag.cfg;
        var j = tag.jellyIndex;
        var p = cfg.phase;

        // Jellyfish vertical bob and drift
        var bobY = Math.sin(phase * 0.8 + p) * 40;
        var driftX = Math.sin(phase * 0.3 + p * 1.7) * 30;
        var jx = tag.baseX + driftX;
        var jy = tag.baseY + bobY;

        // Pulsing
        var pulse = Math.sin(phase * 2.5 + p) * 0.15;

        if (tag.isBell) {
            el.setCenter(elise.point(jx, jy));
            el.radiusX = cfg.bellRX * (1 + pulse);
            el.radiusY = cfg.bellRY * (1 - pulse * 0.5);
            controller.invalidate();
            return;
        }

        if (tag.isGlow) {
            el.setCenter(elise.point(jx, jy - 5));
            var glowPulse = 0.4 + Math.sin(phase * 3 + p) * 0.15;
            el.radiusX = cfg.bellRX * glowPulse;
            el.radiusY = cfg.bellRY * glowPulse;
            controller.invalidate();
            return;
        }

        if (tag.isTentacle) {
            var t = tag.tentIndex;
            var tentStartAngle = tag.tentStartAngle;
            var brx = cfg.bellRX * (1 + pulse);
            var bry = cfg.bellRY * (1 - pulse * 0.5);
            var startX = jx + Math.cos(tentStartAngle) * brx * 0.8;
            var startY = jy + bry * 0.5;

            var pts = '';
            for (var seg = 0; seg < tag.tentLen; seg++) {
                var segY = startY + seg * 22;
                var wave = Math.sin(phase * 2 + seg * 0.9 + t * 0.7 + p) * (8 + seg * 3);
                var segX = startX + wave;
                if (seg > 0) pts += ' ';
                pts += Math.round(segX) + ',' + Math.round(segY);
            }
            el.setPoints(pts);
            controller.invalidate();
            return;
        }
    });
    controller.startTimer();
});

return model;
