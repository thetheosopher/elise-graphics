var width = 600;
var height = 600;
var model = elise.model(width, height);
model.setFill('#08081a');

var cx = width / 2;
var cy = height / 2;
var clockRadius = 240;

// --- Aurora background shimmer ---
var auroraRibbons = 6;
for (var a = 0; a < auroraRibbons; a++) {
    var ribbon = elise.polyline();
    ribbon.smoothPoints = true;
    var baseY = 70 + a * 95;
    for (var s = 0; s <= 12; s++) {
        ribbon.addPoint(elise.point((s / 12) * width, baseY));
    }
    var aColors = [
        { r: 40, g: 200, b: 100 },
        { r: 30, g: 160, b: 180 },
        { r: 80, g: 120, b: 200 },
        { r: 140, g: 80, b: 180 },
        { r: 80, g: 220, b: 160 },
        { r: 170, g: 110, b: 220 }
    ];
    var ac = aColors[a];
    ribbon.setStroke(elise.color(70, ac.r, ac.g, ac.b).toHexString() + ',34');
    ribbon.timer = 'bg';
    ribbon.tag = { auroraIndex: a, baseY: baseY, color: ac };
    model.add(ribbon);
}

// --- Clock face ---
var face = elise.ellipse(cx, cy, clockRadius, clockRadius);
var faceGrad = elise.radialGradientFill(cx + ',' + cy, cx + ',' + cy, clockRadius, clockRadius);
faceGrad.stops.push(elise.gradientFillStop('#0c0c2599', 0));
faceGrad.stops.push(elise.gradientFillStop('#06061888', 0.8));
faceGrad.stops.push(elise.gradientFillStop('#020210cc', 1.0));
face.setFill(faceGrad);
face.setStroke('#334466,2');
model.add(face);

// --- Tick marks ---
for (var t = 0; t < 60; t++) {
    var angle = (t / 60) * Math.PI * 2 - Math.PI / 2;
    var isHour = t % 5 === 0;
    var innerR = isHour ? clockRadius - 25 : clockRadius - 12;
    var outerR = clockRadius - 5;
    var tick = elise.line(
        cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR,
        cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR
    );
    if (isHour) {
        tick.setStroke('#8899bb,2');
    } else {
        tick.setStroke('#44556644,1');
    }
    model.add(tick);
}

// --- Hour numbers ---
for (var h = 1; h <= 12; h++) {
    var angle = (h / 12) * Math.PI * 2 - Math.PI / 2;
    var numR = clockRadius - 42;
    var numX = cx + Math.cos(angle) * numR - 14;
    var numY = cy + Math.sin(angle) * numR - 12;
    var numText = elise.text('' + h, numX, numY, 28, 24);
    numText.setAlignment('center,middle');
    numText.setTypeface('Georgia, serif');
    numText.setTypesize(18);
    numText.setFill('#8899cc');
    model.add(numText);
}

// --- Clock hands ---
// Hour hand
var hourHand = elise.line(cx, cy, cx, cy - 120);
hourHand.setStroke('#aabbdd,4');
hourHand.timer = 'clock';
hourHand.tag = { hand: 'hour' };
model.add(hourHand);

// Minute hand
var minuteHand = elise.line(cx, cy, cx, cy - 170);
minuteHand.setStroke('#8899cc,3');
minuteHand.timer = 'clock';
minuteHand.tag = { hand: 'minute' };
model.add(minuteHand);

// Second hand
var secondHand = elise.line(cx, cy, cx, cy - 190);
secondHand.setStroke('#ff4444,1');
secondHand.timer = 'clock';
secondHand.tag = { hand: 'second' };
model.add(secondHand);

// Center cap
var cap = elise.ellipse(cx, cy, 6, 6);
cap.setFill('#ccddee');
model.add(cap);

// Second hand tail
var secondTail = elise.line(cx, cy, cx, cy + 30);
secondTail.setStroke('#ff4444,1');
secondTail.timer = 'clock';
secondTail.tag = { hand: 'secondTail' };
model.add(secondTail);

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);

    commandHandler.addHandler('bg', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 0.094;
        var tag = el.tag;
        var a = tag.auroraIndex;
        var pts = '';
        for (var s = 0; s <= 12; s++) {
            var px = (s / 12) * width;
            var wave1 = Math.sin(phase * 1.0 + s * 0.4 + a * 1.5) * 50;
            var wave2 = Math.sin(phase * 0.5 + s * 0.2 + a * 2.5) * 30;
            var py = tag.baseY + wave1 + wave2;
            if (s > 0) pts += ' ';
            pts += Math.round(px) + ',' + Math.round(py);
        }
        el.setPoints(pts);

        // Shift alpha based on time of day simulation
        var hourPhase = parameters.elapsedTime * 7.27e-5;
        var timeAlpha = Math.sin(hourPhase) * 0.25 + 0.75;
        var baseAlpha = Math.floor(95 * timeAlpha);
        var c = tag.color;
        el.setStroke(elise.color(baseAlpha, c.r, c.g, c.b).toHexString() + ',34');
        controller.invalidate();
    });

    commandHandler.addHandler('clock', function (controller, el, command, trigger, parameters) {
        var now = new Date();
        var hours = now.getHours() % 12;
        var minutes = now.getMinutes();
        var seconds = now.getSeconds();
        var millis = now.getMilliseconds();
        var tag = el.tag;

        var handAngle, handLen;

        if (tag.hand === 'hour') {
            var hourFrac = hours + minutes / 60;
            handAngle = (hourFrac / 12) * Math.PI * 2 - Math.PI / 2;
            handLen = 120;
            // Glow color shifts with hour
            var hue = hours * 30;
            var hr = Math.floor(160 + 60 * Math.sin(hue * Math.PI / 180));
            var hg = Math.floor(160 + 60 * Math.sin((hue + 120) * Math.PI / 180));
            var hb = Math.floor(160 + 60 * Math.sin((hue + 240) * Math.PI / 180));
            el.setStroke(elise.color(255, hr, hg, hb).toHexString() + ',4');
        } else if (tag.hand === 'minute') {
            var minFrac = minutes + seconds / 60;
            handAngle = (minFrac / 60) * Math.PI * 2 - Math.PI / 2;
            handLen = 170;
            var mhue = minutes * 6;
            var mr = Math.floor(120 + 50 * Math.sin(mhue * Math.PI / 180));
            var mg = Math.floor(140 + 50 * Math.sin((mhue + 120) * Math.PI / 180));
            var mb = Math.floor(180 + 40 * Math.sin((mhue + 240) * Math.PI / 180));
            el.setStroke(elise.color(220, mr, mg, mb).toHexString() + ',3');
        } else if (tag.hand === 'second') {
            var secFrac = seconds + millis / 1000;
            handAngle = (secFrac / 60) * Math.PI * 2 - Math.PI / 2;
            handLen = 190;
        } else if (tag.hand === 'secondTail') {
            var secFrac = seconds + millis / 1000;
            handAngle = (secFrac / 60) * Math.PI * 2 - Math.PI / 2 + Math.PI;
            handLen = 30;
        }

        var endX = cx + Math.cos(handAngle) * handLen;
        var endY = cy + Math.sin(handAngle) * handLen;
        el.setP1(elise.point(cx, cy));
        el.setP2(elise.point(endX, endY));
        controller.invalidate();
    });

    controller.startTimer();
});

return model;
