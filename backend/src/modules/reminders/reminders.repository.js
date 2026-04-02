const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RemindersRepository {
  async getDueIn7Days() {
    const today = new Date();
    
    // 1. Calculamos el día exacto dentro de 7 días (en tu zona horaria local)
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + 7);

    // 2. Extraemos el Año, Mes y Día de forma LOCAL (evitando que .toISOString() nos adelante un día)
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    
    const dateString = `${year}-${month}-${day}`;
    
    // 3. Ahora sí armamos el rango forzado a UTC para que coincida con la base de datos
    const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

    console.log(`🔍 [REPO] Buscando documentos entre ${startOfDay.toISOString()} y ${endOfDay.toISOString()}`);

    return await prisma.documentReminder.findMany({
      where: {
        expirationDate: {
          gte: startOfDay, // Mayor o igual al inicio del día
          lte: endOfDay    // Menor o igual al fin del día
        },
        notified7Days: false
      },
      include: {
        client: true 
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