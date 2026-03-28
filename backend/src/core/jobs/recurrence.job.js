const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateRecurringTransactions = async () => {
  console.log('⏳ [CRON] Iniciando motor de recurrencias...');
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizamos la fecha a la medianoche

  try {
    // Buscamos recurrencias activas que ya deban generarse
    const recurrences = await prisma.recurrence.findMany({
      where: {
        isActive: true,
        nextGenerationDate: { lte: today } // "lte" = Menor o igual a hoy
      },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (recurrences.length === 0) {
      console.log('✅ [CRON] No hay nuevas transacciones por generar hoy.');
      return;
    }

    // Iteramos y usamos transacciones atómicas individuales para que un error en una 
    // no detenga todo el lote.
    for (const rec of recurrences) {
      const lastTx = rec.transactions[0];
      if (!lastTx) continue;

      const newDueDate = new Date(rec.nextGenerationDate);
      const nextGenDate = new Date(newDueDate);
      
      if (rec.frequency === 'MONTHLY') nextGenDate.setMonth(nextGenDate.getMonth() + 1);
      if (rec.frequency === 'ANNUAL') nextGenDate.setFullYear(nextGenDate.getFullYear() + 1);

      await prisma.$transaction(async (tx) => {
        // 1. Crear la nueva deuda pendiente
        await tx.financialTransaction.create({
          data: {
            type: lastTx.type,
            status: 'PENDING',
            amount: lastTx.amount,
            dueDate: newDueDate,
            clientId: lastTx.clientId,
            serviceId: lastTx.serviceId,
            recurrenceId: rec.id
          }
        });

        // 2. Actualizar la fecha para el próximo ciclo
        await tx.recurrence.update({
          where: { id: rec.id },
          data: { nextGenerationDate: nextGenDate }
        });
      });
    }
    console.log(`✅ [CRON] Se generaron ${recurrences.length} nuevas transacciones recurrentes.`);
  } catch (error) {
    console.error('❌ [CRON] Error crítico generando recurrencias:', error);
  }
};

// Se ejecuta todos los días a las 00:01 AM
const startCronJobs = () => {
  cron.schedule('1 0 * * *', generateRecurringTransactions);
  console.log('⏰ Motor de CRON Jobs inicializado.');
};

module.exports = { startCronJobs };