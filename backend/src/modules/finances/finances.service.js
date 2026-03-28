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
    const { type, amount, clientId, serviceId, frequency, dueDate, description } = payload;
    
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
        dueDate: new Date(dueDate)
      });
    }

    // --- ARQUITECTURA LIMPIA: SOLO CREAMOS EL MES ACTUAL ---
    const startDate = new Date(dueDate);
    
    // Calculamos cuándo le toca al sistema generar el cobro del mes 2
    const nextGenDate = new Date(startDate);
    if (frequency === 'MONTHLY') {
      const expectedMonth = (nextGenDate.getUTCMonth() + 1) % 12;
      nextGenDate.setUTCMonth(nextGenDate.getUTCMonth() + 1);
      if (nextGenDate.getUTCMonth() !== expectedMonth) nextGenDate.setUTCDate(0); // Arreglo mes corto
    } else if (frequency === 'ANNUAL') {
      nextGenDate.setUTCFullYear(nextGenDate.getUTCFullYear() + 1);
    }

    const recurrenceData = {
      frequency,
      startDate,
      nextGenerationDate: nextGenDate
    };

    // Usamos createRecurring normal (solo genera 1)
    return await financesRepository.createRecurring({ ...baseData, dueDate: startDate }, recurrenceData);
  }

  async payTransaction(id) {
    const updatedTx = await financesRepository.markAsPaid(id, new Date());
    
    const fullTxData = await prisma.financialTransaction.findUnique({
      where: { id },
      include: {
        client: { select: { firstName: true, lastName1: true, rfc: true, phone: true } },
        service: { select: { name: true } }
      }
    });

    return fullTxData;
  }

  async updateTransaction(id, payload) {
    const { type, amount, description, dueDate, clientId, serviceId } = payload;
    const dataToUpdate = {};
    if (type !== undefined) dataToUpdate.type = type;
    if (amount !== undefined) dataToUpdate.amount = parseFloat(amount);
    if (description !== undefined) dataToUpdate.description = description;
    if (dueDate !== undefined) dataToUpdate.dueDate = new Date(dueDate);
    if (clientId !== undefined) dataToUpdate.clientId = clientId || null;
    if (serviceId !== undefined) dataToUpdate.serviceId = serviceId || null;

    return await financesRepository.update(id, dataToUpdate);
  }

  async deleteTransaction(id) {
    return await financesRepository.delete(id);
  }

  // --- MOTOR DE CALENDARIO CON PROYECCIONES VIRTUALES ---

  async getCalendarTransactions(year, month) {
    try {
      await this.checkAndGenerateFutureTransactions();
    } catch (error) {
      console.error("Aviso auto-generación:", error.message);
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // 1. Traemos las transacciones REALES (físicas) de este mes
    const realTransactions = await financesRepository.getForCalendar(startDate, endDate);

    // 2. Traemos las recurrencias activas para calcular los "Fantasmas"
    const activeRecurrences = await prisma.recurrence.findMany({
      where: { startDate: { lte: endDate } },
      include: {
        // CORRECCIÓN AQUÍ: transactions en lugar de financialTransactions
        transactions: { 
          take: 1, 
          orderBy: { dueDate: 'desc' },
          include: { client: true, service: true } 
        }
      }
    });

    const virtualTransactions = [];

    // 3. Generamos los Fantasmas al vuelo
    for (const rec of activeRecurrences) {
      // CORRECCIÓN AQUÍ TAMBIÉN
      const baseTx = rec.transactions[0];
      if (!baseTx) continue;

      // Si ya hay un cobro físico de esta recurrencia este mes, no dibujamos fantasma
      const hasRealTxThisMonth = realTransactions.some(t => t.recurrenceId === rec.id);
      if (hasRealTxThisMonth) continue;

      // Calculamos en qué día cae dentro de este mes solicitado
      let virtualDate = new Date(rec.startDate);
      if (rec.frequency === 'MONTHLY') {
        virtualDate.setFullYear(year);
        virtualDate.setMonth(month - 1);
        const expectedMonth = month - 1;
        if (virtualDate.getMonth() !== expectedMonth) virtualDate.setDate(0); // Arreglo mes corto
      } else if (rec.frequency === 'ANNUAL') {
        if (virtualDate.getMonth() === month - 1) virtualDate.setFullYear(year);
        else continue; // No cae en este mes
      }

      // Validamos que el fantasma sea para una fecha futura (después de su último cobro real)
      if (virtualDate > baseTx.dueDate) {
        virtualTransactions.push({
          ...baseTx,
          id: `virtual-${rec.id}-${year}-${month}`, // Le damos un ID falso temporal
          dueDate: virtualDate,
          description: `${baseTx.description.split(' (')[0]} (Proyectado)`,
          status: 'PENDING'
        });
      }
    }

    // Retornamos ambos: los reales y los fantasmas calculados
    return [...realTransactions, ...virtualTransactions];
  }

  // --- AUTO-GENERADOR MENSUAL ---
  async checkAndGenerateFutureTransactions() {
    const today = new Date();
    
    const pendingRecurrences = await prisma.recurrence.findMany({
      where: { nextGenerationDate: { lte: today } },
      // CORRECCIÓN AQUÍ
      include: { transactions: { take: 1, orderBy: { dueDate: 'desc' } } }
    });

    for (const rec of pendingRecurrences) {
      // CORRECCIÓN AQUÍ
      const baseTx = rec.transactions[0];
      if (!baseTx) continue;

      await prisma.financialTransaction.create({
        data: {
          type: baseTx.type,
          amount: baseTx.amount,
          description: baseTx.description.split(' (')[0], // Le quitamos lo de Proyectado si lo tuviera
          status: 'PENDING',
          dueDate: new Date(rec.nextGenerationDate),
          clientId: baseTx.clientId,
          serviceId: baseTx.serviceId,
          recurrenceId: rec.id
        }
      });

      const newNextGen = new Date(rec.nextGenerationDate);
      if (rec.frequency === 'MONTHLY') {
        const expectedMonth = (newNextGen.getUTCMonth() + 1) % 12;
        newNextGen.setUTCMonth(newNextGen.getUTCMonth() + 1);
        if (newNextGen.getUTCMonth() !== expectedMonth) newNextGen.setUTCDate(0);
      } else if (rec.frequency === 'ANNUAL') {
        newNextGen.setUTCFullYear(newNextGen.getUTCFullYear() + 1);
      }

      await prisma.recurrence.update({
        where: { id: rec.id },
        data: { nextGenerationDate: newNextGen }
      });
    }
  }

  async getClientSubscriptions() {
    const recurrences = await prisma.recurrence.findMany({
      include: {
        transactions: {
          orderBy: { dueDate: 'asc' }, // Traemos el historial ordenado por fecha
          include: { 
            client: true, 
            service: true 
          }
        }
      }
    });

    const groupedClients = {};

    for (const rec of recurrences) {
      // Tomamos la primera transacción para saber de quién es esta recurrencia
      const baseTx = rec.transactions[0]; 
      if (!baseTx || !baseTx.client) continue;

      const clientId = baseTx.client.id;
      
      // Si es el primer cobro que leemos de este cliente, le creamos su "carpeta"
      if (!groupedClients[clientId]) {
        groupedClients[clientId] = {
          client: {
            id: baseTx.client.id,
            name: `${baseTx.client.firstName} ${baseTx.client.lastName1}`,
            rfc: baseTx.client.rfc
          },
          subscriptions: []
        };
      }

      // Metemos la recurrencia en la "carpeta" de este cliente
      groupedClients[clientId].subscriptions.push({
        recurrenceId: rec.id,
        frequency: rec.frequency,
        serviceName: baseTx.service ? baseTx.service.name : 'Servicio General',
        description: baseTx.description.split(' (')[0], // Limpiamos la descripción
        amount: baseTx.amount,
        startDate: rec.startDate,
        nextGenerationDate: rec.nextGenerationDate,
        history: rec.transactions // Aquí va el historial de pagos para que lo pintes en frontend
      });
    }

    // Devolvemos un arreglo de clientes con sus suscripciones
    return Object.values(groupedClients);
  }

  /**
   * Adelanta N cantidad de pagos de una recurrencia.
   * Crea los registros físicos, los marca como pagados y recorre la fecha del calendario.
   */
  async advanceRecurrencePayments(recurrenceId, periodsToAdvance) {
    const rec = await prisma.recurrence.findUnique({
      where: { id: recurrenceId },
      include: { transactions: { take: 1, orderBy: { dueDate: 'desc' } } }
    });

    if (!rec || !rec.transactions[0]) throw new Error('Recurrencia no encontrada');

    const baseTx = rec.transactions[0];
    const newTransactions = [];
    let currentDate = new Date(rec.nextGenerationDate);

    // Bucle para crear los N meses que el cliente está pagando por adelantado
    for (let i = 0; i < parseInt(periodsToAdvance); i++) {
      
      // 1. Creamos la transacción física y la marcamos como PAGADA mágicamente
      const tx = await prisma.financialTransaction.create({
        data: {
          type: baseTx.type,
          amount: baseTx.amount,
          description: `${baseTx.description.split(' (')[0]} (Anticipo)`,
          status: 'PAID', // ¡Mágico! Ya no queda PENDING
          dueDate: new Date(currentDate),
          clientId: baseTx.clientId,
          serviceId: baseTx.serviceId,
          recurrenceId: rec.id
        }
      });
      newTransactions.push(tx);

      // 2. Calculamos el mes que sigue (con la protección de meses cortos)
      if (rec.frequency === 'MONTHLY') {
        const expectedMonth = (currentDate.getUTCMonth() + 1) % 12;
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
        if (currentDate.getUTCMonth() !== expectedMonth) currentDate.setUTCDate(0);
      } else if (rec.frequency === 'ANNUAL') {
        currentDate.setUTCFullYear(currentDate.getUTCFullYear() + 1);
      }
    }

    // 3. Actualizamos la "nextGenerationDate" para empujar los fantasmas hacia adelante
    await prisma.recurrence.update({
      where: { id: recurrenceId },
      data: { nextGenerationDate: currentDate }
    });

    return { 
      message: `Se adelantaron ${periodsToAdvance} pagos exitosamente.`, 
      transactions: newTransactions 
    };
  }

  async cancelSubscription(recurrenceId) {
    // 1. Validar regla de negocio: No tener adeudos atrasados ni del mes actual
    const today = new Date();
    const adeudo = await prisma.financialTransaction.findFirst({
      where: {
        recurrenceId: recurrenceId,
        status: 'PENDING',
        dueDate: { lte: today } // Busca un pago pendiente que venza hoy o en el pasado
      }
    });

    // Si encuentra un adeudo, lanza el error antes de borrar nada
    if (adeudo) {
      const error = new Error('Para cancelar las membresías, tenemos que tener pagado el mes al corriente, no tener adeudos.');
      error.statusCode = 400; // Error de cliente
      throw error;
    }

    // 2. Si todo está pagado, eliminamos los cobros futuros (fantasmas)
    await prisma.financialTransaction.deleteMany({
      where: {
        recurrenceId: recurrenceId,
        status: 'PENDING'
      }
    });
    
    return true;
  }

}


module.exports = new FinancesService();