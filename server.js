/* Begin all the required stuff */
var express = require('express');
var app = express();
var session = require('express-session');
var debug = require('debug')('app');
var util = require('util');
var Path = require('path');
var request = require('request')
var router = express.Router();
var cache = require('apicache').options({ debug: true }).middleware;

var mongoose = require('mongoose');
var passport = require('passport');
var boardconfig = require('./models/boardconfig.js');


var flash    = require('connect-flash');
var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');

require('./config/passport')(passport); // pass passport for configuration


var PCOService = require("./PCOService");

var config = require('./config.json');

var database = require('./database');


const MongoClient = require('mongodb').MongoClient, assert = require('assert');

/* End all required stuff */

var appDB;

app.set('view engine', 'ejs'); // set up ejs for templating
app.set('views', Path.resolve(__dirname, 'views'));
app.use(session({secret: config.sessionSecret})); // session secret

/* Set up the application */
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms
app.use(flash()); // use connect-flash for flash messages stored in session

/* Connect to the database, or do nothing at all */
MongoClient.connect(config.dbService, function function_name (err, db) {
      assert.equal(null, err);
  console.log("Connected correctly to database server at " + config.dbService);
  appDB = db;
  mongoose.connect(config.dbService); // connect to our database

  /* Using passport for user login */
  app.use(passport.initialize());
  app.use(passport.session());
    
  console.log("Testing connection to Planning Center...");

  /* Log on to planning center */
  var orgInfo = request.get(config.pcoServiceURLs.organizationInfo, {
      'auth': {
      'user': config.auth.applicationID,
      'pass': config.auth.applicationSecret,
      'sendImmediately': false
      }
  }, function (err, res) {
      var orgData = JSON.parse(res.body); 
      pcoAppInstance = new PCOService(orgData);
      console.log("Connected app to PCO service for " + pcoAppInstance.getOrgName())

      /* Get the upcoming service info and cache, etc.  */
      //TODO
  });


  /* Start the web server */
  var server = app.listen(config.port, function () {

    app.route('/login')

      .get(function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage')});
      })

      // process the login form
      .post(passport.authenticate('local-login', {
        successRedirect : '/admin', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    app.route('/signup')
      // show the signup form
      .get(function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
      })


     // process the signup form
      .post(passport.authenticate('local-signup', {
        successRedirect : '/admin', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

   
    app.route('/logout')
      .get(function(req, res) {
        req.logout();
        res.redirect('/');
    });
 
    app.route('/logout')
    /* Main hymn board UI */
      .get(function(req, res){

          res.render('hymnboard', {
              hbconfig: database.getCurrentConfiguration(appDB)
          });

      });

    /* This is the admin page to show UI for creating the configuration. */
    app.route('/admin')
      .get(isAdminUser, function (req, res) {
        console.log("Getting plans...");
        res.render('admin');
        
    });

    app.route('/board') 
      .get(function (req, res) {
        res.render('hymnboard');
    });

    app.use('/scripts', express.static(__dirname + '/node_modules/bootstrap/dist/'));  
    app.use('/public', express.static(__dirname + '/public'));

    app.route('/')

    // home page
    .get(function(req, res) {
        console.log("Hit home");
        res.render('index', {

            orgName: pcoAppInstance.getOrgName()
        });
    });

   
   /* API's used internally */
   app.route('/plans')
    .get(function(req, res) {
      console.log("Getting upcoming plans");
      
      pcoAppInstance.getUpComingPlans(request, function (err, data){
       if (err) {
        handleError(res, err.message, "Failed to get plans.");

       } else {
        //console.log(data);
        res.json(data); 
        //res.sendStatus(200)
       }

      })

    
      
    });

    app.route('/plans/:planid')
      .get(cache('1 minute'), function(req, res){
        planid = req.params.planid;
        console.log('Getting plan for planid ' + planid);
        pcoAppInstance.getPlanInfo(request,planid, function(err, data) {
          if (err) {
            //read from cache?
          } else {
            res.json(data);
          }

        });


    });

    app.route('/boardconfig')
      .get(cache('10 seconds'), function (req, res) {

        //TODO: change to use async custom validators
        boardconfig.find(function (err, bdconfigs) {
          if (err) {
            //no board config found
            res.json('{"error": "No board configuration exists."}');
          } else {
            res.json(bdconfigs);
          }
          
          
        });


      })

      .post(function (req, res) {

        //Check if one exists already
        boardconfig.find({name: 'primary'}, function (err, docs){
          if (docs.length) {
            //document exists, return docs
            console.log('Not creating default board config since it already exists.');
            res.json(docs);
          } else {
            boardconfig.create({

              name: 'primary'

            }, function (err, boardcfg){

            if (err)
                res.send(err);

            boardconfig.find(function(err, bdconfigs) {
              if (err) 
                res.send(err);
              res.json(bdconfigs);
              });
            });
          }


        })
        


      });



    router.use('/', router);
    var host = server.address().address;
    var port = server.address().port;
    console.log('Digital Hymnboard app listening at http://%s:%s', host, port);


  });

});

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        res.locals.user = req.user;
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}

function isAdminUser(req, res, next) {

    console.log("Hit our admin user check");
    console.log(req);
    if (req.isAuthenticated() && (req.user.local.username == 'admin')) {
        res.locals.user = req.user;

        return next();
    } else {
      res.redirect('/login');
    }
}

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

function testFunction(request, callback) {
  console.log('hello world');
  return callback(null, data);
}

