const mongoose = require('mongoose');
const Tweet = mongoose.model('Tweet');
const TwitterREST = require('../../config/twitter').REST;
const TwitterSTREAM = require('../../config/twitter').STREAM;
const _ = require('lodash');

var tweets = {};


var saveTweetIntoDb = function(tweet,type){
    console.log("inside the save tweets function");
    
    Tweet.find({twitter_id: tweet.id}).exec(function(err,data){
        if(err){
            console.log(err)
        }else{
            if (data.length == 0){
                var newTweet = new Tweet(
                    {
                        tweet_type: type,
                        twitter_id: tweet.id,
                        text: tweet.text,
                        user:{
                            id: tweet.user.id,
                            name: tweet.user.name,
                            sereen_name: tweet.user.sereen_name,
                            url: tweet.user.url,
                            profile_image_url: tweet.user.profile_image_url,
                            description: tweet.user.description
                        },
                        entities:{
                            hashtags: tweet.entities.hashtags,
                            urls:{
                                url: tweet.entities.urls.url ? tweet.entities.urls.url : "#" 
                            }
                        },
                        created_at: tweet.created_at
                    }
                )
                
                newTweet.save(function(err){
                    if(err){
                        console.log(err);
                    }
                })             
            }
        }
    })
   
}

/**
 * find all tweets in twitter REST API.
 *
 * @param {String} player name or hashtag, or handle.
 * @param {String} team name or hashtag, or handle.
 * @param {String} author name or hashtag, or handle.
 * @param {String} max_id is the id of latest tweet returned
 *
 */
function findTweetsByREST(player, team, author, max_id) {

    return new Promise(function(resolve, reject) {

        // words used to match with query to twitter using OR operator
        var matchWords = 'contract OR transfer OR offer OR bargain OR signs OR deal OR buy OR purchase OR trade OR accept OR move OR moving OR rumours';

        // the query string to twitter, ex. ' "Rooney" "#manutd" contract OR transfer..'
        var searchStringREST = `\"${player}\" \"${team}\" ${matchWords}`;

        /* 
         *  searching by player, team, or author twitter handles.
         *  appending 'from:' filter to search string to get tweets from given account handles.
         */
        if (~player.search("@")) { player = player.split('@')[1]; searchStringREST = `from:${player} \"${team}\" ${matchWords}` };
        if (~team.search("@")) { team = team.split('@')[1]; searchStringREST = `from:${team} \"${player}\" ${matchWords}` };
        if (~author.search("@")) { author = author.split('@')[1]; searchStringREST = `from:${author} \"${player}\" \"${team}\" ${matchWords}` };

        console.log(searchStringREST)
        /*
         * Twitter REST API, 
         * q: searchString, count: Number of tweets returned.
         */   
        TwitterREST.get('search/tweets', { q: searchStringREST, count: 300, since: since }, function(error, tweets, response) {
            /*
             * Removing retweets from returned tweets to save memory,
             * and to avoid duplicates
             */
            if(tweets.statuses){
                _.remove(tweets.statuses, function(t) {
                    return (!!t.retweeted_status)
                });    
            }
            
            return resolve(tweets);
        });
        
    });
}

/**
 * find all tweets in twitter STREAM API.
 *
 * @param {String} player name.
 * @param {String} team name.
 *
 */
var TweetsFromStream = [];

function findTweetsBySTREAM(player, team, author,callback) {

    var searchStringSTREAM = player + ' ' + team;

    /*
     * Twitter STREAM API, 
     * path: 'statuses/filter', track: to track tweets that match player or team name.
     */
    TwitterSTREAM.stream('statuses/filter', {
        track: searchStringSTREAM
    });

    TwitterSTREAM.on('data', function(tweet) {

        /* 
         * Close Connection After 5mins. and return all found tweets.
         */
        setTimeout(() => {
            TwitterSTREAM.close();
            callback(TweetsFromStream);
            return TweetsFromStream;
        }, 1 * 1000); //time in mills.

        /* 
         * using lodash conforms method to check if the returned tweet
         * matches the search criteria we need for player, team..
         *
         */
        var found = _.conformsTo(tweet, {
            /*
             *  matching only tweets that have player name, team name
             *  and one of the search criteria words : 'contract, offer, ..etc.'
             */
            'text': function(n) {
                var textInLowerCase = n.toLowerCase(),
                    playerLowerCase = player.toLowerCase(),
                    teamLowerCase = team.toLowerCase();
                return (textInLowerCase.search(playerLowerCase) !== -1 && textInLowerCase.search(teamLowerCase) !== -1);
            }
        });

        if (found) { 
            TweetsFromStream.push(tweet)
        }
    });

    TwitterSTREAM.on('connection success', function(uri) {
        console.log('connection success', uri);
    });

    TwitterSTREAM.on('connection error network', function(error) {
        console.log('connection error network', error);
    });

    TwitterSTREAM.on('connection error http', function(httpStatusCode) {
        console.log('connection error http', httpStatusCode);
    });

    TwitterSTREAM.on('connection error unknown', function(error) {
        console.log('connection error unknown', error);
        TwitterSTREAM.close();
    });
}

