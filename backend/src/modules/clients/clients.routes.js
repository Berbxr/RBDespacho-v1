const express = require('express');
const router = express.Router();
const clientsController = require('./clients.controller');

// Obtener todos los clientes (Soporta query params: ?search=Juan&skip=0&take=10&isActive=true)
router.get('/', (req, res, next) => clientsController.getAll(req, res, next));

// Obtener un cliente por ID
router.get('/:id', (req, res, next) => clientsController.getById(req, res, next));

// Obtener el historial de pagos y recurrencia del cliente (NUEVO)
router.get('/:id/history', (req, res, next) => clientsController.getHistory(req, res, next));

// Crear un nuevo cliente
router.post('/', (req, res, next) => clientsController.create(req, res, next));

// Actualizar un cliente por ID
router.put('/:id', (req, res, next) => clientsController.update(req, res, next));

// Eliminar (Soft delete) un cliente por ID
router.delete('/:id', (req, res, next) => clientsController.delete(req, res, next));

module.exports = router;