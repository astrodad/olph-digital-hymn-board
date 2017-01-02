// app/models/boardconfig.js

var mongoose = require('mongoose');


// define the schema for our user model
var boardSchema = mongoose.Schema({

    boardSlots    : {
        slot1     : String,
        slot2     : String,
		slot3     : String,
		slot4     : String,
		slot5     : String,
        slot6     : String,
    }, 

    boardType	  : String,
    boardImage	  : String,
    boardPlan	  : String,
    name          : String
    


});


// create the model for users and expose it to our app
module.exports = mongoose.model('Boardconfig', boardSchema);