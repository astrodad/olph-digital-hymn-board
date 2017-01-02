// Private
var orgData;


// Public


// Constructor
function PCOService(orgData) {
	if (!(this instanceof PCOService)) {
		//console.log(orgData);
    	return new PCOService(orgData);
	}

	this.orgName = orgData.data.attributes.name;
	this.songsURL = orgData.data.links.songs;

	/* URL for retrieving upcoming services, which uses a service type set in the config
	
	https://api.planningcenteronline.com/services/v2/service_types/256986/plans?filter=future
	
	 */
	
	var appConfig = require('./config.json');
	
	this.upComingServicesUrl = orgData.data.links.service_types + '/' + appConfig.massServiceType + "/plans?filter=future";
	this.individualPlanURL = orgData.data.links.service_types + '/' + appConfig.massServiceType + "/plans";
	console.log('Services URL: ' + this.upComingServicesUrl);
	console.log('Individual Plan URL' + this.individualPlanURL);

	var appConfig = require('./config.json');

	this.getConfig = function() {
		return appConfig;
	}

  };
	
PCOService.prototype.getOrgName = function getOrgName(){
	return this.orgName;
};

PCOService.prototype.getUpComingPlans = function getUpComingPlans(req, callback) {

	/* Using the this.upComingServicesUrl, get the upcoming plans */
	processPCORequest(this, req, this.upComingServicesUrl, this.getConfig(), function (err, data) {
      upcomingPlans = data; 

      //if (err) { console.log(error)}; //TODO: handle better

      console.log(upcomingPlans.data);
      return callback(null, upcomingPlans.data);
		     
  });

}

PCOService.prototype.getPlanInfo = function getPlanInfo(req, plan, callback) {

	planurl = this.individualPlanURL + '/' + plan;
	var config = this.getConfig();
	self = this;

	processPCORequest(this, req, planurl, function (err, planInfo) {
    	if (err) { console.log('Error retrieving plan: ' + err)};
     	
     	title = planInfo.data.attributes['title'];
     	id = planInfo.data.id;
     	date = planInfo.data.attributes['sort_date'];


     	//Retrive the notes for the plan
     	notesurl = planurl + '/notes';
     	console.log('config-self: ' + self.getConfig());
     	var planNotesResults = processPCORequest(self, req, notesurl, function (err, notesres) {


      		//handle error
      		var notesInfo = notesres.data;
      		console.log(notesInfo);

          if (notesInfo.length) {

            for (var note in notesInfo) {
              console.log(note);
              if (notesInfo[note].attributes['category_name'] == 'Audio/Visual') {
                noteText = notesInfo[note].attributes['content']
              }

            }
          }
      		


      		var planDetails = {
      			'id' 	: id,
      			'title'	: title,
      			'date' 	: date,
      			'boardEntries' : (typeof noteText !== 'undefined' ? noteText.split('\r\n') : 'no board entries found') 

      		}

      		console.log('Plan details: ' + planDetails);

      		return callback(null, planDetails);
      	
     	});
    	

	});
}


function processPCORequest(pcoservice, request, url, callback) {

	 console.log('Processing URL request: ' + url);

	/* Log on to planning center */
	var results = request.get(url, {
      'auth': {
      'user': pcoservice.getConfig().auth.applicationID,
      'pass': pcoservice.getConfig().auth.applicationSecret,
      'sendImmediately': false
      }
  }, function (err, res) {
      var getresults = JSON.parse(res.body); 
      return callback(err, getresults);

      
  });


}

module.exports = PCOService;
