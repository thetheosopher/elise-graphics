var width = 760;
var height = 620;
var model = elise.model(width, height);
model.setFill('#0b1510');

var bg = elise.rectangle(0, 0, width, height);
var g = elise.linearGradientFill('0,0', '0,620');
g.stops.push(elise.gradientFillStop('#13251a', 0));
g.stops.push(elise.gradientFillStop('#0f1b14', 0.6));
g.stops.push(elise.gradientFillStop('#0a140e', 1));
bg.setFill(g);
model.add(bg);

function lsystem(axiom, rules, depth) {
    var s = axiom;
    for (var i = 0; i < depth; i++) {
        var n = '';
        for (var j = 0; j < s.length; j++) {
            var ch = s.charAt(j);
            n += rules[ch] ? rules[ch] : ch;
        }
        s = n;
    }
    return s;
}

function turtleSegments(seq, startX, startY, len, angDeg) {
    var angle = -Math.PI / 2;
    var stack = [];
    var x = startX;
    var y = startY;
    var segs = [];
    var step = len;
    var turn = angDeg * Math.PI / 180;

    for (var i = 0; i < seq.length; i++) {
        var ch = seq.charAt(i);
        if (ch === 'F') {
            var nx = x + Math.cos(angle) * step;
            var ny = y + Math.sin(angle) * step;
            segs.push({ x1: x, y1: y, x2: nx, y2: ny });
            x = nx; y = ny;
        } else if (ch === '+') {
            angle += turn;
        } else if (ch === '-') {
            angle -= turn;
        } else if (ch === '[') {
            stack.push({ x: x, y: y, a: angle, s: step * 0.97 });
        } else if (ch === ']') {
            var st = stack.pop();
            if (st) {
                x = st.x; y = st.y; angle = st.a; step = st.s;
            }
        }
    }
    return segs;
}

var seq1 = lsystem('F', { 'F': 'FF-[-F+F+F]+[+F-F-F]' }, 3);
var seq2 = lsystem('F', { 'F': 'F[+F]F[-F]F' }, 4);

var segs = [];
segs = segs.concat(turtleSegments(seq1, 200, 600, 5.4, 22.5));
segs = segs.concat(turtleSegments(seq2, 380, 600, 5.2, 20));
segs = segs.concat(turtleSegments(seq1, 560, 600, 4.8, 24));

var lines = [];
for (var i = 0; i < segs.length; i++) {
    var s = segs[i];
    var ln = elise.line(s.x1, s.y1, s.x1, s.y1);
    ln.setStroke('#6dbf76,1');
    model.add(ln);
    lines.push(ln);
}

var title = elise.text('L-System Garden', 16, 16, 280, 26);
title.setTypeface('Consolas, monospace');
title.setTypesize(20);
title.setFill('#cdeec9');
model.add(title);

var driver = elise.ellipse(-10, -10, 2, 2);
driver.setFill('#00000000');
driver.timer = 'tick';
model.add(driver);

model.controllerAttached.add(function (model, controller) {
    var h = new elise.ElementCommandHandler();
    h.attachController(controller);
    h.addHandler('tick', function (controller, el, command, trigger, parameters) {
        var t = parameters.elapsedTime;
        var reveal = Math.min(lines.length, Math.floor(t * 220));

        for (var i = 0; i < lines.length; i++) {
            var seg = segs[i];
            if (i < reveal) {
                lines[i].setP1(elise.point(seg.x1, seg.y1));
                lines[i].setP2(elise.point(seg.x2, seg.y2));
                var growth = Math.max(0, Math.min(1, (reveal - i) / 140));
                var a = Math.floor(90 + growth * 160);
                var gcol = Math.floor(150 + growth * 90);
                lines[i].setStroke(elise.color(a, 90, gcol, 110).toHexString() + ',1');
            } else {
                lines[i].setP1(elise.point(seg.x1, seg.y1));
                lines[i].setP2(elise.point(seg.x1, seg.y1));
            }
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
