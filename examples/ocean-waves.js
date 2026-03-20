var width = 800;
var height = 500;
var model = elise.model(width, height);

// Sky gradient
var sky = elise.rectangle(0, 0, width, height);
var skyGrad = elise.linearGradientFill('400,0', '400,500');
skyGrad.stops.push(elise.gradientFillStop('#ff7733', 0));
skyGrad.stops.push(elise.gradientFillStop('#ff9955', 0.15));
skyGrad.stops.push(elise.gradientFillStop('#ffcc88', 0.3));
skyGrad.stops.push(elise.gradientFillStop('#aaddee', 0.5));
skyGrad.stops.push(elise.gradientFillStop('#224488', 0.85));
skyGrad.stops.push(elise.gradientFillStop('#112244', 1.0));
sky.setFill(skyGrad);
model.add(sky);

// Sun near horizon
var sun = elise.ellipse(620, 120, 50, 50);
var sunGrad = elise.radialGradientFill('620,120', '620,120', 50, 50);
sunGrad.stops.push(elise.gradientFillStop('#ffffee', 0));
sunGrad.stops.push(elise.gradientFillStop('#ffdd44', 0.4));
sunGrad.stops.push(elise.gradientFillStop('#ff880044', 0.8));
sunGrad.stops.push(elise.gradientFillStop('#ff440000', 1.0));
sun.setFill(sunGrad);
model.add(sun);

// Wave layers - back to front (higher Y = closer to viewer)
var waveCount = 8;
var waves = [];
var segCount = 30;

var waveConfigs = [
    { baseY: 200, amp: 8,  speed: 0.7, freq: 0.10, color: { r: 20,  g: 50,  b: 100 }, alpha: 255 },
    { baseY: 230, amp: 10, speed: 0.8, freq: 0.09, color: { r: 25,  g: 60,  b: 110 }, alpha: 250 },
    { baseY: 260, amp: 12, speed: 1.0, freq: 0.08, color: { r: 30,  g: 70,  b: 120 }, alpha: 245 },
    { baseY: 300, amp: 14, speed: 1.2, freq: 0.07, color: { r: 35,  g: 85,  b: 135 }, alpha: 240 },
    { baseY: 340, amp: 16, speed: 1.5, freq: 0.06, color: { r: 25,  g: 95,  b: 145 }, alpha: 235 },
    { baseY: 380, amp: 18, speed: 1.8, freq: 0.055, color: { r: 20, g: 100, b: 155 }, alpha: 230 },
    { baseY: 420, amp: 20, speed: 2.2, freq: 0.05, color: { r: 15, g: 110, b: 160 }, alpha: 225 },
    { baseY: 460, amp: 22, speed: 2.6, freq: 0.045, color: { r: 10, g: 120, b: 170 }, alpha: 220 }
];

for (var w = 0; w < waveCount; w++) {
    var cfg = waveConfigs[w];

    // Wave body (polygon filling down to bottom)
    var wavePoly = elise.polygon();
    // Top edge points
    for (var s = 0; s <= segCount; s++) {
        var px = (s / segCount) * (width + 40) - 20;
        wavePoly.addPoint(elise.point(px, cfg.baseY));
    }
    // Bottom edge
    wavePoly.addPoint(elise.point(width + 20, height));
    wavePoly.addPoint(elise.point(-20, height));

    wavePoly.setFill(elise.color(cfg.alpha, cfg.color.r, cfg.color.g, cfg.color.b).toHexString());
    wavePoly.timer = 'tick';
    wavePoly.tag = {
        isWave: true,
        waveIndex: w,
        cfg: cfg
    };
    waves.push(wavePoly);
    model.add(wavePoly);

    // Foam highlight on wave crest (thin polyline)
    if (w >= 3) {
        var foam = elise.polyline();
        foam.smoothPoints = true;
        for (var s = 0; s <= segCount; s++) {
            foam.addPoint(elise.point((s / segCount) * (width + 40) - 20, cfg.baseY));
        }
        var foamAlpha = 30 + w * 8;
        foam.setStroke(elise.color(foamAlpha, 255, 255, 255).toHexString() + ',2');
        foam.timer = 'tick';
        foam.tag = {
            isFoam: true,
            waveIndex: w,
            cfg: cfg
        };
        model.add(foam);
    }
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 0.12;
        var tag = el.tag;
        var cfg = tag.cfg;
        var w = tag.waveIndex;

        if (tag.isWave) {
            var pts = '';
            for (var s = 0; s <= segCount; s++) {
                var px = (s / segCount) * (width + 40) - 20;
                var wave1 = Math.sin(phase * cfg.speed + s * cfg.freq * 20) * cfg.amp;
                var wave2 = Math.sin(phase * cfg.speed * 0.6 + s * cfg.freq * 12 + w) * cfg.amp * 0.5;
                var wave3 = Math.sin(phase * cfg.speed * 1.4 + s * cfg.freq * 30 + w * 2) * cfg.amp * 0.25;
                var py = cfg.baseY + wave1 + wave2 + wave3;
                if (s > 0) pts += ' ';
                pts += Math.round(px) + ',' + Math.round(py);
            }
            // Add bottom corners
            pts += ' ' + (width + 20) + ',' + height;
            pts += ' -20,' + height;
            el.setPoints(pts);
            controller.invalidate();
            return;
        }

        if (tag.isFoam) {
            var pts = '';
            for (var s = 0; s <= segCount; s++) {
                var px = (s / segCount) * (width + 40) - 20;
                var wave1 = Math.sin(phase * cfg.speed + s * cfg.freq * 20) * cfg.amp;
                var wave2 = Math.sin(phase * cfg.speed * 0.6 + s * cfg.freq * 12 + w) * cfg.amp * 0.5;
                var wave3 = Math.sin(phase * cfg.speed * 1.4 + s * cfg.freq * 30 + w * 2) * cfg.amp * 0.25;
                var py = cfg.baseY + wave1 + wave2 + wave3 - 2;
                if (s > 0) pts += ' ';
                pts += Math.round(px) + ',' + Math.round(py);
            }
            el.setPoints(pts);
            controller.invalidate();
            return;
        }
    });
    controller.startTimer();
});

return model;
