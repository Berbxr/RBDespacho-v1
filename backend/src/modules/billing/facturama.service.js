const axios = require('axios');

class FacturamaService {
  constructor() {
    this.isSandbox = process.env.FACTURAMA_IS_SANDBOX === 'true';
    this.baseUrl = this.isSandbox 
      ? 'https://apisandbox.facturama.mx' 
      : 'https://api.facturama.mx';
    
    // Autenticación HTTP Basic (Estándar para API Multiemisor)
    const credentials = Buffer.from(`${process.env.FACTURAMA_USER}:${process.env.FACTURAMA_PASSWORD}`).toString('base64');
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // =========================================================================
  // 1. MÓDULO DE CERTIFICADOS (CSD) - Exclusivo de Multiemisor
  // =========================================================================

  async uploadCsd(rfc, cerBase64, keyBase64, password) {
    try {
      const body = {
        Rfc: rfc.toUpperCase(),
        Certificate: cerBase64,
        PrivateKey: keyBase64,
        PrivateKeyPassword: password
      };
      const response = await this.client.post('/api-lite/csds', body);
      return response.data;
    } catch (error) {
      console.error("Error Facturama (Subir CSD):", error.response?.data);
      throw new Error(error.response?.data?.Message || 'Error al subir CSD a Facturama');
    }
  }

  async getCsds() {
    try {
      const response = await this.client.get('/api-lite/csds');
      return response.data;
    } catch (error) {
      console.error("Error Facturama (Listar CSDs):", error.response?.data);
      throw new Error('Error al listar los Certificados CSD');
    }
  }

  async getCsdByRfc(rfc) {
    try {
      const response = await this.client.get(`/api-lite/csds/${rfc.toUpperCase()}`);
      return response.data;
    } catch (error) {
      throw new Error(`CSD no encontrado para el RFC: ${rfc}`);
    }
  }

  async updateCsd(rfc, cerBase64, keyBase64, password) {
    try {
      const body = {
        Rfc: rfc.toUpperCase(),
        Certificate: cerBase64,
        PrivateKey: keyBase64,
        PrivateKeyPassword: password
      };
      const response = await this.client.put(`/api-lite/csds/${rfc.toUpperCase()}`, body);
      return response.data;
    } catch (error) {
      console.error("❌ Error Facturama (Actualizar CSD):", error.response?.data);
      throw new Error(error.response?.data?.Message || 'Error al actualizar CSD en Facturama');
    }
  }

  async deleteCsd(rfc) {
    try {
      const response = await this.client.delete(`/api-lite/csds/${rfc.toUpperCase()}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error Facturama (Eliminar CSD):", error.response?.data);
      throw new Error(error.response?.data?.Message || 'Error al eliminar CSD en Facturama');
    }
  }

  // =========================================================================
  // 2. MÓDULO DE TIMBRADO (CFDI 4.0) - Exclusivo de Multiemisor
  // =========================================================================

  async createCfdi(invoiceData, emisorData) {
    try {
      // NODO ITEMS (Conceptos) con la corrección de TaxObject, Base y Total
      const items = invoiceData.conceptos.map(item => {
        let itemTotalTraslados = 0;
        let itemTotalRetenciones = 0;
        let taxesArray = undefined;

        if (item.impuestos && item.impuestos.length > 0) {
          taxesArray = item.impuestos.map(imp => {
            let taxName = 'IVA';
            if (imp.impuesto.includes('ISR') || imp.impuesto === "001") taxName = 'ISR';
            if (imp.impuesto.includes('IEPS') || imp.impuesto === "003") taxName = 'IEPS';

            const importeImpuesto = Number(imp.importe.toFixed(2));
            const baseImpuesto = Number(imp.base ? imp.base : (item.cantidad * item.valorUnitario)).toFixed(2);

            if (imp.tipo === 'Traslado') itemTotalTraslados += importeImpuesto;
            if (imp.tipo === 'Retención') itemTotalRetenciones += importeImpuesto;

            return {
              Name: taxName,
              Rate: Number(imp.tasaOCuota || imp.tasaCuota),
              IsRetention: imp.tipo === 'Retención' || imp.tipo === 'Retencion',
              Total: importeImpuesto,
              Base: Number(baseImpuesto)
            };
          });
        }

        const subtotalItem = Number((item.cantidad * item.valorUnitario).toFixed(2));
        const descuentoItem = item.descuento > 0 ? Number(item.descuento) : 0;
        const totalItem = Number((subtotalItem - descuentoItem + itemTotalTraslados - itemTotalRetenciones).toFixed(2));

        return {
          ProductCode: item.claveProdServ,
          IdentificationNumber: item.noIdentificacion || undefined,
          Description: item.descripcion,
          UnitCode: item.claveUnidad,
          Unit: item.unidad || 'Servicio',
          UnitPrice: Number(item.valorUnitario),
          Quantity: Number(item.cantidad),
          Subtotal: subtotalItem,
          Discount: descuentoItem,
          TaxObject: item.objetoImpuesto ? item.objetoImpuesto.substring(0, 2) : "02", // "01", "02"
          Taxes: taxesArray,
          Total: totalItem 
        };
      });

      // Estructura JSON exacta requerida por la API Multiemisor 4.0
      const body = {
        CfdiType: invoiceData.tipoComprobante.charAt(0), 
        PaymentForm: invoiceData.formaPago?.substring(0, 2), 
        PaymentMethod: invoiceData.metodoPago?.substring(0, 3), 
        ExpeditionPlace: emisorData.cp,
        Folio: invoiceData.folio ? String(invoiceData.folio) : undefined, // Corregido: Folio como String
        Serie: invoiceData.serie || undefined,
        Currency: invoiceData.moneda?.substring(0, 3) || "MXN",
        ExchangeRate: (!invoiceData.moneda || invoiceData.moneda.startsWith('MXN')) ? undefined : Number(invoiceData.tipoCambio),
        Exportation: invoiceData.exportacion?.substring(0, 2) || "01",
        
        Issuer: {
          Rfc: emisorData.rfc,
          Name: emisorData.razonSocial,
          FiscalRegime: emisorData.regimenFiscal
        },
        
        Receiver: {
          Rfc: invoiceData.receptor.rfc,
          Name: invoiceData.receptor.nombre,
          CfdiUse: invoiceData.usoCFDI ? invoiceData.usoCFDI.substring(0, 3) : (invoiceData.receptor.uso || 'G03').substring(0, 3),
          FiscalRegime: invoiceData.receptor.regimenFiscal ? invoiceData.receptor.regimenFiscal.substring(0, 3) : '601',
          TaxZipCode: invoiceData.receptor.cpFiscal || invoiceData.receptor.cp,
          TaxResidence: invoiceData.receptor.residenciaFiscal || undefined,
          TaxRegistrationNumber: invoiceData.receptor.numRegIdTrib || undefined
        },
        
        Items: items
      };

      const cleanBody = JSON.parse(JSON.stringify(body));
      const response = await this.client.post('/api-lite/3/cfdis', cleanBody);
      return response.data;

    } catch (error) {
      console.error("❌ Error Facturama (Timbrado):", JSON.stringify(error.response?.data, null, 2));
      let errorMsg = error.response?.data?.Message || 'Error al timbrar en Facturama';
      if (error.response?.data?.ModelState) {
        const errors = Object.values(error.response.data.ModelState).flat();
        errorMsg = errors.join(' | ');
      }
      throw new Error(errorMsg);
    }
  }

  // =========================================================================
  // 3. OTRAS FUNCIONES (Descargas, Cancelaciones, Complementos)
  // =========================================================================

  async getCfdi(cfdiId) {
    try {
      const response = await this.client.get(`/api-lite/cfdis/${cfdiId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.Message || 'Error al obtener el CFDI');
    }
  }

  async cancelCfdi(cfdiId, motive, rfcIssuer, uuidReplacement = '') {
    try {
      let url = `/api-lite/cfdis/${cfdiId}?motive=${motive}&rfcIssuer=${rfcIssuer}`;
      if (motive === '01' && uuidReplacement) {
        url += `&uuidReplacement=${uuidReplacement}`;
      }
      const response = await this.client.delete(url);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.Message || 'Error al cancelar el CFDI');
    }
  }

  async createPaymentComplement(paymentData) {
    try {
      const body = {
        Issuer: { Rfc: paymentData.emisorRfc },
        Receiver: { 
          Rfc: paymentData.receptorRfc, 
          Name: paymentData.receptorName,
          CfdiUse: "CP01", 
          FiscalRegime: paymentData.receptorRegime,
          TaxZipCode: paymentData.receptorZipCode
        },
        CfdiType: "P",
        Currency: "XXX", 
        Complements: [
          {
            Type: "Payment",
            Payments: [
              {
                Date: paymentData.fechaPago,
                PaymentForm: paymentData.formaPago,
                Amount: paymentData.montoPagado,
                RelatedDocuments: [
                  {
                    Uuid: paymentData.facturaOrigenUuid,
                    Amount: paymentData.montoPagado,
                    PaymentMethod: "PPD",
                    PartialityNumber: paymentData.parcialidad,
                    PreviousBalanceAmount: paymentData.saldoAnterior,
                    AmountPaid: paymentData.montoPagado,
                    OutstandingBalanceAmount: paymentData.saldoInsoluto,
                    Taxes: paymentData.taxes 
                  }
                ]
              }
            ]
          }
        ]
      };
      const response = await this.client.post('/api-lite/3/cfdis', body);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.Message || 'Error al emitir el Complemento de Pago');
    }
  }

  async listarCFDIs(rfcEmisor) {
    try {
      const response = await this.client.get(`/api-lite/cfdis?rfc=${rfcEmisor}`);
      return response.data;
    } catch (error) {
      throw new Error('Error al listar CFDIs en Facturama');
    }
  }

  async descargarXML(idCfdi) {
    try {
      const response = await this.client.get(`/api-lite/cfdis/${idCfdi}/xml`);
      return response.data;
    } catch (error) {
      throw new Error('Error al descargar XML');
    }
  }

  async descargarPDF(idCfdi) {
    try {
      const response = await this.client.get(`/api-lite/cfdis/${idCfdi}/pdf`);
      return response.data;
    } catch (error) {
      throw new Error('Error al descargar PDF');
    }
  }
}

module.exports = new FacturamaService();