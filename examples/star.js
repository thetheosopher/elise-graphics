var model = elise.model(320, 320);
model.setFill('Blue');

var p = elise.polygon();
var numpoints = 5;
var angle = Math.PI * 4 / numpoints;
var radius = 120;
var xc = 160;
var yc = 160;
for (var i = 0; i < numpoints + 1; i++) {
    var x = xc + radius * Math.cos(i * angle - Math.PI / 2);
    var y = yc + radius * Math.sin(i * angle - Math.PI / 2);
    p.addPoint(elise.point(x, y));
}
p.stroke = 'Yellow,3';
p.fill = 'Firebrick';
p.setWinding(elise.WindingMode.EvenOdd);
p.addTo(model);
return model;
