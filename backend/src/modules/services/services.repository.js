const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ServicesRepository {
  // Ahora permite traer todos (incluyendo inactivos) si el frontend lo requiere
  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return await prisma.service.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findById(id) {
    return await prisma.service.findUnique({ where: { id } });
  }

  async findByName(name) {
    return await prisma.service.findUnique({ where: { name } });
  }

  async create(data) {
    return await prisma.service.create({ data });
  }

  async update(id, data) {
    return await prisma.service.update({
      where: { id },
      data
    });
  }

  async softDelete(id) {
    return await prisma.service.update({
      where: { id },
      data: { isActive: false }
    });
  }
}

module.exports = new ServicesRepository();