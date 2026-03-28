// clients.controller.js
const clientsService = require('./clients.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Necesario para que getClientHistory funcione

class ClientsController {
  async getAll(req, res) {
    try {
      const { page, limit, search } = req.query;
      const result = await clientsService.getClients(page, limit, search);
      res.json({ status: 'success', ...result });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  async create(req, res) {
    try {
      const { firstName, lastName1, lastName2, rfc, phone, email } = req.body;
      
      if (!firstName || !lastName1 || !rfc) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Nombre, Primer Apellido y RFC son obligatorios.' 
        });
      }

      const client = await clientsService.createClient({ 
        firstName, lastName1, lastName2, rfc, phone, email 
      });
      res.status(201).json({ status: 'success', data: client });
    } catch (error) {
      res.status(error.statusCode || 500).json({ 
        status: 'error', 
        message: error.message 
      });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const client = await clientsService.updateClient(id, req.body);
      res.json({ status: 'success', data: client });
    } catch (error) {
      res.status(error.statusCode || 500).json({ 
        status: 'error', 
        message: error.message 
      });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await clientsService.deleteClient(id);
      res.json({ status: 'success', message: 'Cliente dado de baja.' });
    } catch (error) {
      res.status(error.statusCode || 500).json({ 
        status: 'error', 
        message: error.message 
      });
    }
  }

  async toggleStatus(req, res) {
    try {
      const { id } = req.params;
      const result = await clientsService.toggleStatus(id);
      res.json({ status: 'success', data: result });
    } catch (error) {
      res.status(error.statusCode || 500).json({ 
        status: 'error', 
        message: error.message 
      });
    }
  }

  // Reemplaza esto en clients.controller.js
async getClientHistory(req, res) {
  try {
    const { id } = req.params;

    // 1. Buscamos todas las transacciones del cliente INCLUYENDO los datos de recurrencia
    const allTransactions = await prisma.financialTransaction.findMany({
      where: { clientId: id },
      orderBy: { dueDate: 'desc' },
      include: {
        service: true,
        recurrence: true // <- Esto nos trae los datos reales de la suscripción
      }
    });

    // 2. Filtramos: Manuales (sin recurrenceId) vs Recurrentes (con recurrenceId)
    const manualTransactions = allTransactions.filter(t => !t.recurrenceId);
    const recurrenceTransactions = allTransactions.filter(t => t.recurrenceId);

    // 3. Determinamos la suscripción ACTIVA (si tiene cobros recurrentes en estado PENDING)
    let subscription = null;
    const pendingRecurrent = recurrenceTransactions.filter(t => t.status === 'PENDING');

    if (pendingRecurrent.length > 0) {
      // Tomamos el próximo cobro pendiente para sacar los datos del plan
      pendingRecurrent.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      const nextTx = pendingRecurrent[0];
      
      subscription = {
        id: nextTx.recurrence.id,
        amount: nextTx.amount,
        nextGenerationDate: nextTx.recurrence.nextGenerationDate,
        dayOfMonth: nextTx.recurrence.dayOfMonth,
        service: nextTx.service,
        frequency: nextTx.recurrence.frequency,
        description: nextTx.description.split(' (')[0] // Limpiamos el texto
      };
    }

    res.json({ 
      status: 'success', 
      data: { 
        transactions: manualTransactions, 
        recurrenceHistory: recurrenceTransactions, 
        subscription: subscription 
      } 
    });
  } catch (error) {
    console.error("Error en getClientHistory:", error);
    res.status(500).json({ status: 'error', message: error.message });
  }
}
}

module.exports = new ClientsController();