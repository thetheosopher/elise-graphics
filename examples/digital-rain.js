var width = 640;
var height = 480;
var chars =
    '!"#$%&\'()*+,-./0123456789:;<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_abcdefghijklmnopqrstuvwxyz{|}~            ';

var model = elise.model(width, height);
model.setFill('Black');

var rows = 20;
var cols = 40;
var tels = [];
var fade = 1000;
var colw = width / cols;
var rowh = height / rows;

var dropcount = cols * 3;
var dropboost = 5;
var dropcols = [];
var droprows = [];
var droplengths = [];
var dropfactors = [];
var droprates = [];
var letters = [];

for (var i = 0; i < dropcount; i++) {
    dropcols.push(Math.floor(Math.random() * cols));
    droprows.push(Math.floor(Math.random() * rows));
    droplengths.push(Math.floor(Math.random() * 4) + 4);
    dropfactors.push(Math.random());
    droprates.push(Math.random() * 16) + 16;
}

for (var row = 0; row < rows; row++) {
    for (var col = 0; col < cols; col++) {
        var letter = chars.charAt(Math.floor(Math.random() * chars.length));
        letters[row * cols + col] = letter;
        var tel = elise.text(letter, col * colw, row * rowh, colw, rowh).setAlignment('center,middle');
        tel.setTypesize(Math.floor(rowh));
        tel.setTypeface('Matrix');
        var tc = elise.Color.Green.clone();
        tel.setFill(tc.toHexString());
        tel.tag = {
            alpha: 255,
            color: tc,
            row: row,
            col: col
        };
        tel.addTo(model);
        tel.timer = 'tick';
        tels.push(tel);
    }
}

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function(controller, element, command, trigger, parameters) {
        var tel = element;
        var delta = parameters.tickDelta;
        var tag = tel.tag;
        tag.alpha -= delta * fade;
        if (tag.alpha < 0) {
            tag.alpha = 0;
        }

        // Factor drops into alpha
        for (var i = 0; i < dropcount; i++) {
            if (tag.col === dropcols[i] && tag.row <= droprows[i]) {
                var boost = 255 - Math.pow(droprows[i] - tag.row, 8 - droplengths[i]);
                tag.alpha += boost * dropfactors[i];
                if (tag.alpha > 255) {
                    tag.alpha = 255;
                }
                else if (tag.alpha < 0) {
                    tag.alpha = 0;
                }
            }
        }

        tag.color.a = Math.floor(tag.alpha);
        var highlight = false;
        for (var i = 0; i < dropcount; i++) {
            if (tag.col === dropcols[i] && tag.row === Math.floor(droprows[i])) {
                highlight = true;
                break;
            }
        }
        if (highlight) {
            tag.color.b = 255;
            tag.color.r = 255;
            tag.color.g = 255;
        }
        else {
            tag.color.b = 0;
            tag.color.r = 0;
            tag.color.g = 255;
        }
        tel.setFill(tag.color.toHexString());
        controller.invalidate();
    });
    controller.timer.add(function(controller, params) {
        for (var i = 0; i < dropcount; i++) {
            droprows[i] += params.tickDelta * droprates[i];
            if (droprows[i] > rows * 2) {
                dropcols[i] = Math.floor(Math.random() * cols);
                droprows[i] = 0;
            }
        }

        // Rotate letters in a row
        var col = Math.floor(Math.random() * cols);
        var coltels = [];
        for (var row = 0; row < rows; row++) {
            var tel = tels[row * cols + col];
            coltels.push(tel);
        }
        var colletters = [];
        for (var row = 0; row < rows; row++) {
            colletters.push(letters[row * cols + col]);
        }
        colletters.splice(0, 0, chars.charAt(Math.floor(Math.random() * chars.length)));
        colletters.pop();
        for (var row = 0; row < rows; row++) {
            letters[row * cols + col] = colletters[row];
        }

        for (var row = 0; row < rows; row++) {
            var coltel = coltels[row];
            coltel.setText(colletters[row]);
        }
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
