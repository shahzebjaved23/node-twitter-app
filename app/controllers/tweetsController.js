const mongoose = require('mongoose');
const Tweet = mongoose.model('Tweet');
const TwitterREST = require('../../config/twitter').REST;
const TwitterSTREAM = require('../../config/twitter').STREAM;
const _ = require('lodash');
var io = require('../../server').io;


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
                        id_str: tweet.id_str,
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
                            if(socket){
                                socket.emit("tweet",{tweet: tweet});
                                console.log("tweet emitted");    
                            }
                            
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

function findTweetsBySTREAM(query) {

    /*
     * Twitter STREAM API, 
     * path: 'statuses/filter', track: to track tweets that match player or team name.
     */
    var stream = TwitterSTREAM.stream('statuses/filter', {
        track: query
    });


    /*
    * close the stream. other wise the server gets overloaded and crashes
    */
    setTimeout(() => {
        console.log("close the stream");
        TwitterSTREAM.close();
        return TweetsFromStream;
    }, 100 * 1000); //time in mills


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
 * @param {String} player_team_op is the operation between player and team
 * @param {String} team_author_op is the operation of author and team
 */
tweets.getTweetsByRest = function(req,res){

    var player = req.query.player;
    var team = req.query.team;
    var author = req.query.author;
    var player_team_op = req.query.player_team_op;
    var team_author_op = req.query.team_author_op;

    /*
    * Parse the inputs params, replace ',' with AND so that is searches for whole query 
    */
    if(player != ""){
        player = "'"+player.replace(" "," OR ").replace(","," ")+"'";    
    }
    
    if(team != ""){
        team = "'"+team.replace("FC","").replace("F.C","").replace("F.C.","").replace(" "," OR ").replace(","," ")+"'";    
    }

    if(author != ""){
        author = "'"+author.replace(" "," OR ").replace(","," ");    
    }
    
    
   
    /*
    * the query words
    */
    var matchWords = 'contract OR transfer OR offer OR signs OR buy OR moving';

    
    /* 
    *  searching by player, team, or author twitter handles.
    *  appending 'from:' filter to search string to get tweets from given account handles.
    */
    var searchStringREST = "";

    /*
    *  generate the query string in terms of the supplied operators
    *  leave out the varaibles if they are empty strings
    */ 
    if(player_team_op == "AND" && team_author_op == "AND"){
        if(player == "" && team != ""){
            searchStringREST = team+" "+matchWords ;
        }else if(player != "" && team == ""){
            searchStringREST = player+" "+matchWords ;
        }else if(player != "" && team != ""){
            searchStringREST = player+" "+team+" OR "+matchWords ;
        }     
    }else if(player_team_op == "OR" && team_author_op == "AND"){
        if(player == "" && team != ""){
            searchStringREST = team+" "+matchWords ;
        }else if(player != "" && team == ""){
            searchStringREST = player+" "+matchWords ;
        }else if(player != "" && team != ""){
            searchStringREST = player+" OR "+team+" OR "+matchWords ;
        }
    }else if(player_team_op == "AND" && team_author_op == "OR"){
        if(player == "" && team != ""){
            searchStringREST = team+" "+matchWords ;
        }else if(player != "" && team == ""){
            searchStringREST = player+" "+matchWords ;
        }else if(player != "" && team != ""){
            searchStringREST = player+" "+team+" OR "+matchWords ;
        }
    }else if(player_team_op == "OR" && team_author_op == "OR"){
        if(player == "" && team != ""){
            searchStringREST = team+" OR "+matchWords ;
        }else if(player != "" && team == ""){
            searchStringREST = player+" "+matchWords ;
        }else if(player != "" && team != ""){
            searchStringREST = player+" OR "+team+" OR "+matchWords ;
        }
    }

    if(author != ""){
        if(team_author_op == "OR"){
            searchStringREST += "OR from:"+author;
        }else if(team_author_op = "AND"){
            searchStringREST += "AND from:"+author;
        }
    }

    console.log(searchStringREST);

     /*
    * Open the tweets Stream
    */

    findTweetsBySTREAM(searchStringREST);

    /*
     * Twitter REST API, 
     * q: searchString, count: Number of tweets returned.
     */

    var tweetsArray = [];
    
    TwitterREST.get('search/tweets', { q: searchStringREST , count: 300, lang:"en"}, function(error, tweets, response){
        
        if(tweets.statuses){
            tweets.statuses.forEach(function(tweet){
                tweetsArray.push(tweet);
            })
            TwitterREST.get('search/tweets', { q: searchStringREST , count: 300, max_id: tweetsArray[tweetsArray.length - 1].id, lang:"en"}, function(error, tweets, response){
                if(tweets.statuses){
                    tweets.statuses.forEach(function(tweet){
                        tweetsArray.push(tweet);
                    })
                    TwitterREST.get('search/tweets', { q: searchStringREST , count: 300, max_id: tweetsArray[tweetsArray.length - 1].id, lang:"en"}, function(error, tweets, response){
                        if(tweets.statuses){
                            tweets.statuses.forEach(function(tweet){
                                tweetsArray.push(tweet);
                            })
                            console.log(tweetsArray.length);
                            
                            // save tweets to db
                            tweetsArray.forEach(function(tweet){
                                saveTweetIntoDb(tweet,'rest',function(tweet){
                                })
                            })
                            // remove retweets to remove duplicates
                            _.remove(tweetsArray, function(t) {
                                return (!!t.retweeted_status)
                            });
                            res.send(tweetsArray)    
                        }
                    })
                }          
            })
        }
    })
}

var searchDb = function(player,team,author,player_team_op,team_author_op,callback){
    console.log(RegExp(author));

    player = player.replace(" "," OR ").replace(","," ");
    team = team.replace("FC","").replace("F.C","").replace("F.C.","").replace(" "," OR ").replace(","," ");
    author = author.replace(" "," OR ").replace(","," ");

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
    var player = req.query.player;
    var team = req.query.team;
    var author = req.query.author;
    
    var tweets = searchDb(player,team,author,null,null,function(tweets){
        var ruturnArray = _.uniqBy(tweets, function(t) {
            return t.text        });
        res.send(ruturnArray);
    });
}

tweets.getFrequency = function(req,res){
    var player = req.query.player ? req.query.player : "";
    var team = req.query.team ? req.query.team : "";
    var author = req.query.author ? req.query.author : "football-news";
    var player_team_op = req.query.player_team_op;
    var team_author_op = req.query.team_author_op;

    player = player.replace(" "," OR ").replace(","," ");
    team = team.replace("FC","").replace("F.C","").replace("F.C.","").replace(" "," OR ").replace(","," ");
    author = author.replace(" "," OR ").replace(","," ");


    console.log(player)
    console.log(team)
    console.log(author)
    console.log(player_team_op)
    console.log(team_author_op)

    var options ;

    if(player_team_op == "OR"){
        if(player != "" && team != ""){
            options = {
                $match: {
                    $or:[
                        {
                            text:{
                                $regex: new RegExp(playerplayer),
                                $options: 'i'
                            }
                        },
                        {
                            text:{
                                $regex: new RegExp(team), 
                                $options: 'i'
                            }
                        }            
                    ]
                }
            };
        }else if(player != "" && team == ""){
            options = {
                $match: {
                    text:{
                        $regex: new RegExp(playerplayer),
                        $options: 'i'
                    }  
                }
            };
        }else if( player == "" && team != ""){
            options = {
                $match: {
                    text:{
                        $regex: new RegExp(team),
                        $options: 'i'
                    }  
                }
            };
        }
    }else if (player_team_op == "AND"){
        if(player != "" && team != ""){
            options = {
                $match: {
                    $and:[
                        {
                            text:{
                                $regex: new RegExp(player),
                                $options: 'i'
                            }
                        },
                        {
                            text:{
                                $regex: new RegExp(team), 
                                $options: 'i'
                            }
                        }            
                    ]
                }
            };
        }else if(player != "" && team == ""){
            options = {
                $match: {
                    text:{
                        $regex: new RegExp(player),
                        $options: 'i'
                    }  
                }
            };
        }else if( player == "" && team != ""){
            options = {
                $match: {
                    text:{
                        $regex: new RegExp(team),
                        $options: 'i'
                    }  
                }
            };
        }
    }   

    console.log(options);


    Tweet.aggregate([
        options,
        { 
            "$group": {
                "_id": {
                    "year": { "$year": "$created_at" },
                    "month":{ "$month": "$created_at"},
                    "day": { "$dayOfMonth": "$created_at" } 
                },
                "count": { "$sum" : 1 }
            }
        },
        {"$sort": { "_id.month": 1,"_id.day": 1 }}
    ],function(err,response){
        console.log("getFrequency:")
        console.log(response);
        res.send(response);
    })
}

module.exports = tweets;
