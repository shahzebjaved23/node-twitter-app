var preview = require("page-previewer");
var http = require("http");
var Twit = require('twit');
var dps = require('dbpedia-sparql-client').default;
var _ = require('lodash');

var T = new Twit({
  consumer_key:         process.env.CONSUMER_KEY,
  consumer_secret:      process.env.CONSUMER_SECRET,
  access_token:         "197496793-yVnc4tIs1ORhgjJq6ZvpAABADzLVArmD4jIAUULy",
  access_token_secret:  "mn4RpqZfP1NLm6mmZb154uZ4nMNIJ1UHPwPsfopcVwYU7"
})

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


module.exports.getOembed = function(req,res){
	var id = req.query.id;
	var url = req.query.url;

	console.log(id);

	// T.get('statuses/oembed', { id: id.toString() },  function (err, data, response) {
 //        console.log(data);
 //        res.send(data)
 //    })

 	var options = {
 		host: "publish.twitter.com",
 		path: "/oembed?url="+url
 	}

 	console.log(url);
	http.get(options, function(err,response){
		console.log(response);
	})

}

// sparql query

// PREFIX p: <http://dbpedia.org/property/>
// PREFIX dbpedia-owl: <http://dbpedia.org/ontology/>
// SELECT ?name, ?birthDate, ?height, ?labelposition,?clubName, ?country  WHERE {
//   ?player a <http://dbpedia.org/ontology/SoccerPlayer> .
//    ?player dbo:birthPlace ?countryOfBirth .
//   ?countryOfBirth rdfs:label ?country .
//   ?player dbp:name ?name . 
//   ?player <http://dbpedia.org/ontology/birthDate> ?birthDate .
//   ?player <http://dbpedia.org/ontology/Person/height> ?height  .
//   ?player <http://dbpedia.org/ontology/position> ?position .
//   ?position rdfs:label ?labelposition . 
//   ?player p:currentclub ?club .
//   ?club rdfs:label ?clubName .
//   FILTER(regex(?name, "Rooney","i"))
//   FILTER langMatches(lang(?labelposition),'en')
//   FILTER langMatches(lang(?clubName ),'en')
//   FILTER langMatches(lang(?country ),'en')
// }


module.exports.getSparqlQuery = function(req,res){

	var player = req.query.player;

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
  	query += "?player <http://dbpedia.org/ontology/thumbnail> ?image ." 
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


module.exports.getPlayerAutoComplete = function(req,res){
	var name = req.query.name;

	console.log(name);

// SELECT ?name, ?category WHERE {
// ?player a <http://dbpedia.org/ontology/SoccerPlayer> .
// ?player dbp:name ?name .
// ?player dct:subject ?category . 
// FILTER(regex(?name, "",'i'))
// FILTER(regex(?category,"Category:Living_people","i"))
// }

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


