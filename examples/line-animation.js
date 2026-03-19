var width = 800,
    height = 600;
var model = elise.model(width, height);
var x1, y1, x2, y2, dx1, dx2, dy1, dy2, colorIndex, namedColor, l, i;

// Create some random lines
for (i = 0; i < 25; i++) {
    x1 = Math.floor(Math.random() * width);
    y1 = Math.floor(Math.random() * height);
    x2 = Math.floor(Math.random() * width);
    y2 = Math.floor(Math.random() * height);
    dx1 = (Math.random() - 0.5) * 10;
    dy1 = (Math.random() - 0.5) * 10;
    dx2 = (Math.random() - 0.5) * 10;
    dy2 = (Math.random() - 0.5) * 10;
    colorIndex = Math.floor(Math.random() * elise.Color.NamedColors.length);
    namedColor = elise.Color.NamedColors[colorIndex];
    l = elise.line(x1, y1, x2, y2).setStroke(namedColor.name + ',7');
    l.tag = i;
    l.dx1 = dx1;
    l.dx2 = dx2;
    l.dy1 = dy1;
    l.dy2 = dy2;
    l.timer = 'tick';
    model.add(l);
}

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function(controller, element, command, trigger, parameters) {
        var l = element;
        var dx1 = l.dx1;
        var dx2 = l.dx2;
        var dy1 = l.dy1;
        var dy2 = l.dy2;
        var x1 = l.getP1().x + dx1;
        var x2 = l.getP2().x + dx2;
        var y1 = l.getP1().y + dy1;
        var y2 = l.getP2().y + dy2;
        var width = controller.model.getSize().width;
        var height = controller.model.getSize().height;
        if (x1 > width) {
            x1 = width + width - x1;
            dx1 *= -1;
        }
        else if (x1 < 0) {
            x1 = -x1;
            dx1 *= -1;
        }
        if (x2 > width) {
            x2 = width + width - x2;
            dx2 *= -1;
        }
        else if (x2 < 0) {
            x2 = -x2;
            dx2 *= -1;
        }
        if (y1 > height) {
            y1 = height + height - y1;
            dy1 *= -1;
        }
        else if (y1 < 0) {
            y1 = -y1;
            dy1 *= -1;
        }
        if (y2 > height) {
            y2 = height + height - y2;
            dy2 *= -1;
        }
        else if (y2 < 0) {
            y2 = -y2;
            dy2 *= -1;
        }
        l.setP1(elise.point(x1, y1));
        l.setP2(elise.point(x2, y2));
        l.dx1 = dx1;
        l.dx2 = dx2;
        l.dy1 = dy1;
        l.dy2 = dy2;
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
