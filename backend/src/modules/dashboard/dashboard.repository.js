const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DashboardRepository {
  // 🚀 OPTIMIZACIÓN: Dejamos que PostgreSQL sume los montos.
  async getSumByTypeAndDate(type, status, startDate, endDate) {
    const result = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: {
        type,
        status,
        ...(status === 'PAID' ? { paymentDate: { gte: startDate, lte: endDate } } : { dueDate: { gte: startDate, lte: endDate } })
      }
    });
    return result._sum.amount || 0;
  }

  // Helper para la gráfica de 6 meses
  async getMonthlySum(type, status, year, month) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    return await this.getSumByTypeAndDate(type, status, startDate, endDate);
  }

  async getTopDebtors() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return await prisma.financialTransaction.findMany({
      where: {
        status: 'PENDING',
        type: 'INCOME',
        dueDate: { lt: thirtyDaysAgo } // Vencidas hace más de 30 días
      },
      orderBy: { amount: 'desc' },
      take: 10,
      include: {
        client: { select: { firstName: true, lastName1: true, phone: true } }
      }
    });
  }

    async getActiveClientsCount() {
      // Filtramos para contar solo los clientes donde isActive sea true
      return await prisma.client.count({ 
        where: { isActive: true } 
      });
    }

  async getRecurringIncomeProjection() {
    // Sumamos los montos base de todas las recurrencias activas de ingresos
    const recurrences = await prisma.recurrence.findMany({
      where: { frequency: 'MONTHLY' }, // Solo proyectamos las mensuales para tener un estimado real mensual
      include: {
        transactions: {
          take: 1,
          orderBy: { dueDate: 'desc' },
          where: { type: 'INCOME' }
        }
      }
    });

    let totalProjection = 0;
    for (const rec of recurrences) {
      if (rec.transactions[0]) {
        totalProjection += Number(rec.transactions[0].amount);
      }
    }
    return totalProjection;
  }
}

module.exports = new DashboardRepository();