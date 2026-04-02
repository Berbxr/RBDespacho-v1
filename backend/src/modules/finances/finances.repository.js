const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FinancesRepository {
  // Solución al N+1: Traemos cliente y servicio en la misma consulta
  async findPaginated(skip, take, type) {
    const where = type ? { type } : {};
    
    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' }, // CORRECCIÓN: dueDate no existe, es date
        include: {
          client: { select: { firstName: true, lastName1: true, rfc: true } },
          service: { select: { name: true } }
        }
      }),
      prisma.financialTransaction.count({ where })
    ]);

    return { transactions, total };
  }

  // Crea una transacción ÚNICA
  async createSingle(data) {
    return await prisma.financialTransaction.create({ data });
  }

  // Crea Suscripción + Primera Transacción de forma ATÓMICA
  async createRecurring(transactionData, subscriptionData) {
    return await prisma.$transaction(async (tx) => {
      // CORRECCIÓN: El modelo se llama subscription, no recurrence
      const subscription = await tx.subscription.create({
        data: subscriptionData
      });

      const transaction = await tx.financialTransaction.create({
        data: {
          ...transactionData,
          subscriptionId: subscription.id // CORRECCIÓN: Relación es subscriptionId
        }
      });
      return { subscription, transaction };
    });
  }

  async update(id, data) {
    return await prisma.financialTransaction.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return await prisma.financialTransaction.delete({
      where: { id }
    });
  }

  async getForCalendar(startDate, endDate) {
    return await prisma.financialTransaction.findMany({
      where: { 
        date: { gte: startDate, lte: endDate } // CORRECCIÓN: date en vez de dueDate
      },
      include: {
        client: { select: { firstName: true, lastName1: true } },
        service: { select: { name: true } }
      },
      orderBy: { date: 'asc' } // CORRECCIÓN: date
    });
  }
}

module.exports = new FinancesRepository();