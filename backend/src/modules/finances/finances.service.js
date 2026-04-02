const financesRepository = require('./finances.repository');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class FinancesService {
  async getTransactions(page = 1, limit = 20, type) {
    const skip = (page - 1) * limit;
    const { transactions, total } = await financesRepository.findPaginated(skip, parseInt(limit), type);
    
    return {
      data: transactions,
      meta: { total, page: parseInt(page), lastPage: Math.ceil(total / limit) }
    };
  }

  async registerTransaction(payload) {
    const { type, amount, clientId, serviceId, frequency, dueDate, description, dayOfMonth } = payload;
    
    const baseData = {
      type,
      status: 'PENDING',
      amount: parseFloat(amount),
      description,
      clientId: clientId || null,
      serviceId: serviceId || null, 
    };

    if (!frequency || frequency === 'ONCE') {
      return await financesRepository.createSingle({
        ...baseData,
        date: new Date(dueDate)
      });
    }

    const initialDate = new Date(dueDate);
    // Tomamos el día exacto que el usuario haya seleccionado o el día de inicio por defecto
    const billingDay = dayOfMonth ? parseInt(dayOfMonth, 10) : initialDate.getUTCDate();
    const nextBillingDate = new Date(initialDate);
    
    // Cálculo seguro de fechas para la Suscripción
    if (frequency === 'MONTHLY') {
      let nextMonth = initialDate.getUTCMonth() + 1;
      let nextYear = initialDate.getUTCFullYear();
      
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
      }
      
      // Protegemos contra meses cortos (e.g., Febrero)
      const maxDaysInNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
      const finalDay = Math.min(billingDay, maxDaysInNextMonth);
      
      nextBillingDate.setUTCFullYear(nextYear, nextMonth, finalDay);
    } else if (frequency === 'ANNUAL') {
      nextBillingDate.setUTCFullYear(nextBillingDate.getUTCFullYear() + 1);
      nextBillingDate.setUTCDate(billingDay);
    }

    let nombreDelServicio = 'Servicio General';
    if (serviceId) {
      const servicioAsignado = await prisma.service.findUnique({ where: { id: serviceId } });
      if (servicioAsignado) nombreDelServicio = servicioAsignado.name;
    }

    // Guardamos la transacción atómica (Recibo + Configuración de Suscripción)
    return await financesRepository.createRecurring(
      { ...baseData, date: initialDate }, 
      { 
        clientId,
        serviceName: nombreDelServicio,
        amount: parseFloat(amount),
        frequency,
        startDate: new Date(),
        nextBilling: nextBillingDate 
      }
    );
  }

  async updateTransaction(id, data) {
    return await financesRepository.update(id, data);
  }

  async deleteTransaction(id) {
    return await financesRepository.delete(id);
  }

  // --- MÉTODOS PARA EL CALENDARIO ---
  async getCalendarTransactions(yearStr, monthStr) {
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const realTransactions = await financesRepository.getForCalendar(startDate, endDate);

    const activeSubscriptions = await prisma.subscription.findMany({
      where: { isActive: true },
      include: { client: { select: { firstName: true, lastName1: true } } }
    });

    const ghostTransactions = [];

    activeSubscriptions.forEach(sub => {
      const billingDate = new Date(sub.nextBilling);
      const day = billingDate.getUTCDate();
      const subMonth = billingDate.getUTCMonth() + 1;

      let shouldProject = false;

      if (sub.frequency === 'MONTHLY') {
          shouldProject = true; 
      } else if (sub.frequency === 'ANNUAL') {
          if (subMonth === month) {
              shouldProject = true; 
          }
      }

      if (shouldProject) {
        const yaExisteReal = realTransactions.some(tx => tx.subscriptionId === sub.id);

        if (!yaExisteReal) {
          const ghostDate = new Date(Date.UTC(year, month - 1, day));
          const inicioContrato = new Date(Date.UTC(sub.startDate.getUTCFullYear(), sub.startDate.getUTCMonth(), 1));

          if (ghostDate >= inicioContrato) {
              ghostTransactions.push({
                id: `ghost-${sub.id}-${year}-${month}`,
                type: 'INCOME',
                amount: sub.amount,
                description: sub.serviceName || 'Suscripción Recurrente',
                date: ghostDate.toISOString(),
                status: 'PENDING',
                isGhost: true,
                subscriptionId: sub.id,
                client: sub.client,
                service: { name: sub.serviceName }
              });
          }
        }
      }
    });

    return { realTransactions, ghostTransactions };
  }

  // --- MÉTODOS PARA EL MÓDULO DE SUSCRIPCIONES (RECURRENTES) ---
  async getClientSubscriptions() {
    return await prisma.subscription.findMany({
      where: { isActive: true },
      include: {
        client: { 
          select: { firstName: true, lastName1: true, lastName2: true, rfc: true, email: true } 
        },
        transactions: {
          orderBy: { date: 'desc' },
          take: 5
        }
      },
      orderBy: { nextBilling: 'asc' } 
    });
  }

  async advanceRecurrencePayments(subscriptionId, periodsToAdvance) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new Error('La suscripción no existe o fue eliminada.');
    }

    const newTransactions = [];
    const currentDate = new Date(subscription.nextBilling);
    const generatedMonths = [];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < periodsToAdvance; i++) {
        const txDate = new Date(currentDate);
        const mesTexto = `${monthNames[txDate.getUTCMonth()]} ${txDate.getUTCFullYear()}`;
        generatedMonths.push(mesTexto);

        const newTx = await tx.financialTransaction.create({
          data: {
            type: 'INCOME',
            status: 'PAID',
            amount: subscription.amount,
            date: txDate,
            description: `${subscription.serviceName} - Cobro Adelantado (${mesTexto})`,
            clientId: subscription.clientId,
            subscriptionId: subscription.id
          }
        });

        newTransactions.push(newTx);

        if (subscription.frequency === 'MONTHLY') {
          currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
        } else if (subscription.frequency === 'ANNUAL') {
          currentDate.setUTCFullYear(currentDate.getUTCFullYear() + 1);
        }
      }

      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { nextBilling: currentDate }
      });
    });

    return {
      message: `Se adelantaron ${periodsToAdvance} pagos exitosamente: ${generatedMonths.join(', ')}.`,
      transactions: newTransactions
    };
  }
}

module.exports = new FinancesService();