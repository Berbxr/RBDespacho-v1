const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ClientsRepository {
  async findAll(filters = {}) {
    const { skip = 0, take = 20, search, isActive } = filters;
    
    // Construimos la consulta dinámica
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { rfc: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: Number(skip),
        take: Number(take),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.client.count({ where })
    ]);

    return { clients, total };
  }

  async findById(id) {
    return await prisma.client.findUnique({
      where: { id },
      include: {
        subscriptions: true // Opcional: traer suscripciones activas si se requiere
      }
    });
  }

  async findByRFC(rfc) {
    return await prisma.client.findUnique({ where: { rfc } });
  }

  async create(data) {
    return await prisma.client.create({ data });
  }

  async update(id, data) {
    return await prisma.client.update({
      where: { id },
      data
    });
  }

  // Soft Delete: En lugar de borrar de la BD, lo marcamos como inactivo
  async softDelete(id) {
    return await prisma.client.update({
      where: { id },
      data: { isActive: false }
    });
  }


  // Verifica si el cliente tiene alguna transacción pendiente
  async hasPendingDebts(id) {
    const pending = await prisma.financialTransaction.findFirst({
      where: { clientId: id, status: 'PENDING' }
    });
    return !!pending; // Devuelve true si hay adeudos, false si está limpio
  }

  // Trae el historial completo para el ModalHistorial
  async getHistory(id) {
    // 1. Pagos manuales / únicos (sin suscripción asociada)
    const transactions = await prisma.financialTransaction.findMany({
      where: { clientId: id, subscriptionId: null },
      orderBy: { date: 'desc' }
    });

    // 2. Suscripción activa (Solo para mostrar la tarjeta azul de la membresía actual)
    const subscription = await prisma.subscription.findFirst({
      where: { clientId: id, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    // 3. ¡LA CORRECCIÓN!: Historial de TODOS los cobros recurrentes del cliente
    // Al usar { not: null }, traemos todos los cobros de recurrencia, 
    // incluso si pertenecen a una suscripción que ya fue cancelada en el pasado.
    const recurrenceHistory = await prisma.financialTransaction.findMany({
      where: { 
        clientId: id,
        subscriptionId: { not: null } 
      },
      orderBy: { date: 'desc' }
    });

    return { transactions, recurrenceHistory, subscription };
  }
}

module.exports = new ClientsRepository();