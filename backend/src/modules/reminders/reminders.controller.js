// src/modules/reminders/reminders.controller.js
const remindersService = require('./reminders.service');

class RemindersController {
  async getAll(req, res) {
    try {
      const reminders = await remindersService.getAllReminders();
      res.json({ status: 'success', data: reminders });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  async create(req, res) {
    try {
      const { clientId, documentType, rfc, expirationDate } = req.body;
      
      if (!clientId || !documentType || !expirationDate) {
        return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios' });
      }

      const reminder = await remindersService.createReminder(req.body);
      res.status(201).json({ status: 'success', data: reminder });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await remindersService.deleteReminder(id);
      res.json({ status: 'success', message: 'Recordatorio eliminado' });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
}

module.exports = new RemindersController();