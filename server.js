var express = require('express');
var app = express();
var session = require('express-session');
var debug = require('debug')('app');
var util = require('util');
var Path = require('path');
var request = require('request')
var database = require('./database');

var PCOService = require("./PCOService");
var pcoAppInstance;
var config = require('./config.json');

const MongoClient = require('mongodb').MongoClient, assert = require('assert');
var appDB;

app.set('view engine', 'ejs');
app.set('views', Path.resolve(__dirname, 'views'));

MongoClient.connect(config.dbService, function function_name (err, db) {
      assert.equal(null, err);
  console.log("Connected correctly to database server at " + config.dbService);
  appDB = db;
  
  console.log("Testing connection to Planning Center...");

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
  });

  var server = app.listen(config.port, function () {


    var host = server.address().address;
    var port = server.address().port;
    console.log('Digital Hymnboard app listening at http://%s:%s', host, port);


  });


});

/* Application main page which includes basic info and login page. */
app.get('/', function(req, res) {

    res.render('index', {

    	orgName: pcoAppInstance.getOrgName()
    });
});

/* Main hymn board UI */
app.get('/hymnboard', function(req, res){

  res.render('hymnboard', {
    hbconfig: database.getCurrentConfiguration(appDB)
  });

});

/* This is the admin page to show UI for creating the configuration. */
app.get('/admin', function (req, res) {
  console.log("Showing the admin page...");
  res.render('admin', {
    something: "nothing to see here"
  });
});