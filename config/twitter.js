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
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    token: "197496793-yVnc4tIs1ORhgjJq6ZvpAABADzLVArmD4jIAUULy",
    token_secret: "mn4RpqZfP1NLm6mmZb154uZ4nMNIJ1UHPwPsfopcVwYU7",
    bearer_token: process.env.BEARER_TOKEN
}

module.exports = {
    REST: new twitterRest(keys),
    STREAM: new twitterStream(keys, [true, { gzip: true }])
}
