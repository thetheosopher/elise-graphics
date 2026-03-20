var width = 640;
var height = 640;
var model = elise.model(width, height);
model.setFill('#000000');

var cx = width / 2;
var cy = height / 2;

// Grid of rectangles that create a plasma effect
// Using a moderate grid for performance
var cols = 32;
var rows = 32;
var cellW = width / cols;
var cellH = height / rows;
var cells = [];

for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
        var rect = elise.rectangle(col * cellW, row * cellH, cellW + 1, cellH + 1);
        rect.setFill('#000000');
        rect.timer = 'tick';
        rect.tag = {
            col: col,
            row: row,
            cx: (col + 0.5) / cols,  // normalized 0-1
            cy: (row + 0.5) / rows
        };
        cells.push(rect);
        model.add(rect);
    }
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var phase = parameters.elapsedTime * 1.2;
        var tag = el.tag;
        var x = tag.cx;
        var y = tag.cy;

        // Classic plasma: sum of sine functions
        var v1 = Math.sin(x * 10 + phase);
        var v2 = Math.sin(y * 10 + phase * 1.3);
        var v3 = Math.sin((x + y) * 8 + phase * 0.7);
        var dist = Math.sqrt((x - 0.5) * (x - 0.5) + (y - 0.5) * (y - 0.5));
        var v4 = Math.sin(dist * 12 - phase * 2);
        var v = (v1 + v2 + v3 + v4) / 4; // range -1 to 1

        // Map to vibrant colors using sine color cycling
        var r = Math.floor(128 + 127 * Math.sin(v * Math.PI + phase * 0.5));
        var g = Math.floor(128 + 127 * Math.sin(v * Math.PI + phase * 0.5 + 2.094));
        var b = Math.floor(128 + 127 * Math.sin(v * Math.PI + phase * 0.5 + 4.188));

        el.setFill(elise.color(255, r, g, b).toHexString());
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
