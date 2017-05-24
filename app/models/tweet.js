const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var tweetSchema = new Schema({
	
	/*
		player name and team name,
		each is mapped to it's model reference.
		* Makes the tweet more organized by player and team name 
	*/
    id: {type: String, unique: true},
	player: { type: Schema.ObjectId, ref: 'Player' },
    team: { type: Schema.ObjectId, ref: 'Team'},


    // either stream or rest
    tweet_type: { type: String, default: "rest"},
    
    
    /*
		author of the tweet, screen_name of author account.
    */
    user: { 
        id_str: { type: String, default: ""},
        name: {type: String, default: ""},
        screen_name: {type: String, default: ""},
        url: { type: String, default: ""},
        profile_image_url: {type: String, default: ""},
        description: {type: String, default: ""},
        profile_background_image_url: {type: String, default: ""}
  
    },

    text: {type: String, default: ""},

    entities:{
        hashtags: {type: [], default: []},
        urls:{
            url: {type: String, default: "#"}
        }
    },

    // creation time of tweet as appears on Twitter
    created_at: { type: Date }
});

module.exports = mongoose.model('Tweet', tweetSchema);