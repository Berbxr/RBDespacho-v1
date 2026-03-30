const facturamaService = require('./facturama.service');
const { PrismaClient } = require('@prisma/client'); 
const billingService = require('./billing.service');
const prisma = new PrismaClient(); 

const billingController = {
  // Tarea 1: Subir CSD
  async subirCsd(req, res) {
    try {
      const { rfc, razonSocial, cerBase64, keyBase64, password, regimen, cp, email } = req.body;
      
      // 1. Mandar Certificados a Facturama
      const resultado = await facturamaService.uploadCsd(rfc, cerBase64, keyBase64, password);
      
      // 2. Guardar Régimen, CP, Email y Razón Social en la Base de Datos Local
      await prisma.billingEmisor.upsert({
        where: { rfc: rfc.toUpperCase() },
        update: { 
          razonSocial: razonSocial ? razonSocial.toUpperCase() : rfc.toUpperCase(),
          regimenFiscal: regimen, 
          codigoPostal: cp, 
          email: email || null 
        },
        create: { 
          rfc: rfc.toUpperCase(), 
          razonSocial: razonSocial ? razonSocial.toUpperCase() : rfc.toUpperCase(), 
          regimenFiscal: regimen, 
          codigoPostal: cp, 
          email: email || null 
        }
      });

      res.status(201).json({ status: 'success', data: resultado });
    } catch(error) { 
      res.status(500).json({ status: 'error', message: error.message }); 
    }
  },

  // Tarea 2: Listar CSDs
  async listarCsds(req, res) {
    try {
      // 1. Traer CSDs de Facturama
      const listaFacturama = await facturamaService.getCsds();
      // 2. Traer datos complementarios de Prisma
      const emisoresLocales = await prisma.billingEmisor.findMany();

      const arrayFacturama = Array.isArray(listaFacturama) ? listaFacturama : (listaFacturama.data || []);

      // 3. Fusionar datos (CSD + Datos Locales)
      const dataFusionada = arrayFacturama.map(csd => {
        const local = emisoresLocales.find(e => e.rfc === csd.Rfc);
        return {
          ...csd,
          FiscalRegime: local ? local.regimenFiscal : '601 - General de Ley Personas Morales',
          TaxZipCode: local ? local.codigoPostal : '21399',
          Email: local ? local.email : '',
          RazonSocial: local ? local.razonSocial : csd.TaxEntityName || 'SIN RAZON SOCIAL'
        };
      });

      res.json({ status: 'success', data: dataFusionada });
    } catch(error) { 
      res.status(500).json({ status: 'error', message: error.message }); 
    }
  },

  // Tarea 3: Obtener 1 CSD
  async obtenerCsd(req, res) {
    try {
      const { rfc } = req.params;
      const csd = await facturamaService.getCsdByRfc(rfc);
      res.json({ status: 'success', data: csd });
    } catch(error) { 
      res.status(500).json({ status: 'error', message: error.message }); 
    }
  },

  // Tarea 4: Actualizar CSD
  async actualizarCsd(req, res) {
    try {
      const { rfc } = req.params;
      const { razonSocial, cerBase64, keyBase64, password, regimen, cp, email } = req.body;
      
      const resultado = await facturamaService.updateCsd(rfc, cerBase64, keyBase64, password);
      
      await prisma.billingEmisor.upsert({
        where: { rfc: rfc.toUpperCase() },
        update: { 
          razonSocial: razonSocial ? razonSocial.toUpperCase() : rfc.toUpperCase(),
          regimenFiscal: regimen, 
          codigoPostal: cp, 
          email: email || null 
        },
        create: { 
          rfc: rfc.toUpperCase(), 
          razonSocial: razonSocial ? razonSocial.toUpperCase() : rfc.toUpperCase(), 
          regimenFiscal: regimen, 
          codigoPostal: cp, 
          email: email || null 
        }
      });

      res.json({ status: 'success', data: resultado });
    } catch (error) { 
      res.status(500).json({ status: 'error', message: error.message }); 
    }
  },

  // Tarea 5: Eliminar CSD
  async eliminarCsd(req, res) {
    try {
      const { rfc } = req.params;
      const resultado = await facturamaService.deleteCsd(rfc);
      
      // Borrar de base de datos local
      await prisma.billingEmisor.deleteMany({ where: { rfc: rfc.toUpperCase() } });
      
      res.json({ status: 'success', data: resultado });
    } catch (error) { 
      res.status(500).json({ status: 'error', message: error.message }); 
    }
  },

  async emitirCfdi(req, res) {
    try {
      const invoiceData = req.body;
      const resultado = await billingService.emitirFactura(invoiceData);
      res.status(201).json({ status: 'success', message: 'Factura timbrada con éxito', data: resultado.facturamaResponse });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  async crearReceptor(req, res) {
    try {
      const { rfc, razonSocial, usoCfdiDefault, regimenFiscal, codigoPostal, email } = req.body;
      
      const existe = await prisma.billingReceptor.findUnique({ where: { rfc: rfc.toUpperCase() } });
      if (existe) return res.status(400).json({ status: 'error', message: 'Este RFC ya está registrado.' });

      const nuevoReceptor = await prisma.billingReceptor.create({
        data: {
          rfc: rfc.toUpperCase(),
          razonSocial: razonSocial.toUpperCase(),
          usoCfdiDefault,
          regimenFiscal,
          codigoPostal,
          email: email || null
        }
      });
      res.status(201).json({ status: 'success', data: nuevoReceptor });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error al guardar el receptor en la Base de Datos.' });
    }
  },

  async listarReceptores(req, res) {
    try {
      const receptores = await prisma.billingReceptor.findMany({ orderBy: { razonSocial: 'asc' } });
      res.json({ status: 'success', data: receptores });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error al listar receptores.' });
    }
  },

  async obtenerPerfil(req, res) {
    try {
      const perfil = await facturamaService.getProfile();
      res.json({ status: 'success', data: perfil });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error al obtener perfil' });
    }
  },

  async cancelarCfdi(req, res) {
    try {
      const { id } = req.params; 
      const { motivo, rfcEmisor, uuidReemplazo } = req.body;
      
      if (!rfcEmisor || !motivo) {
        return res.status(400).json({ status: 'error', message: 'El motivo y RFC del emisor son obligatorios' });
      }

      const resultado = await billingService.cancelarFactura(id, motivo, rfcEmisor, uuidReemplazo);
      res.json({ status: 'success', message: 'Solicitud de cancelación enviada correctamente', data: resultado });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  async descargarCfdi(req, res) {
    try {
      const { id } = req.params;
      const resultado = await billingService.obtenerFactura(id);
      res.json({ status: 'success', data: resultado });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
};

module.exports = billingController;