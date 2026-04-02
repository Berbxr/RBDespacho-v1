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
        return res.status(400).json({ status: 'error', message: 'Faltan parámetros de año y mes' });
      }

      // Llamamos al servicio que acabamos de mejorar
      const result = await financesService.getCalendarTransactions(year, month);
      
      // Enviamos el resultado (que ahora es un objeto { realTransactions, ghostTransactions })
      res.json({ status: 'success', data: result });
    } catch (error) {
      console.error('Error en getCalendar:', error);
      res.status(500).json({ status: 'error', message: 'Error cargando el calendario' });
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
      const { id } = req.params;
      const { periodsToAdvance } = req.body;
      
      // Llamamos al servicio (que ya arreglamos y devuelve las 'transactions')
      const result = await financesService.advanceRecurrencePayments(id, periodsToAdvance);
      
      // 👇 ESTA LÍNEA ES LA CLAVE: Enviar 'result' de regreso al frontend
      res.json({ 
        status: 'success', 
        message: result.message,
        data: result // Aquí viajan las transacciones para que React arme el PDF
      });
      
    } catch (error) {
      console.error('Error al adelantar pagos:', error);
      res.status(500).json({ status: 'error', message: 'Error procesando el adelanto' });
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


  async cancelSubscription(id) {
    // Candado backend: Verificar si hay recibos pendientes vencidos (adeudos)
    const tieneAdeudos = await prisma.financialTransaction.findFirst({
      where: {
        subscriptionId: id,
        status: 'PENDING',
        date: { lte: new Date() } // Pagos cuya fecha ya pasó o es hoy
      }
    });

    if (tieneAdeudos) {
      throw new Error('No se puede cancelar: El cliente tiene recibos atrasados sin pagar.');
    }

    return await prisma.subscription.update({
      where: { id },
      data: { isActive: false }
    });
  }


}

module.exports = new FinancesController();