'use strict';

const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const winston = require('winston');
const config = require('./');

const env = process.env.NODE_ENV || 'development';

module.exports = function(app) {

    // Compression middleware (should be placed before express.static)
    app.use(compression({
        threshold: 512
    }));

    app.use(cors());
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        next();
    });

    // Use winston on production
    let log = 'dev';
    if (env !== 'development') {
        log = {
            stream: {
                write: message => winston.info(message)
            }
        };
    }

    // Don't log during tests
    // Logging middleware
    if (env !== 'test') app.use(morgan(log));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
};
