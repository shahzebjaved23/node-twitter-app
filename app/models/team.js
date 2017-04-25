const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var teamSchema = new Schema({

	// team name
	name: { type: String, default: '' },

	// twitter handle of team.
	twitter: { type: String, default: '' }
	
	/* Additional fields Could be added for future data 

	 * foreign_players: { type: Number, default: 0 },
	 * stadium: { type: String, default: ''},
 	 * cuurent_transfer_record: { type: String, default: ''},

 	*/
});

module.exports = mongoose.model('Team', teamSchema);