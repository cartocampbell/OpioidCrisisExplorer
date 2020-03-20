//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
	//use d3-queue to parallelize asynchronous data loading
	d3.queue()
		.defer(d3.csv, "data/OD_DATA.csv")//load attribute data from csv
		.defer(d3.json, "data/US_STATES.topojson")//load spatial data
		.await(callback);

	function callback(error, csvData, states){
		//translate US_STATES topojson
		var unitedStates = topojson.feature(states, states.objects.US_STATES).features;



		console.log(error);
		console.log(csvData);
		console.log(states);
	};
};