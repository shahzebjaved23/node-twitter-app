'use strict';

const qs = require('querystring'),
    request = require('request'),
    config = require('.'),
    playersController = require('../app/controllers/playersController'),
    teamsController = require('../app/controllers/teamsController'),
    tweetsController = require('../app/controllers/tweetsController');

module.exports = function(app) {

    app.get('/', function(req, res, next) {
        res.json({ API: 'twitter' });
    });

    app.get('/find', tweetsController.find);

    app.get('/get_twitter_bearer_token', function(req, res) {
        var consumer_key_base64 = config.twitter.consumer_key;
        var consumer_secret_base64 = config.twitter.consumer_secret;
        var bearer_credential = consumer_key_base64 + ':' + consumer_secret_base64;
        var bearer_credential_base64 = new Buffer(bearer_credential).toString('base64');

        console.log(bearer_credential_base64);
        var url = 'https://api.twitter.com/oauth2/token';
        request.post({
            url: url,
            headers: {
                'Authorization': 'Basic ' + bearer_credential_base64,
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: {
                grant_type: 'client_credentials'
            },
        }, function(err, response, body) {
            console.log(body);
            console.log(err);
            if (!err && response.statusCode == 200) {
                res.send(body);
            } else {
                res.send(err);
            }
        });
    })

};
