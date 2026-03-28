const dashboardService = require('./dashboard.service');

class DashboardController {
  async getDashboardData(req, res) {
    try {
      const data = await dashboardService.getMainMetrics();
      
      return res.status(200).json({
        status: 'success',
        data
      });
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Hubo un error al procesar las métricas del dashboard',
        error: error.message
      });
    }
  }
}

module.exports = new DashboardController();