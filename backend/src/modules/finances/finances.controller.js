// backend/src/modules/finances/finances.controller.js
const financesService = require('./finances.service');

class FinancesController {
  async getAll(req, res) {
    const { page, limit, type } = req.query;
    const result = await financesService.getTransactions(page, limit, type);
    res.json({ status: 'success', ...result });
  }

  async create(req, res) {
    // 1. Agregamos description aquí
    const { type, amount, dueDate, description } = req.body;
    
    // 2. Lo validamos
    if (!type || !amount || !dueDate || !description) {
      return res.status(400).json({ status: 'error', message: 'Tipo, Monto, Fecha y Descripción son obligatorios.' });
    }

    const transaction = await financesService.registerTransaction(req.body);
    res.status(201).json({ status: 'success', data: transaction });
  }

  async pay(req, res) {
    const { id } = req.params;
    const transaction = await financesService.payTransaction(id);
    res.json({ status: 'success', message: 'Transacción marcada como pagada.', data: transaction });
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updatedTransaction = await financesService.updateTransaction(id, req.body);
      res.json({ status: 'success', message: 'Transacción actualizada', data: updatedTransaction });
    } catch (error) {
      res.status(400).json({ status: 'error', message: 'Error al actualizar', error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await financesService.deleteTransaction(id);
      res.json({ status: 'success', message: 'Transacción eliminada correctamente' });
    } catch (error) {
      res.status(400).json({ status: 'error', message: 'Error al eliminar', error: error.message });
    }
  }

  async getCalendar(req, res) {
    try {
      const { year, month } = req.query;
      if (!year || !month) {
        return res.status(400).json({ status: 'error', message: 'Faltan parámetros year y month' });
      }
      
      const data = await financesService.getCalendarTransactions(parseInt(year), parseInt(month));
      res.json({ status: 'success', data });
    } catch (error) {
      res.status(400).json({ status: 'error', message: 'Error al cargar calendario', error: error.message });
    }
  }

  async getSubscriptions(req, res) {
    try {
      const subscriptions = await financesService.getClientSubscriptions();
      return res.status(200).json({
        success: true,
        data: subscriptions
      });
    } catch (error) {
      console.error('Error al obtener suscripciones:', error);
      return res.status(500).json({
        success: false,
        message: 'Hubo un error al obtener el panel de suscripciones',
        error: error.message
      });
    }
  }

  async advancePayments(req, res) {
    try {
      const { id } = req.params; // ID de la recurrencia
      const { periodsToAdvance } = req.body; // Cuántos meses está adelantando

      if (!periodsToAdvance || isNaN(periodsToAdvance) || periodsToAdvance < 1) {
        return res.status(400).json({
          success: false,
          message: 'Debes enviar una cantidad válida de periodos a adelantar (mínimo 1).'
        });
      }

      const result = await financesService.advanceRecurrencePayments(id, periodsToAdvance);
      
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result.transactions
      });
    } catch (error) {
      console.error('Error al adelantar pagos:', error);
      return res.status(500).json({
        success: false,
        message: 'Hubo un error al intentar adelantar los pagos',
        error: error.message
      });
    }
  }

  async cancelSubscription(req, res) {
    try {
      const { id } = req.params;
      await financesService.cancelSubscription(id);
      res.json({ success: true, message: 'Suscripción cancelada correctamente.' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }


}

module.exports = new FinancesController();