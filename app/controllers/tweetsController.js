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
        TwitterREST.get('search/tweets', { q: searchStringREST, count: 100, max_id: max_id || null }, function(error, tweets, response) {

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

        console.log(tweet.id_str, tweet.user.screen_name, tweet.text);

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
        res.send(tweets)
    });





    //findTweetsBySTREAM(player, team, author);

}

// "scripts": {
  //   "start": "./node_modules/.bin/cross-env NODE_ENV=production ./node_modules/.bin/nodemon server.js",
  //   "debug": "./node_modules/.bin/cross-env NODE_ENV=development ./node_modules/.bin/nodemon --debug server.js",
  //   "test": "./node_modules/.bin/cross-env NODE_ENV=test ./node_modules/.bin/babel-tape-runner test/test-*.js"
  // },

module.exports = tweets;
