var width = 600;
var height = 800;
var model = elise.model(width, height);

// Storm sky gradient
var sky = elise.rectangle(0, 0, width, height);
var skyGrad = elise.linearGradientFill('300,0', '300,800');
skyGrad.stops.push(elise.gradientFillStop('#1a1a25', 0));
skyGrad.stops.push(elise.gradientFillStop('#2a2a35', 0.3));
skyGrad.stops.push(elise.gradientFillStop('#3a3530', 0.6));
skyGrad.stops.push(elise.gradientFillStop('#4a4035', 0.8));
skyGrad.stops.push(elise.gradientFillStop('#554838', 1.0));
sky.setFill(skyGrad);
model.add(sky);

// Flat ground
var ground = elise.rectangle(0, 700, width, 100);
ground.setFill('#3a3528');
ground.setStroke('#4a4535,1');
model.add(ground);

// Ground detail lines
for (var g = 0; g < 15; g++) {
    var gx = Math.random() * width;
    var gy = 700 + Math.random() * 5;
    var gl = elise.line(gx, gy, gx + 20 + Math.random() * 40, gy + 2);
    gl.setStroke(elise.color(25, 80, 70, 50).toHexString() + ',1');
    model.add(gl);
}

// --- Tornado particles ---
var particleCount = 180;
var funnelBaseY = 700; // ground level
var funnelTopY = 80;   // cloud level
var funnelBaseRadius = 30;
var funnelTopRadius = 150;
var funnelCX = 300;

var particles = [];

for (var i = 0; i < particleCount; i++) {
    var t = Math.random(); // 0 = base, 1 = top
    var angle = Math.random() * Math.PI * 2;
    var radius = funnelBaseRadius + (funnelTopRadius - funnelBaseRadius) * t;
    var py = funnelBaseY - (funnelBaseY - funnelTopY) * t;
    var px = funnelCX + Math.cos(angle) * radius;

    var size = 1 + t * 3 + Math.random() * 2;
    var p = elise.ellipse(px, py, size, size * 0.6);

    // Color: dark debris at bottom, grey-white dust higher up
    var r = Math.floor(80 + t * 100 + Math.random() * 40);
    var g = Math.floor(70 + t * 90 + Math.random() * 30);
    var b = Math.floor(60 + t * 80 + Math.random() * 20);
    var a = Math.floor(120 + Math.random() * 100);
    p.setFill(elise.color(a, r, g, b).toHexString());
    p.timer = 'tick';
    p.tag = {
        baseT: t,
        angle: angle,
        orbitSpeed: 3 + (1 - t) * 8, // faster at base, slower at top
        riseSpeed: 0.1 + Math.random() * 0.3,
        radiusJitter: (Math.random() - 0.5) * 20,
        baseAlpha: a,
        baseSize: size
    };
    particles.push(p);
    model.add(p);
}

// Funnel cloud at the top
var cloudEls = [];
for (var c = 0; c < 12; c++) {
    var cloudX = funnelCX + (Math.random() - 0.5) * 300;
    var cloudY = 40 + Math.random() * 80;
    var cloudRX = 50 + Math.random() * 80;
    var cloudRY = 20 + Math.random() * 25;
    var cloud = elise.ellipse(cloudX, cloudY, cloudRX, cloudRY);
    cloud.setFill(elise.color(60, 50, 50, 55).toHexString());
    cloud.timer = 'tick';
    cloud.tag = { isCloud: true, baseX: cloudX, baseY: cloudY, phase: Math.random() * Math.PI * 2 };
    cloudEls.push(cloud);
    model.add(cloud);
}

// Dust cloud at the base
for (var d = 0; d < 8; d++) {
    var dustX = funnelCX + (Math.random() - 0.5) * 200;
    var dustY = 680 + Math.random() * 30;
    var dustRX = 30 + Math.random() * 50;
    var dustRY = 10 + Math.random() * 15;
    var dust = elise.ellipse(dustX, dustY, dustRX, dustRY);
    dust.setFill(elise.color(35, 100, 90, 70).toHexString());
    dust.timer = 'tick';
    dust.tag = { isDust: true, baseX: dustX, baseY: dustY, phase: Math.random() * Math.PI * 2 };
    model.add(dust);
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 0.25;
        var tag = el.tag;

        if (tag.isCloud) {
            var dx = Math.sin(phase * 0.3 + tag.phase) * 15;
            var dy = Math.sin(phase * 0.2 + tag.phase * 1.5) * 5;
            el.setCenter(elise.point(tag.baseX + dx, tag.baseY + dy));
            controller.invalidate();
            return;
        }

        if (tag.isDust) {
            var dx = Math.sin(phase * 0.8 + tag.phase) * 25;
            var dy = Math.sin(phase * 0.5 + tag.phase * 2) * 5;
            el.setCenter(elise.point(tag.baseX + dx, tag.baseY + dy));
            controller.invalidate();
            return;
        }

        // Tornado particle animation
        // t cycles from bottom to top then resets
        var t = (tag.baseT + phase * tag.riseSpeed) % 1;
        var angle = tag.angle + phase * tag.orbitSpeed;

        // Funnel radius widens with height
        var radius = funnelBaseRadius + (funnelTopRadius - funnelBaseRadius) * t + tag.radiusJitter;

        // Slight funnel sway
        var swayX = Math.sin(phase * 0.3) * 15 * t;
        var swayY = Math.sin(phase * 0.4) * 5 * t;

        var py = funnelBaseY - (funnelBaseY - funnelTopY) * t + swayY;
        var px = funnelCX + Math.cos(angle) * radius + swayX;

        el.setCenter(elise.point(px, py));

        // Size increases higher up
        var size = tag.baseSize * (0.6 + t * 0.6);
        el.radiusX = size;
        el.radiusY = size * 0.6;

        // Fade near top and bottom extremes
        var fadeFactor = 1;
        if (t < 0.05) fadeFactor = t / 0.05;
        if (t > 0.9) fadeFactor = (1 - t) / 0.1;
        var a = Math.floor(tag.baseAlpha * fadeFactor);
        a = Math.max(0, Math.min(255, a));

        var r = Math.floor(80 + t * 100);
        var g = Math.floor(70 + t * 90);
        var b = Math.floor(60 + t * 80);
        el.setFill(elise.color(a, r, g, b).toHexString());

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
