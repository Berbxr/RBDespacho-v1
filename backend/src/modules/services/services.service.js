const servicesRepository = require('./services.repository');

class ServicesService {
  async getAllServices(includeInactive) {
    return await servicesRepository.findAll(includeInactive);
  }

  async createService(name) {
    if (!name) throw new Error('MISSING_NAME');

    const existing = await servicesRepository.findByName(name);
    if (existing) {
      if (!existing.isActive) {
        throw new Error('SERVICE_EXISTS_INACTIVE');
      }
      throw new Error('SERVICE_ALREADY_EXISTS');
    }
    return await servicesRepository.create({ name });
  }

  async updateService(id, name) {
    if (!name) throw new Error('MISSING_NAME');

    const service = await servicesRepository.findById(id);
    if (!service) throw new Error('SERVICE_NOT_FOUND');

    // Revisar que el nuevo nombre no le pertenezca a OTRO servicio
    const existing = await servicesRepository.findByName(name);
    if (existing && existing.id !== id) {
      throw new Error('SERVICE_ALREADY_EXISTS');
    }
    
    return await servicesRepository.update(id, { name });
  }

  async deleteService(id) {
    const service = await servicesRepository.findById(id);
    if (!service) throw new Error('SERVICE_NOT_FOUND');
    return await servicesRepository.softDelete(id);
  }

  async reactivateService(id) {
    const service = await servicesRepository.findById(id);
    if (!service) throw new Error('SERVICE_NOT_FOUND');
    return await servicesRepository.update(id, { isActive: true });
  }
}

module.exports = new ServicesService();