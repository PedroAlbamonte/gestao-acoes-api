const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const port = process.env.PORT || 3333;
const app = express();

app.use(cors());
app.use(express.json());
app.use(function(req, res, next) {
    if(req.protocol !== 'https') {
        return res.status(403).send({message: 'SSL required'});
    }
    // allow the request to continue
    next();
});

app.use(routes);

app.listen(port);
