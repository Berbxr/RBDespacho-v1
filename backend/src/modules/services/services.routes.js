const express = require('express');
const servicesController = require('./services.controller');
const router = express.Router();

router.get('/', (req, res, next) => servicesController.getAll(req, res, next));
router.post('/', (req, res, next) => servicesController.create(req, res, next));
// PUT se usa para actualizar el nombre o reactivarlo enviando { isActive: true }
router.put('/:id', (req, res, next) => servicesController.update(req, res, next)); 
// DELETE se usa para el soft-delete (borrado lógico)
router.delete('/:id', (req, res, next) => servicesController.delete(req, res, next));

module.exports = router;