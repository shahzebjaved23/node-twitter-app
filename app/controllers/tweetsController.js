const mongoose = require('mongoose');
const Tweet = mongoose.model('Tweet');
const TwitterREST = require('../../config/twitter').REST;
const TwitterSTREAM = require('../../config/twitter').STREAM;
const _ = require('lodash');
var io = require('../../server').io;
var https = require ('https');

var socket;

io.on('connection', function(s){
  console.log('a user connected');
  socket = s;
});

var tweets = {};


var saveTweetIntoDb = function(tweet,type,callback){
    // console.log("inside the save tweets function");
    
    Tweet.find({id: tweet.id}).exec(function(err,data){
        if(err){
            console.log(err)
        }else{
            if (data.length == 0){
               
                var newTweet = new Tweet(
                    {
                        tweet_type: type,
                        id: tweet.id,
                        text: tweet.text,
                        user:{
                            id: tweet.user.id,
                            name: tweet.user.name,
                            sereen_name: tweet.user.sereen_name,
                            url: tweet.user.url,
                            profile_image_url: tweet.user.profile_image_url,
                            description: tweet.user.description,
                            profile_background_image_url: tweet.user.profile_background_image_url
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
                    }else{
                        console.log("tweet saved");

                        if(type == "stream"){
                            console.log("tweet emitted");
                            socket.emit("tweet",{tweet: tweet});
                        } 

                        callback(tweet);    
                    }

                    
                })           
            }
        }
    })
   
}

/**
 * find all tweets in twitter STREAM API.
 *
 * @param {String} player name.
 * @param {String} team name.
 * @param {String} author name.
 *
 */
var TweetsFromStream = [];

function findTweetsBySTREAM(player, team, author) {

    var searchStringSTREAM = player + ' ' + team;

    /*
     * Twitter STREAM API, 
     * path: 'statuses/filter', track: to track tweets that match player or team name.
     */
    var stream = TwitterSTREAM.stream('statuses/filter', {
        track: searchStringSTREAM
    });

    // console.log(TwitterSTREAM)

    TwitterSTREAM.on('data', function(tweet) {

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
            console.log("inside stream tweet found")
            if(TweetsFromStream.indexOf(tweet) == -1){
                saveTweetIntoDb(tweet,'stream',function(tweet){

                });    
            }
            
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


/**
 * find all tweets in twitter REST API.
 *
 * @param {String} player name or hashtag, or handle.
 * @param {String} team name or hashtag, or handle.
 * @param {String} author name or hashtag, or handle.
 * @param {String} max_id is the id of latest tweet returned
 *
 */
tweets.getTweetsByRest = function(req,res){

    var player = req.query.player ? req.query.player : "";
    var team = req.query.team ? req.query.team : "";
    var author = req.query.author ? req.query.author : "football-news";
    var player_team_op = req.query.player_team_op;
    var team_author_op = req.query.team_author_op;

    
    findTweetsBySTREAM(player, team, author);

    var matchWords = 'contract OR transfer OR offer OR bargain OR signs OR deal OR buy OR purchase OR trade OR accept OR move OR moving OR rumours';

    // the query string to twitter, ex. ' "Rooney" "#manutd" contract OR transfer..'

    /* 
    *  searching by player, team, or author twitter handles.
    *  appending 'from:' filter to search string to get tweets from given account handles.
    */

    var searchStringREST = "";

    player = player.split(' ').join(' OR ');
    team = team.split(' ').join(' OR ');
    author = author.split(' ').join(' OR ');

    if(player_team_op == "AND" && team_author_op == "AND"){
        searchStringREST = player+" "+team+" "+"from:"+author+" "+matchWords ;
    }else if(player_team_op == "OR" && team_author_op == "AND"){
        searchStringREST = player+" OR "+team+" "+"from:"+author+" "+matchWords ;
    }else if(player_team_op == "AND" && team_author_op == "OR"){
        searchStringREST = player+" "+team+" OR "+"from:"+author+" "+matchWords ;
    }else if(player_team_op == "OR" && team_author_op == "OR"){
        searchStringREST = player+" OR "+team+" OR "+"from:"+author+" "+matchWords ;
    }

    console.log(searchStringREST);

    /*
     * Twitter REST API, 
     * q: searchString, count: Number of tweets returned.
     */


    var tweetsArray = [];
    var tweetReturnArray = [];

    TwitterREST.get('search/tweets', { q: searchStringREST , count: 300}, function(error, tweets, response){
        tweets.statuses.forEach(function(tweet){
            tweetsArray.push(tweet);
        })
        TwitterREST.get('search/tweets', { q: searchStringREST , count: 300, max_id: tweetsArray[tweetsArray.length - 1].id}, function(error, tweets, response){
            tweets.statuses.forEach(function(tweet){
                tweetsArray.push(tweet);
            })
            TwitterREST.get('search/tweets', { q: searchStringREST , count: 300, max_id: tweetsArray[tweetsArray.length - 1].id}, function(error, tweets, response){
                tweets.statuses.forEach(function(tweet){
                    tweetsArray.push(tweet);
                })

                // console.log(tweetsArray.length);

                tweetsArray.forEach(function(tweet){
                    saveTweetIntoDb(tweet,'rest',function(tweet){
                        tweetReturnArray.push(tweet);
                    })
                })
              
                res.send(tweetsArray)    
            
            })
        })
       

        
        
    })
}

var searchDb = function(player,team,author,player_team_op,team_author_op,callback){
    console.log(RegExp(author));

      Tweet.find({
        $and:[
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
    
    var tweets = searchDb(player,team,author,null,null,function(tweets){
        res.send(tweets);
    });
    

}

tweets.getFrequency = function(req,res){
    var player = req.query.player ? req.query.player : "";
    var team = req.query.team ? req.query.team : "";
    var author = req.query.author ? req.query.author : "football-news";
    var player_team_op = req.query.player_team_op;
    var team_author_op = req.query.team_author_op;


    console.log(player)
    console.log(team)
    console.log(author)

    Tweet.aggregate([
        {
            $match:{
                $or:[
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
            }
        },
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
        {"$sort": { "_id.month": 1 }}
    ],function(err,response){
        console.log("getFrequency:")
        console.log(response);
        res.send(response);
    })
}

module.exports = tweets;
