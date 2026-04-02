const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const facturamaApi = require('./facturama.service');

class BillingService {
  
  // SOLUCIÓN BUG 8 Y 9: Ahora recibe TODO el "invoiceData" generado por el Frontend
  async emitirFactura(invoiceData) {
    // 1. Validar que el Emisor exista localmente
    const emisorLocal = await prisma.billingEmisor.findUnique({ 
      where: { rfc: invoiceData.emisor.rfc.toUpperCase() } 
    });
    if (!emisorLocal) throw new Error('El Emisor no está registrado localmente.');
  
    // 2. Validar que el Receptor pertenezca a ESTE Emisor (Lógica inoWebs)
    const receptorLocal = await prisma.billingReceptor.findFirst({ 
      where: { 
        rfc: invoiceData.receptor.rfc.toUpperCase(),
        emisorId: emisorLocal.id
      } 
    });
    if (!receptorLocal) throw new Error('El receptor no pertenece al catálogo de este emisor.');

    // 3. Cálculos matemáticos usando los conceptos DINÁMICOS del frontend (Bug 9 Solucionado)
    let subtotalCalculado = 0;
    let totalCalculado = 0;
    
    invoiceData.conceptos.forEach(c => {
      subtotalCalculado += Number(c.importe);
      
      let impuestosTrasladados = 0;
      let impuestosRetenidos = 0;
      
      c.impuestos.forEach(imp => {
        if (imp.tipo === 'Traslado') impuestosTrasladados += Number(imp.importe);
        if (imp.tipo === 'Retención') impuestosRetenidos += Number(imp.importe);
      });
      
      totalCalculado += (Number(c.importe) - Number(c.descuento || 0) + impuestosTrasladados - impuestosRetenidos);
    });

    // 4. Enviar a timbrar a Facturama (Se pasa el payload completo)
  const cfdiTimbrado = await facturamaApi.createCfdi(invoiceData);

    // 5. Si Facturama lo aprobó y timbró con éxito, guardamos el registro en Prisma
    const nuevaFactura = await prisma.invoice.create({
      data: {
        emisorId: emisorLocal.id,
        receptorId: receptorLocal.id,
        tipoComprobante: invoiceData.tipoComprobante.charAt(0),
        metodoPago: invoiceData.metodoPago.substring(0, 3), 
        formaPago: invoiceData.formaPago.substring(0, 2),
        subtotal: subtotalCalculado,
        total: totalCalculado,
        satUuid: cfdiTimbrado.Complement.TaxStamp.Uuid, // Extraído de la respuesta del SAT
        facturamaId: cfdiTimbrado.Id,
        status: 'TIMBRADA'
      }
    });
  
    return { localInvoice: nuevaFactura, facturamaResponse: cfdiTimbrado };
  }

  // NUEVO: Cancelar Factura
  async cancelarFactura(cfdiId, motivo, rfcEmisor, uuidReemplazo = '') {
    if (!rfcEmisor) {
      throw new Error('El RFC del Emisor es obligatorio para cancelar en Multiemisor.');
    }

    // 1. Mandar la orden de cancelación a Facturama
    const cancelacion = await facturamaApi.cancelCfdi(cfdiId, motivo, rfcEmisor, uuidReemplazo);
    
    // 2. (Opcional) Si en el futuro guardas el Id de Facturama en tu modelo Invoice de Prisma,
    // aquí podrías actualizar su estado a 'CANCELLED'
    // await prisma.invoice.updateMany({ where: { facturamaId: cfdiId }, data: { status: 'CANCELLED' } });
    
    return cancelacion;
  }

  // NUEVO: Obtener XML/Detalle de Factura
  async obtenerFactura(cfdiId) {
    const factura = await facturamaApi.getCfdi(cfdiId);
    return factura;
  }


}

module.exports = new BillingService();