/* Begin all the required stuff */
var express = require('express');
var app = express();
var session = require('express-session');

const MongoStore = require('connect-mongo')(session);

var debug = require('debug')('app');
var util = require('util');
var Path = require('path');
var request = require('request')
var router = express.Router();
var cache = require('apicache').options({ debug: true }).middleware;

var mongoose = require('mongoose');
var passport = require('passport');

var boardconfig = require('./models/boardconfig.js');
var boardentry = require('./models/boardentry.js');


var flash    = require('connect-flash');
var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');

require('./config/passport')(passport); // pass passport for configuration


var PCOService = require("./PCOService");

var config = require('./config.json');

var database = require('./database');

var io = require('socket.io');
var passportSocketIo = require('passport.socketio');




const MongoClient = require('mongodb').MongoClient, assert = require('assert');

/* End all required stuff */

var appDB;

app.set('view engine', 'ejs'); // set up ejs for templating
app.set('views', Path.resolve(__dirname, 'views'));
// session secret

/* Set up the application */
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)


app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(flash()); // use connect-flash for flash messages stored in session

/* Connect to the database, or do nothing at all */
MongoClient.connect(config.dbService, function function_name (err, db) {
      assert.equal(null, err);
  console.log("Connected correctly to database server at " + config.dbService);
  appDB = db;
  mongoose.connect(config.dbService); // connect to our database

  var sessionStore = new MongoStore({ mongooseConnection: mongoose.connection });

  app.use(session({
    key: 'express.sid',
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false


  })); 



  /* Using passport for user login */
  app.use(passport.initialize());
  app.use(passport.session());

  /* This is just to lay the ground work for doing the updates to the hymnal via
  Planning Center */
    
  // console.log("Testing connection to Planning Center...");

  // /* Log on to planning center */
  // var orgInfo = request.get(config.pcoServiceURLs.organizationInfo, {
  //     'auth': {
  //     'user': config.auth.applicationID,
  //     'pass': config.auth.applicationSecret,
  //     'sendImmediately': false
  //     }
  // }, function (err, res) {
  //     var orgData = JSON.parse(res.body); 
  //     pcoAppInstance = new PCOService(orgData);
  //     console.log("Connected app to PCO service for " + pcoAppInstance.getOrgName())

  //     /* Get the upcoming service info and cache, etc.  */
  //     //TODO
  // });


  /* Start the web server */
  var server = app.listen(process.env.PORT || config.port, function () {

    var io = require('socket.io')(server);  //Connects server to socket.io

    console.log('Setting up socket to use passportsocketio');

    //With Socket.io >= 1.0
    io.use(passportSocketIo.authorize({
      cookieParser: cookieParser,       // the same middleware you registrer in express
      key:          'express.sid',       // the name of the cookie where express/connect stores its session_id
      secret:       config.sessionSecret,    // the session_secret to parse the cookie
      store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please
      success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
      fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
    }));


    function onAuthorizeSuccess(data, accept){
      console.log('successful connection to socket.io');

      // The accept-callback still allows us to decide whether to
      // accept the connection or not.
      accept(null, true);

      // OR

      // If you use socket.io@1.X the callback looks different
      accept();
    }

    function onAuthorizeFail(data, message, error, accept){
      if(error)
        throw new Error(message);
      console.log('failed connection to socket.io:', message);

      // We use this callback to log all of our failed connections.
      accept(null, false);

      // OR

      // If you use socket.io@1.X the callback looks different
      // If you don't want to accept the connection
      if(error)
        accept(new Error(message));
      // this error will be sent to the user as a special error-package
      // see: http://socket.io/docs/client-api/#socket > error-object
    }

    io.on('connection', function(socket){
       

        console.log('Connected socket client, sending ack...');
        socket.emit('message', {'message': 'Connected to hymnboard server.'});

        socket.on('test', function (data) {
          console.log('Got a test socket.io message');
          socket.emit('message', {'message': 'Got your test data: ' + data});
        });


        /* This single socket connection allows updates to the board entries aka slots */
        socket.on('slotUpdate', function(data) {

          if (socket.request.user.logged_in) {
            /* Client code to submit:
            slotObject: opts.object,
            slotAttribute: opts.attribute,
            slotValue: value */


            console.log('User logged in, allowing slot update.');
            slotObject = data.slotObject;       //This is an integer telling us which slot we have
            slotAttribute = data.slotAttribute; //This tells what we're updating (slotText, slotType)
            slotValue = data.slotValue;         //This tells us the new value

            var error;
            var updateResults;

            switch (slotAttribute) {
              case 'slotText':
                console.log('Updating text for slot: ' + slotObject + ' to ' + slotValue);
                boardentry
                  .findOneAndUpdate({boardSlot: slotObject}, {
                  $set: {
                    slotText: slotValue
                  }
                }, {}, (err, result) => {
                  if (err) error = err; 
                  console.log('Result of update' + result);
                  io.sockets.emit('slotTextUpdated', result);
                
                });
                break;
              case 'slotType':
              console.log('Updating slot type for slot: ' + slotObject + ' to ' + slotValue);
                boardentry
                  .findOneAndUpdate({boardSlot: slotObject}, {
                  $set: {
                    slotType: slotValue
                  }
                }, {}, (err, result) => {
                  if (err) error = err; 
                  io.sockets.emit('slotTypeUpdated', result);
                
                });
                break;
            }
          
            
          
          }


          

        });
      

    });

    



    app.route('/login')

      .get(function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage')});
      })

      // process the login form
      .post(passport.authenticate('local-login', {

        successRedirect : '/board', // redirect to the secure profile section
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
        res.render('/');
        
    });

    app.route('/board') 
      .get(function (req, res) {

        //Get all of the board entries and make them available to the render.
        boardentry.find(function (err, slots) {

          console.log('Is request authenticated? ' + req.isAuthenticated());
          res.render('hymnboard', {
            boardslots: slots,
            authenticated: req.isAuthenticated()
          });

        });
        
    });

    app.use('/scripts', express.static(__dirname + '/node_modules/bootstrap/dist/')); 
    app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/')); 
    app.use('/public', express.static(__dirname + '/public'));
    app.use('/font-awesome', express.static(__dirname + '/node_modules/font-awesome'));
    app.use('/fonts', express.static(__dirname + '/fonts'));

    app.route('/')

    // home page
    .get(function(req, res) {
        console.log("Hit home");
        res.render('index', {

            orgName: "Our Lady of Perpetual Help" //pcoAppInstance.getOrgName()
        });
    });

   
   /* API's used internally */
   app.route('/plans')
    .get(cache('1 second'), function(req, res) {
      console.log("Getting upcoming plans");
      
      pcoAppInstance.getUpComingPlans(request, function(err, data) {
       if (err) {
        handleError(res, err.message, "Failed to get plans.");

       } else {
        //console.log(data);
        res.json(data); 
        //res.sendStatus(200)
       }

      });

    
      
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



    app.route('/boardentry/:entryid')
      .get(cache('1 minute'), function(req, res){
        entryid = req.params.entryid;
        console.log('Getting entry data for entry id ' + entryid);
        boardentry.find({boardSlot: entryid}, function (err, boarddocs) {

          if (boarddocs.length) {
            res.json(boarddocs);
          } else {
            console.log('Did not find a board entry for slot ' + entryid);
            res.json(boarddocs);
          };


        });

        // pcoAppInstance.getPlanInfo(request,planid, function(err, data) {
        //   if (err) {
        //     //read from cache?
        //   } else {
        //     res.json(data);
        //   }

        // });


    });

     app.post('/boardentry', function (req, res) {

      console.log('Got request to update slot');
      
      var entryid = req.body['data-object'];


      //Check if one exists already
      boardentry.find({boardSlot: entryid}, function (err, docs){
        if (docs.length) {
          console.log('Found slot, returning');
          console.log(docs);
          res.json(docs);
        } else {
          console.log("Slot doesn't exist, so creating with id of " + entryid);

          boardentry.create({

            boardSlot: entryid //need to get the rest of the data from the board entry

          }, function (err, boardcfg){

          if (err)
              res.send(err);

          boardentry.find(function(err, boardentries) {
            if (err) 
              res.send(err);
            res.json(boardentries);
            });
          });
        }


      })

      });  

    //Get the board slot text alone
    app.route('/boardentry/slottext/:entryid')
      .get(cache('1 minute'), function (req, res) {
        entryid = req.params.entryid;
        console.log('Getting entry data for entry id ' + entryid);
        boardentry.find({boardSlot: entryid}, function (err, boarddocs) {

          if (boarddocs.length) {
            console.log(boarddocs);
            res.json(boarddocs[0].slotText);
          } else {
            console.log('Did not find a board entry for slot ' + entryid);
            res.json(boarddocs);
          };


        });


      })

      .post(function(req, res) {
       
        slotText = req.body['value'];
        slotNumber = req.body['object']
        console.log('Received new value for board slot text for ' + slotNumber);
        
        boardentry
          .findOneAndUpdate({boardSlot: slotNumber}, {
            $set: {
              slotText: slotText
            }
          }, {}, (err, result) => {
            if (err) return res.send(err);
            res.send(slotText)

          });


        
      });

      //Get the board slot type alone
    app.route('/boardentry/slottype/:entryid')
      .get(cache('1 minute'), function (req, res) {
        entryid = req.params.entryid;
        console.log('Getting entry slot type data for entry id ' + entryid);
        boardentry.find({boardSlot: entryid}, function (err, boarddocs) {

          if (boarddocs.length) {
            console.log(boarddocs);
            res.json(boarddocs[0].slotType);
          } else {
            console.log('Did not find a board entry for slot ' + entryid);
            res.json(boarddocs);
          };


        });


      })

      .post(function(req, res) {

        slotType = req.body['value'];
        slotNumber = req.body['object']
        console.log('Received new value for board slot type' + slotType);
        
        boardentry
          .findOneAndUpdate({boardSlot: slotNumber}, {
            $set: {
              slotType: slotType
            }
          }, {}, (err, result) => {
            if (err) return res.send(err)
            res.send(slotType)
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

