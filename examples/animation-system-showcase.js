var width = 1040;
var height = 680;
var model = elise.model(width, height);
model.setFill('#f4ecdf');

function addElement(element) {
    model.add(element);
    return element;
}

function makeText(text, x, y, width, height, size, fill, alignment, style) {
    var element = elise.text(text, x, y, width, height);
    element.setTypesize(size || 18);
    element.setFill(fill || '#ffffff');
    element.setTypeface('Palatino Linotype, Book Antiqua, Georgia, serif');
    if (alignment) {
        element.setAlignment(alignment);
    }
    if (style) {
        element.setTypestyle(style);
    }
    return addElement(element);
}

function makePanel(x, y, width, height, title, details) {
    var background = elise.rectangle(x, y, width, height)
        .setFill('#fff8ef')
        .setStroke('#d8c7b4');
    addElement(background);

    var titleText = makeText(title, x + 16, y + 14, width - 32, 24, 16, '#243445', 'left,top', 'bold');
    var detailsText = makeText(details, x + 16, y + height - 34, width - 32, 18, 12, '#7c7468', 'left,top');
    detailsText.opacity = 0.82;

    return {
        background: background,
        title: titleText,
        details: detailsText
    };
}

var warmGlow = addElement(elise.ellipse(170, 88, 220, 92).setFill('#ecd9bc'));
warmGlow.opacity = 0.42;

var coolGlow = addElement(elise.ellipse(900, 596, 250, 132).setFill('#d6e7dc'));
coolGlow.opacity = 0.48;

var title = makeText('Animation System Showcase', 48, 26, 520, 38, 28, '#1f3141', 'left,top', 'bold');
var subtitle = makeText(
    'property tweens with easing, callbacks, replay, and redraws',
    50,
    68,
    620,
    24,
    15,
    '#4f7a72',
    'left,top'
);
subtitle.opacity = 0.85;

var status = makeText('Waiting for controller...', 338, 108, 360, 28, 18, '#4f7a72', 'center,top', 'bold');
status.opacity = 0.68;

var heroPanel = makePanel(44, 146, 350, 220, 'Bounds + Color', 'size, color, rotation');
var ellipsePanel = makePanel(412, 146, 278, 220, 'Center + Radius', 'center, radii, opacity');
var patternPanel = makePanel(708, 146, 288, 220, 'Fill Offset', 'pattern scale + pan');
var linePanel = makePanel(44, 388, 476, 212, 'Line Endpoints', 'endpoints + stroke');
var textPanel = makePanel(540, 388, 456, 212, 'Text + Replay', 'callbacks + replay');

linePanel.details.setLocation(elise.point(334, 575));
linePanel.details.setAlignment('right,top');
textPanel.details.setLocation(elise.point(824, 575));
textPanel.details.setAlignment('right,top');

var hero = addElement(elise.rectangle(84, 198, 152, 92).setFill('#6f8fb8').setStroke('#8caad0'));
hero.opacity = 0.9;

var heroShadow = addElement(elise.rectangle(96, 210, 152, 92).setFill('#c9b59c'));
heroShadow.opacity = 0.26;

var heroCaption = makeText('Card', 100, 222, 120, 40, 26, '#fffdf8', 'center,middle', 'bold');

var orb = addElement(elise.ellipse(552, 250, 52, 48).setFill('#77bfb9').setStroke('#f6fffd'));
orb.opacity = 0.8;

var orbTrail = addElement(elise.ellipse(520, 252, 24, 22).setFill('#b8d5cb').setStroke('#8bb3a7'));
orbTrail.opacity = 0.42;

var line = addElement(elise.line(88, 552, 488, 438).setStroke('#5f857a'));
line.opacity = 0.75;

var lineAnchor1 = addElement(elise.ellipse(88, 552, 6, 6).setFill('#5f857a'));
var lineAnchor2 = addElement(elise.ellipse(488, 438, 6, 6).setFill('#d4875d'));

