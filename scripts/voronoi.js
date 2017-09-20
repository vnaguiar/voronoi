// global variables, event listeners and initial state.........................

var gui = new dat.GUI(),
		typeGUI, pointsGUI, params = {
			points: 6,
			type: "diagram",
			shiftBorder: borderShifted,
			toggleMovement: sitesShifted,
			shiftColor: function() {palleteShifted(true);}
		};

var line = d3.line()
			.x(function(d) { return d[0]; })
			.y(function(d) { return d[1]; }),
		svg = d3.select("svg"), start = Date.now(), voronoi,
		points = [], sites, polygon, link, site, movementTimer, border = 0, 
		defaultTheme, interpolateTypes = 
			[d3.curveLinear, d3.curveBasisClosed, d3.curveCardinalClosed];

typeGUI = gui.add(params, "type", ["diagram", "drag and drop"]);
gui.add(params, "shiftColor");
gui.add(params, "shiftBorder");
movementGUI = gui.add(params, "toggleMovement");
pointsGUI = gui.add(params, "points").min(2).max(42).step(1);

window.onresize = resized;
typeGUI.onFinishChange(typeShifted);
pointsGUI.onFinishChange(function() {newDiagram(false);});

typeShifted(params.type);
borderShifted();

// type function...............................................................
function typeShifted(type){
	var circles = svg.selectAll("circle");

	circles.call(d3.drag()
					.on("start", null)
					.on("drag", null)
					.on("end", null))
					.transition().attr("r", 3);
	svg.on("touchmove mousemove", null);

	if(type == "trip"){
		movementGUI.remove();
		movementGUI  =  null;
		pointsGUI.remove();
		pointsGUI = null;
		newGoodTrip();
	}
	else {
		if(svg.selectAll("*").node() == null)
			newDiagram(true);

		if(movementGUI == null){
			newDiagram(true);
			movementGUI = gui.add(params, "toggleMovement");
			pointsGUI = gui.add(params, "points").min(2).max(42).step(1);
			pointsGUI.onFinishChange(function() {newDiagram(false);});
		}

		if(type == "diagram")
			svg.on("touchmove mousemove", moved);
		else {
			circles.call(d3.drag()
						.on("start", dragstarted)
						.on("drag", dragged)
						.on("end", dragended))
						.transition().attr("r", 10);
		}
	}
}

// resize function.............................................................
function resized() {
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
function moved() {
	sites[0] = d3.mouse(this);
	redraw();
}

// drag and drop functions.....................................................
function dragstarted() {
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

function dragended() {
	d3.select(this).classed("active", false);
}

// palette functions...........................................................
function palleteShifted(hasShifted){
	var theme, color;

	if(hasShifted || defaultTheme == undefined){
		theme = Math.floor(Math.random() * palette.length);
		defaultTheme = theme;
	}
	else
		theme = defaultTheme;
	
	d3.selectAll("path").each(function() {
		color = Math.floor(Math.random() * 5);
		d3.select(this).transition().attr("fill", palette[theme][color]);
	});
}

// border functions............................................................
function borderShifted() {
	border = border < 2 ? border + 1 : 0;
	line.curve(interpolateTypes[border]);

	redraw();
}

// movement functions..........................................................
function sitesShifted() {
	if(movementTimer){
		movementTimer.stop();
		movementTimer = null;
	}
	else {
		movementTimer = d3.timer(function(elapsed){
			var circles = svg.selectAll("circle");
			sites = [];

			circles.each(function() {
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
function newDiagram(hasNewColor){
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
	.data(line(voronoi.polygons(sites)))
	.enter().append("path");

	link = svg.append("g")
		.attr("class", "links")
	.selectAll("line")
	.data(voronoi.links(sites))
	.enter().append("line");

	site = svg.append("g")
		.attr("class", "sites")
	.selectAll("circle")
	.data(sites)
	.enter().append("circle")
		.attr("r", 3)
		.each(function() {
			d3.select(this)
				.attr("speedx", 6*Math.random())
				.attr("speedy", 6*Math.random());
		});

	svg.select("circle")
		.attr("id", "diagramSite");
	svg.select("path")
		.attr("id", "diagramPolygon");

	palleteShifted(hasNewColor);
	redraw();
}

function newGoodTrip(){
	var width = window.innerWidth,
			height = window.innerHeight;

	svg.attr("width", width)
		 .attr("height", height);

	voronoi = d3.voronoi()
		.extent([[-1, -1], [width + 1, height + 1]]);

	svg.selectAll("*").remove();

	svg.append("g")
		.attr("class", "polygons");
	svg.append("g")
		.attr("class", "links");
	svg.append("g")
		.attr("class", "sites");

	ellipse(0.5, 0.5, 0.2, 0.4, 8, 0.02);

	palleteShifted(true);
	d3.timer(function(){

		redraw();
	});

	// ellipse creation....................
	function ellipse(cx, cy, a, b, n, δθ){
		var newPoints = [];

		d3.range(1e-6, 2 * Math.PI, 2 * Math.PI / n).map(function(θ, i) {
			var point = [cx + Math.cos(θ) * a, cy + Math.sin(θ) * b];
			newPoints.push(point);

			d3.timer(function(elapsed){
				var angle = θ + δθ * elapsed / 60;
				point[0] = cx + Math.cos(angle) * a;
				point[1] = cy + Math.sin(angle) * b;
			});
		});

		sites = newPoints
		 	.map(function(d) {return [d[0] * width, d[1] * height];});

		polygon = svg.select(".polygons").selectAll("path")
			.data(line(voronoi.polygons(sites)))
			.enter().append("path");

		link = svg.select(".links").selectAll("line")
			.data(voronoi.links(sites))
			.enter().append("line");

		site = svg.select(".sites").selectAll("circle")
			.data(sites)
			.enter().append("circle")
				.attr("r", 3);


	}
}

function redraw() {
	var diagram = voronoi(sites);
	polygon = polygon.data(diagram.polygons()).call(redrawPolygon);
	link = link.data(diagram.links()), link.exit().remove();
	link = link.enter().append("line").merge(link).call(redrawLink);
	site = site.data(sites).call(redrawSite);
}

function redrawPolygon(polygon){
	polygon
		.attr("d", function(points) {
			var p0, p1 = points[0], resample = [];

			for(i = 1; i < points.length; i++){
				p0 = p1;
				p1 = points[i];
				resample.push(p0,
					[(p0[0] + p1[0])/2, (p0[1] + p1[1])/2]);
			}
			resample.push(p1);

			return line(resample);
		});
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
