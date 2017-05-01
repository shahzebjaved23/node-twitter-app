const mongoose = require('mongoose');
const Tweet = mongoose.model('Tweet');
const TwitterREST = require('../../config/twitter').REST;
const TwitterSTREAM = require('../../config/twitter').STREAM;
const _ = require('lodash');

var tweets = {};

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

        var since;

        Tweet.find().exec(function(err,data){
            if(err){
                console.log(err)
            }else{
                if(data[0] != null){
                    since = data[0].created_at; 
                    searchStringREST = searchStringREST + " since : " + since;
                }
            }
        })

        console.log(searchStringREST);

        console.log(since)

        TwitterREST.get('search/tweets', { q: searchStringREST, count: 300, since: since }, function(error, tweets, response) {
            
            /*
             * Removing retweets from returned tweets to save memory,
             * and to avoid duplicates
             */
            // _.remove(tweets.statuses, function(t) {
            //     return (!!t.retweeted_status)
            // });

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

function findTweetsBySTREAM(player, team, author) {

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
            return TweetsFromStream;

        }, 10 * 1000); //time in mills.

        // console.log(tweet.id_str, tweet.user.screen_name, tweet.text);

        /* 
         * using lodash conforms method to check if the returned tweet
         * matches the search criteria we need for player, team..
         *
         */
        var   found    = _.conformsTo(tweet, {
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

        if (found) { TweetsFromStream.push(tweet); }
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

tweets.find = function(req, res) {

    var player = req.query.player;
    var team = req.query.team;
    var author = req.query.author || '';



    // var playerModel = new Player();

    // var tweet = new Tweet({author: author,player: });


    
    /* Each request retrieve max 100 tweets,
     * Here you get multiple requests to get more than 100 tweets if available.
     */
    findTweetsByREST(player, team, author).then((tweets) => {
        // findTweetsByREST(player, team, author, tweets.search_metadata.max_id).then((next_tweets) => {
        //     var allTweets = tweets.statuses.concat(next_tweets.statuses);
        //     console.log("tweets length: ", allTweets.length);
        //     res.send(allTweets);
        // });
        // tweets.statuses.forEach(function(tweet){
        //     Tweet.insert()
        // })

        
        // tweets.statuses.forEach(function(tweet){
        //     var newTweet = new Tweet({
        //         author: tweet.user.name,
        //         tweet:{
        //             id: tweet.id,
        //             text: tweet.text,
        //         },
        //         created_at: tweet.created_at,
        //         hashtags: tweet.entities.hashtags,
        //         author_link: tweet.entities.urls.url,
        //         tweet_link: tweet.entities.urls.expanded_url
        //     });

        //     newTweet.save(function(err,data){
        //         if(err){
        //             console.log(err)
        //         }else{
        //             console.log(data)
        //         }
        //     }); 
        // })

        Tweet.find().exec(function(err,ntweets){
            if(err){
                console.log(err)
            }else{
                if(ntweets.length > 0){
                    res.send(ntweets)
                }
                // else{
                //     res.send(tweets);
                // }
            }
        })

         // res.send(tweets);
        
    });


    // insert the tweets and insert into the db
    // get the next tweets after the created_at of the last tweet,
    // uset he aggregation framework of the mongodb for getting the frequesncies
    // make sure the db and the api can be adequately queried 





    //findTweetsBySTREAM(player, team, author);

}

tweets.getTweetsByRest = function(req,res){

    var player = req.query.player;
    var team = req.query.team;
    var author = req.query.author;

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


    Tweet.find().sort({created_at: -1}).exec(function(err,data){
        if(err){
            console.log(err)
        }else{
            
            if(data.length > 0){
                console.log("if")
                // searchStringREST = searchStringREST + " since_id:" + data[data.length - 1].twitter_id;
                
                TwitterREST.get('search/tweets', { q: searchStringREST, since_id: data[data.length-1].twitter_id }, function(error, tweets, response){
                    
                    console.log(tweets.statuses.length)
                    
                    var statuses = tweets.statuses.sort(function(a,b){
                        return new Date(a.created_at) - new Date(b.created_at);
                    });

                    statuses.forEach(function(tweet,index){
                        // if (index != 0){
                            var newTweet = new Tweet({
                                twitter_id: tweet.id,
                                author: tweet.user.name,
                                tweet:{
                                    id: tweet.id,
                                    text: tweet.text,
                                },
                                created_at: tweet.created_at,
                                hashtags: tweet.entities.hashtags,
                                author_link: tweet.user.url,
                                tweet_link: tweet.entities.urls.expanded_url,
                                profile_image_url: tweet.user.profile_image_url
                            });

                            newTweet.save(function(err,data){
                                if(err){
                                    console.log(err)
                                }else{
                                    // console.log(data)
                                }
                            });    
                        // }
                            
                    })

                    Tweet.find().sort({created_at: -1}).exec(function(err,data){
                        if(err){
                            console.log(err)
                        }else{
                            res.send(data)        
                        }
                    })
                }) 
            }else{
                console.log("else")
                TwitterREST.get('search/tweets', { q: searchStringREST, count: 300 }, function(error, tweets, response){
                    console.log(tweets.statuses.length);
                    var statuses = tweets.statuses.sort(function(a,b){
                        return new Date(a.created_at) - new Date(b.created_at);
                    });

                    // tweets.statuses.forEach(function(tweet){
                    //     console.log(tweet.created_at);
                    // })
                    if(statuses != null){
                        statuses.forEach(function(tweet){
                            
                            var newTweet = new Tweet({
                                twitter_id: tweet.id,
                                author: tweet.user.name,
                                tweet:{
                                    id: tweet.id,
                                    text: tweet.text,
                                },
                                created_at: tweet.created_at,
                                hashtags: tweet.entities.hashtags,
                                author_link: tweet.user.url,
                                tweet_link: tweet.entities.urls.expanded_url,
                                profile_image_url: tweet.user.profile_image_url
                            });

                            newTweet.save(function(err,data){
                                if(err){
                                    console.log(err)
                                }else{
                                    // console.log(data)
                                }
                            }); 
                        })

                        Tweet.find().sort({created_at: -1}).exec(function(err,data){
                            if(err){
                                console.log(err)
                            }else{
                                res.send(data)        
                            }
                        })    
                    }
                    
                    // res.send(tweets)
                }) 
            }
        }
    })
}


tweets.getFrequency = function(req,res){
    Tweet.aggregate([
        { "$group": {
            "_id": {
                 "year": { "$year": "$created_at" },
                 "month":{ "$month": "$created_at"},
                 "day": { "$subtract": [
                    {  "$dayOfMonth": "$created_at"  },
                    { "$mod": [
                         {  "$dayOfMonth": "$created_at"  },
                         1
                    ]}
                 ]} 
                    
            },
            "count": { "$sum" : 1 }
        }}
    ],function(err,response){
        res.send(response);
    })
}

// "scripts": {
  //   "start": "./node_modules/.bin/cross-env NODE_ENV=production ./node_modules/.bin/nodemon server.js",
  //   "debug": "./node_modules/.bin/cross-env NODE_ENV=development ./node_modules/.bin/nodemon --debug server.js",
  //   "test": "./node_modules/.bin/cross-env NODE_ENV=test ./node_modules/.bin/babel-tape-runner test/test-*.js"
  // },

module.exports = tweets;
