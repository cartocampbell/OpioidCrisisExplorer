//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

	//map frame dimensions
	var width = 960,
		height = 460;

	//create new svg container for the map
	var map = d3.select("body")
		.append("svg")
		.attr("class", "map")
		.attr("width", width)
		.attr("height", height);

	//create Albers equal area conic proj. centered on france
	var projection = d3.geoAlbers()
		.center([-3.64, 16.33])
		.rotate([-2, 101, -24.55])
		.parallels([14.05, 41.23])
		.scale(376.77)
		.translate([width / 2, height / 2]);

	//create path generator
	var path = d3.geoPath()
		.projection(projection);

	//use d3-queue to parallelize asynchronous data loading
	d3.queue()
		.defer(d3.csv, "data/OD_DATA.csv")//load attribute data from csv
		.defer(d3.json, "data/US_STATES.topojson")//load spatial data
		.defer(d3.json, "data/COUNTRIES.topojson")
		.await(callback);

	function callback(error, csvData, states, countries){
		//translate US_STATES topojson
		var unitedStates = topojson.feature(states, states.objects.US_STATES).features;
		var naCountries = topojson.feature(countries, countries.objects.COUNTRIES).features;
	
		//add NA countries to map 
		var northAmerica = map.append("path")
			.datum(naCountries)
			.attr("class", "countries")
			.attr("d", path);
		
		//add us states to the map
		var regions = map.selectAll(".unitedStates")
			.data(unitedStates)
			.enter()
			.append("path")
			.attr("class", function(d){
				return "unitedStates " + d.properties.NAME;
			})
			.attr("d", path);			
		};
};
