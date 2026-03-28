// src/modules/reminders/reminders.service.js
const remindersRepository = require('./reminders.repository');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RemindersService {
  async getAllReminders() {
    // Traemos todos los recordatorios e incluimos los datos del cliente
    return await prisma.documentReminder.findMany({
      include: {
        client: { select: { firstName: true, lastName1: true, lastName2: true } }
      },
      orderBy: { expirationDate: 'asc' }
    });
  }

  async createReminder(data) {
    const { clientId, documentType, rfc, expirationDate } = data;

    // Normalizamos la fecha a UTC a las 00:00:00 para que coincida perfecto con el Cronjob
    const normalizedDate = new Date(expirationDate);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    return await prisma.documentReminder.create({
      data: {
        clientId,
        documentType,
        rfc,
        expirationDate: normalizedDate
      }
    });
  }

  async deleteReminder(id) {
    return await prisma.documentReminder.delete({
      where: { id }
    });
  }
}

module.exports = new RemindersService();