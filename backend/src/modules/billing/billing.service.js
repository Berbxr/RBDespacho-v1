const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const facturamaApi = require('./facturama.service');

class BillingService {
  
  // SOLUCIÓN BUG 8 Y 9: Ahora recibe TODO el "invoiceData" generado por el Frontend
  async emitirFactura(invoiceData) {
    
    // 1. Validar Emisor (Bug 8 Solucionado - Multiemisor Obligatorio)
    if (!invoiceData.emisor || !invoiceData.emisor.rfc) {
      throw new Error('El RFC del Emisor es obligatorio para la API Multiemisor.');
    }

    // 2. Validar que el Receptor exista en nuestra BD local (Prisma)
    const receptor = await prisma.billingReceptor.findUnique({ 
      where: { rfc: invoiceData.receptor.rfc.toUpperCase() } 
    });
    if (!receptor) {
      throw new Error('Receptor fiscal no encontrado en la base de datos local. Por favor, regístralo primero.');
    }

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
        receptorId: receptor.id,
        tipoComprobante: invoiceData.tipoComprobante.charAt(0), // 'I', 'E', 'P'
        metodoPago: invoiceData.metodoPago.substring(0, 3), // 'PUE' o 'PPD'
        formaPago: invoiceData.formaPago.substring(0, 2), // '01', '03', '99'
        subtotal: subtotalCalculado,
        total: totalCalculado
        // Nota: Si en tu modelo de Prisma 'Invoice' agregas un campo 'uuidFacturama String',
        // podrías guardarlo aquí usando: uuidFacturama: cfdiTimbrado.Id
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