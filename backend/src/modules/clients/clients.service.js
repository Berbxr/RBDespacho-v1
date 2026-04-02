const clientsRepository = require('./clients.repository');

class ClientsService {
  async getAllClients(query) {
    return await clientsRepository.findAll(query);
  }

  async getClientById(id) {
    const client = await clientsRepository.findById(id);
    if (!client) {
      throw new Error('CLIENT_NOT_FOUND'); // Puedes manejar esto con clases de error personalizadas
    }
    return client;
  }

  async createClient(data) {
    // Validar campos obligatorios
    if (!data.firstName || !data.lastName1 || !data.rfc) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    // Validar que el RFC no exista ya en la base de datos
    const existingClient = await clientsRepository.findByRFC(data.rfc);
    if (existingClient) {
      throw new Error('RFC_ALREADY_EXISTS');
    }

    return await clientsRepository.create(data);
  }

  async updateClient(id, data) {
    // Verificar que el cliente exista
    await this.getClientById(id); 

    // Si intenta actualizar el RFC, verificar que no colisione con otro
    if (data.rfc) {
      const existingClient = await clientsRepository.findByRFC(data.rfc);
      if (existingClient && existingClient.id !== id) {
        throw new Error('RFC_ALREADY_EXISTS');
      }
    }

    return await clientsRepository.update(id, data);
  }

  async deleteClient(id) {
    await this.getClientById(id); // Verifica existencia
    
    // Validar si tiene adeudos antes de desactivar
    const hasDebts = await clientsRepository.hasPendingDebts(id);
    if (hasDebts) {
      throw new Error('CLIENT_HAS_DEBTS');
    }
    
    return await clientsRepository.softDelete(id);
  }

  async getClientHistory(id) {
    await this.getClientById(id); 
    return await clientsRepository.getHistory(id);
  }
  
}

module.exports = new ClientsService();