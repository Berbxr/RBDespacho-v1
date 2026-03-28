const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const facturamaApi = require('./facturama.service');

class BillingService {
  async emitirFactura(receptorId, conceptosIds, metodoPago, formaPago) {
    // 1. Obtener receptor
    const receptor = await prisma.billingReceptor.findUnique({ where: { id: receptorId } });
    if (!receptor) throw new Error('Receptor fiscal no encontrado');

    // 2. Obtener conceptos (servicios facturables)
    const conceptos = await prisma.billingConcept.findMany({
      where: { id: { in: conceptosIds } }
    });

    // 3. Cálculos matemáticos locales
    let subtotal = 0;
    let total = 0;
    conceptos.forEach(c => {
      subtotal += Number(c.valorUnitario);
      total += Number(c.valorUnitario) * (1 + Number(c.impuestoTrasladado));
    });

    // 4. Enviar a timbrar a Facturama
    const invoiceData = { receptor, conceptos, metodoPago, formaPago };
    const cfdiTimbrado = await facturamaApi.createCfdi(invoiceData);

    // 5. Si Facturama tuvo éxito, guardamos el registro localmente
    const nuevaFactura = await prisma.invoice.create({
      data: {
        receptorId,
        tipoComprobante: 'INGRESO',
        metodoPago,
        formaPago,
        subtotal,
        total,
        satUuid: cfdiTimbrado.Complement.TaxStamp.Uuid,
        folio: cfdiTimbrado.Folio,
        status: 'ACTIVE',
        facturamaId: cfdiTimbrado.Id,
      }
    });

    return nuevaFactura;
  }
}

module.exports = new BillingService();