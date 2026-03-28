const express = require('express');
const billingController = require('./billing.controller');
const router = express.Router();

router.post('/emitir', billingController.emitir);

module.exports = router;