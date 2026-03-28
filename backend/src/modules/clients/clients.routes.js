// clients.routes.js
const express = require('express');
const clientsController = require('./clients.controller');
const router = express.Router();

router.get('/', clientsController.getAll);
router.post('/', clientsController.create);
router.put('/:id', clientsController.update);
router.delete('/:id', clientsController.delete);
router.patch('/:id/status', clientsController.toggleStatus);
router.get('/:id/history', clientsController.getClientHistory);


module.exports = router;