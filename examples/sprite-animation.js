var width = 500,
    height = 160;
var model = elise.model(width, height);
model.setBasePath('./assets/resources');
model.fill = 'DarkGreen';

elise.bitmapResource('santa', '/sprites/santa.png').addTo(model);

var sx = 4;
var sy = 4;
var frameCount = 16;
var imageWidth = 600;
var imageHeight = 600;
var spriteWidth = imageWidth / sx;
var spriteHeight = imageHeight / sy;

var sprite = elise.sprite(-spriteWidth, 0, spriteWidth, spriteHeight).addTo(model);
sprite.timer = 'tick';
sprite.createSheetFrames('santa', imageWidth, imageHeight, spriteWidth, spriteHeight, frameCount, 0.05, null, 0);

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function(controller, element, command, trigger, parameters) {
        // Move sprite across screen
        var phase = controller.timerPhase(0.1);
        var x = phase / (Math.PI * 2) * (500 + spriteWidth) - spriteWidth;
        element.setLocation(elise.point(x, 0));
        elise.TransitionRenderer.spriteTransitionHandler(controller, element, command, trigger, parameters);
        controller.invalidate();
    });

    controller.startTimer();
});

return model;
