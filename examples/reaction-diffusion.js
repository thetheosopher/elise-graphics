var width = 768;
var height = 576;
var model = elise.model(width, height);
model.setFill('#0b0f1a');

var cols = 64;
var rows = 48;
var cw = width / cols;
var ch = height / rows;

var a = [];
var b = [];
var na = [];
var nb = [];
var cells = [];

for (var y = 0; y < rows; y++) {
    a[y] = [];
    b[y] = [];
    na[y] = [];
    nb[y] = [];
    cells[y] = [];
    for (var x = 0; x < cols; x++) {
        a[y][x] = 1;
        b[y][x] = 0;
        var r = elise.rectangle(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw) + 1, Math.ceil(ch) + 1);
        r.setFill('#06080f');
        model.add(r);
        cells[y][x] = r;
    }
}

for (var i = 0; i < 600; i++) {
    var sx = 10 + Math.floor(Math.random() * (cols - 20));
    var sy = 10 + Math.floor(Math.random() * (rows - 20));
    b[sy][sx] = 1;
}

var feed = 0.045;
var kill = 0.062;
var dA = 1.0;
var dB = 0.5;

function lap(grid, x, y) {
    var v = 0;
    v += grid[y][x] * -1;
    v += grid[y][(x + 1) % cols] * 0.2;
    v += grid[y][(x - 1 + cols) % cols] * 0.2;
    v += grid[(y + 1) % rows][x] * 0.2;
    v += grid[(y - 1 + rows) % rows][x] * 0.2;
    v += grid[(y + 1) % rows][(x + 1) % cols] * 0.05;
    v += grid[(y + 1) % rows][(x - 1 + cols) % cols] * 0.05;
    v += grid[(y - 1 + rows) % rows][(x + 1) % cols] * 0.05;
    v += grid[(y - 1 + rows) % rows][(x - 1 + cols) % cols] * 0.05;
    return v;
}

var hud = elise.text('Reaction-Diffusion', 14, 12, 340, 24);
hud.setTypeface('Consolas, monospace');
hud.setTypesize(16);
hud.setFill('#a9d7ff');
model.add(hud);

var driver = elise.ellipse(-10, -10, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);
    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime;

        var cx = Math.floor(cols / 2 + Math.sin(t * 0.7) * 10);
        var cy = Math.floor(rows / 2 + Math.cos(t * 0.9) * 8);
        for (var oy = -2; oy <= 2; oy++) {
            for (var ox = -2; ox <= 2; ox++) {
                var px = (cx + ox + cols) % cols;
                var py = (cy + oy + rows) % rows;
                b[py][px] = 1;
            }
        }

        for (var iter = 0; iter < 2; iter++) {
            for (var y = 0; y < rows; y++) {
                for (var x = 0; x < cols; x++) {
                    var A = a[y][x];
                    var B = b[y][x];
                    var reaction = A * B * B;
                    na[y][x] = A + (dA * lap(a, x, y) - reaction + feed * (1 - A));
                    nb[y][x] = B + (dB * lap(b, x, y) + reaction - (kill + feed) * B);
                    if (na[y][x] < 0) na[y][x] = 0;
                    if (na[y][x] > 1) na[y][x] = 1;
                    if (nb[y][x] < 0) nb[y][x] = 0;
                    if (nb[y][x] > 1) nb[y][x] = 1;
                }
            }
            var tmpA = a; a = na; na = tmpA;
            var tmpB = b; b = nb; nb = tmpB;
        }

        for (var yy = 0; yy < rows; yy++) {
            for (var xx = 0; xx < cols; xx++) {
                var v = a[yy][xx] - b[yy][xx];
                var n = Math.max(0, Math.min(1, v * 1.5));
                var r = Math.floor(30 + n * 80);
                var g = Math.floor(40 + n * 190);
                var c = Math.floor(80 + (1 - n) * 160);
                cells[yy][xx].setFill(elise.color(255, r, g, c).toHexString());
            }
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
