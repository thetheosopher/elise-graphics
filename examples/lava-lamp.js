var width = 400;
var height = 800;
var model = elise.model(width, height);
model.setFill('#08080f');

var cx = 200;
var glassTop = 80;
var glassBottom = 700;

// Interior half-width of the glass at a given y coordinate
function lampHalfWidth(y) {
    if (y <= glassTop || y >= glassBottom) return 0;
    var t = (y - glassTop) / (glassBottom - glassTop);
    if (t < 0.55) {
        return 35 + 85 * Math.pow(t / 0.55, 0.55);
    }
    return 120 - 20 * ((t - 0.55) / 0.45);
}

// Build the glass body outline path (reused for fill and stroke layers)
function buildGlass() {
    var p = elise.path();
    p.add('m165,80');
    p.add('c155,200,80,280,80,420');
    p.add('c80,560,90,660,100,700');
    p.add('l300,700');
    p.add('c310,660,320,560,320,420');
    p.add('c320,280,245,200,235,80');
    p.add('z');
    return p;
}

// --- Glass body (filled interior, drawn behind blobs) ---
var glassBody = buildGlass();
var interiorGrad = elise.radialGradientFill(
    cx + ',480', cx + ',580', 160, 340);
interiorGrad.stops.push(elise.gradientFillStop('#1e0a04', 0));
interiorGrad.stops.push(elise.gradientFillStop('#120503', 0.7));
interiorGrad.stops.push(elise.gradientFillStop('#0a0302', 1.0));
glassBody.setFill(interiorGrad);
model.add(glassBody);

// --- Warm glow near the heat source ---
var heatGlow = elise.ellipse(cx, 688, 85, 20);
heatGlow.setFill(elise.color(50, 255, 100, 10).toHexString());
model.add(heatGlow);

// --- Lava blobs ---
var blobs = [];
var configs = [
    { baseY: 630, amp: 230, phase: 0.0, rx: 58, ry: 44, r: 220, g: 50,  b: 10 },
    { baseY: 530, amp: 270, phase: 1.5, rx: 44, ry: 36, r: 250, g: 100, b: 10 },
    { baseY: 590, amp: 180, phase: 3.1, rx: 50, ry: 46, r: 255, g: 140, b: 0  },
    { baseY: 660, amp: 100, phase: 0.5, rx: 68, ry: 28, r: 190, g: 30,  b: 5  },
    { baseY: 450, amp: 300, phase: 4.5, rx: 36, ry: 32, r: 255, g: 180, b: 20 },
    { baseY: 570, amp: 200, phase: 5.8, rx: 52, ry: 40, r: 240, g: 70,  b: 5  },
    { baseY: 490, amp: 250, phase: 2.3, rx: 42, ry: 38, r: 250, g: 120, b: 10 }
];

for (var i = 0; i < configs.length; i++) {
    var cfg = configs[i];
    var e = elise.ellipse(cx, cfg.baseY, cfg.rx, cfg.ry);
    e.tag = cfg;
    e.fill = elise.color(210, cfg.r, cfg.g, cfg.b).toHexString();
    e.timer = 'tick';
    blobs.push(e);
    model.add(e);
}

// --- Glass outline (on top of blobs for a clean edge) ---
var glassOutline = buildGlass();
glassOutline.setStroke('#5a4835,2');
model.add(glassOutline);

// --- Glass reflection highlight ---
var highlight = elise.path();
highlight.add('m172,100');
highlight.add('c168,230,110,290,110,410');
highlight.add('c110,530,115,630,120,685');
highlight.add('l125,685');
highlight.add('c120,630,115,530,115,410');
highlight.add('c115,290,172,230,176,100');
highlight.add('z');
highlight.setFill(elise.color(18, 255, 255, 255).toHexString());
model.add(highlight);

// --- Lamp base ---
var base = elise.path();
base.add('m95,700');
base.add('l305,700');
base.add('l325,780');
base.add('l75,780');
base.add('z');
base.setFill('#252530');
base.setStroke('#3a3845,2');
model.add(base);

// Power indicator LED
var powerLed = elise.ellipse(cx, 762, 4, 4);
powerLed.setFill('#ff3300');
model.add(powerLed);

// --- Lamp cap ---
var cap = elise.path();
cap.add('m165,80');
cap.add('c160,65,170,40,190,30');
cap.add('l210,30');
cap.add('c230,40,240,65,235,80');
cap.add('z');
cap.setFill('#252530');
cap.setStroke('#3a3845,2');
model.add(cap);

// --- Animation ---
model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var cfg = el.tag;
        var phase = controller.timerPhase(0.045);

        // Smooth vertical oscillation
        var y = cfg.baseY - cfg.amp * Math.sin(phase + cfg.phase);
        y = Math.max(glassTop + 50, Math.min(glassBottom - 30, y));

        // Shape morphing — wider and flatter near the bottom, taller near the top
        var yNorm = (y - glassTop) / (glassBottom - glassTop);
        var widthScale = 0.7 + 0.6 * yNorm;
        var heightScale = 1.4 - 0.8 * yNorm;

        // Organic wobble for a morphing look
        var wobbleRX = Math.sin(phase * 1.7 + cfg.phase * 2.3) * 10;
        var wobbleRY = Math.cos(phase * 1.3 + cfg.phase * 1.8) * 8;
        var rx = cfg.rx * widthScale + wobbleRX;
        var ry = cfg.ry * heightScale + wobbleRY;

        // Gentle horizontal drift
        var driftX = Math.sin(phase * 0.6 + cfg.phase * 1.1) * 18;

        // Constrain blob to the glass interior
        var hw = lampHalfWidth(y);
        var maxRX = hw - Math.abs(driftX) - 10;
        rx = Math.min(Math.max(18, rx), Math.max(18, maxRX));
        ry = Math.max(15, ry);

        el.radiusX = rx;
        el.radiusY = ry;
        el.setCenter(elise.point(cx + driftX, y));

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
