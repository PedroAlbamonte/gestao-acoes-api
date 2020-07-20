const express = require('express');

const OperationsController = require('./controllers/OperationsController');
const StocksController = require('./controllers/StocksController');
const DarfsController = require('./controllers/DarfsController');
const SecurityController = require('./controllers/SecurityController');

const routes = express.Router();

routes.get('/operations', OperationsController.index);
routes.post('/operations', OperationsController.create);
routes.delete('/operations/:id', OperationsController.delete);

routes.get('/stocks', StocksController.index);

routes.get('/darfs', DarfsController.index);

routes.get('/security/validate', SecurityController.validade);

routes.get('/', function(req, res, next) {
    res.json({ status: "OK"});
});

module.exports = routes;
