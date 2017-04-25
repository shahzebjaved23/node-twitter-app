const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const playerSchema = new Schema({

	// player name.
    name: { type: String, default: '' },

    // twitter handle of player.
    twitter: { type: String, default: '' },

    // player nationality.
    nationality: { type: String, default: ''},

    // player team, referenced to team model.
    _team: { type: Schema.ObjectId, ref: 'Team'},

    // player birthdate.
    birthdate: { type: Date },

    // player height in meters.
    height: { type: Number, default: 0 },

    // player position.
    position: { type: String, default: ''},

    // player foot: right or left.
    foot: { type: String, default: ''},

    // the date at which contract of player will end.
    contract_until: { type: Date }

});

module.exports = mongoose.model('Player', playerSchema);