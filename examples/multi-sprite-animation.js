var modelWidth = 600,
    modelHeight = 450;
var model = elise.model(modelWidth, modelHeight);
model.setBasePath('./assets/resources');
var sx = 4;
var sy = 4;
var frameCount = 16;
var imageWidth = 256;
var imageHeight = 256;
var spriteWidth = imageWidth / sx;
var spriteHeight = imageHeight / sy;

elise.bitmapResource('sprite', '/sprites/explosion.png').addTo(model);

// Create a lot of sprites
var i, factor, width, height, x, y, s, o, sprite;
for (i = 0; i < 250; i++) {
    factor = Math.random() + 0.5;
    width = spriteWidth * factor;
    height = spriteHeight * factor;
    x = Math.floor(Math.random() * (modelWidth - width));
    y = Math.floor(Math.random() * (modelHeight - height));
    s = Math.random() / 10.0 + 0.02;
    o = Math.random() * 0.7 + 0.3;
    sprite = elise.sprite(x, y, width, height).addTo(model);
    sprite.timer = 'tick';

    // Make sprite frames
    sprite.createSheetFrames('sprite', imageWidth, imageHeight, spriteWidth, spriteHeight, frameCount, s);
    sprite.frames.forEach(function(f) {
        f.opacity = o;
    });
}

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('tick', function(controller, element, command, trigger, parameters) {
        // Chain to sprite handler to increment sprite frame
        elise.TransitionRenderer.spriteTransitionHandler(controller, element, command, trigger, parameters);
    });

    controller.startTimer();
});

return model;
