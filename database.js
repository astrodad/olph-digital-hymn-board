var config = require('./config.json');
const configCollection = "configuration";

module.exports = {


	getCurrentConfiguration: function (database) {

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
	}
}
