const hubspot = require('@hubspot/api-client');

const getDeals= async(accessToken)=>{
    console.log(accessToken);
    const hubspotClient = new hubspot.Client({"accessToken":accessToken});
    
    
    const limit = 10;
    const after = undefined;
    const properties = undefined;
    const propertiesWithHistory = undefined;
    const associations = [  
      "contacts",
      null
      ];
    const archived = false;
    
    try {
      const apiResponse = await hubspotClient.crm.deals.basicApi.getPage(limit, after, properties, propertiesWithHistory, associations, archived);
      //console.log(apiResponse, null, 2);
      
      // console.log(JSON.parse(JSON.stringify(apiResponse, null, 2)).results[7]);
      return JSON.parse(JSON.stringify(apiResponse, null, 2)).results;
      
    
    
    } catch (e) {
      e.message === 'HTTP request failed'
        ? console.error(JSON.stringify(e.response, null, 2))
        : console.error(e)
    }
    
    }
// const AssociatedDeals= (deals) =>{
// const selected= deals.filter((deal)=>{                                                                                                                                                                                            
//           if (deal.associations=== undefined || null)
//           {
//             return false;
//           }
//           else{
//             return true;
//           }
//           //const Contdeal= deal.associations.contacts.results[0];
//         })
//         return selected;
//       }  
    
module.exports={
    getDeals:getDeals
    //,AssociatedDeals:AssociatedDeals
}