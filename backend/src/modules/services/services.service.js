const serviceRepository = require('./services.repository');

class ServicesService {
  async getAllServices() {
    return await serviceRepository.findAll();
  }

  async createService(name) {
    // Regla de negocio: No duplicar nombres de servicios
    const existing = await serviceRepository.findByName(name);
    if (existing) {
      const error = new Error(`El servicio '${name}' ya existe.`);
      error.statusCode = 400;
      throw error;
    }
    return await serviceRepository.create({ name });
  }

  async updateService(id, name) {
    // 🚨 NUEVA VALIDACIÓN: Revisar que el nuevo nombre no le pertenezca a OTRO servicio
    const existing = await serviceRepository.findByName(name);
    if (existing && existing.id !== id) {
      const error = new Error(`El servicio '${name}' ya existe (quizás esté dado de baja).`);
      error.statusCode = 400;
      throw error;
    }
    
    return await serviceRepository.update(id, { name });
  }

  async deleteService(id) {
    return await serviceRepository.softDelete(id);
  }
}

module.exports = new ServicesService();