var preview = require("page-previewer");

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