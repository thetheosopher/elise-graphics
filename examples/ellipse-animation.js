var width = 800,
    height = 600,
    i;
var model = elise.model(width, height);

var radiusX, radiusY, centerX, centerY, dx, dy, colorIndex, namedColor, e;

// Create some random ellipses
for (i = 0; i < 50; i++) {
    radiusX = Math.floor(Math.random() * 60 + 1);
    radiusY = radiusX;
    centerX = Math.floor(Math.random() * (width - radiusX * 2) + radiusX);
    centerY = Math.floor(Math.random() * (height - radiusY * 2) + radiusY);
    dx = (Math.random() - 0.5) * 200;
    dy = (Math.random() - 0.5) * 200;
    colorIndex = Math.floor(Math.random() * elise.Color.NamedColors.length);
    namedColor = elise.Color.NamedColors[colorIndex];
    e = elise.ellipse(centerX, centerY, radiusX, radiusY);
    e.tag = i;
    e.dx = dx;
    e.dy = dy;
    e.fill = namedColor.name;
    e.stroke = 'Black';
    e.timer = 'tick';
    model.add(e);
}

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function(controller, element, command, trigger, parameters) {
        var delta = parameters.tickDelta;
        var centerX = element.getCenter().x;
        var centerY = element.getCenter().y;
        var radiusX = element.radiusX;
        var radiusY = element.radiusY;
        var width = controller.model.getSize().width;
        var height = controller.model.getSize().height;
        var over;

        centerX += element.dx * delta;
        if (centerX + radiusX > width) {
            over = centerX + radiusX - width;
            centerX = width - radiusX - over;
            element.dx *= -1;
        }
        else if (centerX - radiusX < 0) {
            over = centerX - radiusX;
            centerX = radiusX - over;
            element.dx *= -1;
        }

        centerY += element.dy * delta;
        if (centerY + radiusY > height) {
            over = centerY + radiusY - height;
            centerY = height - radiusY - over;
            element.dy *= -1;
        }
        else if (centerY - radiusY < 0) {
            over = centerY - radiusY;
            centerY = radiusY - over;
            element.dy *= -1;
        }
        element.setCenter(elise.point(centerX, centerY));
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
