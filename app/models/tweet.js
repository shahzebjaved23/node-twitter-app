const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var tweetSchema = new Schema({
	
	/*
		player name and team name,
		each is mapped to it's model reference.
		* Makes the tweet more organized by player and team name 
	*/
	player: { type: Schema.ObjectId, ref: 'Player' },
    team: { type: Schema.ObjectId, ref: 'Team'},

    twitter_id: {type: String , default: ""},
    
    
    /*
		author of the tweet, screen_name of author account.
    */
    author: { type: String, default: ''},

    author_link: {type: String, default: '#'},
    tweet_link: {type: String, default: '#'},
    profile_image_url: {type: String, default: ''},
    
    
    /*
		tweet is an object that will contain:
		tweet id, tweet text.
    */
    tweet: {},
    
    // hashtags within tweets is saved into array
    hashtags: { type: [], default: '' },
    
    // creation time of tweet as appears on Twitter
    created_at: { type: Date }
});

module.exports = mongoose.model('Tweet', tweetSchema);