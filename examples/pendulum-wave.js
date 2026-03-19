var width = 800;
var height = 500;
var model = elise.model(width, height);
model.setFill('#0c0c1a');

var cx = width / 2;
var pendulumCount = 20;
var spacing = 28;
var startX = cx - ((pendulumCount - 1) * spacing) / 2;
var pivotY = 40;
var stringLength = 320;
var bobRadius = 12;
var basePeriod = 2.0;

// Support beam
var beam = elise.rectangle(startX - 30, pivotY - 10, (pendulumCount - 1) * spacing + 60, 12);
beam.setFill('#333344');
beam.setStroke('#444466,1');
model.add(beam);

// Left support
var leftSupport = elise.line(startX - 20, pivotY, startX - 20, 10);
leftSupport.setStroke('#444466,4');
model.add(leftSupport);

// Right support
var rightX = startX + (pendulumCount - 1) * spacing + 20;
var rightSupport = elise.line(rightX, pivotY, rightX, 10);
rightSupport.setStroke('#444466,4');
model.add(rightSupport);

// Rainbow-ish colors across pendulums
function pendulumColor(i) {
    var t = i / (pendulumCount - 1);
    var r = Math.floor(255 * Math.sin(t * Math.PI * 0.5 + 0.0));
    var g = Math.floor(255 * Math.sin(t * Math.PI * 0.5 + 1.0));
    var b = Math.floor(255 * Math.sin(t * Math.PI * 0.5 + 2.0));
    r = Math.max(60, Math.min(255, r));
    g = Math.max(60, Math.min(255, g));
    b = Math.max(60, Math.min(255, b));
    return { r: r, g: g, b: b };
}

var strings = [];
var bobs = [];
var glows = [];
// Each pendulum has slightly different period to create the wave effect
// Classic pendulum wave: N+i oscillations in a fixed time T
var T = 60; // full pattern repeat in seconds

for (var i = 0; i < pendulumCount; i++) {
    var px = startX + i * spacing;
    var c = pendulumColor(i);

    // String (line)
    var string = elise.line(px, pivotY, px, pivotY + stringLength);
    string.setStroke('#666688,1');
    string.timer = 'tick';
    string.tag = { index: i, pivotX: px, isString: true };
    strings.push(string);
    model.add(string);

    // Glow behind bob
    var glow = elise.ellipse(px, pivotY + stringLength, bobRadius + 6, bobRadius + 6);
    glow.setFill(elise.color(40, c.r, c.g, c.b).toHexString());
    glow.timer = 'tick';
    glow.tag = { index: i, pivotX: px, isGlow: true };
    glows.push(glow);
    model.add(glow);

    // Bob
    var bobGrad = elise.radialGradientFill(
        px + ',' + (pivotY + stringLength),
        (px - 3) + ',' + (pivotY + stringLength - 3),
        bobRadius, bobRadius);
    bobGrad.stops.push(elise.gradientFillStop(
        elise.color(255, Math.min(255, c.r + 60), Math.min(255, c.g + 60), Math.min(255, c.b + 60)).toHexString(), 0));
    bobGrad.stops.push(elise.gradientFillStop(
        elise.color(255, c.r, c.g, c.b).toHexString(), 0.6));
    bobGrad.stops.push(elise.gradientFillStop(
        elise.color(255, Math.floor(c.r * 0.5), Math.floor(c.g * 0.5), Math.floor(c.b * 0.5)).toHexString(), 1.0));
    var bob = elise.ellipse(px, pivotY + stringLength, bobRadius, bobRadius);
    bob.setFill(bobGrad);
    bob.timer = 'tick';
    bob.tag = { index: i, pivotX: px, isBob: true };
    bobs.push(bob);
    model.add(bob);
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = controller.timerPhase(1 / T);
        var tag = el.tag;
        var i = tag.index;

        // Each pendulum completes (pendulumCount + i) oscillations in T seconds
        var freq = (pendulumCount + i);
        var angle = Math.sin(phase * freq) * 0.45; // max swing ~25 degrees

        var bobX = tag.pivotX + Math.sin(angle) * stringLength;
        var bobY = pivotY + Math.cos(angle) * stringLength;

        if (tag.isString) {
            el.setP1(elise.point(tag.pivotX, pivotY));
            el.setP2(elise.point(bobX, bobY));
        } else if (tag.isGlow || tag.isBob) {
            el.setCenter(elise.point(bobX, bobY));
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
