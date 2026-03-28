const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RemindersRepository {
  async getDueIn7Days() {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 7); // Sumamos exactamente 7 días

    // Formateamos para comparar solo la fecha, ignorando la hora
    const targetDateString = targetDate.toISOString().split('T')[0];

    return await prisma.documentReminder.findMany({
      where: {
        expirationDate: {
          equals: new Date(targetDateString)
        },
        notified7Days: false // Solo los no notificados
      },
      include: {
        client: { select: { firstName: true, lastName1: true } }
      }
    });
  }

  async markAsNotified(ids) {
    return await prisma.documentReminder.updateMany({
      where: { id: { in: ids } },
      data: { notified7Days: true }
    });
  }
}

module.exports = new RemindersRepository();