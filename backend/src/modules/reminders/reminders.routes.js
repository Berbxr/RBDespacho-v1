// src/modules/reminders/reminders.routes.js
const express = require('express');
const remindersController = require('./reminders.controller');
const router = express.Router();

router.get('/', remindersController.getAll);
router.post('/', remindersController.create);
router.delete('/:id', remindersController.delete);

module.exports = router;