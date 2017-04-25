'use strict';

const config = require('.')
const twitterRest = require('twitter');
const twitterStream = require('twitter-stream-api');

/* Twitter OAuth Keys 
 * as to Connect to both REST and STREAM APIs
 * 
 * --
 * More details on libraries could be foun at :
 * REST: https://github.com/desmondmorris/node-twitter
 * STREAM: https://github.com/trygve-lie/twitter-stream-api
*/

const keys = {
    consumer_key: config.twitter.consumer_key,
    consumer_secret: config.twitter.consumer_secret,
    token: config.twitter.token,
    token_secret: config.twitter.token_secret,
    bearer_token: config.twitter.bearer_token
};

module.exports = {
    REST: new twitterRest(keys),
    STREAM: new twitterStream(keys, [true, { gzip: true }])
}
