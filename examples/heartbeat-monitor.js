var width = 800;
var height = 400;
var model = elise.model(width, height);
model.setFill('#0a0a14');

var cy = height / 2;

// Grid lines
for (var gx = 0; gx < width; gx += 40) {
    var gridV = elise.line(gx, 0, gx, height);
    gridV.setStroke(elise.color(15, 0, 60, 0).toHexString() + ',1');
    model.add(gridV);
}
for (var gy = 0; gy < height; gy += 40) {
    var gridH = elise.line(0, gy, width, gy);
    gridH.setStroke(elise.color(15, 0, 60, 0).toHexString() + ',1');
    model.add(gridH);
}

// Center baseline
var baseline = elise.line(0, cy, width, cy);
baseline.setStroke(elise.color(30, 0, 100, 0).toHexString() + ',1');
model.add(baseline);

// ECG waveform shape definition (one heartbeat cycle, normalized x 0-1, y -1 to 1)
// P wave, QRS complex, T wave
function ecgWaveform(t) {
    // P wave (small bump)
    if (t >= 0.0 && t < 0.1) {
        var p = (t - 0.0) / 0.1;
        return Math.sin(p * Math.PI) * 0.15;
    }
    // Flat
    if (t >= 0.1 && t < 0.18) return 0;
    // Q dip
    if (t >= 0.18 && t < 0.22) {
        var q = (t - 0.18) / 0.04;
        return -Math.sin(q * Math.PI) * 0.15;
    }
    // R spike (tall)
    if (t >= 0.22 && t < 0.30) {
        var r = (t - 0.22) / 0.08;
        return Math.sin(r * Math.PI) * 0.9;
    }
    // S dip
    if (t >= 0.30 && t < 0.35) {
        var s = (t - 0.30) / 0.05;
        return -Math.sin(s * Math.PI) * 0.25;
    }
    // Flat
    if (t >= 0.35 && t < 0.50) return 0;
    // T wave (medium bump)
    if (t >= 0.50 && t < 0.65) {
        var tw = (t - 0.50) / 0.15;
        return Math.sin(tw * Math.PI) * 0.25;
    }
    // Flat remainder
    return 0;
}

// Main trace polyline
var segCount = 200;
var trace = elise.polyline();
for (var i = 0; i <= segCount; i++) {
    trace.addPoint(elise.point(0, cy));
}
trace.setStroke('#00ff44,2');
trace.timer = 'tick';
trace.tag = { isTrace: true };
model.add(trace);

// Glow trace
var glowTrace = elise.polyline();
for (var i = 0; i <= segCount; i++) {
    glowTrace.addPoint(elise.point(0, cy));
}
glowTrace.setStroke(elise.color(40, 0, 255, 68).toHexString() + ',8');
glowTrace.timer = 'tick';
glowTrace.tag = { isGlow: true };
model.add(glowTrace);

// Move main trace to front
model.remove(trace);
model.add(trace);

// Scanning dot
var dot = elise.ellipse(0, cy, 4, 4);
dot.setFill('#00ff66');
dot.timer = 'tick';
dot.tag = { isDot: true };
model.add(dot);

// Dot glow
var dotGlow = elise.ellipse(0, cy, 12, 12);
dotGlow.setFill(elise.color(50, 0, 255, 100).toHexString());
dotGlow.timer = 'tick';
dotGlow.tag = { isDotGlow: true };
model.add(dotGlow);

// Move dot to very front
model.remove(dot);
model.add(dot);

// BPM text
var bpmText = elise.text('72 BPM', width - 140, 20, 120, 30);
bpmText.setAlignment('right,middle');
bpmText.setTypeface('Courier New, monospace');
bpmText.setTypesize(22);
bpmText.setFill('#00dd44');
bpmText.timer = 'tick';
bpmText.tag = { isBPM: true };
model.add(bpmText);

// Heart symbol that pulses
var heartText = elise.text('\u2665', width - 170, 20, 30, 30);
heartText.setAlignment('center,middle');
heartText.setTypeface('Arial');
heartText.setTypesize(24);
heartText.setFill('#ff2222');
heartText.timer = 'tick';
heartText.tag = { isHeart: true };
model.add(heartText);

var beatsPerMinute = 72;
var beatPeriod = 60 / beatsPerMinute; // seconds per beat
var scanSpeed = width / 4; // pixels per second (full sweep in 4 seconds)

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = (parameters.elapsedTime % 4) / 4 * Math.PI * 2; // 4-second sweep cycle
        var tag = el.tag;

        // Current scan X position
        var scanX = (phase / (Math.PI * 2)) * width;
        scanX = scanX % width;

        if (tag.isTrace || tag.isGlow) {
            var pts = '';
            for (var i = 0; i <= segCount; i++) {
                var px = (i / segCount) * width;

                // Time offset — how far back in time this pixel is from the scan head
                var timeDiff = (scanX - px) / scanSpeed;
                if (timeDiff < 0) timeDiff += width / scanSpeed;

                // Heartbeat cycle position
                var beatT = (timeDiff % beatPeriod) / beatPeriod;
                var wave = ecgWaveform(beatT);

                // Add slight noise
                var noise = (Math.random() - 0.5) * 0.01;
                var py = cy - (wave + noise) * (height * 0.4);

                // Fade trail: brightness decreases further from scan head
                if (i > 0) pts += ' ';
                pts += Math.round(px) + ',' + Math.round(py);
            }
            el.setPoints(pts);

            // Fade the trace behind the scan head
            if (tag.isTrace) {
                el.setStroke('#00ff44,2');
            }
            controller.invalidate();
            return;
        }

        if (tag.isDot) {
            var beatT = 0;
            var wave = ecgWaveform(beatT);
            var dpy = cy - wave * (height * 0.4);
            el.setCenter(elise.point(scanX, dpy));
            controller.invalidate();
            return;
        }

        if (tag.isDotGlow) {
            var beatT = 0;
            var wave = ecgWaveform(beatT);
            var dpy = cy - wave * (height * 0.4);
            el.setCenter(elise.point(scanX, dpy));
            controller.invalidate();
            return;
        }

        if (tag.isHeart) {
            // Pulse on QRS
            var time = (phase / (Math.PI * 2)) * 4;
            var beatT = (time % beatPeriod) / beatPeriod;
            var isQRS = beatT >= 0.22 && beatT < 0.35;
            var size = isQRS ? 28 : 22;
            el.setTypesize(size);
            if (isQRS) {
                el.setFill('#ff4444');
            } else {
                el.setFill('#cc2222');
            }
            controller.invalidate();
            return;
        }

        if (tag.isBPM) {
            // Slight variation in displayed BPM
            var time = (phase / (Math.PI * 2)) * 4;
            var bpmNoise = Math.floor(Math.sin(time * 0.5) * 2);
            el.setText((beatsPerMinute + bpmNoise) + ' BPM');
            controller.invalidate();
            return;
        }
    });
    controller.startTimer();
});

return model;
