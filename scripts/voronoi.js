// global variables, event listeners and initial state.........................

var gui = new dat.GUI(),
	typeGui, pointsGui, params = {
		points: 4,
		type: "trip",
		shiftBorder: shiftBorder,
		shiftColor: function() {shiftPallete(true);}
	};

var svg = d3.select("svg"), voronoi, points, sites, polygonsDom, 
	linksDom, sitesDom, border = 0, theme = 0, wasTrip = true, timer,

	line = d3.line()
		.x(function(d) { return d[0]; })
		.y(function(d) { return d[1]; }),

	curveTypes = 
		[d3.curveLinear, d3.curveBasisClosed,
		 d3.curveCardinalClosed, d3.curveCatmullRomClosed];

typeGui = gui.add(params, "type", ["trip", "diagram", "drag and drop"]);
typeGui.onFinishChange(shiftType);
gui.add(params, "shiftColor");
gui.add(params, "shiftBorder");
pointsGui = gui.add(params, "points").min(2).max(42).step(1);
pointsGui.onChange(updateDiagram);

shiftType();

// event functions.............................................................

function shiftType(){
	svg.on("touchmove mousemove", null);
	svg.selectAll("circle").call(d3.drag()
			.on("start", null)
			.on("drag", null)
			.on("end", null));

	if(params.type == "trip"){
		pointsGui.remove();

		window.onresize = function(){
			timer.stop();
			newGoodTrip()};

		wasTrip = true;
		newGoodTrip();

		// FOR DEBUG PURPOSES........................................
		svg.on("touchmove mousemove", function(){
			console.log([d3.mouse(this)[0]-svg.attr("width")/2,
						d3.mouse(this)[1]-svg.attr("height")/2,]);});
		// END MANUAL DEBUG..........................................
	}
	else {
		if(wasTrip){
			pointsGui = gui.add(params, "points").min(2).max(42).step(1);
			pointsGui.onChange(updateDiagram);
			window.onresize = updateDiagram;
			wasTrip = false;
			timer.stop();
			newDiagram();
		}

		if(params.type == "diagram"){
			svg.on("touchmove mousemove", moved);
			svg.selectAll("circle").transition().attr("r", 3);
		}
		else if(params.type == "drag and drop"){
			svg.selectAll("circle").call(d3.drag()
						.on("start", dragstarted)
						.on("drag", dragged)
						.on("end", dragended))
						.transition().attr("r", 10);
		}
	}
}

function resize() {
	var diagram,
		width = window.innerWidth,
		height = window.innerHeight;

	svg	.attr("width", width)
		.attr("height", height);
	
	voronoi = d3.voronoi()
		.extent([[-1, -1], [width + 1, height + 1]]);
	
	sites = points
		.map(function(d) {return [d[0] * width, d[1] * height]; });

	redraw();
}

function moved() {
	sites[0] = d3.mouse(this);
	redraw();
}

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

function shiftPallete(hasShifted){
	if(hasShifted)
		theme = Math.round(Math.random() * palette.length);
	
	svg.select(".polygons").selectAll("path").each(function() {
		d3.select(this).transition()
			.attr("fill", palette[theme][Math.round(Math.random()*4)]);
	});
}

function shiftBorder() {
	border = border < 3 ? border + 1 : 0;
	line.curve(curveTypes[border]);
	if(params.type != "trip")
		redraw();
}

// draw functions..............................................................

