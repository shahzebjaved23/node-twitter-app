var preview = require("page-previewer");
var http = require("http");
var dps = require('dbpedia-sparql-client').default;
var _ = require('lodash');



/*
* gets the link preview using page viewer
*/
module.exports.getLinkPreview = function(req,res){
	var url = req.query.url;
	if(url != null){
        preview(url, function(err, data) {
            if(!err) {
                res.json({preview: data});
            }

        });    
    }
}

/*
* query the dbpedia to get player information
*/

module.exports.getSparqlQuery = function(req,res){


	// parse the player request param
	var player = req.query.player.replace(","," ");
	
	// the sparql query
	var query = "";
	query += "PREFIX p: <http://dbpedia.org/property/>";
	query += "SELECT ?name, ?birthDate, ?height, ?labelposition,?clubName, ?country,?image WHERE {";
  	query += "?player a <http://dbpedia.org/ontology/SoccerPlayer> .";
  	query += "?player dbo:birthPlace ?countryOfBirth .";
  	query += "?countryOfBirth rdfs:label ?country .";
  	query += "?player dbp:name ?name . ";
  	query += "?player <http://dbpedia.org/ontology/birthDate> ?birthDate .";
  	query += "?player <http://dbpedia.org/ontology/Person/height> ?height  .";
  	query += "?player <http://dbpedia.org/ontology/position> ?position .";
  	query += "?position rdfs:label ?labelposition . ";
  	query += "?player dct:subject ?category ."
  	query += "?player p:currentclub ?club .";
  	query += "?club rdfs:label ?clubName .";
  	query += "OPTIONAL{ ?player <http://dbpedia.org/ontology/thumbnail> ?image . }" 
  	query += "FILTER(regex(?name, '"+player+"','i'))";
  	query += "FILTER(regex(?category,'Category:Manchester_United_F.C._players|Category:Chelsea_F.C._players','i'))";
  	query += "FILTER langMatches(lang(?country ),'en')";
  	query += "FILTER langMatches(lang(?labelposition),'en')";
  	query += "FILTER langMatches(lang(?clubName ),'en')}";

	dps.client().query(query).asJson().then(function(r) { 
		var returnArray = _.uniqBy(r.results.bindings,function(object){
			return object.name.value;
		});
		res.send(returnArray);
	}).catch(function(e) { 
		console.log(e)
	});
}


// gets the player information to be used in autocomplete
module.exports.getPlayerAutoComplete = function(req,res){
	var name = req.query.name;
	var query = "";
	query += "SELECT ?name WHERE {";
  	query += "?player a <http://dbpedia.org/ontology/SoccerPlayer> .";
  	query += "?player dbp:name ?name .";
  	query += "?player dct:subject ?category . ";
  	query += "FILTER(regex(?name,'"+name+"','i'))";
  	query += "FILTER(regex(?category,'Category:La_Liga_players','i'))}" 

	dps.client().query(query).asJson().then(function(r) { 
		var returnArray = r.results.bindings.map(function(object){
			return object.name.value;
		});
		res.send(returnArray); 
	}).catch(function(e) { 
		console.log(e)
	});
}

// gets the team information to be used in autocomplete
module.exports.getTeamAutoComplete = function(req,res){
	var name = req.query.name;

	var query = "PREFIX p: <http://dbpedia.org/property/>";
	query += "SELECT ?clubName  WHERE {";
  	query += "?player a <http://dbpedia.org/ontology/SoccerPlayer> .";
  	query += "?player p:currentclub ?club .";
  	query += "?club rdfs:label ?clubName .";
  	query += "?player dct:subject ?category ."
  	query += "FILTER(regex(?clubName, '"+name+"','i'))";
  	query += "FILTER langMatches(lang(?clubName ),'en')";
  	query += "FILTER(regex(?category,'Category:La_Liga_players','i'))}";

	dps.client().query(query).asJson().then(function(r) { 
		var parsedArray = r.results.bindings.map(function(object){
			return object.clubName.value;
		});
		var returnArray = parsedArray.filter(function(elem, index, self) {
		    return index == self.indexOf(elem);
		});
		res.send(returnArray);  
	}).catch(function(e) { 
		console.log(e)
	});

}


