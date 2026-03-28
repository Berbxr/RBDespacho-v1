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
        orderBy: { dueDate: 'desc' },
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

  // Crea Recurrencia + Primera Transacción de forma ATÓMICA
  async createRecurring(transactionData, recurrenceData) {
    return await prisma.$transaction(async (tx) => {
      // 1. Creamos el motor de recurrencia
      const recurrence = await tx.recurrence.create({
        data: recurrenceData
      });

      // 2. Creamos la primera transacción enlazada a esta recurrencia
      const transaction = await tx.financialTransaction.create({
        data: {
          ...transactionData,
          recurrenceId: recurrence.id
        }
      });

      return { recurrence, transaction };
    });
  }

  async markAsPaid(id, paymentDate) {
    return await prisma.financialTransaction.update({
      where: { id },
      data: { status: 'PAID', paymentDate }
    });
  }

  // Actualizar una transacción
  async update(id, data) {
    return await prisma.financialTransaction.update({
      where: { id },
      data
    });
  }

  // Eliminar una transacción
  async delete(id) {
    return await prisma.financialTransaction.delete({
      where: { id }
    });
  }

  // 👇 VERSIÓN SIMPLIFICADA PARA EL CALENDARIO 👇
  async getForCalendar(startDate, endDate) {
    return await prisma.financialTransaction.findMany({
      where: { 
        dueDate: { gte: startDate, lte: endDate } 
      },
      include: {
        client: { select: { firstName: true, lastName1: true } },
        service: { select: { name: true } }
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  // Crea el motor de recurrencia y los 6 meses de un jalón
  async createRecurringBulk(transactions, recurrenceData) {
    return await prisma.$transaction(async (tx) => {
      // 1. Creamos el motor de recurrencia
      const recurrence = await tx.recurrence.create({
        data: recurrenceData
      });

      // 2. Creamos los 6 cobros enlazados
      const createdTransactions = await Promise.all(
        transactions.map(data => 
          tx.financialTransaction.create({
            data: { ...data, recurrenceId: recurrence.id }
          })
        )
      );

      return { recurrence, createdTransactions };
    });
  }
}

module.exports = new FinancesRepository();