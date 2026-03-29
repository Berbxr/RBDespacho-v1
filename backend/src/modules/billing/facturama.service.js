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
  // Documentación: https://apisandbox.facturama.mx/Docs-multi/csds
  // =========================================================================

  async uploadCsd(rfc, cerBase64, keyBase64, password) {
    try {
      const body = {
        Rfc: rfc.toUpperCase(),
        Certificate: cerBase64,
        PrivateKey: keyBase64,
        PrivateKeyPassword: password
      };
      // Endpoint oficial Multiemisor para subir CSD
      const response = await this.client.post('/api-lite/csds', body);
      return response.data;
    } catch (error) {
      console.error("Error Facturama (Subir CSD):", error.response?.data);
      throw new Error(error.response?.data?.Message || 'Error al subir CSD a Facturama');
    }
  }

  async getCsds() {
    try {
      // Endpoint oficial Multiemisor para listar CSDs
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

  // =========================================================================
  // 2. MÓDULO DE TIMBRADO (CFDI 4.0) - Exclusivo de Multiemisor
  // Documentación: https://apisandbox.facturama.mx/Docs-multi/cfdis
  // =========================================================================

  async createCfdi(invoiceData) {
    try {
      // Estructura JSON exacta requerida por la API Multiemisor 4.0
      const body = {
        CfdiType: invoiceData.tipoComprobante.charAt(0), // "I", "E", "P"
        PaymentForm: invoiceData.formaPago.substring(0, 2), // "03", "99"
        PaymentMethod: invoiceData.metodoPago.substring(0, 3), // "PUE", "PPD"
        ExpeditionPlace: invoiceData.emisor.cp,
        Folio: invoiceData.folio || undefined,
        Serie: invoiceData.serie || undefined,
        Currency: invoiceData.moneda.substring(0, 3), // "MXN"
        ExchangeRate: invoiceData.moneda.startsWith('MXN') ? undefined : Number(invoiceData.tipoCambio),
        Exportation: invoiceData.exportacion.substring(0, 2), // "01"
        
        // NODO ISSUER (OBLIGATORIO EN MULTIEMISOR)
        Issuer: {
          Rfc: invoiceData.emisor.rfc,
          Name: invoiceData.emisor.nombre,
          FiscalRegime: invoiceData.emisor.regimen.split(' ')[0]
        },
        
        // NODO RECEIVER
        Receiver: {
          Rfc: invoiceData.receptor.rfc,
          Name: invoiceData.receptor.nombre,
          CfdiUse: invoiceData.receptor.uso.split(' ')[0],
          FiscalRegime: invoiceData.receptor.regimen.split(' ')[0],
          TaxZipCode: invoiceData.receptor.cp,
          TaxResidence: invoiceData.receptor.residenciaFiscal || undefined,
          TaxRegistrationNumber: invoiceData.receptor.numRegIdTrib || undefined
        },
        
        // NODO ITEMS (Conceptos)
        Items: invoiceData.conceptos.map(item => {
          // Filtrar y mapear impuestos
          let taxesArray = undefined;
          if (item.impuestos && item.impuestos.length > 0) {
            taxesArray = item.impuestos.map(imp => {
              // Ajustar el nombre del impuesto para Facturama
              let taxName = 'IVA';
              if (imp.impuesto.includes('ISR')) taxName = 'ISR';
              if (imp.impuesto.includes('IEPS')) taxName = 'IEPS';

              return {
                Name: taxName,
                Rate: Number(imp.tasaOCuota),
                IsRetention: imp.tipo === 'Retención',
                Total: Number(imp.importe.toFixed(2)),
                Base: Number(imp.base.toFixed(2))
              };
            });
          }

          return {
            ProductCode: item.claveProdServ,
            IdentificationNumber: item.noIdentificacion || undefined,
            Description: item.descripcion,
            UnitCode: item.claveUnidad,
            Unit: item.unidad || 'Servicio',
            UnitPrice: Number(item.valorUnitario),
            Quantity: Number(item.cantidad),
            Subtotal: Number((item.cantidad * item.valorUnitario).toFixed(2)),
            Discount: item.descuento > 0 ? Number(item.descuento) : 0,
            TaxObject: item.objetoImpuesto.substring(0, 2), // "01", "02"
            Taxes: taxesArray
          };
        })
      };

      // Limpiamos los campos undefined
      const cleanBody = JSON.parse(JSON.stringify(body));
      
      console.log("📤 Enviando a Facturama (API Lite):", JSON.stringify(cleanBody, null, 2));

      // Endpoint oficial para timbrado Multiemisor
      const response = await this.client.post('/api-lite/3/cfdis', cleanBody);
      return response.data;

    } catch (error) {
      console.error("❌ Error Facturama (Timbrado):", JSON.stringify(error.response?.data, null, 2));
      
      // Extraer mensaje detallado del SAT (ModelState) si existe
      let errorMsg = error.response?.data?.Message || 'Error al timbrar en Facturama';
      if (error.response?.data?.ModelState) {
        const errors = Object.values(error.response.data.ModelState).flat();
        errorMsg = errors.join(' | ');
      }
      throw new Error(errorMsg);
    }
  }

  // =========================================================================
  // 3. OTRAS FUNCIONES (Descargas, Cancelaciones, etc.)
  // =========================================================================
  // Nota: En multiemisor, descargar un XML se hace mediante GET /api-lite/cfdis/{id}
  // y para cancelar es DELETE /api-lite/cfdis/{id}

  // Obtener/Descargar CFDI (Devuelve el detalle y el XML Base64)
  async getCfdi(cfdiId) {
    try {
      const response = await this.client.get(`/api-lite/cfdis/${cfdiId}`);
      return response.data;
    } catch (error) {
      console.error("❌ Error Facturama (Descarga):", error.response?.data);
      throw new Error(error.response?.data?.Message || 'Error al obtener el CFDI');
    }
  }

  // Cancelar CFDI (Requiere Motivo y RFC Emisor)
  async cancelCfdi(cfdiId, motive, rfcIssuer, uuidReplacement = '') {
    try {
      // Construimos la URL con los parámetros obligatorios de Multiemisor
      let url = `/api-lite/cfdis/${cfdiId}?motive=${motive}&rfcIssuer=${rfcIssuer}`;
      
      // Si el motivo es "01" (Comprobante emitido con errores con relación)
      if (motive === '01' && uuidReplacement) {
        url += `&uuidReplacement=${uuidReplacement}`;
      }

      const response = await this.client.delete(url);
      return response.data;
    } catch (error) {
      console.error("❌ Error Facturama (Cancelación):", error.response?.data);
      throw new Error(error.response?.data?.Message || 'Error al cancelar el CFDI');
    }
  }




}

module.exports = new FacturamaService();