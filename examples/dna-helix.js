var width = 700;
var height = 700;
var model = elise.model(width, height);
model.setFill('#060612');

var cx = width / 2;
var cy = height / 2;

// --- DNA Helix ---
var helixRadius = 100;
var helixHeight = 600;
var startY = 50;
var numNodes = 30;
var nodeSpacing = helixHeight / numNodes;

// Base pair colors
var basePairs = [
    { left: { r: 220, g: 60, b: 60 }, right: { r: 60, g: 60, b: 220 }, label: 'A-T' },
    { left: { r: 60, g: 200, b: 60 }, right: { r: 220, g: 180, b: 40 }, label: 'G-C' }
];

// Pre-create all elements
var leftNodes = [];
var rightNodes = [];
var rungs = [];
var leftGlows = [];
var rightGlows = [];

for (var i = 0; i < numNodes; i++) {
    var y = startY + i * nodeSpacing;
    var pair = basePairs[i % 2];

    // Rung (line connecting the two strands)
    var rung = elise.line(cx, y, cx, y);
    rung.setStroke('#33335520,1');
    rung.timer = 'tick';
    rung.tag = { index: i, isRung: true };
    rungs.push(rung);
    model.add(rung);

    // Left glow
    var lglow = elise.ellipse(cx, y, 14, 14);
    lglow.setFill(elise.color(30, pair.left.r, pair.left.g, pair.left.b).toHexString());
    lglow.timer = 'tick';
    lglow.tag = { index: i, isGlow: true, side: 'left' };
    leftGlows.push(lglow);
    model.add(lglow);

    // Right glow
    var rglow = elise.ellipse(cx, y, 14, 14);
    rglow.setFill(elise.color(30, pair.right.r, pair.right.g, pair.right.b).toHexString());
    rglow.timer = 'tick';
    rglow.tag = { index: i, isGlow: true, side: 'right' };
    rightGlows.push(rglow);
    model.add(rglow);

    // Left strand node
    var leftNode = elise.ellipse(cx, y, 8, 8);
    leftNode.setFill(elise.color(255, pair.left.r, pair.left.g, pair.left.b).toHexString());
    leftNode.timer = 'tick';
    leftNode.tag = {
        index: i,
        isNode: true,
        side: 'left',
        pair: pair
    };
    leftNodes.push(leftNode);
    model.add(leftNode);

    // Right strand node
    var rightNode = elise.ellipse(cx, y, 8, 8);
    rightNode.setFill(elise.color(255, pair.right.r, pair.right.g, pair.right.b).toHexString());
    rightNode.timer = 'tick';
    rightNode.tag = {
        index: i,
        isNode: true,
        side: 'right',
        pair: pair
    };
    rightNodes.push(rightNode);
    model.add(rightNode);
}

// Backbone polylines (smooth curves connecting nodes along each strand)
var leftBackbone = elise.polyline();
leftBackbone.smoothPoints = true;
for (var i = 0; i < numNodes; i++) {
    leftBackbone.addPoint(elise.point(cx, startY + i * nodeSpacing));
}
leftBackbone.setStroke('#cc444488,2');
leftBackbone.timer = 'tick';
leftBackbone.tag = { isBackbone: true, side: 'left' };
model.add(leftBackbone);

var rightBackbone = elise.polyline();
rightBackbone.smoothPoints = true;
for (var i = 0; i < numNodes; i++) {
    rightBackbone.addPoint(elise.point(cx, startY + i * nodeSpacing));
}
rightBackbone.setStroke('#4444cc88,2');
rightBackbone.timer = 'tick';
rightBackbone.tag = { isBackbone: true, side: 'right' };
model.add(rightBackbone);

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 0.25;
        var tag = el.tag;

        // Helper: compute x position for a helix strand at node index i
        function helixX(i, offset) {
            var angle = (i / numNodes) * Math.PI * 4 + phase + offset;
            return Math.cos(angle) * helixRadius;
        }

        // Helper: compute depth (z) for perspective scaling
        function helixZ(i, offset) {
            var angle = (i / numNodes) * Math.PI * 4 + phase + offset;
            return Math.sin(angle); // -1 to 1
        }

        if (tag.isBackbone) {
            var offset = tag.side === 'left' ? 0 : Math.PI;
            var pts = '';
            for (var n = 0; n < numNodes; n++) {
                var x = cx + helixX(n, offset);
                var y = startY + n * nodeSpacing;
                if (n > 0) pts += ' ';
                pts += Math.round(x) + ',' + Math.round(y);
            }
            el.setPoints(pts);

            // Depth-based alpha for the overall backbone
            var midZ = helixZ(Math.floor(numNodes / 2), offset);
            var alpha = Math.floor(120 + midZ * 60);
            alpha = Math.max(10, Math.min(255, alpha));
            if (tag.side === 'left') {
                el.setStroke(elise.color(alpha, 204, 68, 68).toHexString() + ',2');
            } else {
                el.setStroke(elise.color(alpha, 68, 68, 204).toHexString() + ',2');
            }
            controller.invalidate();
            return;
        }

        if (tag.isRung) {
            var i = tag.index;
            var lx = cx + helixX(i, 0);
            var rx = cx + helixX(i, Math.PI);
            var y = startY + i * nodeSpacing;

            // Depth of midpoint determines visibility
            var lz = helixZ(i, 0);
            var rz = helixZ(i, Math.PI);
            var midZ = (lz + rz) / 2;
            var alpha = Math.floor(100 + midZ * 80);
            alpha = Math.max(10, Math.min(200, alpha));

            el.setP1(elise.point(lx, y));
            el.setP2(elise.point(rx, y));
            el.setStroke(elise.color(alpha, 80, 80, 120).toHexString() + ',1');
            controller.invalidate();
            return;
        }

        if (tag.isGlow || tag.isNode) {
            var i = tag.index;
            var offset = tag.side === 'left' ? 0 : Math.PI;
            var x = cx + helixX(i, offset);
            var y = startY + i * nodeSpacing;
            var z = helixZ(i, offset);

            // Perspective: scale based on depth
            var depthScale = 0.6 + (z + 1) * 0.25; // range 0.6..1.1

            if (tag.isNode) {
                var pair = tag.pair;
                var c = tag.side === 'left' ? pair.left : pair.right;
                var alpha = Math.floor(140 + z * 115);
                alpha = Math.max(30, Math.min(255, alpha));
                var nodeR = 6 * depthScale + 2;

                el.setCenter(elise.point(x, y));
                el.radiusX = nodeR;
                el.radiusY = nodeR;
                el.setFill(elise.color(alpha, c.r, c.g, c.b).toHexString());
            }

            if (tag.isGlow) {
                var pair = basePairs[i % 2];
                var c = tag.side === 'left' ? pair.left : pair.right;
                var alpha = Math.floor(20 + z * 20);
                alpha = Math.max(0, Math.min(50, alpha));
                var glowR = 12 * depthScale + 4;

                el.setCenter(elise.point(x, y));
                el.radiusX = glowR;
                el.radiusY = glowR;
                el.setFill(elise.color(alpha, c.r, c.g, c.b).toHexString());
            }

            controller.invalidate();
            return;
        }
    });
    controller.startTimer();
});

return model;
