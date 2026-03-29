const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');

// Rutas para CSD (Tareas 1 a 5)
router.post('/csds', billingController.subirCsd);               // Tarea 1
router.get('/csds', billingController.listarCsds);              // Tarea 2
router.get('/csds/:rfc', billingController.obtenerCsd);         // Tarea 3
router.put('/csds/:rfc', billingController.actualizarCsd);      // Tarea 4
router.delete('/csds/:rfc', billingController.eliminarCsd);     // Tarea 5

// Ruta para Emitir (Tarea 6)
router.post('/emitir', billingController.emitirCfdi);           // Tarea 6

router.post('/receptores', billingController.crearReceptor);
router.get('/receptores', billingController.listarReceptores);

module.exports = router;