var modelWidth = 640;
var modelHeight = 480;
var bannerWidth = 640;
var bannerHeight = 480;
var sourceWidth = 640;
var sourceHeight = 480;
var i;

var model = elise.model(modelWidth, modelHeight);
model.setBasePath('./assets/resources');

var transitions = [
    'none',
    'fade',
    'pushLeft',
    'pushRight',
    'pushUp',
    'pushDown',
    'wipeLeft',
    'wipeRight',
    'wipeUp',
    'wipeDown',
    'slideLeft',
    'slideRight',
    'slideUp',
    'slideDown',
    'slideLeftDown',
    'slideRightDown',
    'slideLeftUp',
    'slideRightUp',
    'revealLeft',
    'revealRight',
    'revealUp',
    'revealDown',
    'revealLeftDown',
    'revealRightDown',
    'revealLeftUp',
    'revealRightUp',
    'ellipticalIn',
    'ellipticalOut',
    'rectangularIn',
    'rectangularOut',
    'grid',
    'expandHorizontal',
    'expandVertical',
    'zoomIn',
    'zoomOut',
    'zoomRotateIn',
    'zoomRotateOut',
    'radar'
];

// Add resources
for (i = 0; i < transitions.length; i++) {
    elise.bitmapResource(transitions[i], '/transitions/640x480/' + transitions[i] + '.jpg').addTo(model);
}

// Create Sprite element
var left = (modelWidth - bannerWidth) / 2;
var top = (modelHeight - bannerHeight) / 2;
var sprite = elise.sprite(left, top, bannerWidth, bannerHeight);
sprite.timer = elise.TransitionRenderer.SPRITE_TRANSITION;

// Make sprite frames
var duration = 0.5;
var transitionDuration = 1.0;

// Add frames
for (i = 0; i < transitions.length; i++) {
    sprite.frames.push(
        elise.spriteFrame(transitions[i], 0, 0, sourceWidth, sourceHeight, duration, transitions[i], transitionDuration)
    );
}

// Add sprite element to model
model.add(sprite);

// Add a rectangle frame
model.add(elise.rectangle(left, top, bannerWidth, bannerHeight).setStroke('Black,2'));

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler(
        elise.TransitionRenderer.SPRITE_TRANSITION,
        elise.TransitionRenderer.spriteTransitionHandler
    );
    controller.startTimer();
});

return model;
