const cron = require('node-cron');
const axios = require('axios');
const remindersRepository = require('../../modules/reminders/reminders.repository');

const sendTelegramAlerts = async () => {
  console.log('⏳ [CRON] Buscando documentos por vencer en 7 días...');

  try {
    const dueReminders = await remindersRepository.getDueIn7Days();

    if (dueReminders.length === 0) {
      console.log('✅ [CRON] No hay documentos por vencer.');
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const notifiedIds = [];

    // Iteramos sobre cada documento y enviamos el mensaje
   for (const reminder of dueReminders) {
      const clientName = `${reminder.client.firstName} ${reminder.client.lastName1}`;
      
      // Usamos etiquetas HTML (<b> para negritas, <i> para cursivas)
      const text = `🚨 <b>ALERTA DE VENCIMIENTO</b>\n\n` +
                   `👤 <b>Cliente:</b> ${clientName}\n` +
                   `📄 <b>Documento:</b> ${reminder.documentType}\n` +
                   `🆔 <b>RFC:</b> ${reminder.rfc}\n` +
                   `📅 <b>Vence el:</b> ${reminder.expirationDate.toISOString().split('T')[0]}\n\n` +
                   `⚠️ <i>Faltan 7 días para su vencimiento.</i>`;

      // Llamada a la API de Telegram usando parse_mode: 'HTML'
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      });

      notifiedIds.push(reminder.id);
    }

    // Actualizamos la base de datos para no volver a notificar mañana
    if (notifiedIds.length > 0) {
      await remindersRepository.markAsNotified(notifiedIds);
    }

    console.log(`✅ [CRON] Se enviaron ${notifiedIds.length} alertas por Telegram.`);
  } catch (error) {
    console.error('❌ [CRON] Error enviando alertas de Telegram:', error.response?.data || error.message);
  }
};

// Se ejecuta todos los días a las 09:00 AM
const startRemindersCron = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Ejecutando cronjob de recordatorios diarios...');
    await sendTelegramAlerts();
  }, {
    timezone: "America/Mexico_City" // Ajusta a tu zona horaria
  });
  console.log('✅ Cronjob de Telegram programado (8:00 AM).');
};

module.exports = { startRemindersCron };