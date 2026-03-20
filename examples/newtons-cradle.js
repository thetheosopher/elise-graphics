var width = 700;
var height = 400;
var model = elise.model(width, height);
model.setFill('#0c0c18');

var cx = width / 2;
var ballCount = 7;
var ballRadius = 22;
var stringLength = 220;
var pivotY = 50;
var spacing = ballRadius * 2 + 2;
var totalWidth = (ballCount - 1) * spacing;
var startX = cx - totalWidth / 2;

// Frame / support structure
var frameTop = elise.rectangle(startX - 50, pivotY - 15, totalWidth + 100, 12);
frameTop.setFill('#2a2a3a');
frameTop.setStroke('#3a3a4a,1');
model.add(frameTop);

var leftPole = elise.line(startX - 40, pivotY, startX - 40, pivotY + stringLength + ballRadius + 20);
leftPole.setStroke('#2a2a3a,4');
model.add(leftPole);

var rightPole = elise.line(startX + totalWidth + 40, pivotY, startX + totalWidth + 40, pivotY + stringLength + ballRadius + 20);
rightPole.setStroke('#2a2a3a,4');
model.add(rightPole);

var base = elise.rectangle(startX - 55, pivotY + stringLength + ballRadius + 15, totalWidth + 110, 10);
base.setFill('#2a2a3a');
base.setStroke('#3a3a4a,1');
model.add(base);

// Strings and balls
var strings = [];
var balls = [];
var shadows = [];
var maxAngle = 0.65; // ~37 degrees max swing

for (var i = 0; i < ballCount; i++) {
    var bx = startX + i * spacing;
    var by = pivotY + stringLength;

    // String
    var string = elise.line(bx, pivotY, bx, by);
    string.setStroke('#666680,1');
    string.timer = 'tick';
    string.tag = { index: i, isString: true };
    strings.push(string);
    model.add(string);

    // Shadow
    var shadow = elise.ellipse(bx, by + ballRadius + 8, ballRadius * 0.8, 4);
    shadow.setFill(elise.color(20, 0, 0, 0).toHexString());
    shadow.timer = 'tick';
    shadow.tag = { index: i, isShadow: true };
    shadows.push(shadow);
    model.add(shadow);

    // Ball with metallic gradient
    var ball = elise.ellipse(bx, by, ballRadius, ballRadius);
    var ballGrad = elise.radialGradientFill(
        bx + ',' + by,
        (bx - 6) + ',' + (by - 6),
        ballRadius, ballRadius
    );
    ballGrad.stops.push(elise.gradientFillStop('#e8e8f0', 0));
    ballGrad.stops.push(elise.gradientFillStop('#b0b0c0', 0.4));
    ballGrad.stops.push(elise.gradientFillStop('#606080', 0.8));
    ballGrad.stops.push(elise.gradientFillStop('#404060', 1.0));
    ball.setFill(ballGrad);
    ball.timer = 'tick';
    ball.tag = { index: i, isBall: true };
    balls.push(ball);
    model.add(ball);
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 0.94;
        var tag = el.tag;
        var i = tag.index;
        var bx = startX + i * spacing;

        // Newton's cradle: only the end balls swing
        // Use a sinusoidal swing with energy transfer
        var angle = 0;

        // Half-period swing: left ball out when sin > 0, right ball out when sin < 0
        var swing = Math.sin(phase);

        if (i === 0) {
            // Left end ball — swings left (away from group) when swing > 0
            angle = -Math.max(0, swing) * maxAngle;
        } else if (i === ballCount - 1) {
            // Right end ball — swings right (away from group) when swing < 0
            angle = -Math.min(0, swing) * maxAngle;
        } else {
            angle = 0;
        }

        var bobX = bx + Math.sin(angle) * stringLength;
        var bobY = pivotY + Math.cos(angle) * stringLength;

        if (tag.isString) {
            el.setP1(elise.point(bx, pivotY));
            el.setP2(elise.point(bobX, bobY));
        }

        if (tag.isBall) {
            el.setCenter(elise.point(bobX, bobY));
            // Update gradient center for realistic specular
            var grad = elise.radialGradientFill(
                Math.round(bobX) + ',' + Math.round(bobY),
                Math.round(bobX - 6) + ',' + Math.round(bobY - 6),
                ballRadius, ballRadius
            );
            grad.stops.push(elise.gradientFillStop('#e8e8f0', 0));
            grad.stops.push(elise.gradientFillStop('#b0b0c0', 0.4));
            grad.stops.push(elise.gradientFillStop('#606080', 0.8));
            grad.stops.push(elise.gradientFillStop('#404060', 1.0));
            el.setFill(grad);
        }

        if (tag.isShadow) {
            // Shadow stays on the ground plane but shifts with ball position
            var shadowX = bobX;
            var shadowScale = 0.5 + Math.abs(angle) * 0.5;
            el.setCenter(elise.point(shadowX, pivotY + stringLength + ballRadius + 8));
            el.radiusX = ballRadius * shadowScale;
            var shadowAlpha = Math.floor(20 * (1 - Math.abs(angle) * 0.8));
            el.setFill(elise.color(shadowAlpha, 0, 0, 0).toHexString());
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
