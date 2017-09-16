// global variables, event listeners and initial state.........................

var gui = new dat.GUI(), typeGUI, pointsGUI;
var params = {
	points: 6,
	type: "diagram",
	borders: smoothBorders,
	toggleMovement: moveSites,
	shiftColor: function(){palleteChanged(true);}
};

var svg = d3.select("svg"), voronoi, points, 
		sites, polygon, link, site, timer, defaultTheme;

typeGUI = gui.add(params, "type", ["diagram", "drag and drop"]);
pointsGUI = gui.add(params, "points").min(2).max(42).step(1);
gui.add(params, "shiftColor");
gui.add(params, "toggleMovement");

window.onresize = resized;
typeGUI.onFinishChange(typeChanged);
pointsGUI.onFinishChange(function(){newVoronoi(false);});

newVoronoi(true);

// type function...............................................................
function typeChanged(type){
  var circles = svg.selectAll("circle");

	if(type == "diagram"){
		circles.call(d3.drag()
          .on("start", null)
          .on("drag", null)
          .on("end", null))
          .on("click", clicked)
          .transition().attr("r", 3);
		svg.on("touchmove mousemove", moved);
  }
  else {
  	svg.on("touchmove mousemove", null);
  	circles.call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
          .transition().attr("r", 10);
  }
}

// resize function.............................................................
function resized(){
  var width = window.innerWidth,
      height = window.innerHeight;

  svg
    .attr("width", width)
    .attr("height", height);

  voronoi = d3.voronoi()
    .extent([[-1, -1], [width + 1, height + 1]]);

  sites = points
    .map(function(d) { return [d[0] * width, d[1] * height]; });

  redraw();
}

// diagram function............................................................
function moved(){
  sites[0] = d3.mouse(this);
  redraw();
}

function clicked(){
  souris = d3.mouse(this);
  sites.push(souris);

  svg.select(".sites")
      .append("circle")
      .attr("r", 3)
      .attr("cx", souris[0])
      .attr("cy", souris[1])
      .attr("speedx", 6*Math.random())
      .attr("speedy", 6*Math.random());

  redraw();
}

// drag and drop functions.....................................................
function dragstarted(){
	d3.select(this).classed("active", true);
}

function dragged(d){
  var temp, next;

  d3.select(this)
    .attr("cx", d.x = d3.event.x)
    .attr("cy", d.y = d3.event.y);

  sites = [];
  temp = svg.selectAll("circle").data();
  for(var i = 0; i < temp.length; i++){
    next = temp[i];
    if(temp[i].x != null)
      next[0] = temp[i].x;
    if(temp[i].y != null)
      next[1] = temp[i].y;
    sites.push(temp[i]);
  }

  redraw();
}

function dragended(){
  d3.select(this).classed("active", false);
}

// palette functions...........................................................
function palleteChanged(changeColor){
  var theme, color;

  if(changeColor || defaultTheme == undefined){
    theme = Math.floor(Math.random() * palette.length);
    defaultTheme = theme;
  }
  else
    theme = defaultTheme;
  
  d3.selectAll("path").each(function(){
    color = Math.floor(Math.random() * 5);
    d3.select(this).transition().attr("fill", palette[theme][color]);
  });

  changeColor = false;
}


// border functions............................................................
function smoothBorders(){}

// movement functions..........................................................
function moveSites(){
	if(timer){
    timer.stop();
    timer = null;
  }
	else{
		timer = d3.timer(function(elapsed){
			var circles = svg.selectAll("circle");
			sites = [];

			circles.each(function(){
				var circle = d3.select(this),				
						cx = parseFloat(circle.attr("cx")),
						cy = parseFloat(circle.attr("cy")),
						speedx = parseFloat(circle.attr("speedx")),
						speedy = parseFloat(circle.attr("speedy"));
				
				if(circle.attr("id") != "mouse" || params.type != "diagram"){
					cx = cx + speedx;
					cy = cy + speedy;
					
					if(cx <= 0 || cx >= svg.attr("width"))
						circle.attr("speedx", -1*speedx);

					if(cy <= 0 || cy >= svg.attr("height"))
						circle.attr("speedy", -1*speedy);
				}
				
				sites.push([cx, cy]);
			});

			redraw();
		});
	}
}

// redraw functions............................................................
function newVoronoi(changeColor){
  var width = window.innerWidth,
		  height = window.innerHeight;

  svg.attr("width", width)
     .attr("height", height);

  voronoi = d3.voronoi()
    .extent([[-1, -1], [width + 1, height + 1]]);

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
	    .attr("r", 3)
      .each(function(){
        d3.select(this)
          .attr("speedx", 6*Math.random())
          .attr("speedy", 6*Math.random());
      })
	    .call(redrawSite);

	svg.select("circle")
		.attr("id", "diagramSite");
	svg.select("path")
		.attr("id", "diagramPolygon");
  
	palleteChanged(changeColor);
	typeChanged(params.type);
	redraw();
}

function redraw(){
  var diagram = voronoi(sites);
  polygon = polygon.data(diagram.polygons()).call(redrawPolygon);
  link = link.data(diagram.links()), link.exit().remove();
  link = link.enter().append("line").merge(link).call(redrawLink);
  site = site.data(sites).call(redrawSite);
}

function redrawPolygon(polygon){
  polygon
    .attr("d", function(d) { return d ? "M" + d.join("L") + "Z" : null; });
}

function redrawLink(link){
  link
      .attr("x1", function(d) { return d.source[0]; })
      .attr("y1", function(d) { return d.source[1]; })
      .attr("x2", function(d) { return d.target[0]; })
      .attr("y2", function(d) { return d.target[1]; });
}

function redrawSite(site){
  site
      .attr("cx", function(d) { return d[0]; })
      .attr("cy", function(d) { return d[1]; });
}
