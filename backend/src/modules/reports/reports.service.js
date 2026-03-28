const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ReportsService {
  async generateDebtorsExcel() {
    // 1. Obtenemos datos crudos de Prisma
    const debtors = await prisma.financialTransaction.findMany({
      where: { status: 'PENDING', type: 'INCOME' },
      include: {
        client: { select: { firstName: true, lastName1: true, rfc: true } },
        service: { select: { name: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    // 2. Mapeamos a un formato plano y amigable para Excel
    const flatData = debtors.map(d => ({
      'Cliente': `${d.client?.firstName} ${d.client?.lastName1}`,
      'RFC': d.client?.rfc || 'N/A',
      'Servicio': d.service?.name || 'General',
      'Monto Deuda': Number(d.amount),
      'Fecha Vencimiento': d.dueDate.toISOString().split('T')[0],
      'Días Vencido': Math.floor((new Date() - new Date(d.dueDate)) / (1000 * 60 * 60 * 24))
    }));

    // Si no hay datos, creamos una fila vacía para que no truene
    if (flatData.length === 0) flatData.push({ Mensaje: 'No hay adeudos registrados' });

    // 3. 🚀 Generación del Excel en Memoria (Buffer)
    const worksheet = XLSX.utils.json_to_sheet(flatData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Adeudos');

    // Retorna un buffer binario, NO guarda en disco
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = new ReportsService();