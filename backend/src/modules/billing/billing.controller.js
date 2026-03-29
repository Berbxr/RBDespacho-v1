const facturamaService = require('./facturama.service');
const { PrismaClient } = require('@prisma/client'); // <-- NUEVO
const billingService = require('./billing.service');
const prisma = new PrismaClient(); // <-- NUEVO
// Aquí también importarás Prisma si necesitas guardar en la BD después de timbrar

const billingController = {
  // Tarea 1: Subir
  async subirCsd(req, res) {
    const { rfc, cerBase64, keyBase64, password } = req.body;
    const resultado = await facturamaService.uploadCsd(rfc, cerBase64, keyBase64, password);
    res.status(201).json({ status: 'success', data: resultado });
  },

  // Tarea 2: Listar
  async listarCsds(req, res) {
    const lista = await facturamaService.getCsds();
    res.json({ status: 'success', data: lista });
  },

  // Tarea 3: Obtener 1
  async obtenerCsd(req, res) {
    const { rfc } = req.params;
    const csd = await facturamaService.getCsdByRfc(rfc);
    res.json({ status: 'success', data: csd });
  },

  // Tarea 4: Actualizar
  async actualizarCsd(req, res) {
    const { rfc } = req.params;
    const { cerBase64, keyBase64, password } = req.body;
    const resultado = await facturamaService.updateCsd(rfc, cerBase64, keyBase64, password);
    res.json({ status: 'success', data: resultado });
  },

  // Tarea 5: Eliminar
  async eliminarCsd(req, res) {
    const { rfc } = req.params;
    const resultado = await facturamaService.deleteCsd(rfc);
    res.json({ status: 'success', data: resultado });
  },

  // Tarea 6: Emitir
 async emitirCfdi(req, res) {
    const invoiceData = req.body;
    
    // Llamamos al BillingService que ahora se encarga de todo (Timbrar y Guardar en BD)
    const resultado = await billingService.emitirFactura(invoiceData);
    
    res.status(201).json({ 
      status: 'success', 
      message: 'Factura timbrada con éxito y guardada en base de datos',
      data: resultado.facturamaResponse 
    });
  },

  // NUEVO: Guardar un Receptor en Prisma
  async crearReceptor(req, res) {
    try {
      const { rfc, razonSocial, usoCfdiDefault, regimenFiscal, codigoPostal } = req.body;
      
      // Validar si ya existe
      const existe = await prisma.billingReceptor.findUnique({ where: { rfc: rfc.toUpperCase() } });
      if (existe) {
        return res.status(400).json({ status: 'error', message: 'Este RFC ya está registrado.' });
      }

      const nuevoReceptor = await prisma.billingReceptor.create({
        data: {
          rfc: rfc.toUpperCase(),
          razonSocial: razonSocial.toUpperCase(),
          usoCfdiDefault,
          regimenFiscal,
          codigoPostal
        }
      });

      res.status(201).json({ status: 'success', data: nuevoReceptor });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error al guardar el receptor en la Base de Datos.' });
    }
  },

  // NUEVO: Listar Receptores desde Prisma
  async listarReceptores(req, res) {
    try {
      const receptores = await prisma.billingReceptor.findMany({
        orderBy: { razonSocial: 'asc' }
      });
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

  // NUEVO: Cancelar CFDI
  async cancelarCfdi(req, res) {
    try {
      const { id } = req.params; // El ID que Facturama nos devolvió al timbrar
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

  // NUEVO: Descargar CFDI
  async descargarCfdi(req, res) {
    try {
      const { id } = req.params;
      const resultado = await billingService.obtenerFactura(id);
      
      // "resultado" incluye mucha info del comprobante, y típicamente el nodo "Xml" en Base64
      res.json({ status: 'success', data: resultado });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },


};




module.exports = billingController;