var model = elise.model(640, 640);
model.add(elise.rectangle(0, 0, 640, 640).setFill('White'));
model.setBasePath('./assets/resources/models');

function addThumb(name, x, y, width, height) {
    elise.modelResource(name, '/' + name + '/').addTo(model);
    model.add(elise.innerModel(name, x, y, width, height));
    model.add(elise.rectangle(x, y, width, height).setStroke('Black'));
}

var models = [
    'ellipse-element',
    'image-element-opacity',
    'image-fill',
    'image-fill-opacity-scaling',
    'line-element',
    'linear-gradient-fill',
    'matrix-transform',
    'model-element',
    'model-element-embedded',
    'model-element-opacity',
    'model-fill',
    'path-element',
    'polygon-element',
    'polyline-element',
    'radial-gradient-fill',
    'rectangle-element',
    'rotate-transform',
    'scale-transform',
    'skew-transform',
    'translate-transform',
    'solid-fill',
    'stroked-and-filled-model',
    'text-element',
    'text-element-container-localized',
    'text-element-external-localized'
];

var x = 0,
    y = 0,
    i;
for (i = 0; i < models.length; i++) {
    addThumb(models[i], x, y, 128, 128);
    x += 128;
    if (x >= 640) {
        x = 0;
        y += 128;
    }
}

return model;
