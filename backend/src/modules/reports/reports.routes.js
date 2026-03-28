const express = require('express');
const router = express.Router();

// Aquí irá la descarga de Excel más adelante
router.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Módulo Reportes Activo' });
});

module.exports = router;