tweets.getTweetsFromStream = function(req,res){
    var team = req.query.team ? req.query.team : "";
    var player = req.query.player ? req.query.player : "";
    var author = req.query.author ? req.query.author : "";

    console.log("player = "+ player);
    console.log("team = "+ team);
    console.log("author = "+ author);

    findTweetsBySTREAM(player, team, author,function(tweets){
        console.log(tweets);
        tweets.forEach(function(tweet){
            saveTweetIntoDb(tweet,'stream')
        })
        res.send(tweets);    
    });

    
}

tweets.getTweetsByRest = function(req,res){

    var player = req.query.player ? req.query.player : "";
    var team = req.query.team ? req.query.team : "";
    var author = req.query.author ? req.query.author : "";

    var matchWords = 'contract OR transfer OR offer OR bargain OR signs OR deal OR buy OR purchase OR trade OR accept OR move OR moving OR rumours';

    // the query string to twitter, ex. ' "Rooney" "#manutd" contract OR transfer..'
    var searchStringREST = `\"${player}\" \"${team}\" ${matchWords}`;

    /* 
     *  searching by player, team, or author twitter handles.
     *  appending 'from:' filter to search string to get tweets from given account handles.
     */
    if (~player.search("@")) { player = player.split('@')[1]; searchStringREST = `from:${player} \"${team}\" ${matchWords}` };
    if (~team.search("@")) { team = team.split('@')[1]; searchStringREST = `from:${team} \"${player}\" ${matchWords}` };
    if (~author.search("@")) { author = author.split('@')[1]; searchStringREST = `from:${author} \"${player}\" \"${team}\" ${matchWords}` };

    /*
     * Twitter REST API, 
     * q: searchString, count: Number of tweets returned.
     */


    TwitterREST.get('search/tweets', { q: searchStringREST , count: 300}, function(error, tweets, response){
         
        console.log(tweets.statuses.length)

        if (tweets.statuses) {
            tweets.statuses.forEach(function(tweet){
                saveTweetIntoDb(tweet,'rest')
            })

            console.log(tweets.statuses.length);

            res.send(tweets.statuses)    
        }else{
            res.send("")
        }
        
    })
}

var searchDb = function(player,team,author,type,callback){
    console.log(RegExp(author));

    Tweet.find({
        $and:[
            {tweet_type: type },
            {text: 
                {
                    $regex: new RegExp(player),
                    $options: 'i'
                }
            },
            {text: 
                {
                    $regex: new RegExp(team), 
                    $options: 'i'
                }
            },
            {"user.name": 
                {
                    $regex: new RegExp(author),
                    $options: 'i'
                }       
            }            
        ]       
    }).sort({created_at: -1}).exec(function(err,data){
        if(err){
            console.log(err)
        }else{
            callback(data)
        }
    })

}

tweets.getTweetsFromDb = function(req,res){
    var player = req.query.player ? req.query.player : "";
    var team = req.query.team ? req.query.team : "";
    var author = req.query.author ? req.query.author : "";
    var type = req.query.type ? req.query.type : "rest";

    var tweets = searchDb(player,team,author,type,function(tweets){
        res.send(tweets);
    });
    

}

tweets.getFrequency = function(req,res){
    Tweet.aggregate([
        { 
            "$group": {
            "_id": {
                 "year": { "$year": "$created_at" },
                 "month":{ "$month": "$created_at"},
                 "day": { "$dayOfMonth": "$created_at" } 
            },
            "count": { "$sum" : 1 }
        }}
        ,
        {"$sort": { "_id.day": -1 }}
    ],function(err,response){
        console.log(response)
        res.send(response);
    })
}

module.exports = tweets;
