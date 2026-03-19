var width = 800;
var height = 600;
var model = elise.model(width, height);
var ellipses = [];
model.setFill('Black');

// Create random ellipses
for (var i = 0; i < 50; i++) {
    var radiusX = Math.floor(Math.random() * 5 + 1);
    var radiusY = radiusX;
    var centerX = Math.floor(Math.random() * (width - radiusX * 2) + radiusX);
    var centerY = Math.floor(Math.random() * (height - radiusY * 2) + radiusY);
    var dx = (Math.random() - 0.5) * 320;
    var dy = (Math.random() - 0.5) * 320;
    var e = elise.ellipse(centerX, centerY, radiusX, radiusY);
    e.tag = {
        index: i,
        dx: dx,
        dy: dy,
        lines: []
    };
    e.fill = '#ffffff';
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
        if (centerX + radiusX > width) {
            over = centerX + radiusX - width;
            centerX = width - radiusX - over;
            tag.dx *= -1;
        }
        else if (centerX - radiusX < 0) {
            over = centerX - radiusX;
            centerX = radiusX - over;
            tag.dx *= -1;
        }

        centerY += tag.dy * delta;
        if (centerY + radiusY > height) {
            over = centerY + radiusY - height;
            centerY = height - radiusY - over;
            tag.dy *= -1;
        }
        else if (centerY - radiusY < 0) {
            over = centerY - radiusY;
            centerY = radiusY - over;
            tag.dy *= -1;
        }
        el.setCenter(elise.point(centerX, centerY));

        // Remove previous connector lines
        for (var i = 0; i < tag.lines.length; i++) {
            model.remove(tag.lines[i]);
        }
        tag.lines = [];

        // Add lines to other ellipses
        for (var o = 0; o < ellipses.length; o++) {
            var elo = ellipses[o];
            if (elo !== el) {
                var c1 = el.getCenter();
                var c2 = elo.getCenter();
                var dx = c1.x - c2.x;
                var dy = c1.y - c2.y;
                var d = Math.floor(Math.sqrt(dx * dx + dy * dy));
                if (d < 128) {
                    var line = elise.line(el.getCenter().x, el.getCenter().y, elo.getCenter().x, elo.getCenter().y);
                    var lc = elise.color(255 - d * 2, 255, 255, 255);
                    line.setStroke(lc.toHexString());
                    line.addTo(model);
                    tag.lines.push(line);
                }

                // Detect collisions
                if (d < el.radiusX || d < elo.radiusX) {
                    var angle1 = Math.atan2(tag.dy, tag.dx);
                    var v1 = (Math.random() - 0.5) * 320 + 10;
                    var angle2 = Math.atan2(elo.tag.dy, elo.tag.dx);
                    var v2 = (Math.random() - 0.5) * 320 + 10;

                    var ai1 = (angle1 + angle2) / 2;
                    var ai2 = ai1 + Math.PI;

                    tag.dx = Math.cos(ai1) * v1;
                    tag.dy = Math.sin(ai1) * v2;
                    elo.tag.dx = Math.cos(ai2) * v2;
                    elo.tag.dy = Math.sin(ai2) * v2;
                }
                else if (d < el.radiusX + elo.radiusX) {
                    var angle1 = Math.atan2(tag.dy, tag.dx);
                    var v1 = Math.sqrt(tag.dx * tag.dx + tag.dy * tag.dy);
                    var angle2 = Math.atan2(elo.tag.dy, elo.tag.dx);
                    var v2 = Math.sqrt(elo.tag.dx * elo.tag.dx + elo.tag.dy * elo.tag.dy);

                    var ai1 = (angle1 + angle2) / 2;
                    var ai2 = ai1 + Math.PI;

                    tag.dx = Math.cos(ai1) * v1;
                    tag.dy = Math.sin(ai1) * v2;
                    elo.tag.dx = Math.cos(ai2) * v2;
                    elo.tag.dy = Math.sin(ai2) * v2;
                }
            }
        }

        controller.invalidate();
    });
    controller.startTimer();
});

return model;
