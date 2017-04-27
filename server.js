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

module.exports = app;

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
  app.listen(port);
  console.log('Express app started on port ' + port);
}

function connect () {
  var options = { server: { socketOptions: { keepAlive: 1 } } };
  return mongoose.connect("mongodb://shahzebjaved23:lahore1@ds151289.mlab.com:51289/node_twitter", options).connection;
}
