const hubspot = require('@hubspot/api-client');
   
//Get all deals associated with contacts
const getContact = async(accessToken,id)=>{
  const hubspotClient = new hubspot.Client({"accessToken":accessToken});
  const contactId = id;
  const properties = [
    "firstname",
    "lastname",
    "phone"
  ];
  const propertiesWithHistory = undefined;
  const associations = undefined;
  const archived = false;
  
  try {
    const apiResponse = await hubspotClient.crm.contacts.basicApi.getById(contactId, properties, propertiesWithHistory, associations, archived);
    console.log(JSON.parse(JSON.stringify(apiResponse, null, 2)));
    return JSON.parse(JSON.stringify(apiResponse, null, 2));
  } catch (e) {
    e.message === 'HTTP request failed'
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e)
  }
  
  }
  

module.exports= {getContact:getContact};
      
  