// BASE SETUP
// =============================================================================

// call the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var app = express();

var morgan = require('morgan');
var config = require('./config');
var mongoose = require('mongoose');

// configure app
app.use(morgan('dev')); // log requests to the console

// configure body parser
app.use(bodyParser.json()); // parse application/json 
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(bodyParser.urlencoded({ extended: true })); // parse application/x-www-form-urlencoded

app.use(methodOverride('X-HTTP-Method-Override')); // override with the X-HTTP-Method-Override header in the request. simulate DELETE/PUT

// Use the session middleware
app.use(cookieParser());

//-------------
var port     = process.env.PORT || 7001; // set our port

// CREATE OUR ROUTER
require('./route')(app);


mongoose.connect(config.DB_URI); // connect to database

mongoose.connect(config.DB_URI)
    .then(() =>  console.log('connection succesful'))
    .catch((err) => console.error(err));

// START THE SERVER
// =============================================================================
app.listen(port);
//console.log('Requests on port:' + port);
exports = module.exports = app;
