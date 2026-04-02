const servicesService = require('./services.service');

class ServicesController {
  async getAll(req, res, next) {
    try {
      // Si el frontend manda ?all=true, trae también los inactivos
      const includeInactive = req.query.all === 'true'; 
      const services = await servicesService.getAllServices(includeInactive);
      res.status(200).json({ success: true, data: services });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { name } = req.body;
      const service = await servicesService.createService(name);
      res.status(201).json({ success: true, data: service, message: 'Servicio creado correctamente' });
    } catch (error) {
      if (error.message === 'MISSING_NAME') return res.status(400).json({ success: false, message: 'El nombre del servicio es requerido' });
      if (error.message === 'SERVICE_ALREADY_EXISTS') return res.status(409).json({ success: false, message: 'El servicio ya existe' });
      if (error.message === 'SERVICE_EXISTS_INACTIVE') return res.status(409).json({ success: false, message: 'El servicio ya existe pero está inactivo. Búscalo y reactívalo.' });
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, isActive } = req.body;

      // Si el request solo viene a cambiar el estado (Activar/Desactivar)
      if (isActive !== undefined && !name) {
        const service = isActive 
          ? await servicesService.reactivateService(id)
          : await servicesService.deleteService(id);
        return res.status(200).json({ success: true, data: service, message: 'Estado del servicio actualizado' });
      }

      const service = await servicesService.updateService(id, name);
      res.status(200).json({ success: true, data: service, message: 'Servicio actualizado correctamente' });
    } catch (error) {
      if (error.message === 'MISSING_NAME') return res.status(400).json({ success: false, message: 'El nombre del servicio es requerido' });
      if (error.message === 'SERVICE_NOT_FOUND') return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
      if (error.message === 'SERVICE_ALREADY_EXISTS') return res.status(409).json({ success: false, message: 'El nombre ya está en uso por otro servicio' });
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await servicesService.deleteService(id);
      res.status(200).json({ success: true, message: 'Servicio inhabilitado correctamente' });
    } catch (error) {
      if (error.message === 'SERVICE_NOT_FOUND') return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
      next(error);
    }
  }
}

module.exports = new ServicesController();