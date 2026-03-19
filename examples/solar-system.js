var width = 800;
var height = 800;
var model = elise.model(width, height);
model.setFill('#020208');

var cx = width / 2;
var cy = height / 2;

// --- Starfield background ---
for (var i = 0; i < 200; i++) {
    var sx = Math.random() * width;
    var sy = Math.random() * height;
    var sr = Math.random() * 0.8 + 0.3;
    var a = Math.floor(Math.random() * 100 + 40);
    var s = elise.ellipse(sx, sy, sr, sr);
    s.setFill(elise.color(a, 255, 255, 255).toHexString());
    model.add(s);
}

// --- Sun ---
var sunGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, 50, 50);
sunGrad.stops.push(elise.gradientFillStop('#ffffff', 0));
sunGrad.stops.push(elise.gradientFillStop('#ffee44', 0.3));
sunGrad.stops.push(elise.gradientFillStop('#ff8800', 0.7));
sunGrad.stops.push(elise.gradientFillStop('#ff440044', 1.0));
var sun = elise.ellipse(cx, cy, 40, 40);
sun.setFill(sunGrad);
model.add(sun);

// Sun glow
var glow = elise.ellipse(cx, cy, 60, 60);
glow.setFill(elise.color(30, 255, 200, 50).toHexString());
model.add(glow);

// --- Planet data ---
var planets = [
    { name: 'Mercury', dist: 75,  r: 4,  color: '#b0b0b0', speed: 4.15 },
    { name: 'Venus',   dist: 105, r: 6,  color: '#e8c060', speed: 1.62 },
    { name: 'Earth',   dist: 140, r: 7,  color: '#4488ff', speed: 1.0 },
    { name: 'Mars',    dist: 180, r: 5,  color: '#dd4422', speed: 0.53 },
    { name: 'Jupiter', dist: 240, r: 18, color: '#d4a050', speed: 0.084 },
    { name: 'Saturn',  dist: 310, r: 14, color: '#e8d490', speed: 0.034 },
    { name: 'Uranus',  dist: 360, r: 10, color: '#88ccdd', speed: 0.012 },
    { name: 'Neptune', dist: 395, r: 9,  color: '#4466dd', speed: 0.006 }
];

var planetEls = [];

for (var p = 0; p < planets.length; p++) {
    var pd = planets[p];

    // Orbit ring
    var orbit = elise.ellipse(cx, cy, pd.dist, pd.dist);
    orbit.setStroke(elise.color(30, 100, 120, 180).toHexString() + ',1');
    model.add(orbit);

    // Planet
    var phase0 = Math.random() * Math.PI * 2;
    var px = cx + Math.cos(phase0) * pd.dist;
    var py = cy + Math.sin(phase0) * pd.dist;
    var planet = elise.ellipse(px, py, pd.r, pd.r);
    planet.setFill(pd.color);
    planet.timer = 'tick';
    planet.tag = {
        dist: pd.dist,
        speed: pd.speed,
        phase0: phase0,
        radius: pd.r,
        name: pd.name
    };
    planetEls.push(planet);
    model.add(planet);

    // Saturn's ring
    if (pd.name === 'Saturn') {
        var ring = elise.ellipse(px, py, 22, 6);
        ring.setStroke('#c8b87088,1');
        ring.timer = 'tick';
        ring.tag = {
            dist: pd.dist,
            speed: pd.speed,
            phase0: phase0,
            isSaturnRing: true
        };
        model.add(ring);
    }

    // Earth's moon
    if (pd.name === 'Earth') {
        var moon = elise.ellipse(px + 14, py, 2, 2);
        moon.setFill('#cccccc');
        moon.timer = 'tick';
        moon.tag = {
            parentDist: pd.dist,
            parentSpeed: pd.speed,
            parentPhase0: phase0,
            moonDist: 14,
            moonSpeed: 13.0,
            isMoon: true
        };
        model.add(moon);
    }
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = controller.timerPhase(0.015);
        var tag = el.tag;

        if (tag.isMoon) {
            var parentAngle = tag.parentPhase0 + phase * tag.parentSpeed;
            var parentX = cx + Math.cos(parentAngle) * tag.parentDist;
            var parentY = cy + Math.sin(parentAngle) * tag.parentDist;
            var moonAngle = phase * tag.moonSpeed;
            var mx = parentX + Math.cos(moonAngle) * tag.moonDist;
            var my = parentY + Math.sin(moonAngle) * tag.moonDist;
            el.setCenter(elise.point(mx, my));
            controller.invalidate();
            return;
        }

        if (tag.isSaturnRing) {
            var angle = tag.phase0 + phase * tag.speed;
            var sx = cx + Math.cos(angle) * tag.dist;
            var sy = cy + Math.sin(angle) * tag.dist;
            el.setCenter(elise.point(sx, sy));
            controller.invalidate();
            return;
        }

        var angle = tag.phase0 + phase * tag.speed;
        var px = cx + Math.cos(angle) * tag.dist;
        var py = cy + Math.sin(angle) * tag.dist;
        el.setCenter(elise.point(px, py));
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
