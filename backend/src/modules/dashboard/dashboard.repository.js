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
        // CORRECCIÓN: La base de datos usa 'date', no 'paymentDate' ni 'dueDate'
        date: { gte: startDate, lte: endDate } 
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
        // CORRECCIÓN: Cambiado de 'dueDate' a 'date'
        date: { lt: thirtyDaysAgo } // Vencidas hace más de 30 días
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
    // CORRECCIÓN: La tabla real se llama "subscription", no "recurrence"
    // Sumamos los montos base de todas las suscripciones activas mensuales
    const subscriptions = await prisma.subscription.findMany({
      where: { 
        frequency: 'MONTHLY',
        isActive: true
      }
    });

    let projection = 0;
    
    // Sumamos la proyección de todos los contratos activos
    subscriptions.forEach(sub => {
      projection += Number(sub.amount || 0);
    });

    return projection;
  }
}

module.exports = new DashboardRepository();