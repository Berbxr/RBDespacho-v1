const billingService = require('./billing.service');

class BillingController {
  async emitir(req, res) {
    const { receptorId, conceptosIds, metodoPago, formaPago } = req.body;
    
    if (!receptorId || !conceptosIds || conceptosIds.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Datos incompletos para facturar.' });
    }

    const factura = await billingService.emitirFactura(receptorId, conceptosIds, metodoPago, formaPago);
    res.status(201).json({ status: 'success', data: factura });
  }
}

module.exports = new BillingController();