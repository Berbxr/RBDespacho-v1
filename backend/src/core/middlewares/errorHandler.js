// src/core/middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(`[Error]: ${err.message}`);

  const statusCode = err.statusCode || 500;
  const response = {
    status: 'error',
    message: err.message || 'Error interno del servidor',
  };

  // No enviar el stack trace en producción por seguridad
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;