var tileModel = elise.model(72, 72);
tileModel.setFill('#091421');
tileModel.add(elise.rectangle(0, 0, 72, 72).setFill('#efe1cb'));
tileModel.add(elise.rectangle(0, 0, 36, 36).setFill('#d9c1a3'));
tileModel.add(elise.rectangle(36, 36, 36, 36).setFill('#d9c1a3'));
tileModel.add(elise.line(0, 36, 72, 36).setStroke('#b99776'));
tileModel.add(elise.line(36, 0, 36, 72).setStroke('#b99776'));
elise.modelResource('signal-grid', tileModel).addTo(model);

var patternBox = addElement(elise.rectangle(770, 198, 146, 124).setFill('model(signal-grid)').setStroke('#b4865c'));
patternBox.fillScale = 1.05;
patternBox.opacity = 0.78;

var patternLabel = makeText('model(fill)', 756, 322, 172, 22, 16, '#7b5a43', 'center,middle', 'bold');
patternLabel.opacity = 0.82;

var textBlock = makeText('Sequence text\nwithout timers.', 608, 446, 250, 90, 22, '#284454', 'left,top', 'bold');
textBlock.opacity = 0.82;

var detailLine = makeText('Replay cancels and restarts.', 608, 528, 240, 28, 15, '#8a5f4a', 'left,top');
detailLine.opacity = 0.74;

var replayButton = addElement(elise.rectangle(866, 34, 142, 46).setFill('#315f5c').setStroke('#638b82'));
replayButton.opacity = 0.88;
replayButton.setInteractive(true);
replayButton.click = 'replayShowcase';

var replayLabel = makeText('Replay', 866, 34, 142, 46, 18, '#fff8ef', 'center,middle', 'bold');
replayLabel.opacity = 0.94;

var animatedElements = [
    title,
    subtitle,
    status,
    hero,
    heroShadow,
    heroCaption,
    orb,
    orbTrail,
    line,
    lineAnchor1,
    lineAnchor2,
    patternBox,
    patternLabel,
    textBlock,
    detailLine,
    replayButton,
    replayLabel
];

var cycleCount = 0;
var nextCycleTimer = null;

function stopAllAnimations() {
    for (var i = 0; i < animatedElements.length; i++) {
        animatedElements[i].cancelAnimations();
    }
    if (nextCycleTimer !== null) {
        clearTimeout(nextCycleTimer);
        nextCycleTimer = null;
    }
}

function syncLineAnchors() {
    var p1 = line.getP1();
    var p2 = line.getP2();
    if (p1) {
        lineAnchor1.setCenter(p1);
    }
    if (p2) {
        lineAnchor2.setCenter(p2);
    }
}

function resetScene() {
    title.setLocation(elise.point(48, 26));
    title.setTypesize(30);
    title.setFill('#1f3141');
    title.setOpacity(1);

    subtitle.setLocation(elise.point(50, 66));
    subtitle.setFill('#4f7a72');
    subtitle.setOpacity(0.85);

    status.setText('Animating property tweens');
    status.setLocation(elise.point(338, 108));
    status.setTypesize(18);
    status.setFill('#4f7a72');
    status.setOpacity(0.68);

    heroShadow.setLocation(elise.point(96, 210));
    heroShadow.setSize(elise.size(152, 92));
    heroShadow.setOpacity(0.26);

    hero.setLocation(elise.point(84, 198));
    hero.setSize(elise.size(152, 92));
    hero.setFill('#6f8fb8');
    hero.setStroke('#8caad0');
    hero.setOpacity(0.9);
    hero.setRotation(0);

    heroCaption.setText('Card');
    heroCaption.setLocation(elise.point(100, 222));
    heroCaption.setTypesize(26);
    heroCaption.setFill('#fffdf8');
    heroCaption.setOpacity(0.96);

    orb.setCenter(elise.point(552, 250));
    orb.radiusX = 52;
    orb.radiusY = 48;
    orb.setFill('#77bfb9');
    orb.setStroke('#f6fffd');
    orb.setOpacity(0.8);

    orbTrail.setCenter(elise.point(520, 252));
    orbTrail.radiusX = 24;
    orbTrail.radiusY = 22;
    orbTrail.setFill('#b8d5cb');
    orbTrail.setStroke('#8bb3a7');
    orbTrail.setOpacity(0.42);

    line.setP1(elise.point(88, 552));
    line.setP2(elise.point(488, 438));
    line.setStroke('#5f857a');
    line.setOpacity(0.75);
    syncLineAnchors();

    patternBox.setLocation(elise.point(770, 198));
    patternBox.setSize(elise.size(146, 124));
    patternBox.fillScale = 1.05;
    patternBox.fillOffsetX = 0;
    patternBox.fillOffsetY = 0;
    patternBox.setStroke('#b4865c');
    patternBox.setOpacity(0.78);
    patternBox.setRotation(0);

    patternLabel.setLocation(elise.point(756, 322));
    patternLabel.setFill('#7b5a43');
    patternLabel.setOpacity(0.82);

    textBlock.setText('Sequence text\nwithout timers.');
    textBlock.setLocation(elise.point(608, 446));
    textBlock.setTypesize(22);
    textBlock.setFill('#284454');
    textBlock.setOpacity(0.82);

    detailLine.setText('Replay cancels and restarts.');
    detailLine.setLocation(elise.point(608, 528));
    detailLine.setTypesize(15);
    detailLine.setFill('#8a5f4a');
    detailLine.setOpacity(0.74);

    replayButton.setFill('#315f5c');
    replayButton.setStroke('#638b82');
    replayButton.setOpacity(0.88);
    replayButton.setRotation(0);
    replayLabel.setFill('#fff8ef');
    replayLabel.setOpacity(0.94);
    replayLabel.setTypesize(18);
}

