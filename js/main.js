// wrap everything in self execting anon function to move the local scope
(function() {

	var attrArray = ["OODR_2015", "ADODR_2015", "OOP_2015",
		"OODR_2016", "ADODR_2016", "OOP_2016", "OODR_2017", "ADODR_2017",
		"OOP_2017", "OODR_2018", "ADODR_2018", "OOP_2018"];

	var expressed = attrArray[0]; //initial attribute

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
			setGraticule(map, path);

			//translate usStates topojson
			var naCountries = topojson.feature(countryData, countryData.objects.ne_50m_admin_0_countries), //load background spatial data
				unitedStates = topojson.feature(statesData, statesData.objects.states).features;//load choropleth data

			//add NA countries to map
			var northAmerica = map.append("path")
				.datum(naCountries)
				.attr("class", "countries")
				.attr("d", path);

			// join csv data to Geojson enumerration units
			unitedStates = joinData(unitedStates, csvData);

			// create color scale
			var colorScale = makeColorScale(csvData);

			//add enumeration units to the map
			setEnumerationUnits(unitedStates, map, path, colorScale);

			//add coordinated viz to map
			setChart(csvData, colorScale);

			createDropdown();

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
			var csvState = csvData[i]; // the current region
			var csvKey = csvState.Location; //the csv primary key

			//loo through geojson states to find correct state
			for (var a = 0; a < unitedStates.length; a++) {
				var geojsonProps = unitedStates[a].properties; // the current state geojson properties

				var geojsonKey = geojsonProps.name //the geojson primary key

				//where primary keys match, transfer csv data to geojson properties object
				if (geojsonKey == csvKey) {

					// assign all sttributes and values
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
			.style("fill", function (d) {
				return choropleth(d.properties, colorScale);
		});
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

	// function to create a dropdown menu for attribute selectino
	function createDropdown() {
		//add select element
		var dropdown = d3.select("body")
			.append("select")
			.attr("class", "dropdown");

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
			.text(function (d) {return d});

	};

//function to create coordinated bar chart
	function setChart(csvData, colorScale){
		//chart frame dimensions
		var chartWidth = window.innerWidth * 0.425,
			chartHeight = 473,
			leftPadding = 25,
			rightPadding = 2,
			topBottomPadding = 5,
			chartInnerWidth = chartWidth - leftPadding - rightPadding,
			chartInnerHeight = chartHeight - topBottomPadding * 2,
			translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

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

		//create a scale to size bars proportionally to frame and for axis
		var yScale = d3.scaleLinear()
			.range([463, 0])
			.domain([0, 100]);

		//set bars for each province
		var bars = chart.selectAll(".bar")
			.data(csvData)
			.enter()
			.append("rect")
			.sort(function(a, b){
				return b[expressed]-a[expressed]
			})
			.attr("class", function(d){
				return "bar " + d.adm1_code;
			})
			.attr("width", chartInnerWidth / csvData.length - 1)
			.attr("x", function(d, i){
				return i * (chartInnerWidth / csvData.length) + leftPadding;
			})
			.attr("height", function(d, i){
				return 463 - yScale(parseFloat(d[expressed]));
			})
			.attr("y", function(d, i){
				return yScale(parseFloat(d[expressed])) + topBottomPadding;
			})
			.style("fill", function(d){
				return choropleth(d, colorScale);
			});

		//create a text element for the chart title
		var chartTitle = chart.append("text")
			.attr("x", 40)
			.attr("y", 40)
			.attr("class", "chartTitle")
			.text("Number of Overdoses per State");

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
	};
})();
