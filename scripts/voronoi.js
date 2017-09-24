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

newGoodTrip();

// event functions.............................................................

function shiftType(){
	svg.on("touchmove mousemove", null);
	svg.selectAll("circle").call(d3.drag()
			.on("start", null)
			.on("drag", null)
			.on("end", null));

	if(params.type == "trip"){
		if(pointsGui){
			pointsGui.remove();
			pointsGui = null;
		}

		svg.selectAll("*").remove();
		window.onresize = null;
		wasTrip = true;

		newGoodTrip();
	}
	else {
		if(wasTrip){
			pointsGui = gui.add(params, "points").min(2).max(42).step(1);
			pointsGui.onChange(updateDiagram);
			window.onresize = updateDiagram;
			svg.selectAll("*").remove();
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
	var width = window.innerWidth,
		height = window.innerHeight,
		lineTrip = d3.line().curve(d3.curveCardinalClosed);

	// initial dimensions
	svg .attr("width", width)
		.attr("height", height);
	voronoi = d3.voronoi()
		.extent([[-1, -1], [width + 1, height + 1]]);

	// initial structure
	svg.append("g").attr("class", "polygons");
	svg.append("g").attr("class", "curves");
	svg.append("g").attr("class", "sites");

	// initial curves
	newCurve(3, 2 + Math.floor(Math.random()*12));

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

		// if(elapsed > 200)
		// 	timer.stop();
	}, 200);

	// curve generators and transition
	function newCurve(pointsIn, pointsOn){
		var sitesOn = [], pathLength;

		// should be generalized........................... 
		points = [];
		while(points.length < pointsIn)
			points.push([Math.random(), Math.random()]);
		//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

		sites = points
			.map(function(d) {
				return [d[0] * width, d[1] * height]; });
		
		var path = svg.select(".curves")
			.append("path").data([sites])
		.style("fill", "none")
		.style("stroke", "grey")
		.attr("d", lineTrip);

		pathLength = path.node().getTotalLength();
		while(sitesOn.length < pointsOn){
			var d = (sitesOn.length/pointsOn) * pathLength,
				p = path.node().getPointAtLength(d)
			sitesOn.push([p.x, p.y]);
		}

		//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		// unique keys talvez seja uma solucao para que nao sobreponha
		var site = svg.select(".sites")
			.selectAll("circle")
		.data(sitesOn)
		.enter().append("circle")
			.attr("r", 6)
			.style("fill", "grey")
			.each(function(d, i){
				transition(path, d3.select(this), i/sitesOn.length);});
		//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	}

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
