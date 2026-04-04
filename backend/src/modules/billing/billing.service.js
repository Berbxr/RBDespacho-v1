const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const facturamaApi = require('./facturama.service');

class BillingService {
  
  async emitirFactura(invoiceData) {
    // 1. Validar Emisor
    const emisorLocal = await prisma.facEmisor.findUnique({ 
      where: { rfc: invoiceData.emisor.rfc.toUpperCase() } 
    });
    if (!emisorLocal) throw new Error('El Emisor no está registrado.');

    // 2. Validar Receptor (Aislamiento por Emisor)
    const receptorLocal = await prisma.facReceptor.findFirst({ 
      where: { 
        rfc: invoiceData.receptor.rfc.toUpperCase(),
        emisorId: emisorLocal.id
      } 
    });
    if (!receptorLocal) throw new Error('El receptor no pertenece al catálogo de este emisor.');

    // 3. Preparar correos para envío automático 
    // (Prioriza los que se escribieron en el frontend, si están vacíos usa los de la DB)
    const emails = [];
    const emailEmisor = invoiceData.emisor.email || emisorLocal.emailEnvio;
    const emailReceptor = invoiceData.receptor.email || receptorLocal.email;

    if (emailEmisor) emails.push(emailEmisor);
    if (emailReceptor) emails.push(emailReceptor);

    // 4. Mapear Payload para Facturama API-Lite
    const facturamaPayload = {
      Serie: invoiceData.serie || null,
      Folio: String(invoiceData.folio),
      ExpeditionPlace: emisorLocal.cp,
      PaymentFormControl: invoiceData.formaPago,
      PaymentMethod: invoiceData.metodoPago,
      Currency: invoiceData.moneda,
      CfdiType: invoiceData.tipoComprobante,
      Receiver: {
        Rfc: receptorLocal.rfc,
        Name: receptorLocal.razonSocial,
        CfdiUse: invoiceData.usoCFDI,
        TaxZipCode: receptorLocal.cpFiscal,
        FiscalRegime: receptorLocal.regimenFiscal,
        Email: emails.length > 0 ? emails.join(';') : null
      },
      Items: invoiceData.conceptos.map(c => ({
        ProductCode: c.claveProdServ,
        IdentificationNumber: c.noIdentificacion,
        Description: c.descripcion,
        UnitCode: c.claveUnidad,
        Unit: c.unidad,
        Quantity: c.cantidad,
        UnitPrice: c.valorUnitario,
        Subtotal: Number((c.cantidad * c.valorUnitario).toFixed(2)),
        TaxObject: c.objetoImpuesto || "02",
        Taxes: c.impuestos?.map(imp => ({
          Name: imp.Name, // IVA, ISR, IEPS
          Rate: imp.Rate,
          Base: Number((c.cantidad * c.valorUnitario).toFixed(2)),
          Total: Number(imp.Total.toFixed(2)),
          IsRetained: imp.IsRetained,
          IsQuota: imp.IsQuota || false
        }))
      }))
    };

    try {
      // 5. Timbrado en Facturama
      const cfdiTimbrado = await facturamaApi.createCfdi(facturamaPayload);

      // 6. Guardar en Base de Datos Local
      const nuevaFactura = await prisma.facCFDI.create({
        data: {
          emisorId: emisorLocal.id,
          receptorId: receptorLocal.id,
          tipoCFDI: invoiceData.tipoComprobante.charAt(0),
          metodoPago: invoiceData.metodoPago,
          formaPago: invoiceData.formaPago,
          usoCFDI: invoiceData.usoCFDI,
          folio: Number(invoiceData.folio),
          conceptos: invoiceData.conceptos,
          subtotal: invoiceData.totales.subtotal,
          total: invoiceData.totales.total,
          satUuid: cfdiTimbrado.Complement?.TaxStamp?.Uuid,
          estado: 'TIMBRADA'
        }
      });

      return { success: true, data: nuevaFactura, cfdiId: cfdiTimbrado.Id };
    } catch (error) {
      console.error("Error Facturama:", error.message);
      throw error;
    }
  }

  async cancelarFactura(cfdiId, motivo, rfcEmisor, uuidReemplazo = '') {
    const resultado = await facturamaApi.cancelCfdi(cfdiId, motivo, rfcEmisor, uuidReemplazo);
    await prisma.facCFDI.updateMany({
      where: { satUuid: cfdiId },
      data: { estado: 'CANCELADA', motivoCancelacion: motivo, folioSustitucion: uuidReemplazo }
    });
    return resultado;
  }
}

module.exports = new BillingService();