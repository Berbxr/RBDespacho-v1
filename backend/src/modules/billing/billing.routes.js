const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');

// ==========================================
// 1. CERTIFICADOS (CSD) Y EMISORES
// ==========================================
router.post('/csds', billingController.subirCsd);               // Tarea 1: Subir y crear
router.get('/csds', billingController.listarCsds);              // Tarea 2: Listar todos
router.get('/csds/:rfc', billingController.obtenerCsd);         // Tarea 3: Obtener uno
router.put('/csds/:rfc', billingController.actualizarCsd);      // Tarea 4: Actualizar
router.delete('/csds/:rfc', billingController.eliminarCsd);     // Tarea 5: Eliminar
router.get('/perfil', billingController.obtenerPerfil);         // Obtener perfil/CSDs

// ==========================================
// 2. RECEPTORES (CLIENTES)
// ==========================================
router.post('/receptores', billingController.crearReceptor);    // Crear receptor (requiere rfcEmisor)
router.get('/receptores', billingController.listarReceptores);  // Listar receptores

// ==========================================
// 3. FACTURACIÓN Y CFDIS
// ==========================================
router.post('/emitir', billingController.emitirCfdi);           // Tarea 6: Emitir nueva factura
router.get('/cfdis/:id', billingController.descargarCfdi);      // Obtener JSON del CFDI


router.delete('/cfdis/:id', billingController.cancelarCfdi);

router.post('/productos', billingController.crearProducto);      
router.get('/productos', billingController.listarProductos);     


module.exports = router;