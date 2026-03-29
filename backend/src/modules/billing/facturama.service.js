const axios = require('axios');

class FacturamaService {
  constructor() {
    this.isSandbox = process.env.FACTURAMA_IS_SANDBOX === 'true';
    this.baseUrl = this.isSandbox 
      ? 'https://apisandbox.facturama.mx' 
      : 'https://api.facturama.mx';
    
    // Autenticación HTTP Basic exigida por Facturama
    const credentials = Buffer.from(`${process.env.FACTURAMA_USER}:${process.env.FACTURAMA_PASSWORD}`).toString('base64');
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // TAREA 1: Subir CSD
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
      throw new Error(error.response?.data?.Message || 'Error al subir CSD a Facturama');
    }
  }

  // TAREA 2: Listar CSDs cargados
  async getCsds() {
    try {
      const response = await this.client.get('/api-lite/csds');
      return response.data;
    } catch (error) {
      throw new Error('Error al listar los CSDs');
    }
  }

  // TAREA 3: Obtener CSD por RFC
  async getCsdByRfc(rfc) {
    try {
      const response = await this.client.get(`/api-lite/csds/${rfc.toUpperCase()}`);
      return response.data;
    } catch (error) {
      throw new Error(`CSD no encontrado para el RFC: ${rfc}`);
    }
  }

  // TAREA 4: Actualizar CSD
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
      throw new Error('Error al actualizar el CSD');
    }
  }

  // TAREA 5: Eliminar CSD
  async deleteCsd(rfc) {
    try {
      const response = await this.client.delete(`/api-lite/csds/${rfc.toUpperCase()}`);
      return response.data;
    } catch (error) {
      throw new Error('Error al eliminar el CSD');
    }
  }

  // TAREA 6: Emitir CFDI 4.0 (con la lógica robusta de impuestos que ya teníamos)
  async createCfdi(invoiceData) {
    try {
      // Usamos la misma estructura de "cleanBody" que creamos anteriormente
      const body = {
        CfdiType: invoiceData.tipoComprobante.charAt(0),
        PaymentForm: invoiceData.formaPago.substring(0, 2),
        PaymentMethod: invoiceData.metodoPago.substring(0, 3),
        ExpeditionPlace: invoiceData.emisor.cp,
        Folio: invoiceData.folio || undefined,
        Serie: invoiceData.serie || undefined,
        Currency: invoiceData.moneda.substring(0, 3),
        ExchangeRate: invoiceData.moneda.startsWith('MXN') ? undefined : Number(invoiceData.tipoCambio),
        Exportation: invoiceData.exportacion.substring(0, 2),
        Issuer: {
          Rfc: invoiceData.emisor.rfc,
          Name: invoiceData.emisor.nombre,
          FiscalRegime: invoiceData.emisor.regimen.split(' ')[0]
        },
        Receiver: {
          Rfc: invoiceData.receptor.rfc,
          Name: invoiceData.receptor.nombre,
          CfdiUse: invoiceData.receptor.uso.split(' ')[0],
          FiscalRegime: invoiceData.receptor.regimen.split(' ')[0],
          TaxZipCode: invoiceData.receptor.cp
        },
        Items: invoiceData.conceptos.map(item => ({
          ProductCode: item.claveProdServ,
          Description: item.descripcion,
          UnitCode: item.claveUnidad,
          UnitPrice: Number(item.valorUnitario),
          Quantity: Number(item.cantidad),
          Subtotal: Number((item.cantidad * item.valorUnitario).toFixed(2)),
          Discount: item.descuento > 0 ? Number(item.descuento) : undefined,
          TaxObject: item.objetoImpuesto.substring(0, 2),
          Taxes: item.impuestos.length > 0 ? item.impuestos.map(imp => ({
            Name: imp.impuesto.includes('ISR') ? 'ISR' : (imp.impuesto.includes('IEPS') ? 'IEPS' : 'IVA'),
            Rate: Number(imp.tasaOCuota),
            IsRetention: imp.tipo === 'Retención',
            Total: Number(imp.importe.toFixed(2)),
            Base: Number(imp.base.toFixed(2))
          })) : undefined
        }))
      };

      const cleanBody = JSON.parse(JSON.stringify(body));
      
      // Llamada exacta al endpoint solicitado en tu PDF (Tarea 6)
      const response = await this.client.post('/api-lite/3/cfdis', cleanBody);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.Message || 'Error al emitir CFDI 4.0');
    }
  }
}

module.exports = new FacturamaService();