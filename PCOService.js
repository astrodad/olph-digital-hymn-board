// Private
var orgData;


// Public


// Constructor
function PCOService(orgData) {
	if (!(this instanceof PCOService)) {
		//console.log(orgData);
    	return new PCOService(orgData);
	}

	//console.log(orgData);
	this.orgName = orgData.data.attributes.name;
	this.serviceTypesURL = orgData.data.links.service_types;
	this.songsURL = orgData.data.links.songs;
  };
	
PCOService.prototype.getOrgName = function getOrgName(){
	return this.orgName;
};

module.exports = PCOService;