function scheduleNextCycle(delay) {
    if (nextCycleTimer !== null) {
        clearTimeout(nextCycleTimer);
    }
    nextCycleTimer = setTimeout(function() {
        nextCycleTimer = null;
        runShowcase();
    }, delay);
}

function animateReplayPulse(onComplete) {
    replayButton.animate(
        { opacity: 1, rotation: -2 },
        {
            duration: 180,
            easing: 'easeOutQuad',
            onComplete: function() {
                replayButton.animate({ opacity: 0.88, rotation: 0 }, { duration: 260, easing: 'easeInOutQuad' });
            }
        }
    );
    replayLabel.animate(
        { opacity: 1, fill: '#fffdf8', typesize: 19 },
        {
            duration: 180,
            easing: 'easeOutQuad',
            onComplete: function() {
                replayLabel.animate({ opacity: 0.94, fill: '#fff8ef', typesize: 18 }, { duration: 260, easing: 'easeInOutQuad' });
                if (onComplete) {
                    onComplete();
                }
            }
        }
    );
}

function runShowcase(fromReplay) {
    cycleCount += 1;
    stopAllAnimations();
    resetScene();

    title.animate({ y: 22, fill: '#173244' }, { duration: 320, easing: 'easeOutQuad' });
    subtitle.animate({ opacity: 1, x: 56 }, { duration: 420, easing: 'easeOutCubic' });
    status.animate({ opacity: 0.92, typesize: 22, x: 330, fill: '#315f5c' }, { duration: 300, easing: 'easeOutQuad' });

    if (fromReplay) {
        animateReplayPulse();
    }

    heroShadow.animate(
        { x: 114, y: 194, width: 188, height: 110, opacity: 0.18 },
        {
            duration: 900,
            easing: 'easeInOutCubic',
            onComplete: function() {
                heroShadow.animate({ x: 96, y: 210, width: 152, height: 92, opacity: 0.26 }, { duration: 700, easing: 'easeInOutQuart' });
            }
        }
    );

    hero.animate(
        { x: 106, y: 184, width: 188, height: 110, rotation: 6, fill: '#d4875d', stroke: '#f2ddcd', opacity: 0.96 },
        {
            duration: 900,
            easing: 'easeInOutCubic',
            onComplete: function() {
                hero.animate(
                    { x: 84, y: 198, width: 152, height: 92, rotation: 0, fill: '#6f8fb8', stroke: '#8caad0', opacity: 0.9 },
                    { duration: 700, easing: 'easeInOutQuart' }
                );
            }
        }
    );

    heroCaption.animate(
        { x: 122, y: 222, typesize: 30, fill: '#fff7ee' },
        {
            duration: 840,
            easing: 'easeOutCubic',
            onComplete: function() {
                heroCaption.animate({ x: 100, y: 222, typesize: 26, fill: '#fffdf8' }, { duration: 680, easing: 'easeInOutCubic' });
            }
        }
    );

    orbTrail.animate(
        { centerX: 548, centerY: 252, radiusX: 38, radiusY: 16, opacity: 0.28 },
        {
            duration: 760,
            delay: 120,
            easing: 'easeOutQuad',
            onComplete: function() {
                orbTrail.animate({ centerX: 520, centerY: 252, radiusX: 24, radiusY: 22, opacity: 0.42 }, { duration: 620, easing: 'easeInOutQuart' });
            }
        }
    );

    orb.animate(
        { centerX: 584, centerY: 244, radiusX: 82, radiusY: 56, fill: '#a5d8ce', stroke: '#fffdf8', opacity: 0.96 },
        {
            duration: 860,
            delay: 180,
            easing: 'easeOutCubic',
            onComplete: function() {
                orb.animate(
                    { centerX: 552, centerY: 250, radiusX: 52, radiusY: 48, fill: '#77bfb9', stroke: '#f6fffd', opacity: 0.8 },
                    { duration: 700, easing: 'easeInOutQuart' }
                );
            }
        }
    );

    line.animate(
        { x1: 92, y1: 540, x2: 490, y2: 422, stroke: '#d4875d', opacity: 0.96 },
        {
            duration: 880,
            delay: 240,
            easing: 'easeInOutCubic',
            onUpdate: syncLineAnchors,
            onComplete: function() {
                line.animate(
                    { x1: 88, y1: 552, x2: 488, y2: 438, stroke: '#5f857a', opacity: 0.75 },
                    {
                        duration: 680,
                        easing: 'easeInOutQuart',
                        onUpdate: syncLineAnchors
                    }
                );
            }
        }
    );

    patternBox.animate(
        { x: 754, y: 188, width: 174, height: 138, fillScale: 0.84, fillOffsetX: 54, fillOffsetY: 36, rotation: -3, opacity: 0.94 },
        {
            duration: 900,
            delay: 360,
            easing: 'easeInOutCubic',
            onComplete: function() {
                patternBox.animate(
                    { x: 770, y: 198, width: 146, height: 124, fillScale: 1.05, fillOffsetX: 0, fillOffsetY: 0, rotation: 0, opacity: 0.78 },
                    { duration: 700, easing: 'easeInOutQuart' }
                );
            }
        }
    );

    patternLabel.animate(
        { y: 326, opacity: 1, fill: '#6b4d38' },
        {
            duration: 520,
            delay: 460,
            easing: 'easeOutQuad',
            onComplete: function() {
                patternLabel.animate({ y: 322, opacity: 0.82, fill: '#7b5a43' }, { duration: 620, easing: 'easeInOutQuad' });
            }
        }
    );

    textBlock.animate(
        { x: 594, y: 438, typesize: 28, fill: '#315f5c', opacity: 1 },
        {
            duration: 720,
            delay: 620,
            easing: 'easeOutCubic',
            onComplete: function() {
                textBlock.animate(
                    { x: 608, y: 446, typesize: 22, fill: '#284454', opacity: 0.82 },
                    { duration: 640, easing: 'easeInOutCubic' }
                );
            }
        }
    );

    detailLine.animate(
        { x: 620, y: 536, typesize: 16, fill: '#aa785e', opacity: 0.96 },
        {
            duration: 620,
            delay: 820,
            easing: 'easeOutQuad',
            onComplete: function() {
                detailLine.animate(
                    { x: 608, y: 528, typesize: 15, fill: '#8a5f4a', opacity: 0.74 },
                    {
                        duration: 620,
                        easing: 'easeInOutQuad',
                        onComplete: function() {
                            status.setText('Cycle ' + cycleCount + ' complete. Click Replay.');
                            status.animate({ opacity: 0.72, typesize: 18, x: 338, fill: '#53786e' }, { duration: 620, easing: 'easeInOutQuad' });
                            animateReplayPulse(function() {
                                scheduleNextCycle(2000);
                            });
                        }
                    }
                );
            }
        }
    );
}

model.controllerAttached.add(function(model, controller) {
    var commandHandler = new elise.ElementCommandHandler();
    commandHandler.attachController(controller);
    commandHandler.addHandler('replayShowcase', function(controller, element) {
        runShowcase(true);
    });

    runShowcase();
});

return model;