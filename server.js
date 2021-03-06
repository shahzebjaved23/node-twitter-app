'use strict';

require('dotenv').config();

const fs = require('fs');
const join = require('path').join;
const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');

const models = join(__dirname, 'app/models');
const port = process.env.PORT || 5000;
const app = express();
var http = require('http').Server(app);
var io = require('socket.io').listen(http);

module.exports = app;
module.exports.io = io;

// Bootstrap models
fs.readdirSync(models)
  .filter(file => ~file.search(/^[^\.].*\.js$/))
  .forEach(file => require(join(models, file)));

// Bootstrap routes
require('./config/express')(app);
require('./config/routes')(app);

connect()
  .on('error', console.log)
  .on('disconnected', connect)
  .once('open', listen);


function listen () {
  if (app.get('env') === 'test') return;
  http.listen(port);
  console.log('Express app started on port ' + port);
}

function connect () {
  var options = { 
    server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } },
    replset: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } } 
  };
  return mongoose.connect("mongodb://root:password@ds123351.mlab.com:23351/nodetwitter", options).connection;
  // return mongoose.connect("mongodb://localhost/SoccerTransfer", options).connection;
}

  // "scripts" :
  //   {  "start" : "./node_modules/pm2/bin/pm2 start server.js" 
  // },
