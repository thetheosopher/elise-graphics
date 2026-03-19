var model = elise.model(400, 400);

model.setBasePath('./assets/resources');
elise.bitmapResource('spiral', '/images/animated-spiral.gif').addTo(model);

var imageElement = elise.image('spiral', 0, 0, 400, 400).addTo(model);

imageElement.timer = 'tick';
imageElement.frequency = -2;

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function(controller, element, command, trigger, parameters) {
        // Get timer phase (Radians) and use for rotate transform
        var phase = controller.timerPhase(element.frequency);
        element.transform = 'rotate(' + -phase * 57.2957795 + '(200, 200))';
        controller.invalidate();
    });

    controller.startTimer();
});

return model;
