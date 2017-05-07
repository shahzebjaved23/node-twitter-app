var FB = require("../../config/facebook");


module.exports.test = function(req,res){
	FB.api("/search?q=Rooney&type=user",function(response){
		console.log(response);
		res.send(response)
	})
}