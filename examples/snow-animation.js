var width = 800;
var height = 600;
var model = elise.model(width, height);
var ellipses = [];
model.setFill('DarkBlue');

// Create some random ellipses
for (var i = 0; i < 750; i++) {
    var radiusX = Math.random() * 3 + 1;
    var radiusY = radiusX;
    var centerX = Math.floor(Math.random() * (width - radiusX * 2) + radiusX);
    var centerY = Math.floor(Math.random() * (height - radiusY * 2) + radiusY);
    var dx = (Math.random() - 0.5) * 10;
    var dy = Math.random() * 80 + 60;
    var alpha = Math.floor(Math.random() * 192) + 64;
    var e = elise.ellipse(centerX, centerY, radiusX, radiusY);
    e.tag = {
        index: i,
        dx: dx,
        dy: dy
    };
    e.fill = elise.color(alpha, 255, 255, 255).toHexString();
    e.timer = 'tick';
    ellipses.push(e);
    model.add(e);
}

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function(controller, el, command, trigger, parameters) {
        var delta = parameters.tickDelta;
        var center = el.getCenter();
        var centerX = center.x;
        var centerY = center.y;
        var radiusX = el.radiusX;
        var radiusY = el.radiusY;
        var over;
        var tag = el.tag;
        centerX += tag.dx * delta;
        centerY += tag.dy * delta;
        if (centerY - radiusY > height) {
            centerY = -radiusY;
        }
        if (centerX - radiusX > width) {
            over = centerX - radiusX - width;
            centerX = over;
            centerY = -radiusY;
        }
        else if (centerX + radiusX < 0) {
            centerX = width - over;
            centerY = -radiusY;
        }
        el.setCenter(elise.point(centerX, centerY));
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
