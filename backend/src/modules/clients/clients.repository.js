const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ClientRepository {
async findPaginated(skip, take, search) {
  const where = {
   
    ...(search && {
      OR: [
        { rfc: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName1: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

    // Ejecutamos ambas consultas en paralelo para mayor rendimiento
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: { lastName1: 'asc' }
      }),
      prisma.client.count({ where })
    ]);

    return { clients, total };
  }

  async findByRfc(rfc) {
    return await prisma.client.findUnique({ where: { rfc } });
  }

  async create(data) {
    return await prisma.client.create({ data });
  }

  async update(id, data) {
    return await prisma.client.update({ where: { id }, data });
  }

  async softDelete(id) {
    return await prisma.client.update({ where: { id }, data: { isActive: false } });
  }

  async hasPendingDebts(clientId) {
  const count = await prisma.financialTransaction.count({
    where: { 
      clientId, 
      status: 'PENDING', 
      type: 'INCOME' 
    }
  });
  return count > 0;
}


// Dentro de clients.repository.js
async findById(id) {
  return await prisma.client.findUnique({ where: { id } });
}

async hasPendingDebts(clientId) {
  const count = await prisma.financialTransaction.count({
    where: { 
      clientId, 
      status: 'PENDING', 
      type: 'INCOME' 
    }
  });
  return count > 0;
}

}

module.exports = new ClientRepository();