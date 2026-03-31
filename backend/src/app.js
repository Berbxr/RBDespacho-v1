// src/app.js
require('express-async-errors'); // 1. Debe ir estrictamente hasta arriba
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

// 2. Middlewares Base
const errorHandler = require('./core/middlewares/errorHandler');
const requireAuth = require('./core/middlewares/auth.middleware'); // Nuestro Guardián JWT

// 3. Importar Rutas
const authRoutes = require('./modules/auth/auth.routes');
const clientRoutes = require('./modules/clients/clients.routes');
const serviceRoutes = require('./modules/services/services.routes');
const financesRoutes = require('./modules/finances/finances.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes'); 
const reportsRoutes = require('./modules/reports/reports.routes');
const billingRoutes = require('./modules/billing/billing.routes'); // <-- Importamos Facturación
const remindersRoutes = require('./modules/reminders/reminders.routes');

const { startRemindersCron } = require('./core/jobs/telegramAlerts.job');

// AQUI NACE LA APP
const app = express();

// 4. Middlewares de seguridad y parseo (Despues de crear la app)
app.use(helmet()); 
app.use(cors({ 
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'] 
  }));
app.use(express.json());

// 5. Rutas Públicas
app.use('/api/auth', authRoutes);

// 6. Rutas Privadas (Protegidas por requireAuth)
app.use('/api/clients', requireAuth, clientRoutes);
app.use('/api/services', requireAuth, serviceRoutes);
app.use('/api/finances', requireAuth, financesRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/billing', requireAuth, billingRoutes);     // <-- Conectamos Facturación
app.use('/api/reminders', requireAuth, remindersRoutes);


startRemindersCron();

// 7. Manejo de errores global (Siempre estrictamente al final)
app.use(errorHandler);

module.exports = app;