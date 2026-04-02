const clientsService = require('./clients.service');

class ClientsController {
  async getAll(req, res, next) {
    try {
      const result = await clientsService.getAllClients(req.query);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const client = await clientsService.getClientById(req.params.id);
      res.status(200).json({ success: true, data: client });
    } catch (error) {
      if (error.message === 'CLIENT_NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const newClient = await clientsService.createClient(req.body);
      res.status(201).json({ success: true, data: newClient, message: 'Cliente creado con éxito' });
    } catch (error) {
      if (error.message === 'MISSING_REQUIRED_FIELDS') {
        return res.status(400).json({ success: false, message: 'Faltan campos obligatorios (Nombre, Apellido 1, RFC)' });
      }
      if (error.message === 'RFC_ALREADY_EXISTS') {
        return res.status(409).json({ success: false, message: 'El RFC ya está registrado' });
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updatedClient = await clientsService.updateClient(req.params.id, req.body);
      res.status(200).json({ success: true, data: updatedClient, message: 'Cliente actualizado' });
    } catch (error) {
      if (error.message === 'CLIENT_NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }
      if (error.message === 'RFC_ALREADY_EXISTS') {
        return res.status(409).json({ success: false, message: 'El nuevo RFC ya está registrado por otro cliente' });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await clientsService.deleteClient(req.params.id);
      res.status(200).json({ success: true, message: 'Cliente desactivado correctamente' });
    } catch (error) {
      if (error.message === 'CLIENT_HAS_DEBTS') {
        return res.status(400).json({ success: false, message: 'No se puede desactivar al cliente porque tiene adeudos pendientes.' });
      }
      if (error.message === 'CLIENT_NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
      }
      next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const history = await clientsService.getClientHistory(req.params.id);
      res.status(200).json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ClientsController();