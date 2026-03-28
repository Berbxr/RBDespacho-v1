// services.controller.js
const servicesService = require('./services.service');

class ServicesController {
  async getAll(req, res) {
    const services = await servicesService.getAllServices();
    res.json({ status: 'success', data: services });
  }

  async create(req, res) {
    const { name } = req.body;
    if (!name) return res.status(400).json({ status: 'error', message: 'El nombre es requerido' });
    
    const service = await servicesService.createService(name);
    res.status(201).json({ status: 'success', data: service });
  }

  async update(req, res) {
    const { id } = req.params;
    const { name } = req.body;
    const service = await servicesService.updateService(id, name);
    res.json({ status: 'success', data: service });
  }

  async delete(req, res) {
    const { id } = req.params;
    await servicesService.deleteService(id);
    res.json({ status: 'success', message: 'Servicio eliminado correctamente' });
  }
}

module.exports = new ServicesController();