// wrap everything in self execting anon function to move the local scope
(function() {

	var attrArray = ["Opioid_Overdose_Death_Rate_2015", "Accidental_Drug_Overdose_Death_Rate_2015", "Opioid_Overdose_Percentage_2015",
					 "Opioid_Overdose_Death_Rate_2016", "Accidental_Drug_Overdose_Death_Rate_2016", "Opioid_Overdose_Percentage_2016",
					 "Opioid_Overdose_Death_Rate_2017", "Accidental_Drug_Overdose_Death_Rate_2017", "Opioid_Overdose_Percentage_2017",
					 "Opioid_Overdose_Death_Rate_2018", "Accidental_Drug_Overdose_Death_Rate_2018", "Opioid_Overdose_Percentage_2018"];

	var expressed = attrArray[11]; //initial attribute

	var statesArray = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
	"Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

	//chart frame dimensions
	var chartWidth = window.innerWidth * 0.425,
		chartHeight = 473,
		leftPadding = 25,
		rightPadding = 2,
		topBottomPadding = 5,
		chartInnerWidth = chartWidth - leftPadding - rightPadding,
		chartInnerHeight = chartHeight - topBottomPadding * 2,
		translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

	//create a scale to size bars proportionally to frame and for axis
	var yScale = d3.scaleLinear()
		.range([463, 0])
		.domain([0, 100]);

	//initialize variable for zooming
	var zoomSettings = {
		duration: 1000,
		ease: d3.easeCubicOut,
		zoomLevel: 5
	};

//begin script when window loads
	window.onload = setMap();

//set up choropleth map
	function setMap() {

		//map frame dimensions
		var width = window.innerWidth * 0.5,
			height = 460;

		//create new svg container for the map
		var map = d3.select("body")
			.append("svg")
			.attr("class", "map")
			.attr("width", width)
			.attr("height", height);

		var g = map.append("g");

		map.call(d3.zoom().on("zoom", () => {
			g.attr("transform", d3.event.transform);
		}));

		// map.append("rect")
		// 	.attr("width", width)
		// 	.attr("height", height)
		// 	.style("fill", "none")
		// 	.style("pointer-events", "all")
		// 	.call(d3.zoom()
		// 		.scaleExtent([1 / 2, 4])
		// 		.on("zoom", zoomed));

		//create geoconicconformal conic projection centered on US
		var projection = d3.geoConicConformal()
			.center([-101, 35])
			.rotate([-2, 0])
			.parallels([0, 0])
			.scale(500)
			.translate([width / 2, height / 2]);

		//create path generator
		var path = d3.geoPath()
			.projection(projection);

		//use d3-queue to parallelize asynchronous data loading
		d3.queue()
			.defer(d3.csv, "data/odData.csv") //load attributes from csv
			.defer(d3.json, "data/naCountries.topojson") //load background spatial data
			.defer(d3.json, "data/newStates.topojson") //load choropleth spatial data
			.await(callback);

		function callback(error, csvData, countryData, statesData) {

			//place graticule on the map
			setGraticule(g, path);

			//translate usStates topojson
			var naCountries = topojson.feature(countryData, countryData.objects.ne_50m_admin_0_countries), //load background spatial data
				unitedStates = topojson.feature(statesData, statesData.objects.states).features;//load choropleth data

			//add NA countries to map
			var northAmerica = g.append("path")
				.datum(naCountries)
				.attr("class", "countries")
				.attr("d", path);

			// join csv data to Geojson enumerration units
			unitedStates = joinData(unitedStates, csvData);

			// create color scale
			var colorScale = makeColorScale(csvData);

			//add enumeration units to the map
			setEnumerationUnits(unitedStates, g, path, colorScale);

			//add coordinated viz to map
			setChart(csvData, colorScale);

			createDropdown(csvData);

		};
	};   // end of setMap()

	//function to create color scale generator
	function makeColorScale(data) {
		var colorClasses = [
			"#f2f0f7",
			"#cbc9e2",
			"#9e9ac8",
			"#756bb1",
			"#54278f"
		];

		// create color scale generator
		var colorScale = d3.scaleThreshold()
			.range(colorClasses);

		// build array of all values of the expressed attribute
		var domainArray = [];
		for (var i=0; i < data.length; i++){
			var val = parseFloat(data[i][expressed]);
			domainArray.push(val);
		};

		// cluster data using ckmeans clustering algorith to create natural breaks
		var clusters = ss.ckmeans(domainArray, 5);
		//reset domain array to cluster minimums
		domainArray = clusters.map(function (d) {
			return d3.min(d);
		});

		// remove first value from domain array to create class breakpoints
		domainArray.shift();

		//assign array of last 4 cluster minimums as domain
		colorScale.domain(domainArray);

		return colorScale;
	};

	function setGraticule(map, path) {
		//create graticule generator
		var graticule = d3.geoGraticule()
			.step([20, 20]); //place graticule lines every 5 degrees of longitude and latitude

		//create graticule background
		var gratBackground = map.append("path")
			.datum(graticule.outline())   // bind graticule background
			.attr("class", "gratBackground")  //assign class for styling
			.attr("d", path) //project graticule

		//create graticule lines
		var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
			.data(graticule.lines()) //bind graticule lines to each element to be created
			.enter() //create an element for each datum
			.append("path") //append each element to the svg as a path element
			.attr("class", "gratLines") //assign class for styling
			.attr("d", path); //project graticule lines

	};

	function joinData(unitedStates, csvData){
		for (var i = 0; i < csvData.length; i++) {
			var csvState = csvData[i]; // the current state
			var csvKey = csvState.name; //the csv primary key

			//loop through geojson states to find correct state
			for (var a = 0; a < unitedStates.length; a++) {
				var geojsonProps = unitedStates[a].properties; // the current state geojson properties

				var geojsonKey = geojsonProps.name //the geojson primary key

				//where primary keys match, transfer csv data to geojson properties object
				if (geojsonKey == csvKey) {

					// assign all attributes and values
					attrArray.forEach((function (attr) {
						var val = parseFloat(csvState[attr]);  // get csv attribute value

						console.log("var val = " + val);
						console.log(csvState[attr]);

						geojsonProps[attr] = val;  // assign attribute and value to geojson properties

						console.log(geojsonProps[attr]);
					}));
				};
			};
		};


		console.log(csvData);
		console.log(unitedStates);

		return unitedStates;
	};

	function setEnumerationUnits(unitedStates, map, path, colorScale){
		var states = map.selectAll(".unitedStates")
			.data(unitedStates)
			.enter()
			.append("path")
			.attr("class", function (d) {
				return "unitedStates " + d.properties.name;
			})
			.attr("d", path)
			.attr('cursor', 'pointer')
			.style("fill", function (d) {
				return choropleth(d.properties, colorScale);
		})
			.on("mouseover", function (d) {
				highlight(d.properties);
			})
			.on("mouseout", function (d) {
				dehighlight(d.properties);
		})
			.on("mousemove", moveLabel);

		var desc = states.append("desc")
			.text('{"stroke": "#000", "stroke-width": "0.5px"}');
	};

	//function to test for data value and return color
	function choropleth(props, colorScale) {
		//make sure attribute value is a number
		var val = parseFloat(props[expressed]);
		//if attribute value exists, assign a color, otherwise assign gray
		if (typeof val == 'number' && !isNaN(val)) {
			return colorScale(val);
		} else {
			return "#CCC";
		};
	};

	// function to create a dropdown menu for attribute selection
	function createDropdown(csvData) {
		//add select element
		var dropdown = d3.select("body")
			.append("select")
			.attr("class", "dropdown")
			.on("change", function(){
				changeAttribute(this.value.replace(" ", "_"), csvData)
			});

		//add initial option
		var titleOption = dropdown.append("option")
			.attr("class", "titleOption")
			.attr("disabled", "true")
			.text("Select Attribute");

		//add attribute name options
		var attrOptions = dropdown.selectAll("attrOptions")
			.data(attrArray)
			.enter()
			.append("option")
			.attr("value", function(d) {return d})
			.text(function (d) {return d.replace(/_/g, " ")});

	};

	//dropdown change listener handler
	function changeAttribute(attribute, csvData){
		//change the expressed attribute
		expressed = attribute;

		console.log(expressed);
		console.log(csvData);

		//recreate the color scale
		var colorScale = makeColorScale(csvData);

		//recolor enumeration units
		var states = d3.selectAll(".unitedStates")
			.transition()
			.duration(1000)
			.style("fill", function(d){
				return choropleth(d.properties, colorScale)
			});

		//re-sort, resize, and recolor bars
		var bars = d3.selectAll(".bar")
			//re-sort bars
			.sort(function(a, b){
				return b[expressed] - a[expressed];
			})
			.transition() // add animation
			.delay(function(d, i) {
				return i * 20
			})
			.duration(500);

			// });

		updateChart(bars, csvData.length, colorScale);

	};

	function updateChart(bars, n, colorScale) {
		// position bars
		bars.attr("x", function(d, i){
			return i * (chartInnerWidth / n) + leftPadding;
		})
		//resize bars
		.attr("height", function(d, i){
			console.log(d[expressed]);
			return 463 - yScale(parseFloat(d[expressed]));
		})
		.attr("y", function(d, i){
			return yScale(parseFloat(d[expressed])) + topBottomPadding;
		})
		//recolor bars
		.style("fill", function(d){
			return choropleth(d, colorScale);
		});

		var chartTitle = d3.select(".chartTitle")
			.text(expressed.replace(/_/g, " "));
	};

//function to create coordinated bar chart
	function setChart(csvData, colorScale){
		//create a second svg element to hold the bar chart
		var chart = d3.select("body")
			.append("svg")
			.attr("width", chartWidth)
			.attr("height", chartHeight)
			.attr("class", "chart");

		//create a rectangle for chart background fill
		var chartBackground = chart.append("rect")
			.attr("class", "chartBackground")
			.attr("width", chartInnerWidth)
			.attr("height", chartInnerHeight)
			.attr("transform", translate);



		//set bars for each province
		var bars = chart.selectAll(".bar")
			.data(csvData)
			.enter()
			.append("rect")
			.sort(function(a, b){
				return b[expressed]-a[expressed]
			})
			.attr("class", function(d){
				return "bar " + d.name;
			})
			.attr("width", chartInnerWidth / csvData.length - 1)
			.on("mouseover", highlight)
			.on("mouseout", dehighlight)
			.on("mousemove", moveLabel);


		//create a text element for the chart title
		var chartTitle = chart.append("text")
			.attr("x", 150)
			.attr("y", 30)
			.attr("class", "chartTitle");



		//create vertical axis generator
		var yAxis = d3.axisLeft()
			.scale(yScale);


		//place axis
		var axis = chart.append("g")
			.attr("class", "axis")
			.attr("transform", translate)
			.call(yAxis);


		//create frame for chart border
		var chartFrame = chart.append("rect")
			.attr("class", "chartFrame")
			.attr("width", chartInnerWidth)
			.attr("height", chartInnerHeight)
			.attr("transform", translate);

		var desc = bars.append("desc")
			.text('{"stroke": "none", "stroke-width": "0px"}');

		updateChart(bars, csvData.length, colorScale);
	};

	//function to highlight enumeration units and bars
	function highlight(props){
		//change stroke
		var selected = d3.selectAll("." + props.name)
			.style("stroke", "blue")
			.style("stroke-width", "2");

		setLabel(props);
	};

	function dehighlight(props) {
		var selected = d3.selectAll("." + props.name)
			.style("stroke", function () {
				return getStyle(this, "stroke")
			})
			.style("stroke-width", function () {
				return getStyle(this, "stroke-width")
			});

		function getStyle(element, styleName) {
			var styleText = d3.select(element)
				.select("desc")
				.text();

			var styleObject = JSON.parse(styleText);

			return styleObject[styleName];
		};

		d3.select(".infolabel")
			.remove();
	};

	//function to create dynamic label
	function setLabel(props){
		//label content
		var labelAttribute = "<h2>" + props[expressed] +
			"</h2><b>" + expressed + "</b>";

		//create info label div
		var infolabel = d3.select("body")
			.append("div")
			.attr("class", "infolabel")
			.attr("id", props.adm1_code + "_label")
			.html(labelAttribute);

		var stateName = infolabel.append("div")
			.attr("class", "labelname")
			.html(props.name);
	};

	//function to move label with mouse
	function moveLabel(){
		//get width of label
		var labelWidth = d3.select(".infolabel")
			.node()
			.getBoundingClientRect()
			.width;

		//use coordinates of mousemove event to set label coordinates
		var x1 = d3.event.clientX + 10,
			y1 = d3.event.clientY - 75,
			x2 = d3.event.clientX - labelWidth - 10,
			y2 = d3.event.clientY + 25;

		//horizontal label coordinate, testing for overflow
		var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
		//vertical label coordinate, testing for overflow
		var y = d3.event.clientY < 75 ? y2 : y1;

		d3.select(".infolabel")
			.style("left", x + "px")
			.style("top", y + "px");
	};


})();
