import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout'; 
import ModalEmisor from '../components/ModalEmisor';
import ModalReceptor from '../components/ModalReceptor';
import { 
  FileText, Plus, Trash2, X, UserCircle, Building2, Edit3,
  BarChart3, BookOpen, Clock, Ticket, CheckCircle2, AlertCircle, Users, Package
} from 'lucide-react';

// IMPORTACIÓN DE LOS CATÁLOGOS OFICIALES DEL SAT
import { 
  CATALOGO_FORMA_PAGO, 
  CATALOGO_USO_CFDI, 
  CATALOGO_EXPORTACION 
} from '../utils/catalogos'; 

const mockUltimosCFDI = [
  { uuid: '7168C2CD-A30E-4F2A-8B12-1C2D3E4F5A6B', emisor: 'MEBH020306876', receptor: 'CORPORATIVO ADUANERO ARTEMIS', fecha: '2024-03-28', total: 1000.00, estado: 'Timbrado' },
];

const CrearFactura = () => {
  const [activeSubModule, setActiveSubModule] = useState('facturas'); 
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [cargando, setCargando] = useState(true);

  // --- DATOS REALES ---
  const [emisores, setEmisores] = useState([]);
  const [receptores, setReceptores] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    timbresRestantes: 'Cargando...', rfcsEmisores: 0, clientes: 0, productos: 45, cotizacionesPendientes: 3 
  });

  // --- ESTADOS DE EDICIÓN Y MODALES ---
  const [modalEmisor, setModalEmisor] = useState(false);
  const [emisorEditando, setEmisorEditando] = useState(null); 
  const [modalReceptor, setModalReceptor] = useState(false);
  const [procesandoTimbre, setProcesandoTimbre] = useState(false);
  const [catalogoActivo, setCatalogoActivo] = useState('clientes'); 

  // --- FORMULARIO DE FACTURA ---
  const [emisorSel, setEmisorSel] = useState(null);
  const [receptorSel, setReceptorSel] = useState(null);
  const [isClienteExtranjero, setIsClienteExtranjero] = useState(false);
  const [facturaData, setFacturaData] = useState({
    serie: '', folio: '', fecha: new Date().toISOString().slice(0, 16),
    tipoComprobante: 'I - Ingreso', exportacion: '01 - No aplica',
    metodoPago: 'PUE - Pago en una sola exhibición', formaPago: '01 - Efectivo',
    moneda: 'MXN - Peso Mexicano', tipoCambio: '1'
  });
  const [conceptos, setConceptos] = useState([]);
  const [mostrarFormConcepto, setMostrarFormConcepto] = useState(false);
  const [formConcepto, setFormConcepto] = useState({
    claveProdServ: '', noIdentificacion: '', cantidad: 1, claveUnidad: 'E48', unidad: 'Servicio',
    valorUnitario: 0, descuento: 0, descripcion: '', objetoImpuesto: '02 - Sí objeto de impuesto'
  });
  const [impuestosTemp, setImpuestosTemp] = useState([]);
  const [impuestoForm, setImpuestoForm] = useState({ tipo: 'Traslado', base: 0, impuesto: '002 - IVA', tipoFactor: 'Tasa', tasaOCuota: '0.160000', importe: 0 });

  // --- CARGA INICIAL ---
  const cargarDatos = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resCsds, resReceptores, resPerfil] = await Promise.all([
        axios.get('http://localhost:3500/api/billing/csds', { headers }).catch(() => ({data: {data: []}})),
        axios.get('http://localhost:3500/api/billing/receptores', { headers }).catch(() => ({data: {data: []}})),
        axios.get('http://localhost:3500/api/billing/perfil', { headers }).catch(() => null)
      ]);

      const emisoresFormat = (resCsds.data?.data || []).map((csd, index) => ({
        id: index, 
        rfc: csd.Rfc, 
        nombre: csd.RazonSocial || csd.Rfc, 
        regimen: csd.FiscalRegime || '601 - General de Ley Personas Morales', 
        cp: csd.TaxZipCode || '21399',
        email: csd.Email || ''
      }));
      
      const receptoresFormat = (resReceptores.data?.data || []).map(c => ({
        id: c.id, 
        rfc: c.rfc, 
        nombre: c.razonSocial, 
        cp: c.codigoPostal, 
        regimen: c.regimenFiscal, 
        uso: c.usoCfdiDefault,
        email: c.email || '' 
      }));

      setEmisores(emisoresFormat);
      setReceptores(receptoresFormat);
      if (emisoresFormat.length > 0 && !emisorSel) setEmisorSel(emisoresFormat[0]);
      if (receptoresFormat.length > 0 && !receptorSel) setReceptorSel(receptoresFormat[0]);

      const perfilData = resPerfil?.data?.data || {};
      setDashboardStats(prev => ({
        ...prev, 
        timbresRestantes: perfilData.AvailableCfdis ?? 'N/A (Multiemisor)', 
        rfcsEmisores: emisoresFormat.length, 
        clientes: receptoresFormat.length
      }));
    } catch (error) { 
      console.error("Error cargando catálogos", error); 
    } finally { 
      setCargando(false); 
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // --- LÓGICA DE CÁLCULOS ---
  useEffect(() => {
    const base = (formConcepto.cantidad * formConcepto.valorUnitario) - formConcepto.descuento;
    setImpuestoForm(prev => ({ ...prev, base: base > 0 ? base : 0, importe: (base * Number(prev.tasaOCuota)) }));
  }, [formConcepto.cantidad, formConcepto.valorUnitario, formConcepto.descuento, impuestoForm.tasaOCuota]);

  const totales = useMemo(() => {
    let subtotal = 0, descuentoTotal = 0, totalTraslados = 0, totalRetenciones = 0;
    conceptos.forEach(c => {
      subtotal += c.importe;
      descuentoTotal += Number(c.descuento);
      c.impuestos.forEach(imp => {
        if (imp.tipo === 'Traslado') totalTraslados += imp.importe;
        if (imp.tipo === 'Retención') totalRetenciones += imp.importe;
      });
    });
    return { subtotal, descuentoTotal, totalTraslados, totalRetenciones, total: subtotal - descuentoTotal + totalTraslados - totalRetenciones };
  }, [conceptos]);

  const guardarConcepto = () => {
    if (!formConcepto.descripcion || formConcepto.valorUnitario <= 0) return alert("Llena la descripción y el valor unitario.");
    const importe = formConcepto.cantidad * formConcepto.valorUnitario;
    setConceptos([...conceptos, { ...formConcepto, id: Date.now(), importe, impuestos: impuestosTemp }]);
    setFormConcepto({ claveProdServ: '', noIdentificacion: '', cantidad: 1, claveUnidad: 'E48', unidad: 'Servicio', valorUnitario: 0, descuento: 0, descripcion: '', objetoImpuesto: '02 - Sí objeto de impuesto' });
    setImpuestosTemp([]);
    setMostrarFormConcepto(false);
  };

  // --- ACCIONES DE EMISOR (CSD) ---
  const handleGuardarEmisor = async (datosEmisor) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (datosEmisor.isEdit) {
        await axios.put(`http://localhost:3500/api/billing/csds/${datosEmisor.rfc}`, datosEmisor, { headers });
        alert("CSD Actualizado correctamente.");
      } else {
        await axios.post('http://localhost:3500/api/billing/csds', datosEmisor, { headers });
        alert("Emisor dado de alta en Facturama con éxito.");
      }
      setModalEmisor(false);
      setEmisorEditando(null);
      cargarDatos(); 
    } catch (error) { alert("Error con CSD: " + (error.response?.data?.message || error.message)); }
  };

  const handleEliminarEmisor = async (rfc) => {
    if(!window.confirm(`¿Estás seguro de eliminar el CSD del RFC: ${rfc}? No podrás timbrar a su nombre.`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3500/api/billing/csds/${rfc}`, { headers: { Authorization: `Bearer ${token}` } });
      alert("Emisor eliminado correctamente.");
      cargarDatos();
    } catch(error) { alert("Error al eliminar CSD: " + (error.response?.data?.message || error.message)); }
  };

  // --- ACCIONES DE RECEPTOR ---
  const handleGuardarReceptor = async (datosReceptor) => {
    try {
      const token = localStorage.getItem('token');
      const payload = { 
        rfc: datosReceptor.rfc, 
        razonSocial: datosReceptor.razonSocial, 
        codigoPostal: datosReceptor.cp, 
        regimenFiscal: datosReceptor.regimenFiscal, 
        usoCfdiDefault: datosReceptor.usoCfdiDefault,
        email: datosReceptor.email 
      };
      await axios.post('http://localhost:3500/api/billing/receptores', payload, { headers: { Authorization: `Bearer ${token}` } });
      alert("Receptor guardado exitosamente en el catálogo.");
      setModalReceptor(false);
      cargarDatos();
    } catch (error) { alert("Error al guardar receptor: " + (error.response?.data?.message || error.message)); }
  };

  // --- ACCIÓN TIMBRAR ---
  const handleTimbrar = async () => {
    if (conceptos.length === 0) return alert("Debes agregar al menos un concepto.");
    setProcesandoTimbre(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        ...facturaData,
        emisor: { rfc: emisorSel.rfc, nombre: emisorSel.nombre, regimen: emisorSel.regimen, cp: emisorSel.cp },
        receptor: { 
          rfc: receptorSel.rfc, nombre: receptorSel.nombre, uso: receptorSel.uso, regimen: receptorSel.regimen, cp: receptorSel.cp,
          residenciaFiscal: isClienteExtranjero ? 'USA' : undefined, numRegIdTrib: isClienteExtranjero ? '123456789' : undefined
        },
        conceptos: conceptos
      };
      const response = await axios.post('http://localhost:3500/api/billing/emitir', payload, { headers });
      alert("¡Factura Timbrada! UUID: " + response.data.data.Id);
      setShowCreateForm(false); 
      setConceptos([]);
      cargarDatos();
    } catch (error) { alert("Error SAT: " + (error.response?.data?.message || error.message)); }
    finally { setProcesandoTimbre(false); }
  };

  // --- COMPONENTES UI ERP ---
  const InputERP = ({ label, value, onChange, type = "text", placeholder = "", readonly = false, className = "" }) => (
    <div className={`flex flex-col ${className}`}>
      <label className="text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readonly} className={`w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#00B4D8] focus:ring-1 focus:ring-[#00B4D8] shadow-sm ${readonly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`} />
    </div>
  );
  
  const SelectERP = ({ label, value, onChange, options, className = "" }) => (
    <div className={`flex flex-col ${className}`}>
      <label className="text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
      <select value={value} onChange={onChange} className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#00B4D8] focus:ring-1 focus:ring-[#00B4D8] shadow-sm">
        {options.map((opt, i) => <option key={i} value={typeof opt === 'object' ? opt.value : opt}>{typeof opt === 'object' ? opt.label : opt}</option>)}
      </select>
    </div>
  );
  
  const SectionPanel = ({ title, icon: Icon, children, action }) => (
    <div className="bg-white rounded-md shadow-sm border border-slate-300 mb-6 overflow-hidden">
      <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">{Icon && <Icon className="text-[#203524]" size={16}/>} {title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  const FacturamaSubNav = () => {
    const tabs = [
      { id: 'panel', label: 'Panel', icon: BarChart3 },
      { id: 'facturas', label: 'Facturas', icon: FileText },
      { id: 'catalogos', label: 'Catálogos (Receptores)', icon: BookOpen },
      { id: 'cuentas', label: 'Mis Cuentas (Emisores)', icon: Building2 },
    ];
    return (
      <div className="bg-white border-b border-slate-300 sticky top-0 z-40 mx-[-32px] mt-[-32px] mb-6 px-8 pt-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-[#203524]">Módulo de Facturación Electrónica</h1>
          <div className="text-xs bg-[#00B4D8]/10 text-[#0096C7] px-3 py-1 rounded border border-[#00B4D8]/20 font-bold uppercase tracking-wide">
            Timbres: {dashboardStats.timbresRestantes}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveSubModule(tab.id); setShowCreateForm(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-md font-semibold text-xs uppercase tracking-wider transition-all border-b-2 ${
                activeSubModule === tab.id ? 'bg-slate-100 text-[#203524] border-[#00B4D8]' : 'text-slate-500 hover:text-[#00B4D8] hover:bg-slate-50 border-transparent'
              }`}
            >
              <tab.icon size={16} className={activeSubModule === tab.id ? 'text-[#00B4D8]' : 'text-slate-400'} /> {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ====================== VISTAS PRINCIPALES ============================

  const RenderMisCuentas = () => (
    <SectionPanel 
      title="Administración de Certificados (CSD Multiemisor)" 
      icon={Building2}
      action={<button onClick={() => {setEmisorEditando(null); setModalEmisor(true);}} className="bg-[#203524] hover:bg-[#3F4A33] text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1"><Plus size={14}/> Agregar CSD</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-100 border-y border-slate-300 text-slate-700 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-3 font-bold">RFC Emisor</th>
              <th className="p-3 font-bold">Razón Social</th>
              <th className="p-3 font-bold">Régimen</th>
              <th className="p-3 font-bold">C.P.</th>
              <th className="p-3 font-bold">Email</th>
              <th className="p-3 font-bold">Estado</th>
              <th className="p-3 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {emisores.length === 0 && <tr><td colSpan="7" className="p-6 text-center text-slate-500">No hay CSDs registrados. Agrega uno para empezar a facturar.</td></tr>}
            {emisores.map(e => (
              <tr key={e.rfc} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="p-3 font-bold text-[#0096C7]">{e.rfc}</td>
                <td className="p-3 font-semibold text-slate-700 text-xs">{e.nombre}</td>
                <td className="p-3 text-slate-600 text-xs">{e.regimen}</td>
                <td className="p-3 text-slate-600 text-xs">{e.cp}</td>
                <td className="p-3 text-slate-500 text-xs">{e.email || 'N/D'}</td>
                <td className="p-3"><span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase"><CheckCircle2 size={12}/> Vigente</span></td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => {setEmisorEditando(e); setModalEmisor(true);}} className="text-blue-500 hover:text-blue-700 p-1.5 bg-blue-50 rounded mr-2" title="Actualizar CSD"><Edit3 size={16}/></button>
                  <button onClick={() => handleEliminarEmisor(e.rfc)} className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 rounded" title="Eliminar"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionPanel>
  );

  const RenderCatalogos = () => (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-300 pb-2">
        <button onClick={() => setCatalogoActivo('clientes')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${catalogoActivo === 'clientes' ? 'border-[#00B4D8] text-[#00B4D8]' : 'border-transparent text-slate-500'}`}>Clientes (Receptores)</button>
        <button onClick={() => setCatalogoActivo('conceptos')} className={`text-sm font-bold pb-2 border-b-2 transition-colors ${catalogoActivo === 'conceptos' ? 'border-[#00B4D8] text-[#00B4D8]' : 'border-transparent text-slate-500'}`}>Productos/Servicios</button>
      </div>

      {catalogoActivo === 'clientes' && (
        <SectionPanel title="Catálogo de Clientes" icon={Users} action={<button onClick={() => setModalReceptor(true)} className="bg-[#203524] text-white px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1"><Plus size={14}/> Nuevo Cliente</button>}>
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-100 border-y border-slate-300 text-slate-700 text-xs uppercase tracking-wider">
              <tr><th className="p-3 font-bold">RFC</th><th className="p-3 font-bold">Razón Social</th><th className="p-3 font-bold">Email</th><th className="p-3 font-bold">Uso CFDI</th><th className="p-3 font-bold">C.P.</th></tr>
            </thead>
            <tbody>
              {receptores.length === 0 && <tr><td colSpan="5" className="p-6 text-center text-slate-500">No hay clientes registrados en la base de datos local.</td></tr>}
              {receptores.map(r => (
                <tr key={r.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-800">{r.rfc}</td>
                  <td className="p-3 text-slate-600">{r.nombre}</td>
                  <td className="p-3 text-slate-500 text-xs">{r.email || 'N/D'}</td>
                  <td className="p-3 text-xs"><span className="bg-slate-200 text-slate-700 px-2 py-1 rounded font-mono">{r.uso.substring(0,3)}</span></td>
                  <td className="p-3 text-xs">{r.cp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionPanel>
      )}

      {catalogoActivo === 'conceptos' && (
        <div className="bg-white p-12 rounded-md shadow-sm border border-slate-300 text-center text-slate-400">
          <Package size={48} className="mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-bold">Catálogo de Productos en Desarrollo</h2>
          <p className="text-sm">Próximamente se conectará con `BillingConcept` de Prisma.</p>
        </div>
      )}
    </div>
  );

  const RenderFacturas = () => {
    if (showCreateForm) return <RenderCrearFacturaForm />; 
    return (
      <SectionPanel 
        title="Historial de Comprobantes (CFDI 4.0)" 
        icon={FileText}
        action={<button onClick={() => setShowCreateForm(true)} className="bg-[#00B4D8] hover:bg-[#0096C7] text-white px-4 py-1.5 rounded text-xs font-bold transition shadow-sm flex items-center gap-1"><Plus size={14}/> Nueva Factura</button>}
      >
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-100 border-y border-slate-300 text-slate-700 text-xs uppercase tracking-wider">
            <tr><th className="p-3 font-bold">UUID</th><th className="p-3 font-bold">Emisor</th><th className="p-3 font-bold">Receptor</th><th className="p-3 font-bold">Fecha</th><th className="p-3 font-bold">Total</th><th className="p-3 font-bold text-center">Estado</th></tr>
          </thead>
          <tbody>
            {mockUltimosCFDI.map((cfdi, i) => (
              <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="p-3 font-mono text-[10px] text-slate-500">{cfdi.uuid}</td>
                <td className="p-3 font-semibold text-slate-800 text-xs">{cfdi.emisor}</td>
                <td className="p-3 text-xs text-slate-600 truncate max-w-[150px]">{cfdi.receptor}</td>
                <td className="p-3 text-xs">{cfdi.fecha}</td>
                <td className="p-3 font-bold text-[#203524]">${cfdi.total.toFixed(2)}</td>
                <td className="p-3 text-center"><span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-1 rounded font-bold uppercase">Timbrado</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionPanel>
    );
  };

  const RenderCrearFacturaForm = () => (
    <div className="max-w-6xl mx-auto pb-10">
      {/* BARRA DE ACCIONES SUPERIOR */}
      <div className="bg-white border border-slate-300 shadow-sm p-3 mb-4 rounded-md flex justify-between items-center sticky top-[100px] z-30">
        <button onClick={() => setShowCreateForm(false)} className="text-xs font-bold text-slate-500 hover:text-[#00B4D8] uppercase tracking-wider flex items-center gap-1">← Volver</button>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
            <input type="checkbox" className="accent-[#00B4D8] w-4 h-4" checked={isClienteExtranjero} onChange={e=>setIsClienteExtranjero(e.target.checked)}/> Extranjero
          </label>
          <button className="px-4 py-1.5 border border-slate-300 text-slate-600 bg-slate-50 rounded text-xs font-bold hover:bg-slate-100 transition shadow-sm">Vista Previa</button>
          <button disabled={procesandoTimbre} onClick={handleTimbrar} className="px-6 py-1.5 bg-[#203524] hover:bg-[#3F4A33] text-white rounded text-xs font-bold transition shadow-sm disabled:opacity-50">
            {procesandoTimbre ? 'Procesando...' : 'Timbrar CFDI'}
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: EMISOR (Selector Maestro Multiemisor) */}
      <SectionPanel title="1. Emisor (Multiemisor)" icon={Building2} action={<button onClick={() => setModalEmisor(true)} className="text-[#00B4D8] hover:underline text-xs font-bold">+ Agregar CSD</button>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectERP className="md:col-span-2" label="Facturar a nombre de (RFC Emisor)" value={emisorSel?.rfc || ''} onChange={(e) => setEmisorSel(emisores.find(x => x.rfc === e.target.value))} 
            options={emisores.map(e => ({ label: `${e.rfc} - ${e.nombre}`, value: e.rfc }))} />
          <InputERP label="Régimen Fiscal" value={emisorSel?.regimen || ''} readonly />
        </div>
      </SectionPanel>

      {/* SECCIÓN 2: RECEPTOR */}
      <SectionPanel title="2. Datos del Receptor (Cliente)" icon={UserCircle} action={<button onClick={() => setModalReceptor(true)} className="text-[#00B4D8] hover:underline text-xs font-bold">+ Nuevo Cliente</button>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectERP className="md:col-span-1" label="Buscar Cliente" value={receptorSel?.rfc || ''} onChange={(e) => setReceptorSel(receptores.find(x => x.rfc === e.target.value))} options={[{label: 'Seleccionar...', value: ''}, ...receptores.map(r => ({label: `${r.rfc} - ${r.nombre}`, value: r.rfc}))]} />
          <InputERP label="Razón Social" value={receptorSel?.nombre || ''} readonly className="md:col-span-2" />
          <InputERP label="RFC Receptor" value={receptorSel?.rfc || ''} readonly />
          <InputERP label="Código Postal" value={receptorSel?.cp || ''} readonly />
          <InputERP label="Régimen Fiscal" value={receptorSel?.regimen || ''} readonly />
          <SelectERP label="Uso CFDI" value={receptorSel?.uso || ''} onChange={e => setReceptorSel({...receptorSel, uso: e.target.value})} options={CATALOGO_USO_CFDI} className="md:col-span-1"/>
        </div>
      </SectionPanel>

      {/* SECCIÓN 3: DATOS DEL COMPROBANTE */}
      <SectionPanel title="3. Datos del Comprobante" icon={FileText}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <InputERP className="col-span-2" label="Fecha Emisión" type="datetime-local" value={facturaData.fecha} onChange={e => setFacturaData({...facturaData, fecha: e.target.value})} />
          <InputERP label="Serie" value={facturaData.serie} onChange={e => setFacturaData({...facturaData, serie: e.target.value})} placeholder="Ej. F" />
          <InputERP label="Folio" value={facturaData.folio} onChange={e => setFacturaData({...facturaData, folio: e.target.value})} placeholder="Ej. 1024" />
          <SelectERP className="col-span-2" label="Tipo" value={facturaData.tipoComprobante} onChange={e => setFacturaData({...facturaData, tipoComprobante: e.target.value})} options={['I - Ingreso', 'E - Egreso', 'P - Pago']} />
          
          <SelectERP className="col-span-2" label="Método de Pago" value={facturaData.metodoPago} onChange={e => setFacturaData({...facturaData, metodoPago: e.target.value})} options={['PUE - Pago en una sola exhibición', 'PPD - Pago en parcialidades o diferido']} />
          <SelectERP className="col-span-2" label="Forma de Pago" value={facturaData.formaPago} onChange={e => setFacturaData({...facturaData, formaPago: e.target.value})} options={CATALOGO_FORMA_PAGO} />
          <SelectERP label="Moneda" value={facturaData.moneda} onChange={e => setFacturaData({...facturaData, moneda: e.target.value})} options={['MXN - Peso Mexicano', 'USD - Dólar estadounidense']} />
          <SelectERP label="Exportación" value={facturaData.exportacion} onChange={e => setFacturaData({...facturaData, exportacion: e.target.value})} options={CATALOGO_EXPORTACION} />
        </div>
      </SectionPanel>

      {/* SECCIÓN 4: CONCEPTOS E IMPUESTOS */}
      <div className="flex gap-6 items-start">
        {/* Lado Izquierdo: Lista y Formulario Conceptos */}
        <div className="flex-1 space-y-4">
          <SectionPanel title="4. Conceptos (Detalle de Factura)" icon={Ticket} action={<button onClick={() => setMostrarFormConcepto(true)} className="bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-bold shadow hover:bg-slate-700 flex items-center gap-1"><Plus size={14}/> Agregar Concepto</button>}>
            
            {/* Tabla de Conceptos Agregados */}
            {conceptos.length > 0 && (
              <table className="w-full text-sm border border-slate-200 mb-4">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 text-xs">
                  <tr><th className="p-2 text-left">Clave/Desc</th><th className="p-2 text-center">Cant.</th><th className="p-2 text-right">Precio U.</th><th className="p-2 text-right">Importe</th><th className="p-2 text-center"></th></tr>
                </thead>
                <tbody>
                  {conceptos.map(c => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="p-2"><p className="font-bold text-slate-800">{c.claveProdServ}</p><p className="text-xs text-slate-500 truncate max-w-[200px]">{c.descripcion}</p></td>
                      <td className="p-2 text-center">{c.cantidad}</td>
                      <td className="p-2 text-right">${c.valorUnitario.toFixed(2)}</td>
                      <td className="p-2 text-right font-bold text-slate-800">${c.importe.toFixed(2)}</td>
                      <td className="p-2 text-center"><button onClick={() => setConceptos(conceptos.filter(x => x.id !== c.id))} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Formulario Acordeón de Nuevo Concepto */}
            {mostrarFormConcepto && (
              <div className="bg-slate-50 border border-slate-300 rounded-md p-4 shadow-inner relative">
                <button onClick={() => setMostrarFormConcepto(false)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-700"><X size={18}/></button>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">Detalle del Nuevo Concepto</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
                  <InputERP className="col-span-2" label="Clave Prod/Serv" value={formConcepto.claveProdServ} onChange={e => setFormConcepto({...formConcepto, claveProdServ: e.target.value})} placeholder="Ej. 81111504" />
                  <InputERP label="Cant." type="number" value={formConcepto.cantidad} onChange={e => setFormConcepto({...formConcepto, cantidad: Number(e.target.value)})} />
                  <InputERP label="Clave Unid." value={formConcepto.claveUnidad} onChange={e => setFormConcepto({...formConcepto, claveUnidad: e.target.value})} placeholder="E48" />
                  <InputERP className="col-span-2" label="Unidad" value={formConcepto.unidad} onChange={e => setFormConcepto({...formConcepto, unidad: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <div className="md:col-span-2 flex flex-col">
                    <label className="text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Descripción</label>
                    <input type="text" className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:border-[#00B4D8] focus:ring-1 focus:ring-[#00B4D8] shadow-sm" value={formConcepto.descripcion} onChange={e => setFormConcepto({...formConcepto, descripcion: e.target.value})} />
                  </div>
                  <InputERP label="Valor U. ($)" type="number" value={formConcepto.valorUnitario} onChange={e => setFormConcepto({...formConcepto, valorUnitario: Number(e.target.value)})} />
                  <InputERP label="Descuento ($)" type="number" value={formConcepto.descuento} onChange={e => setFormConcepto({...formConcepto, descuento: Number(e.target.value)})} />
                </div>

                {/* Sub-formulario de Impuestos */}
                <div className="bg-white border border-[#00B4D8]/30 rounded p-3 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-[10px] font-bold text-[#0096C7] uppercase tracking-wider">Configuración de Impuestos</h5>
                    <SelectERP className="w-48" label="" value={formConcepto.objetoImpuesto} onChange={e => setFormConcepto({...formConcepto, objetoImpuesto: e.target.value})} options={['01 - No objeto', '02 - Sí objeto']} />
                  </div>
                  
                  {formConcepto.objetoImpuesto.startsWith('02') && (
                    <div className="flex items-end gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                      <SelectERP className="flex-1" label="Tipo" value={impuestoForm.tipo} onChange={e => setImpuestoForm({...impuestoForm, tipo: e.target.value})} options={['Traslado', 'Retención']} />
                      <SelectERP className="flex-1" label="Impuesto" value={impuestoForm.impuesto} onChange={e => setImpuestoForm({...impuestoForm, impuesto: e.target.value})} options={['002 - IVA', '001 - ISR', '003 - IEPS']} />
                      <SelectERP className="flex-1" label="Factor" value={impuestoForm.tipoFactor} onChange={e => setImpuestoForm({...impuestoForm, tipoFactor: e.target.value})} options={['Tasa', 'Cuota', 'Exento']} />
                      <SelectERP className="flex-1" label="Tasa/Cuota" value={impuestoForm.tasaOCuota} onChange={e => setImpuestoForm({...impuestoForm, tasaOCuota: e.target.value})} options={['0.160000', '0.080000', '0.106666', '0.012500']} />
                      <InputERP className="w-24" label="Base" type="number" value={impuestoForm.base.toFixed(2)} readonly />
                      <InputERP className="w-24" label="Importe" type="number" value={impuestoForm.importe.toFixed(2)} readonly />
                      <button onClick={() => setImpuestosTemp([...impuestosTemp, { ...impuestoForm, id: Date.now() }])} className="mb-0.5 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded text-xs font-bold transition">Añadir</button>
                    </div>
                  )}
                  
                  {impuestosTemp.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {impuestosTemp.map(imp => (
                        <div key={imp.id} className="flex justify-between items-center bg-white border border-slate-200 text-[11px] px-2 py-1 rounded">
                          <span className="font-semibold">{imp.tipo}: {imp.impuesto} (Tasa: {imp.tasaOCuota})</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800">${imp.importe.toFixed(2)}</span>
                            <button onClick={() => setImpuestosTemp(impuestosTemp.filter(i => i.id !== imp.id))} className="text-red-500"><X size={12}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end"><button onClick={guardarConcepto} className="bg-[#203524] text-white px-5 py-2 rounded text-xs font-bold hover:bg-[#3F4A33] transition shadow">Guardar Concepto en Factura</button></div>
              </div>
            )}
          </SectionPanel>
        </div>

        {/* Lado Derecho: Totales Card */}
        <div className="w-80">
          <div className="bg-[#203524] text-white rounded-md shadow-lg border border-[#3F4A33] overflow-hidden sticky top-[170px]">
            <div className="bg-[#18281B] px-4 py-3 border-b border-[#3F4A33]">
              <h3 className="font-bold text-sm flex items-center gap-2"><BarChart3 size={16}/> Resumen Totales</h3>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-[#A3B18A]">Subtotal</span>
                <span className="font-semibold">${totales.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-red-300">
                <span>(-) Descuento</span>
                <span>${totales.descuentoTotal.toFixed(2)}</span>
              </div>
              {totales.totalTraslados > 0 && (
                <div className="flex justify-between items-center text-[#00B4D8]">
                  <span>(+) Imp. Trasladados</span>
                  <span>${totales.totalTraslados.toFixed(2)}</span>
                </div>
              )}
              {totales.totalRetenciones > 0 && (
                <div className="flex justify-between items-center text-orange-300">
                  <span>(-) Imp. Retenidos</span>
                  <span>${totales.totalRetenciones.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-4 mt-2 border-t border-[#3F4A33] flex justify-between items-center">
                <span className="font-bold uppercase tracking-wide">Total a Pagar</span>
                <span className="text-2xl font-black text-[#00B4D8]">${totales.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const RenderPanel = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'RFCs Emisores', value: dashboardStats.rfcsEmisores, color: 'text-[#00B4D8]' },
          { label: 'Clientes Registrados', value: dashboardStats.clientes, color: 'text-[#203524]' },
          { label: 'Catálogo Productos', value: dashboardStats.productos, color: 'text-[#203524]' },
          { label: 'Cotizaciones', value: dashboardStats.cotizacionesPendientes, color: 'text-amber-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-md shadow-sm border border-slate-300 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{stat.label}</p>
            <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
      <SectionPanel title="Estadísticas de Emisión" icon={BarChart3}>
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded">
          [Gráfica de Facturación Mensual - Integración Próxima]
        </div>
      </SectionPanel>
    </div>
  );

  if (cargando) return <Layout><div className="flex items-center justify-center h-screen text-slate-500 font-bold gap-2"><Clock className="animate-spin"/> Cargando Sistema ERP...</div></Layout>;

  return (
    <Layout>
      <div className="w-full min-h-screen bg-slate-50/50 font-sans text-slate-800">
        <FacturamaSubNav />
        <div className="px-2">
          {activeSubModule === 'panel' && <RenderPanel />}
          {activeSubModule === 'facturas' && <RenderFacturas />}
          {activeSubModule === 'catalogos' && <RenderCatalogos />}
          {activeSubModule === 'cuentas' && <RenderMisCuentas />}
        </div>
      </div>

      <ModalEmisor isOpen={modalEmisor} onClose={() => {setModalEmisor(false); setEmisorEditando(null);}} onSave={handleGuardarEmisor} emisorToEdit={emisorEditando} />
      <ModalReceptor isOpen={modalReceptor} onClose={() => setModalReceptor(false)} onSave={handleGuardarReceptor} />
    </Layout>
  );
};

export default CrearFactura;