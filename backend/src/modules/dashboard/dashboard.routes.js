const express = require('express');
const router = express.Router();

// 1. Importamos el controlador que creamos
const dashboardController = require('./dashboard.controller');

// 2. Definimos la ruta principal del dashboard
// Cuando el frontend pida un GET a /api/dashboard, ejecutará getDashboardData
router.get('/', dashboardController.getDashboardData);

module.exports = router;