const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateRecurringTransactions = async () => {
  console.log('⏳ [CRON] Iniciando motor de recurrencias...');
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizamos la fecha a la medianoche

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: {
        isActive: true,
        nextGenerationDate: { lte: today }
      },
      include: { transactions: { orderBy: { date: 'desc' }, take: 1 } }
    });

    if (subscriptions.length === 0) {
      console.log('✅ [CRON] No hay nuevas transacciones por generar hoy.');
      return;
    }

    for (const sub of subscriptions) {
      const lastTx = sub.transactions[0];
      if (!lastTx) continue;

      const newDate = new Date(sub.nextGenerationDate);
      const nextGenDate = new Date(newDate);
      
      // CÁLCULO SEGURO EVITANDO EL BUG DE JAVASCRIPT
      if (sub.frequency === 'MONTHLY') {
        let nextMonth = nextGenDate.getUTCMonth() + 1;
        let nextYear = nextGenDate.getUTCFullYear();
        
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear++;
        }
        
        // Usamos el día que configuraste (ej. 18), con un límite por si el mes trae menos días (ej. febrero)
        const targetDay = sub.dayOfMonth || nextGenDate.getUTCDate();
        const maxDaysInNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
        const finalDay = Math.min(targetDay, maxDaysInNextMonth);
        
        nextGenDate.setUTCFullYear(nextYear, nextMonth, finalDay);
      } else if (sub.frequency === 'ANNUAL') {
        nextGenDate.setUTCFullYear(nextGenDate.getUTCFullYear() + 1);
      }

      await prisma.$transaction(async (tx) => {
        // 1. Crear la nueva deuda pendiente
        await tx.financialTransaction.create({
          data: {
            type: lastTx.type,
            status: 'PENDING',
            amount: sub.amount,
            date: newDate,
            description: lastTx.description,
            clientId: sub.clientId,
            serviceId: sub.serviceId,
            subscriptionId: sub.id
          }
        });

        // 2. Actualizar la fecha para el próximo ciclo
        await tx.subscription.update({
          where: { id: sub.id },
          data: { nextGenerationDate: nextGenDate }
        });
      });
    }
    console.log(`✅ [CRON] Se generaron ${subscriptions.length} nuevas transacciones recurrentes.`);
  } catch (error) {
    console.error('❌ [CRON] Error crítico generando recurrencias:', error);
  }
};

const startCronJobs = () => {
  cron.schedule('1 0 * * *', generateRecurringTransactions);
  console.log('⏰ Motor de CRON Jobs inicializado.');
};

module.exports = { startCronJobs };