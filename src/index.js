const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const GoogleAuth = require('simple-google-openid');

const port = process.env.PORT || 3333;
const environment = process.env.NODE_ENV || 'development';
const app = express();

var googleClientId = process.env.GOOGLE_CLIENT_ID || 'client_id';
console.log(googleClientId);
app.use(GoogleAuth(googleClientId));
app.use(GoogleAuth.guardMiddleware());

app.use(cors());
app.use(express.json());
app.use(function(req, res, next) {
    if( environment !== 'development' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.status(403).send({message: 'SSL required'});
    }
    // allow the request to continue
    next();
});

app.use(routes);

app.listen(port);
