// services.routes.js
const express = require('express');
const servicesController = require('./services.controller');
const router = express.Router();

router.get('/', servicesController.getAll);
router.post('/', servicesController.create);
router.put('/:id', servicesController.update);
router.delete('/:id', servicesController.delete);

module.exports = router;