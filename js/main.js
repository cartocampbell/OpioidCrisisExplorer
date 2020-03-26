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

	//create geoconicconformal conic proj. centered on US
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

	function callback(error, csvData, countryData, statesData){
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
				return "unitedStates " + d.properties.name;
			})
			.attr("d", path);			
		};
};