function newGoodTrip(){
	svg.selectAll("*").remove();

	var width = window.innerWidth,
		height = window.innerHeight,
		lineTrip = d3.line().curve(d3.curveCardinalClosed);

	// initial dimensions
	svg .attr("width", width)
		.attr("height", height);
	voronoi = d3.voronoi()
		.extent([[-1, -1], [width+1, height+1]]);

	// initial structure
	svg.append("g").attr("class", "polygons");
	svg.append("g").attr("class", "curves");
	svg.append("g").attr("class", "sites");	

	// main trip
	randomTrip(3, 2);
	randomTrip(4, 3);

	// initial polygons
	sites = svg.selectAll("circle").data();
	polygonsDom = svg.select(".polygons")
		.selectAll("path")
		.data(voronoi.polygons(sites))
		.enter().append("path")
			.call(redrawPolygon);

	// initial color
	shiftPallete(false);

	// redraw timer
	timer = d3.timer(function(elapsed){
		sites = []
		svg.selectAll("circle").each(function(d, i){
			var p = d3.select(this);
			sites.push([Number(p.attr("cx")), Number(p.attr("cy"))])
		});

		var diagram = voronoi(sites);
		polygonsDom = polygonsDom.data(diagram.polygons()).call(redrawPolygon);
	}, 200);

	// points generator
	function klingemannTrip(){
		var sitesIn, r, angle = 0.707,
			cx = width/2, cy = height/2;

		for(var i = 1; i < 3; i++){
			r = 60 * i;
			sitesIn = [
				[cx, cy-r],
				[cx-r*angle, cy+r*angle],
				[cx+r*angle, cy+r*angle]];
			newCurve(3, sitesIn, 2);
		}
	}

	function randomTrip(pointsIn, pointsOn){
		var sitesIn = [];
		while(sitesIn.length < pointsIn)
			sitesIn.push([Math.random()*width, Math.random()*height]);
		newCurve(pointsIn, sitesIn, pointsOn);
	}

	// curve generator
	function newCurve(pointsIn, sitesIn, pointsOn){
		// create the path for movement
		var path = svg.select(".curves")
			.append("path").data([sitesIn])
		.style("fill", "none")
		.style("stroke", "grey")
		.attr("d", lineTrip);

		// merging old and new sites
		var sitesOn = svg.selectAll("circle").data();
		var oldPoints = sitesOn.length;
		var pathLength = path.node().getTotalLength();
		for(var i = 0; i < pointsOn; i++){
			var d = (i/pointsOn) * pathLength,
				p = path.node().getPointAtLength(d);
			sitesOn.push([p.x, p.y]);
		}

		// creates new curve and movement
		var site = svg.select(".sites")
			.selectAll("circle")
		.data(sitesOn)
		.enter().append("circle")
			.attr("r", 6)
			.style("fill", "grey")
			.style("stroke", "grey")
			.each(function(d, i){
				transition(path, d3.select(this), (i-oldPoints)/pointsOn);
			});
	}

	// transition event
	function transition(path, site, t0) {
		site.transition()
			.duration(10000)
			.ease(d3.easeLinear)
			.attrTween("cx", translateAlong(path.node(), t0, true))
			.attrTween("cy", translateAlong(path.node(), t0, false))
			.on("end", function(){transition(path, site, t0);});
	}

	function translateAlong(path, t0, isX) {
		var l = path.getTotalLength();
		return function(d, i, a) {
			return function(t) {
				t = (t0 + t) < 1 ? (t0 + t) : (t0 + t - 1);
				var p = path.getPointAtLength(t * l);
				return isX ? p.x : p.y;
			};
		};
	}
}

function newDiagram(){
	svg.selectAll("*").remove();

	// sets dimensions of svg
	var width = window.innerWidth,
		height = window.innerHeight;
	svg
		.attr("width", width)
		.attr("height", height);
	voronoi = d3.voronoi()
		.extent([[-1, -1], [width + 1, height + 1]]);

	// creates random initial points
	points = d3.range(params.points)
		.map(function(d) { return [Math.random(), Math.random()]; });
	sites = points
		.map(function(d) { return [d[0] * width, d[1] * height]; });

	// appends the initial structure
	polygonsDom = svg.append("g")
		.attr("class", "polygons")
	.selectAll("path")
	.data(voronoi.polygons(sites))
	.enter().append("path")
	.call(redrawPolygon);
	linksDom = svg.append("g")
		.attr("class", "links")
	.selectAll("line")
	.data(voronoi.links(sites))
	.enter().append("line")
	.call(redrawLink);
	sitesDom = svg.append("g")
		.attr("class", "sites")
	.selectAll("circle")
	.data(sites)
	.enter().append("circle")
		.attr("r", 3)
	.call(redrawSite);

	shiftPallete(false);
}

function updateDiagram(){
	var diagram, width, height;

	// update amount of points
	while(points.length < params.points)
		points.push([Math.random(), Math.random()]);
	while(points.length > params.points)
		points.pop();

	// resize to new window
	width = window.innerWidth;
	height = window.innerHeight;
	svg	.attr("width", width)
		.attr("height", height);
	voronoi = d3.voronoi()
		.extent([[-1, -1], [width + 1, height + 1]]);
	sites = points
		.map(function(d) {return [d[0] * width, d[1] * height]; });
	
	// remove and merge new points
	diagram = voronoi(sites);	
	polygonsDom = svg.select(".polygons")
	.selectAll("path")
		.data(diagram.polygons());
	polygonsDom.exit().remove();
	polygonsDom.enter().append("path")
		.merge(polygonsDom)
		.call(redrawPolygon);
	linksDom = svg.select(".links").selectAll("line")
		.data(diagram.links());
	linksDom.exit().remove();
	linksDom.enter().append("line")
		.merge(linksDom)
		.call(redrawLink);
	sitesDom = svg.select(".sites").selectAll("circle")
		.data(sites);
	sitesDom.exit().remove();
	sitesDom.enter().append("circle")
		.merge(sitesDom)
		.call(redrawSite);

	shiftPallete(false);
	shiftType();
}

function redraw() {
	var diagram = voronoi(sites);
	polygonsDom = polygonsDom.data(diagram.polygons()).call(redrawPolygon);
	linksDom = linksDom.data(diagram.links()), linksDom.exit().remove();
	linksDom = linksDom.enter().append("line").merge(linksDom).call(redrawLink);		
	sitesDom = sitesDom.data(sites).call(redrawSite);
}

function redrawPolygon(polygon){
	polygon.attr("d", function(edges) {
		var p0, p1 = edges[0], resample = [];

		for(i = 1; i < edges.length; i++){
			p0 = p1;
			p1 = edges[i];
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
