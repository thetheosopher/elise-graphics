var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#06080d');

var bg = elise.rectangle(0, 0, width, height);
var bgGrad = elise.linearGradientFill('0,0', '0,620');
bgGrad.stops.push(elise.gradientFillStop('#111726', 0));
bgGrad.stops.push(elise.gradientFillStop('#0b1020', 0.7));
bgGrad.stops.push(elise.gradientFillStop('#080d16', 1));
bg.setFill(bgGrad);
model.add(bg);

var cellSize = 12;
var cols = 52;
var rows = 42;
var gridX = 68;
var gridY = 70;

var frame = elise.rectangle(gridX - 10, gridY - 10, cols * cellSize + 20, rows * cellSize + 20);
frame.setFill('#00000000');
frame.setStroke('#4d6286,2');
model.add(frame);

var title = elise.text('Conway Life Lab', 18, 16, 260, 28);
title.setTypeface('Consolas, monospace');
title.setTypesize(22);
title.setFill('#cedaff');
model.add(title);

var hud = elise.text('Generation: 0   Alive: 0', 18, 44, 400, 22);
hud.setTypeface('Consolas, monospace');
hud.setTypesize(16);
hud.setFill('#8ce4ff');
model.add(hud);

var cells = [];
var cellEls = [];
for (var y = 0; y < rows; y++) {
    cells[y] = [];
    cellEls[y] = [];
    for (var x = 0; x < cols; x++) {
        var alive = Math.random() < 0.32;
        cells[y][x] = alive ? 1 : 0;

        var rc = elise.rectangle(gridX + x * cellSize, gridY + y * cellSize, cellSize - 1, cellSize - 1);
        if (alive) {
            rc.setFill(elise.color(220, 90, 240, 170).toHexString());
        } else {
            rc.setFill(elise.color(22, 18, 38, 62).toHexString());
        }
        model.add(rc);
        cellEls[y][x] = rc;
    }
}

var state = {
    generation: 0,
    acc: 0,
    stepEvery: 0.10,
    pulse: 0
};

var driver = elise.ellipse(-20, -20, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
driver.tag = { kind: 'driver' };
model.add(driver);

function neighbors(grid, x, y) {
    var count = 0;
    for (var oy = -1; oy <= 1; oy++) {
        for (var ox = -1; ox <= 1; ox++) {
            if (ox === 0 && oy === 0) continue;
            var nx = (x + ox + cols) % cols;
            var ny = (y + oy + rows) % rows;
            count += grid[ny][nx];
        }
    }
    return count;
}

function aliveCount(grid) {
    var n = 0;
    for (var y = 0; y < rows; y++) {
        for (var x = 0; x < cols; x++) {
            n += grid[y][x];
        }
    }
    return n;
}

model.controllerAttached.add(function (model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);

    commandHandler.addHandler('tick', function (controller, el, command, trigger, parameters) {
        state.acc += parameters.tickDelta;
        state.pulse = parameters.elapsedTime;

        var stepped = false;
        while (state.acc >= state.stepEvery) {
            state.acc -= state.stepEvery;
            stepped = true;

            var next = [];
            for (var y = 0; y < rows; y++) {
                next[y] = [];
                for (var x = 0; x < cols; x++) {
                    var n = neighbors(cells, x, y);
                    if (cells[y][x] === 1) {
                        next[y][x] = (n === 2 || n === 3) ? 1 : 0;
                    } else {
                        next[y][x] = (n === 3) ? 1 : 0;
                    }
                }
            }
            cells = next;
            state.generation++;
        }

        var alive = aliveCount(cells);
        var pulse = Math.sin(state.pulse * 6) * 0.5 + 0.5;

        if (stepped) {
            for (var y = 0; y < rows; y++) {
                for (var x = 0; x < cols; x++) {
                    if (cells[y][x] === 1) {
                        var a = Math.floor(180 + pulse * 65);
                        var g = Math.floor(220 + pulse * 35);
                        cellEls[y][x].setFill(elise.color(a, 90, g, 170).toHexString());
                    } else {
                        cellEls[y][x].setFill(elise.color(22, 18, 38, 62).toHexString());
                    }
                }
            }
        }

        hud.setText('Generation: ' + state.generation + '   Alive: ' + alive + '   Tick: 100ms');

        controller.invalidate();
    });

    controller.startTimer();
});

return model;
