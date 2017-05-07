var FB = require('fb');

FB.api('oauth/access_token', {
    client_id: '1427666977316536',
    client_secret: '1278d627caf286fc18b15f1df90512e1',
    grant_type: 'client_credentials'
}, function (res) {
    if(!res || res.error) {
        console.log(!res ? 'error occurred' : res.error);
        return;
    }
 
	var accessToken = res.access_token;
    FB.setAccessToken(accessToken);
});


module.exports = FB;