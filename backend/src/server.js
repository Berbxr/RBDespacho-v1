// src/server.js
require('dotenv').config();
const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const { startCronJobs } = require('./core/jobs/recurrence.job');

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3500;

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Base de datos conectada correctamente.');
    
    startCronJobs();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor RB Control corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error fatal al conectar la base de datos:', error);
    process.exit(1);
  }
}

bootstrap();