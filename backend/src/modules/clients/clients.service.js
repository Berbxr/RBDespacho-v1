const clientRepository = require('./clients.repository');

class ClientsService {
  async getClients(page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;
    const { clients, total } = await clientRepository.findPaginated(skip, parseInt(limit), search);
    
    return {
      data: clients,
      meta: {
        total,
        page: parseInt(page),
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  async createClient(clientData) {
    // Regla de negocio: Validar duplicidad de RFC
    const existing = await clientRepository.findByRfc(clientData.rfc);
    if (existing) {
      const error = new Error(`El cliente con RFC ${clientData.rfc} ya existe.`);
      error.statusCode = 400;
      throw error;
    }
    return await clientRepository.create(clientData);
  }

  async updateClient(id, clientData) {
    return await clientRepository.update(id, clientData);
  }

  async deleteClient(id) {
  const hasDebt = await clientRepository.hasPendingDebts(id);
  if (hasDebt) {
    const error = new Error('No se puede dar de baja: el cliente tiene pagos pendientes.');
    error.statusCode = 400;
    throw error;
  }
  return await clientRepository.softDelete(id);
}

    async reactivateClient(id) {
      return await clientRepository.update(id, { isActive: true });
    }

    async toggleStatus(id) {
      const client = await clientRepository.findById(id);
      if (!client) {
        const error = new Error('Cliente no encontrado');
        error.statusCode = 404;
        throw error;
      }

      // Si el cliente está activo y lo quieren dar de baja, validamos deuda
      if (client.isActive) {
        const hasDebt = await clientRepository.hasPendingDebts(id);
        if (hasDebt) {
          const error = new Error('No se puede dar de baja: el cliente tiene pagos pendientes.');
          error.statusCode = 400; // Bad Request
          throw error;
        }
      }

      // Si no tiene deuda o lo estamos reactivando, procedemos
      return await clientRepository.update(id, { isActive: !client.isActive });
    }

    }

module.exports = new ClientsService();