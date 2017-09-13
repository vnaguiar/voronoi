// variables and events -------------------------------------------------------

var params = {
  points: 42,
  type: "classic"
};

var gui = new dat.GUI(),
    experimentControl = gui.add(params, "type",
      ["classic", "good trip", "four colors", "drag and drop"]),
    pointsControl = gui.add(params, "points").min(1).max(256).step(1);

var svg = d3.select("svg")
             .attr("width", window.innerWidth)
             .attr("height", window.innerHeight),
    width = +svg.attr("width"),
    height = +svg.attr("height");

var voronoi = d3.voronoi()
    .extent([[-1, -1], [width + 1, height + 1]]);

var points = d3.range(params.points)
    .map(function(d) { return [Math.random(), Math.random()]; });

var sites = points
    .map(function(d) { return [d[0] * width, d[1] * height]; });

var polygon = svg.append("g")
		.attr("class", "polygons")
	.selectAll("path")
  .data(voronoi.polygons(sites))
  .enter().append("path")
		.call(redrawPolygon);

var link = svg.append("g")
    .attr("class", "links")
  .selectAll("line")
  .data(voronoi.links(sites))
  .enter().append("line")
    .call(redrawLink);

var site = svg.append("g")
    .attr("class", "sites")
  .selectAll("circle")
  .data(sites)
  .enter().append("circle")
    .attr("r", 2.5)
    .call(redrawSite);

// events ----------------------------------------------------------------------

window.onresize = resized;
svg.on("touchmove mousemove", moved);

function moved() {
  sites[0] = d3.mouse(this);
  redraw();
}

function resized() {
  d3.select("svg")
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight);
  width = +svg.attr("width");
  height = +svg.attr("height");

  voronoi = d3.voronoi()
    .extent([[-1, -1], [width + 1, height + 1]]);

  sites = points
    .map(function(d) { return [d[0] * width, d[1] * height]; });

  redraw();
}

pointsControl.onChange(function(){
  svg.selectAll("*").remove();

  points = d3.range(params.points)
    .map(function(d) { return [Math.random(), Math.random()]; });

  sites = points
    .map(function(d) { return [d[0] * width, d[1] * height]; });

  polygon = svg.append("g")
    .attr("class", "polygons")
    .selectAll("path")
    .data(voronoi.polygons(sites))
    .enter().append("path")
    .call(redrawPolygon);

  link = svg.append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(voronoi.links(sites))
    .enter().append("line")
    .call(redrawLink);

  site = svg.append("g")
    .attr("class", "sites")
    .selectAll("circle")
    .data(sites)
    .enter().append("circle")
    .attr("r", 2.5)
    .call(redrawSite);

  redraw();
});

experimentControl.onFinishChange(function(){})

// essential functions ---------------------------------------------------------

function redraw() {
  var diagram = voronoi(sites);
  polygon = polygon.data(diagram.polygons()).call(redrawPolygon);
  link = link.data(diagram.links()), link.exit().remove();
  link = link.enter().append("line").merge(link).call(redrawLink);
  site = site.data(sites).call(redrawSite);
}

function redrawPolygon(polygon) {
  polygon
    .attr("d", function(d) { return d ? "M" + d.join("L") + "Z" : null; });
}

function redrawLink(link) {
  link
      .attr("x1", function(d) { return d.source[0]; })
      .attr("y1", function(d) { return d.source[1]; })
      .attr("x2", function(d) { return d.target[0]; })
      .attr("y2", function(d) { return d.target[1]; });
}

function redrawSite(site) {
  site
      .attr("cx", function(d) { return d[0]; })
      .attr("cy", function(d) { return d[1]; });
}
