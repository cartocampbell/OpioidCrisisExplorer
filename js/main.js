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
        .center([0, 46.2])
        .rotate([-2, 0, 0])
        .parallels([43, 62])
        .scale(2500)
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

	function callback(error, csvData, countryData, statesData){
		//translate usStates topojson
		var naCountries = topojson.feature(countryData, countryData.objects.ne_50m_admin_0_countries), //load background spatial data 
            unitedStates = topojson.feature(statesData, statesData.objects.states).features;//load choropleth data
		    
        
        console.log(unitedStates);
        console.log(naCountries);
	
		//add NA countries to map 
		var northAmerica = map.append("path")
			.datum(naCountries)
			.attr("class", "countries")
			.attr("d", path);
		
		//add us states to the map
		var states = map.selectAll(".unitedStates")
			.data(unitedStates)
			.enter()
			.append("path")
			.attr("class", function(d){
				return "unitedStates " + d.properties.NAME;
			})
			.attr("d", path);			
		};
};
