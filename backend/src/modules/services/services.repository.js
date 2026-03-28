const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ServiceRepository {
  async findAll() {
    // Solo traemos los activos para no saturar los selectores del frontend
    return await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
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
    // Soft delete obligatorio por integridad financiera
    return await prisma.service.update({
      where: { id },
      data: { isActive: false }
    });
  }
}

module.exports = new ServiceRepository();