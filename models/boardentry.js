var mongoose = require('mongoose');


// define the schema for our user model
var boardEntrySchenma = mongoose.Schema({

    boardSlot     : String,
    slotType      : String,  //H for Hymna, WS for Worship Supplement
    slotText      : String
    
});


// create the model for users and expose it to our app
module.exports = mongoose.model('boardEntry', boardEntrySchenma);