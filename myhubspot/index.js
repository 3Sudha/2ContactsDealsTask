require('dotenv').config();
const express = require('express');
const request = require('request-promise-native');
const NodeCache = require('node-cache');
const session = require('express-session');
const bodyParser=require("body-parser");
const opn = require('open');
const hubspot = require('@hubspot/api-client');
const app = express();
const Conts= require('./routes/contacts');
const MyDeals=require('./routes/deals');
const MyAssociatedDeals = require('./routes/deals');
const axios = require('axios');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

const PORT = 3001;
const nextCache = new NodeCache({ deleteOnExpire: true });
const userCache = new NodeCache({ deleteOnExpire: true });

const refreshTokenStore = {};
const accessTokenCache = new NodeCache({ deleteOnExpire: true });

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
    throw new Error('Missing CLIENT_ID or CLIENT_SECRET environment variable.')
}

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Scopes for this app will default to `crm.objects.contacts.read`
// To request others, set the SCOPE environment variable instead
let SCOPES = ['crm.objects.contacts.read'];
if (process.env.SCOPE) {
    SCOPES = (process.env.SCOPE.split(/ |, ?|%20/)).join(' ');
}

// On successful install, users will be redirected to /oauth-callback
const REDIRECT_URI = `https://migration.niswey.net/sudha/oauth-callback`;


// Use a session to keep track of client ID
app.use(session({
  secret: Math.random().toString(36).substring(2),
  resave: false,
  saveUninitialized: true
}));

//   Running the OAuth 2.0 Flow   //
// Step 1
// Build the authorization URL to redirect a user
// to when they choose to install the app
const authUrl =
'https://app.hubspot.com/oauth/authorize?client_id=e817b5a6-9341-40bf-a8d4-61e9b0b59f94&redirect_uri=https://migration.niswey.net/sudha/oauth-callback&scope=crm.objects.contacts.read%20crm.objects.deals.read';
// Redirect the user from the installation page to
// the authorization URL
app.get('/install', (req, res) => {
  console.log('');
  console.log('=== Initiating OAuth 2.0 flow with HubSpot ===');
  console.log('');
  console.log("===> Step 1: Redirecting user to your app's OAuth URL");
  res.redirect(authUrl);
  console.log('===> Step 2: User is being prompted for consent by HubSpot');
});

// Step 2
// The user is prompted to give the app access to the requested
// resources. This is all done by HubSpot, so no work is necessary
// on the app's end

// Step 3
// Receive the authorization code from the OAuth 2.0 Server,
// and process it based on the query parameters that are passed
app.get('/oauth-callback', async (req, res) => {
  console.log('===> Step 3: Handling the request sent by the server');

  // Received a user authorization code, so now combine that with the other
  // required values and exchange both for an access token and a refresh token
  if (req.query.code) {
    console.log('       > Received an authorization token');

    const authCodeProof = {
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: req.query.code
    };

    // Step 4
    // Exchange the authorization code for an access token and refresh token
    console.log('===> Step 4: Exchanging authorization code for an access token and refresh token');
    const token = await exchangeForTokens(req.sessionID, authCodeProof);
    if (token.message) {
      return res.redirect(`/error?msg=${token.message}`);
    }

    // Once the tokens have been retrieved, use them to make a query
    // to the HubSpot API
    res.redirect(`/sudha`);
  }
});

//   Exchanging Proof for an Access Token   //
const exchangeForTokens = async (userId, exchangeProof) => {
  try {
    const responseBody = await request.post('https://api.hubapi.com/oauth/v1/token', {
      form: exchangeProof
    });
    // Usually, this token data should be persisted in a database and associated with
    // a user identity.
    const tokens = JSON.parse(responseBody);
    refreshTokenStore[userId] = tokens.refresh_token;
    accessTokenCache.set(userId, tokens.access_token, Math.round(tokens.expires_in * 0.75));

    console.log('> Received an access token and refresh token');
    return tokens.access_token;
  } catch (e) {
    console.error(`       > Error exchanging ${exchangeProof.grant_type} for access token`);
    return JSON.parse(e.response.body);
  }
};

const refreshAccessToken = async (userId) => {
  const refreshTokenProof = {
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    refresh_token: refreshTokenStore[userId]
  };
  return await exchangeForTokens(userId, refreshTokenProof);
};

const getAccessToken = async (userId) => {
  // If the access token has expired, retrieve
  // a new one using the refresh token
  if (!accessTokenCache.get(userId)) {
    console.log('Refreshing expired access token');
    await refreshAccessToken(userId);
  }
  return accessTokenCache.get(userId);
};

const isAuthorized = (userId) => {
  return refreshTokenStore[userId] ? true : false;
};

//Get Deals//
app.get("/deals",async(req,res)=>{
  if (isAuthorized(req.sessionID)) 
  {
    const accessToken = await getAccessToken(req.sessionID);
    //const deals=await MyDeals.getDeals(accessToken);
    //const selectedDeals= MyAssociatedDeals.AssociatedDeals(deals);
    var direction="Next";
    
    if (!nextCache.get(req.sessionID)) {
      var deals=await MyDeals.getDeals(accessToken,undefined);
    }

    else{
      var deals=await MyDeals.getDeals(accessToken,nextCache.get(req.sessionID));
    }

    var DealsParameter= [];
    var deal;
    for (deal of deals)
    {  
     if(deal.associations!= null||undefined)
     {
     const contactId= deal.associations.contacts.results[0].id;
     const contact = await Conts.getContact(accessToken,contactId);
     DealsParameter.push(
      {
        dealname: deal.properties.dealname, 
        amount:deal.properties.amount,
        firstname:contact.properties.firstname,
        lastname:contact.properties.lastname,
        phone:contact.properties.phone
      });
     }
     else{
      DealsParameter.push(
        {
          dealname: deal.properties.dealname, 
          amount:deal.properties.amount,
          firstname:"null",
          phone:"null"

        });
       
     }
    }
    console.log(DealsParameter) 
    res.render("deals", {deals:DealsParameter,direction : direction,userdata:userCache.get(req.sessionID)});
  }
  else {
    res.write(`<a href="/sudha/install"><h3>Install the app</h3></a>`);
  }
  res.end();
  
})


app.get('/', async (req, res) => {
  // res.setHeader('Content-Type', 'text/html');
  // res.write(`<h2>My App</h2>`);
  if (isAuthorized(req.sessionID)) {
  const accessToken = await getAccessToken(req.sessionID);
  const details = await axios.get(`https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`)
      const user_id = details.data.user
      const portal_id = details.data.hub_id

      const userdata = {user_id :user_id, portal_id: portal_id};
      userCache.set(req.sessionID,userdata,1800)
    
    res.render("home",{userdata:userCache.get(req.sessionID)});
  
  } 
  else{
    res.write(`<a href="/sudha/install"><h3>Install the app</h3></a>`);
  }
  
  res.end();
});

//Destroy SessionId
app.get("/logout", function(req, res) {
  res.render("logout");
  req.session.destroy(() => {
    accessTokenCache.flushAll();
  });
})

app.get('/error', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.write(`<h4>Error: ${req.query.msg}</h4>`);
    res.end();
});


app.listen(PORT, () => console.log(`App is Running on Server ${PORT} `));
opn(`http://localhost:${PORT}`);
  
  