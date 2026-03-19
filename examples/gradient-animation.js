var width = 640;
var height = 640;
var model = elise.model(width, height);
model.setFill('Black');

var ellipse = elise.rectangle(0, 0, width, height);
var frequency = 1;
var center = Math.floor(width / 2) + ',' + Math.floor(height / 2);
var grad = elise.radialGradientFill(center, center, width / 1.414, height / 1.414);
var numstops = 48;
var inc = 1 / numstops;
var offset = 0;
for (var i = 0; i < numstops; i++) {
    var stop = elise.gradientFillStop('#000000', offset);
    offset += inc;
    grad.stops.push(stop);
}
ellipse.setFill(grad);
ellipse.timer = 'tick';
ellipse.addTo(model);

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function(controller, element, command, trigger, parameters) {
        var phase = controller.timerPhase(frequency);
        var inc = Math.PI / 8;
        for (var i = 0; i < numstops; i++) {
            var c = Math.floor(128 * Math.sin(phase - inc * i)) + 128;
            c = Math.max(0, c);
            c = Math.min(255, c);
            grad.stops[i].color = elise.color(255, c, c, c).toHexString();
        }
        controller.invalidate();
    });
    controller.startTimer();
});

return model;
