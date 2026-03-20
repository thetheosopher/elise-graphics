var width = 600;
var height = 600;
var model = elise.model(width, height);
model.setFill('#080818');

var cx = width / 2;
var cy = height / 2;

// Metaball centers: we animate positions, then use a grid of
// ellipses whose opacity is based on the metaball field strength
var blobCount = 5;
var blobConfigs = [
    { x: 200, y: 300, vx: 60, vy: 40, r: 80, color: { r: 255, g: 60, b: 100 } },
    { x: 400, y: 300, vx: -50, vy: 60, r: 90, color: { r: 60, g: 100, b: 255 } },
    { x: 300, y: 200, vx: 40, vy: -55, r: 70, color: { r: 100, g: 255, b: 80 } },
    { x: 150, y: 450, vx: 70, vy: -30, r: 75, color: { r: 255, g: 200, b: 40 } },
    { x: 450, y: 150, vx: -45, vy: 50, r: 65, color: { r: 200, g: 80, b: 255 } }
];

// Blob positions (updated each frame)
var blobX = [];
var blobY = [];
for (var b = 0; b < blobCount; b++) {
    blobX.push(blobConfigs[b].x);
    blobY.push(blobConfigs[b].y);
}

// Grid of cells that visualize the metaball field
var gridSize = 30;
var cellW = width / gridSize;
var cellH = height / gridSize;
var cells = [];

for (var row = 0; row < gridSize; row++) {
    for (var col = 0; col < gridSize; col++) {
        var cell = elise.ellipse(
            (col + 0.5) * cellW,
            (row + 0.5) * cellH,
            cellW * 0.55,
            cellH * 0.55
        );
        cell.setFill('#00000000');
        cell.timer = 'tick';
        cell.tag = {
            col: col,
            row: row,
            px: (col + 0.5) * cellW,
            py: (row + 0.5) * cellH,
            isCell: true
        };
        cells.push(cell);
        model.add(cell);
    }
}

// Ticker element to update blob positions
var ticker = elise.rectangle(0, 0, 0, 0);
ticker.timer = 'tick';
ticker.tag = { isTicker: true };
model.add(ticker);

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var delta = parameters.tickDelta;
        var tag = el.tag;

        if (tag.isTicker) {
            // Update blob positions with bounce
            for (var b = 0; b < blobCount; b++) {
                var cfg = blobConfigs[b];
                blobX[b] += cfg.vx * delta;
                blobY[b] += cfg.vy * delta;

                if (blobX[b] < cfg.r) {
                    blobX[b] = cfg.r;
                    cfg.vx *= -1;
                } else if (blobX[b] > width - cfg.r) {
                    blobX[b] = width - cfg.r;
                    cfg.vx *= -1;
                }
                if (blobY[b] < cfg.r) {
                    blobY[b] = cfg.r;
                    cfg.vy *= -1;
                } else if (blobY[b] > height - cfg.r) {
                    blobY[b] = height - cfg.r;
                    cfg.vy *= -1;
                }
            }
            controller.invalidate();
            return;
        }

        if (tag.isCell) {
            var px = tag.px;
            var py = tag.py;

            // Compute metaball field strength at this point
            var field = 0;
            var totalR = 0, totalG = 0, totalB = 0;
            var totalWeight = 0;

            for (var b = 0; b < blobCount; b++) {
                var dx = px - blobX[b];
                var dy = py - blobY[b];
                var distSq = dx * dx + dy * dy;
                var rSq = blobConfigs[b].r * blobConfigs[b].r;
                var strength = rSq / (distSq + 1);
                field += strength;

                // Weighted color contribution
                var c = blobConfigs[b].color;
                totalR += c.r * strength;
                totalG += c.g * strength;
                totalB += c.b * strength;
                totalWeight += strength;
            }

            // Threshold: only show where field > 1
            if (field > 0.8) {
                var intensity = Math.min(1, (field - 0.8) * 2.5);
                var a = Math.floor(220 * intensity);
                var r = Math.floor(Math.min(255, totalR / totalWeight));
                var g = Math.floor(Math.min(255, totalG / totalWeight));
                var b = Math.floor(Math.min(255, totalB / totalWeight));

                // Brighter at higher field values
                if (field > 1.5) {
                    var boost = Math.min(1, (field - 1.5) * 0.5);
                    r = Math.floor(Math.min(255, r + (255 - r) * boost * 0.5));
                    g = Math.floor(Math.min(255, g + (255 - g) * boost * 0.5));
                    b = Math.floor(Math.min(255, b + (255 - b) * boost * 0.5));
                }

                el.setFill(elise.color(a, r, g, b).toHexString());
                var size = cellW * 0.55 * (0.8 + intensity * 0.3);
                el.radiusX = size;
                el.radiusY = size;
            } else {
                el.setFill('#00000000');
            }
            return;
        }
    });
    controller.startTimer();
});

return model;
