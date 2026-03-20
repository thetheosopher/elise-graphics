var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#060911');

var cols = 140;
var rows = 114;
var cw = width / cols;
var ch = height / rows;

var pixels = [];
for (var y = 0; y < rows; y++) {
    pixels[y] = [];
    for (var x = 0; x < cols; x++) {
        var r = elise.rectangle(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw) + 1, Math.ceil(ch) + 1);
        r.setFill('#000000');
        model.add(r);
        pixels[y][x] = r;
    }
}

var title = elise.text('Mandelbrot Zoom', 14, 12, 280, 24);
title.setTypeface('Consolas, monospace');
title.setTypesize(18);
title.setFill('#d4deff');
model.add(title);

var hud = elise.text('Zoom: 1x', 14, 36, 360, 20);
hud.setTypeface('Consolas, monospace');
hud.setTypesize(14);
hud.setFill('#8eb6ff');
model.add(hud);

var cx = -0.743643887037151;
var cy = 0.13182590420533;
var zoom = 1.0;
var lineCursor = 0;
var frame = 0;

function colorFromIter(i, maxI, t) {
    if (i >= maxI) return { r: 8, g: 8, b: 16 };
    var n = i / maxI;
    var p = n * 6.28318 + t * 0.8;
    return {
        r: Math.floor(90 + 80 * Math.sin(p)),
        g: Math.floor(120 + 110 * Math.sin(p + 2.1)),
        b: Math.floor(180 + 70 * Math.sin(p + 4.2))
    };
}

function mandel(px, py, maxIter, t) {
    var scale = 2.7 / zoom;
    var x0 = cx + (px / cols - 0.5) * scale;
    var y0 = cy + (py / rows - 0.5) * scale * (rows / cols);

    var x = 0;
    var y = 0;
    var i = 0;
    while (x * x + y * y <= 4 && i < maxIter) {
        var xt = x * x - y * y + x0;
        y = 2 * x * y + y0;
        x = xt;
        i++;
    }
    return colorFromIter(i, maxIter, t);
}

var driver = elise.ellipse(-10, -10, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);
    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime;
        var maxIter = 60 + Math.floor(Math.min(120, zoom * 8));

        for (var pass = 0; pass < 6; pass++) {
            var y = lineCursor % rows;
            for (var x = 0; x < cols; x++) {
                var c = mandel(x, y, maxIter, t);
                pixels[y][x].setFill(elise.color(255, c.r, c.g, c.b).toHexString());
            }
            lineCursor++;
        }

        if (lineCursor >= rows) {
            lineCursor = 0;
            frame++;
            zoom *= 1.035;
            if (zoom > 260) {
                zoom = 1;
                frame = 0;
            }
        }

        hud.setText('Zoom: ' + zoom.toFixed(2) + 'x   Iter: ' + maxIter);
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
