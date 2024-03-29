const express = require('express');
const timeout = require('connect-timeout')
const cors = require('cors');
const routes = require('./routes');
const GoogleAuth = require('simple-google-openid');
const userIntercept = require('./modules/userIntercept');
const httpsIntercept = require('./modules/httpsIntercept');
require('dotenv/config');

const port = process.env.PORT || 3334;
const app = express();

var googleClientId = process.env.GOOGLE_CLIENT_ID || 'client_id';
//console.log(googleClientId);

//Valida utilização de HTTPS 
app.use(httpsIntercept.checkHttps);

//CORS
app.use(cors());

//Authenticação
app.use(GoogleAuth(googleClientId));
app.use(GoogleAuth.guardMiddleware());

//Trata dados do usuário
app.use(userIntercept.treatUser);

app.use(express.json());

app.use(timeout('60s'))
app.use(routes);

app.listen(port);