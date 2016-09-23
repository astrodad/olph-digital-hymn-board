var config = require('./config.json');


module.exports = {


	getCurrentConfiguration: function (database, config) {

		var collection = database.collection(configCollection);

		var cursor = collection.find({name: 'main configuration'});

		cursor.limit(1);

		cursor.each(function (err, doc) {

			if (err) {
				console.log("Error retrieving configuration. Check the database.");
			} else {
				console.log("Found main configuration.");
				console.log(doc);
				doc;
			}
		});
	},


	getBoardConfiguration: function (database, config, callback) {

		console.log('Someone requested the board configuration');
		collection = database.collection("Boardconfig");
		cursor = collection.find({name: 'primary'});
		cursor.limit(1);

		cursor.each(function (err, doc){

			if (err || doc == null) {
				console.log('Error getting the board configuration: unable to access collection in database');
			} else if (doc != null) {

				console.log('Board configuration found: ' + doc);
				return callback(err, doc);
			}

			
			return callback(err, doc);
		}) ;

	}
}
