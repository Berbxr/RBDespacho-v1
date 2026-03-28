const reportsService = require('./reports.service');

class ReportsController {
  async downloadDebtorsReport(req, res) {
    try {
      const buffer = await reportsService.generateDebtorsExcel();
      
      // Configuramos las cabeceras HTTP para forzar la descarga en el navegador
      res.setHeader('Content-Disposition', 'attachment; filename="Reporte_Adeudos.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Enviamos el archivo binario directamente
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error generando Excel' });
    }
  }
}

module.exports = new ReportsController();