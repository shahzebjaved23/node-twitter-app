var preview = require("page-previewer");
var http = require("http");
var Twit = require('twit');
var dps = require('dbpedia-sparql-client').default;

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

// PREFIX sp:<http://dbpedia.org/ontology/SoccerPlayer>
// PREFIX p: <http://dbpedia.org/property/>
// SELECT ?name, ?birthDate, ?height, ?labelposition,?clubName WHERE {
//   ?player a <http://dbpedia.org/ontology/SoccerPlayer> .
//   ?player dbp:name ?name . 
//   ?player <http://dbpedia.org/ontology/birthDate> ?birthDate .
//   ?player <http://dbpedia.org/ontology/Person/height> ?height  .
//   ?player <http://dbpedia.org/ontology/position> ?position .
//   ?position rdfs:label ?labelposition . 
//   ?player p:currentclub ?club .
//   ?club rdfs:label ?clubName .
//   FILTER(regex(?name, "WAYNE Rooney","i"))
//   FILTER langMatches(lang(?labelposition),'en')
//   FILTER langMatches(lang(?clubName ),'en')


module.exports.getSparqlQuery = function(req,res){

	var player = req.query.player;

	var query = "";
	query += "PREFIX p: <http://dbpedia.org/property/>";
	query += "SELECT ?name, ?birthDate, ?height, ?labelposition,?clubName, ?country WHERE {";
  	query += "?player a <http://dbpedia.org/ontology/SoccerPlayer> .";
  	query += "?player dbo:birthPlace ?countryOfBirth .";
  	query += "?countryOfBirth rdfs:label ?country .";
  	query += "?player dbp:name ?name . ";
  	query += "?player <http://dbpedia.org/ontology/birthDate> ?birthDate .";
  	query += "?player <http://dbpedia.org/ontology/Person/height> ?height  .";
  	query += "?player <http://dbpedia.org/ontology/position> ?position .";
  	query += "?position rdfs:label ?labelposition . ";
  	query += "?player p:currentclub ?club .";
  	query += "?club rdfs:label ?clubName ."; 
  	query += "FILTER(regex(?name, '"+player+"','i'))";
  	query += "FILTER langMatches(lang(?country ),'en')";
  	query += "FILTER langMatches(lang(?labelposition),'en')";
  	query += "FILTER langMatches(lang(?clubName ),'en')}";

	dps.client().query(query).asJson().then(function(r) { 
		console.log(r);
		res.send(r); 
	}).catch(function(e) { 
		console.log(e)
	});
}


