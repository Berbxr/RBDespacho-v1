const axios = require('axios');

class FacturamaService {
  constructor() {
    // Verificamos si estamos en Sandbox o Producción
    this.isSandbox = process.env.FACTURAMA_IS_SANDBOX === 'true';
    this.baseUrl = this.isSandbox 
      ? 'https://apisandbox.facturama.mx' 
      : 'https://api.facturama.mx';
    
    // Autenticación Básica (Usuario:Contraseña en Base64)
    const credentials = Buffer.from(`${process.env.FACTURAMA_USER}:${process.env.FACTURAMA_PASSWORD}`).toString('base64');
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // 1. Emitir un CFDI 4.0 (MULTIEMISOR)
  async createCfdi(invoiceData) {
    try {
      const body = {
        // NUEVO: En Multiemisor es OBLIGATORIO declarar quién emite la factura
        Issuer: {
          Rfc: invoiceData.emisor.rfc,
          Name: invoiceData.emisor.razonSocial,
          FiscalRegime: invoiceData.emisor.regimenFiscal
        },
        Receiver: {
          Rfc: invoiceData.receptor.rfc,
          Name: invoiceData.receptor.razonSocial,
          CfdiUse: invoiceData.receptor.usoCfdiDefault,
          FiscalRegime: invoiceData.receptor.regimenFiscal,
          TaxZipCode: invoiceData.receptor.codigoPostal
        },
        CfdiType: "I", 
        PaymentForm: invoiceData.formaPago,
        PaymentMethod: invoiceData.metodoPago,
        ExpeditionPlace: invoiceData.emisor.codigoPostal, // CP del Emisor
        Items: invoiceData.conceptos.map(item => ({
          ProductCode: item.claveProdServ,
          IdentificationNumber: item.noIdentificacion,
          Description: item.descripcion,
          UnitCode: item.claveUnidad,
          UnitPrice: Number(item.valorUnitario),
          Quantity: 1.0,
          Subtotal: Number(item.valorUnitario),
          Taxes: [
            {
              Name: "IVA",
              Rate: Number(item.impuestoTrasladado), 
              IsRetention: false
            }
          ],
          Total: Number(item.valorUnitario) * (1 + Number(item.impuestoTrasladado))
        }))
      };

      // NUEVO: Endpoint específico para Multiemisor
      const response = await this.client.post('/api-multiemisor/3/cfdis', body);
      return response.data; 
    } catch (error) {
      console.error("Error en Facturama API:", error.response?.data || error.message);
      const customError = new Error(error.response?.data?.Message || 'Error al timbrar la factura');
      customError.statusCode = 400;
      throw customError;
    }
  }

  // 2. Descargar PDF y XML
  async downloadFile(facturamaId, format = 'pdf') { 
    try {
      const response = await this.client.get(`/api-multiemisor/cfdi/${format}/${format}/${facturamaId}`);
      return response.data.Content; 
    } catch (error) {
      throw new Error(`Error descargando el ${format.toUpperCase()}`);
    }
  }

  // 3. Cancelar Factura
  async cancelCfdi(facturamaId, rfcEmisor, motivo = "02") { 
    try {
      // Multiemisor requiere el RFC del emisor en la URL para cancelar
      const response = await this.client.delete(`/api-multiemisor/api-lite/cfdis/${facturamaId}?motive=${motivo}&rfcIssuer=${rfcEmisor}`);
      return response.data;
    } catch (error) {
      throw new Error('Error al cancelar el CFDI en el SAT');
    }
  }

  // 4. Consultar Timbres Reales
  async getProfile() {
    try {
      // El endpoint /api/profile devuelve la info de tu cuenta maestra y folios
      const response = await this.client.get('/api/profile');
      return response.data; 
    } catch (error) {
      throw new Error('Error al obtener los timbres de Facturama');
    }
  }

  // 5. Subir CSD (Certificados) de un nuevo Emisor a Facturama
  async uploadCsd(rfc, cerBase64, keyBase64, password) {
    try {
      const body = {
        Rfc: rfc.toUpperCase(),
        Certificate: cerBase64,
        PrivateKey: keyBase64,
        PrivateKeyPassword: password
      };
      
      // Facturama guardará estos sellos para poder timbrar a nombre de este RFC
      const response = await this.client.post('/api-multiemisor/csd', body);
      return response.data;
    } catch (error) {
      console.error("Error subiendo CSD:", error.response?.data);
      throw new Error(error.response?.data?.Message || 'Error al cargar los certificados. Revisa tu contraseña.');
    }
  }
}

module.exports = new FacturamaService();