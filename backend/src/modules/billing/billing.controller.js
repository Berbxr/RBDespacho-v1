const facturamaService = require('./facturama.service');
const { PrismaClient } = require('@prisma/client'); 
const billingService = require('./billing.service');
const prisma = new PrismaClient(); 

const billingController = {
  // ==========================================
  // Tarea 1: Subir CSD
  // ==========================================
  async subirCsd(req, res) {
    try {
      // Se agregó logoBase64
      const { rfc, razonSocial, cerBase64, keyBase64, password, regimen, cp, email, logoBase64 } = req.body;
      
      const resultado = await facturamaService.uploadCsd(rfc, cerBase64, keyBase64, password);
      
      // Adaptado a la tabla FacEmisor
      await prisma.facEmisor.upsert({
        where: { rfc: rfc.toUpperCase() },
        update: { 
          razonSocial: razonSocial ? razonSocial.toUpperCase() : rfc.toUpperCase(),
          regimenFiscal: regimen, 
          cp: cp, 
          emailEnvio: email || null,
          logoBase64: logoBase64 || null, // Se guarda el logo
          activo: true // Si había sido borrado lógicamente, se reactiva
        },
        create: { 
          rfc: rfc.toUpperCase(), 
          razonSocial: razonSocial ? razonSocial.toUpperCase() : rfc.toUpperCase(), 
          regimenFiscal: regimen, 
          cp: cp, 
          emailEnvio: email || null,
          logoBase64: logoBase64 || null
        }
      });

      res.status(201).json({ status: 'success', data: resultado, message: 'Emisor configurado exitosamente' });
    } catch(error) { 
      console.error("Error al subir CSD:", error);
      res.status(500).json({ status: 'error', message: error.message || 'Error al subir CSD' }); 
    }
  },

  // ==========================================
  // Tarea 2: Listar CSDs
  // ==========================================
  async listarCsds(req, res) {
    try {
      const listaFacturama = await facturamaService.getCsds();
      // Solo traemos los activos
      const emisoresLocales = await prisma.facEmisor.findMany({ where: { activo: true } });

      const arrayFacturama = Array.isArray(listaFacturama) ? listaFacturama : (listaFacturama.data || []);

      const dataFusionada = arrayFacturama.map(csd => {
        const local = emisoresLocales.find(e => e.rfc === csd.Rfc);
        return {
          ...csd,
          idLocal: local ? local.id : null, // ID de la DB para hacer relaciones
          FiscalRegime: local ? local.regimenFiscal : '601',
          TaxZipCode: local ? local.cp : '',
          Email: local ? local.emailEnvio : '',
          RazonSocial: local ? local.razonSocial : csd.TaxEntityName || 'SIN RAZON SOCIAL',
          logoBase64: local ? local.logoBase64 : null // Lo mandamos para previsualizarlo en el frontend
        };
      }).filter(csd => csd.idLocal !== null); // Filtramos para no mostrar emisores que están inactivos en nuestra DB

      res.json({ status: 'success', data: dataFusionada });
    } catch(error) { 
      res.status(500).json({ status: 'error', message: error.message }); 
    }
  },

  // ==========================================
  // Tarea 3: Obtener 1 CSD
  // ==========================================
  async obtenerCsd(req, res) {
    try {
      const { rfc } = req.params;
      const csd = await facturamaService.getCsdByRfc(rfc);
      res.json({ status: 'success', data: csd });
    } catch(error) { 
      res.status(500).json({ status: 'error', message: error.message }); 
    }
  },

  // ==========================================
  // Tarea 4: Actualizar CSD
  // ==========================================
  async actualizarCsd(req, res) {
    try {
      const { rfc } = req.params;
      const { razonSocial, cerBase64, keyBase64, password, regimen, cp, email, logoBase64 } = req.body;
      
      const resultado = await facturamaService.updateCsd(rfc, cerBase64, keyBase64, password);
      
      await prisma.facEmisor.upsert({
        where: { rfc: rfc.toUpperCase() },
        update: { 
          razonSocial: razonSocial ? razonSocial.toUpperCase() : rfc.toUpperCase(),
          regimenFiscal: regimen, 
          cp: cp, 
          emailEnvio: email || null,
          logoBase64: logoBase64 || undefined
        },
        create: { 
          rfc: rfc.toUpperCase(), 
          razonSocial: razonSocial ? razonSocial.toUpperCase() : rfc.toUpperCase(), 
          regimenFiscal: regimen, 
          cp: cp, 
          emailEnvio: email || null,
          logoBase64: logoBase64 || null
        }
      });

      res.json({ status: 'success', data: resultado });
    } catch (error) { 
      res.status(500).json({ status: 'error', message: error.message }); 
    }
  },

  // ==========================================
  // Tarea 5: Eliminar CSD
  // ==========================================
  async eliminarCsd(req, res) {
    try {
      const { rfc } = req.params;
      
      // 1. Eliminamos de Facturama para que dejen de cobrar/timbrar
      const resultado = await facturamaService.deleteCsd(rfc);
      
      // 2. CORRECCIÓN: Borrado Lógico en Prisma (No borramos el registro para no corromper facturas pasadas)
      await prisma.facEmisor.update({
        where: { rfc: rfc.toUpperCase() },
        data: { activo: false }
      });
      
      res.json({ status: 'success', data: resultado, message: 'Emisor dado de baja correctamente' });
    } catch (error) { 
      res.status(500).json({ status: 'error', message: error.message }); 
    }
  },

  // ==========================================
  // FACTURACIÓN
  // ==========================================
  async emitirCfdi(req, res) {
    try {
      const invoiceData = req.body;
      const resultado = await billingService.emitirFactura(invoiceData);
      res.status(201).json({ status: 'success', message: 'Factura procesada con éxito', data: resultado.facturamaResponse });
    } catch (error) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  // ==========================================
  // RECEPTORES (CLIENTES)
  // ==========================================
  async crearReceptor(req, res) {
    try {
      // 1. Ajustamos los nombres para que coincidan EXACTAMENTE con ReceptorForm.jsx
      const { rfc, razonSocial, regimenFiscal, cpFiscal, email, emisorId } = req.body;
      
      // 2. Validamos el emisorId que ya nos manda el frontend
      if (!emisorId) return res.status(400).json({ status: 'error', message: 'El emisorId es obligatorio.' });

      // 3. Buscamos al emisor directamente por su ID de Prisma
      const emisor = await prisma.facEmisor.findUnique({ where: { id: emisorId } });
      if (!emisor) return res.status(404).json({ status: 'error', message: 'Emisor no encontrado localmente.' });

      // 4. Verificamos que no esté duplicado
      const existe = await prisma.facReceptor.findFirst({ 
        where: { rfc: rfc.toUpperCase(), emisorId: emisor.id } 
      });
      
      if (existe) return res.status(400).json({ status: 'error', message: 'Este RFC ya está registrado para este emisor.' });

      // 5. Guardamos en la base de datos
      const nuevoReceptor = await prisma.facReceptor.create({
        data: {
          emisorId: emisor.id,
          rfc: rfc.toUpperCase(),
          razonSocial: razonSocial.toUpperCase(),
          regimenFiscal: regimenFiscal,
          cpFiscal: cpFiscal, // Usamos la variable correcta del frontend
          email: email || null
        }
      });
      res.status(201).json({ status: 'success', data: nuevoReceptor });
    } catch (error) {
      console.error("Error al crear receptor:", error);
      res.status(500).json({ status: 'error', message: 'Error al guardar el receptor en la Base de Datos.' });
    }
  },

  async listarReceptores(req, res) {
    try {
      // CORRECCIÓN: Ahora permite filtrar enviando el parámetro emisorId por la URL
      const { emisorId } = req.query; 

      const receptores = await prisma.facReceptor.findMany({ 
        where: emisorId ? { emisorId: emisorId } : undefined,
        orderBy: { razonSocial: 'asc' } 
      });
      
      res.json({ status: 'success', data: receptores });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Error al listar receptores.' });
    }
  },

  // ==========================================
  // OTROS (PERFIL Y CANCELACIÓN)
  // ==========================================
  async obtenerPerfil(req, res) {
    try {
      const perfil = await facturamaService.getCsds(); 
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
  },


  async crearProducto(req, res) {
    try {
      const producto = req.body;
      
      const nuevoProducto = await prisma.facProducto.create({
        data: {
          emisorId: producto.emisorId,
          claveProdServ: producto.claveProdServ,
          noIdentificacion: producto.noIdentificacion || '',
          descripcion: producto.descripcion,
          claveUnidad: producto.claveUnidad,
          
          // ✅ CORRECCIÓN 1: Tu BD lo llama "descripcionUnidad", no "unidad"
          descripcionUnidad: producto.unidad || 'Pieza', 
          
          valorUnitario: Number(producto.valorUnitario),
          objetoImpuesto: producto.objetoImpuesto || '02',
          
          // ✅ CORRECCIÓN 2: Tu BD exige el campo "impuestos" en formato Json
          // Le mandamos un arreglo vacío por defecto si el frontend no los envía aún
          impuestos: producto.impuestos || [] 
        }
      });
      
      res.status(201).json({ status: 'success', data: nuevoProducto });
    } catch (error) {
      console.error("Error al crear producto:", error);
      res.status(500).json({ status: 'error', message: 'Error al guardar el producto en la base de datos.' });
    }
  },

  async listarProductos(req, res) {
    try {
      const { emisorId } = req.query;
      
      // Si manejas múltiples emisores, filtramos por emisorId
      const filtro = emisorId ? { emisorId } : {};
      
      const productos = await prisma.facProducto.findMany({
        where: filtro,
        orderBy: { descripcion: 'asc' }
      });
      
      res.json({ status: 'success', data: productos });
    } catch (error) {
      console.error("Error al listar productos:", error);
      res.status(500).json({ status: 'error', message: 'Error al obtener el catálogo de productos.' });
    }
  }

};

module.exports = billingController;