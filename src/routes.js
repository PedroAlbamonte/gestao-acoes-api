const express = require('express');

const OperationsController = require('./controllers/OperationsController');
const StocksController = require('./controllers/StocksController');
const DarfsController = require('./controllers/DarfsController');

const routes = express.Router();

routes.get('/operations', OperationsController.index);
routes.post('/operations', OperationsController.create);
routes.delete('/operations/:id', OperationsController.delete);

routes.get('/stocks', StocksController.index);
routes.post('/teste', StocksController.teste);

routes.get('/darfs', DarfsController.index);

routes.get('/', function(req, res, next) {
    res.json({ status: "OK"});
});

module.exports = routes;
