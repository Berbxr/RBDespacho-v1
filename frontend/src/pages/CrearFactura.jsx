import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout'; 
import ModalEmisor from '../components/ModalEmisor';
import ModalReceptor from '../components/ModalReceptor';
import { 
  FileText, Plus, Trash2, X, UploadCloud, Eye, UserCircle, Building2, 
  BarChart3, Settings, BookOpen, Clock, Ticket
} from 'lucide-react';

const mockUltimosCFDI = [
  { uuid: '7168c2cd-a30e...', emisor: 'JOSE HECTOR MENDOZA BERBER', receptor: 'CORPORATIVO ADUANERO ARTEMIS', fecha: '2023-10-27', total: 1000.00, estado: 'Timbrado' },
  { uuid: 'bbf1-a5b2e...', emisor: 'JOSE HECTOR MENDOZA BERBER', receptor: 'PÚBLICO EN GENERAL', fecha: '2023-10-26', total: 500.00, estado: 'Timbrado' },
];

const CrearFactura = () => {
  // --- ESTADO PARA CONTROLAR EL SUB-MÓDULO ACTIVO ---
  const [activeSubModule, setActiveSubModule] = useState('panel');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // --- ESTADOS DE DATOS REALES ---
  const [emisores, setEmisores] = useState([]);
  const [receptores, setReceptores] = useState([]);
  const [cargando, setCargando] = useState(true);

  // --- ESTADO DASHBOARD ---
  const [dashboardStats, setDashboardStats] = useState({
    timbresRestantes: 'Cargando...',
    rfcsEmisores: 0,
    clientes: 0,
    productos: 45, 
    cotizacionesPendientes: 3 
  });

  // --- ESTADOS DE MODALES ---
  const [modalEmisor, setModalEmisor] = useState(false);
  const [modalReceptor, setModalReceptor] = useState(false);
  const [procesandoTimbre, setProcesandoTimbre] = useState(false);

  // --- ESTADOS DEL FORMULARIO DE CREACIÓN ---
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
  const [impuestoForm, setImpuestoForm] = useState({
    tipo: 'Traslado', base: 0, impuesto: '002 - IVA', tipoFactor: 'Tasa', tasaOCuota: '0.160000', importe: 0
  });

  // --- 1. CARGA INICIAL DE DATOS ---
  useEffect(() => {
    const cargarCatalogosIniciales = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [resCsds, resReceptores, resPerfil] = await Promise.all([
          axios.get('http://localhost:3500/api/billing/csds', { headers }),
          axios.get('http://localhost:3500/api/billing/receptores', { headers }),
          axios.get('http://localhost:3500/api/billing/perfil', { headers }).catch(() => null)
        ]);

        const emisoresFormat = resCsds.data.data.map((csd, index) => ({
          id: index, rfc: csd.Rfc, nombre: csd.Rfc, regimen: '601 - General de Ley', cp: '21399'
        }));
        
        const receptoresFormat = resReceptores.data.data.map(c => ({
          id: c.id, rfc: c.rfc, nombre: c.razonSocial, cp: c.codigoPostal, regimen: c.regimenFiscal, uso: c.usoCfdiDefault 
        }));

        setEmisores(emisoresFormat);
        setReceptores(receptoresFormat);

        if (emisoresFormat.length > 0) setEmisorSel(emisoresFormat[0]);
        if (receptoresFormat.length > 0) setReceptorSel(receptoresFormat[0]);

        const perfilData = resPerfil?.data?.data || {};
        const timbresActuales = perfilData.AvailableCfdis ?? perfilData.AvailableCfdi ?? 'N/A (Multiemisor)';

        setDashboardStats(prev => ({
          ...prev,
          timbresRestantes: timbresActuales,
          rfcsEmisores: emisoresFormat.length,
          clientes: receptoresFormat.length
        }));

      } catch (error) {
        console.error("Error cargando catálogos", error);
      } finally {
        setCargando(false);
      }
    };
    
    cargarCatalogosIniciales();
  }, []);

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

  // --- ACCIONES DE GUARDADO DE MODALES ---
  const handleGuardarEmisor = async (datosEmisor) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3500/api/billing/csds', datosEmisor, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      const nuevoEmisor = { id: Date.now(), rfc: datosEmisor.rfc, nombre: datosEmisor.rfc, regimen: '601 - General de Ley', cp: '21399' };
      setEmisores([...emisores, nuevoEmisor]);
      setEmisorSel(nuevoEmisor);
      setDashboardStats(prev => ({ ...prev, rfcsEmisores: prev.rfcsEmisores + 1 }));
      setModalEmisor(false);
      alert("Emisor dado de alta en Facturama con éxito.");
    } catch (error) {
      alert("Error al subir CSD: " + (error.response?.data?.message || error.message));
    }
  };

  const handleGuardarReceptor = async (datosReceptor) => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        rfc: datosReceptor.rfc,
        razonSocial: datosReceptor.razonSocial,
        codigoPostal: datosReceptor.cp,
        regimenFiscal: datosReceptor.regimenFiscal,
        usoCfdiDefault: datosReceptor.usoCfdiDefault
      };
      const res = await axios.post('http://localhost:3500/api/billing/receptores', payload, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      const nuevoReceptor = { 
        id: res.data.data.id, rfc: res.data.data.rfc, nombre: res.data.data.razonSocial, 
        cp: res.data.data.codigoPostal, regimen: res.data.data.regimenFiscal, uso: res.data.data.usoCfdiDefault 
      };
      setReceptores([...receptores, nuevoReceptor]);
      setReceptorSel(nuevoReceptor); 
      setDashboardStats(prev => ({ ...prev, clientes: prev.clientes + 1 }));
      setModalReceptor(false);
      alert("Receptor guardado en la base de datos exitosamente.");
    } catch (error) {
      alert("Error al guardar receptor: " + (error.response?.data?.message || error.message));
    }
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
      if(typeof dashboardStats.timbresRestantes === 'number') {
        setDashboardStats(prev => ({ ...prev, timbresRestantes: prev.timbresRestantes - 1 }));
      }
    } catch (error) { alert("Error SAT: " + (error.response?.data?.message || error.message)); }
    finally { setProcesandoTimbre(false); }
  };

  // --- REUTILIZABLE UI ---
  const InputGroup = ({ label, value, onChange, type = "text", placeholder = "", readonly = false, className = "" }) => (
    <div className={`flex flex-col ${className}`}>
      <label className="text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} readOnly={readonly}
        className={`w-full p-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 transition-colors ${readonly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
      />
    </div>
  );
  
  const SelectGroup = ({ label, value, onChange, options, className = "" }) => (
    <div className={`flex flex-col ${className}`}>
      <label className="text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <select value={value} onChange={onChange} className="w-full p-2 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-500">
        {options.map((opt, i) => <option key={i} value={typeof opt === 'object' ? opt.value : opt}>{typeof opt === 'object' ? opt.label : opt}</option>)}
      </select>
    </div>
  );
  
  const ToggleSwitch = ({ label, checked, onChange }) => (
    <div className="flex items-center gap-2 cursor-pointer" onClick={() => onChange(!checked)}>
      <div className={`w-10 h-5 flex items-center rounded-full p-1 ${checked ? 'bg-blue-500' : 'bg-slate-300'}`}><div className={`bg-white w-3.5 h-3.5 rounded-full shadow transformative ${checked ? 'translate-x-5' : ''}`}></div></div>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </div>
  );

  // --- COMPONENTE SUB-NAVEGACIÓN HORIZONTAL ---
  const FacturamaSubNav = () => {
    const tabs = [
      { id: 'panel', label: 'Panel', icon: BarChart3 },
      { id: 'facturas', label: 'Facturas', icon: FileText },
      { id: 'cotizaciones', label: 'Cotizaciones', icon: Ticket },
      { id: 'catalogos', label: 'Catálogos SAT', icon: BookOpen },
      { id: 'cuentas', label: 'Mis Cuentas', icon: Building2 },
      { id: 'estadisticas', label: 'Estadísticas', icon: Clock },
    ];
    return (
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 mx-[-32px] mt-[-32px] mb-8 px-8 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-900">Módulo de Facturación Electrónica</h1>
          <div className="text-sm bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full font-semibold border border-blue-100">
            Timbres Disponibles: {dashboardStats.timbresRestantes}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubModule === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => { setActiveSubModule(tab.id); setShowCreateForm(false); }}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-t-lg font-medium text-sm transition-colors duration-150 border-b-2 ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border-blue-600 shadow-inner' 
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 border-transparent'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ====================== RENDERIZADO DE VISTAS ============================

  const RenderPanel = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">RFCs Emisores Activos</p>
          <p className="text-4xl font-extrabold text-blue-600">{dashboardStats.rfcsEmisores}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Clientes Registrados</p>
          <p className="text-4xl font-extrabold text-slate-900">{dashboardStats.clientes}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Catálogo de Productos</p>
          <p className="text-4xl font-extrabold text-slate-900">{dashboardStats.productos}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-1">Cotizaciones Pendientes</p>
          <p className="text-4xl font-extrabold text-amber-600">{dashboardStats.cotizacionesPendientes}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200"><h3 className="font-bold text-slate-800">Resumen de Actividad Reciente</h3></div>
        <div className="p-10 text-center text-slate-400 italic">Aquí se integrará la gráfica de barras del dashboard de Facturama.</div>
      </div>
    </div>
  );

  const RenderFacturas = () => {
    if (showCreateForm) return <RenderCrearFacturaForm />; 

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Historial de CFDI Emitidos</h2>
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition">
            <Plus size={18} /> Crear Nueva Factura (CFDI 4.0)
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr><th className="p-4">Folio/UUID</th><th className="p-4">Emisor</th><th className="p-4">Receptor</th><th className="p-4">Fecha</th><th className="p-4">Total</th><th className="p-4">Estado</th></tr>
            </thead>
            <tbody>
              {mockUltimosCFDI.map((cfdi, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-4"><p className="font-mono text-xs text-blue-700">{cfdi.uuid}</p></td>
                  <td className="p-4">{cfdi.emisor}</td>
                  <td className="p-4 font-medium text-slate-800">{cfdi.receptor}</td>
                  <td className="p-4 text-slate-600">{cfdi.fecha}</td>
                  <td className="p-4 font-bold">${cfdi.total.toFixed(2)}</td>
                  <td className="p-4"><span className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-semibold">{cfdi.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const RenderPlaceHolder = ({ title }) => (
    <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center space-y-4">
      <FileText size={48} className="mx-auto text-slate-300" />
      <h2 className="text-xl font-bold text-slate-800">Módulo de {title}</h2>
      <p className="text-slate-500 max-w-md mx-auto text-sm">Esta es una vista de marcador de posición para el módulo de {title}. Se integrará la funcionalidad completa replicando el portal de Facturama pronto.</p>
    </div>
  );

  const RenderCrearFacturaForm = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-[135px] z-30 mb-6">
          <button onClick={() => setShowCreateForm(false)} className="text-sm font-semibold text-slate-600 hover:text-blue-600">← Volver al Historial</button>
          <div className="flex gap-3">
             <ToggleSwitch label="Cliente extranjero" checked={isClienteExtranjero} onChange={setIsClienteExtranjero} />
             <button className="flex items-center gap-2 px-5 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50">Vista previa</button>
             <button disabled={procesandoTimbre} onClick={handleTimbrar} className="px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
               {procesandoTimbre ? 'Procesando SAT...' : 'Timbrar Factura'}
             </button>
          </div>
        </div>

        {/* --- DATOS EMISOR Y RECEPTOR --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-blue-600 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex gap-2"><Building2 size={18}/> Datos del emisor</h3>
              <button onClick={() => setModalEmisor(true)} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-100">+ CSD</button>
            </div>
            <SelectGroup label="RFC Emisor" value={emisorSel?.rfc || ''} onChange={(e) => setEmisorSel(emisores.find(x => x.rfc === e.target.value))} options={emisores.map(e => e.rfc)} />
            <InputGroup label="Régimen fiscal" value={emisorSel?.regimen || ''} readonly />
            <div className="grid grid-cols-2 gap-4">
               <InputGroup label="Serie" value={facturaData.serie} onChange={e => setFacturaData({...facturaData, serie: e.target.value})} placeholder="Ej. A" />
               <InputGroup label="Folio" value={facturaData.folio} onChange={e => setFacturaData({...facturaData, folio: e.target.value})} placeholder="Ej. 100" />
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-emerald-600 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold flex gap-2"><UserCircle size={18}/> Datos del receptor</h3>
              <button onClick={() => setModalReceptor(true)} className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded font-bold hover:bg-emerald-100">+ Nuevo</button>
            </div>
            <SelectGroup label="Cliente (Prisma DB)" value={receptorSel?.rfc || ''} onChange={(e) => setReceptorSel(receptores.find(x => x.rfc === e.target.value))} options={receptores.map(r => ({label: r.nombre, value: r.rfc}))} />
            <div className="grid grid-cols-2 gap-4">
               <InputGroup label="RFC Receptor" value={receptorSel?.rfc || ''} readonly />
               <SelectGroup label="Uso CFDI" value={receptorSel?.uso || ''} onChange={e => setReceptorSel({...receptorSel, uso: e.target.value})} options={['G03 - Gastos en general', 'S01 - Sin efectos fiscales']} />
            </div>
          </div>
        </div>

        {/* --- DATOS DEL COMPROBANTE --- */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-700 border-b pb-2">Datos del comprobante</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <InputGroup label="Fecha" type="datetime-local" value={facturaData.fecha} onChange={e => setFacturaData({...facturaData, fecha: e.target.value})} />
            <SelectGroup label="Tipo de comprobante" value={facturaData.tipoComprobante} onChange={e => setFacturaData({...facturaData, tipoComprobante: e.target.value})} options={['I - Ingreso', 'E - Egreso', 'P - Pago']} />
            <SelectGroup label="Método de pago" value={facturaData.metodoPago} onChange={e => setFacturaData({...facturaData, metodoPago: e.target.value})} options={['PPD - Pago en parcialidades o diferido', 'PUE - Pago en una sola exhibición']} />
            <SelectGroup label="Forma de pago" value={facturaData.formaPago} onChange={e => setFacturaData({...facturaData, formaPago: e.target.value})} options={['99 - Por definir', '01 - Efectivo', '03 - Transferencia electrónica']} />
            <SelectGroup label="Moneda" value={facturaData.moneda} onChange={e => setFacturaData({...facturaData, moneda: e.target.value})} options={['MXN - Peso Mexicano', 'USD - Dólar estadounidense']} />
            <SelectGroup label="Exportación" value={facturaData.exportacion} onChange={e => setFacturaData({...facturaData, exportacion: e.target.value})} options={['01 - No aplica']} />
          </div>
        </div>

        {/* --- CONCEPTOS --- */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold mb-4 border-b pb-2">Conceptos</h3>
          <div className="flex mb-4"><button onClick={() => setMostrarFormConcepto(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"><Plus size={16}/> Nuevo concepto</button></div>
          
          {conceptos.map(c => (
            <div key={c.id} className="border border-slate-200 rounded p-3 mb-2 flex justify-between items-center text-sm bg-slate-50">
              <div>
                <p className="font-bold text-slate-800">{c.claveProdServ} - {c.descripcion}</p>
                <p className="text-slate-500">Cant: {c.cantidad} | P.U: ${c.valorUnitario}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg">${c.importe.toFixed(2)}</span>
                <button onClick={() => setConceptos(conceptos.filter(x => x.id !== c.id))} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}

          {mostrarFormConcepto && (
            <div className="border border-blue-200 rounded-lg p-5 bg-blue-50/30 mt-4">
              <h3 className="text-sm font-bold text-blue-800 mb-4 border-b border-blue-100 pb-2">Detalle del concepto</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-4">
                <InputGroup className="lg:col-span-2" label="Clave Prod. Serv." value={formConcepto.claveProdServ} onChange={e => setFormConcepto({...formConcepto, claveProdServ: e.target.value})} placeholder="Ej. 81111504" />
                <InputGroup label="Cantidad" type="number" value={formConcepto.cantidad} onChange={e => setFormConcepto({...formConcepto, cantidad: Number(e.target.value)})} />
                <InputGroup label="Clave unidad" value={formConcepto.claveUnidad} onChange={e => setFormConcepto({...formConcepto, claveUnidad: e.target.value})} placeholder="E48" />
                <InputGroup className="lg:col-span-2" label="Unidad" value={formConcepto.unidad} onChange={e => setFormConcepto({...formConcepto, unidad: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2 flex flex-col">
                  <label className="text-xs font-semibold text-slate-600 mb-1">Descripción</label>
                  <input type="text" className="w-full p-2 text-sm border border-slate-300 rounded outline-none focus:border-blue-500" value={formConcepto.descripcion} onChange={e => setFormConcepto({...formConcepto, descripcion: e.target.value})} />
                </div>
                <InputGroup label="Valor unitario" type="number" value={formConcepto.valorUnitario} onChange={e => setFormConcepto({...formConcepto, valorUnitario: Number(e.target.value)})} />
                <InputGroup label="Descuento" type="number" value={formConcepto.descuento} onChange={e => setFormConcepto({...formConcepto, descuento: Number(e.target.value)})} />
              </div>

              {/* IMPUESTOS */}
              <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-white">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Impuestos del concepto</h4>
                <SelectGroup label="Objeto de impuesto" className="w-1/3 mb-4" value={formConcepto.objetoImpuesto} onChange={e => setFormConcepto({...formConcepto, objetoImpuesto: e.target.value})} options={['01 - No objeto de impuesto', '02 - Sí objeto de impuesto']} />
                
                {formConcepto.objetoImpuesto.startsWith('02') && (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4 items-end">
                    <SelectGroup label="Tipo" value={impuestoForm.tipo} onChange={e => setImpuestoForm({...impuestoForm, tipo: e.target.value})} options={['Traslado', 'Retención']} />
                    <InputGroup label="Base" type="number" value={impuestoForm.base} readonly />
                    <SelectGroup label="Impuesto" value={impuestoForm.impuesto} onChange={e => setImpuestoForm({...impuestoForm, impuesto: e.target.value})} options={['002 - IVA', '001 - ISR', '003 - IEPS']} />
                    <SelectGroup label="Tipo factor" value={impuestoForm.tipoFactor} onChange={e => setImpuestoForm({...impuestoForm, tipoFactor: e.target.value})} options={['Tasa', 'Cuota', 'Exento']} />
                    <SelectGroup label="Tasa o cuota" value={impuestoForm.tasaOCuota} onChange={e => setImpuestoForm({...impuestoForm, tasaOCuota: e.target.value})} options={['0.160000', '0.080000', '0.106666', '0.012500']} />
                    <InputGroup label="Importe" type="number" value={impuestoForm.importe.toFixed(2)} readonly />
                  </div>
                )}
                {formConcepto.objetoImpuesto.startsWith('02') && (
                  <div className="flex justify-end mb-4"><button onClick={() => setImpuestosTemp([...impuestosTemp, { ...impuestoForm, id: Date.now() }])} className="text-blue-600 text-sm font-semibold hover:underline">+ Agregar impuesto al concepto</button></div>
                )}
                
                {impuestosTemp.length > 0 && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-200">
                    {impuestosTemp.map(imp => (
                      <div key={imp.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0 border-slate-200">
                        <span>{imp.impuesto} ({imp.tipo}) - Base: ${imp.base.toFixed(2)} - Tasa: {imp.tasaOCuota}</span>
                        <div className="flex items-center gap-4"><span className="font-bold">${imp.importe.toFixed(2)}</span><button onClick={() => setImpuestosTemp(impuestosTemp.filter(i => i.id !== imp.id))} className="text-red-400 hover:text-red-600"><X size={14}/></button></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setMostrarFormConcepto(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                <button onClick={guardarConcepto} className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded hover:bg-slate-700">Guardar concepto en factura</button>
              </div>
            </div>
          )}
        </div>

        {/* --- TOTALES --- */}
        <div className="flex justify-end mt-8">
          <div className="bg-slate-900 text-white rounded-xl p-6 w-full md:w-80 shadow-xl space-y-2 text-sm">
             <div className="flex justify-between"><span>Subtotal</span><span>${totales.subtotal.toFixed(2)}</span></div>
             <div className="flex justify-between text-red-400"><span>Descuento</span><span>-${totales.descuentoTotal.toFixed(2)}</span></div>
             {totales.totalTraslados > 0 && <div className="flex justify-between text-blue-400"><span>Impuestos Trasladados</span><span>${totales.totalTraslados.toFixed(2)}</span></div>}
             {totales.totalRetenciones > 0 && <div className="flex justify-between text-orange-400"><span>Impuestos Retenidos</span><span>-${totales.totalRetenciones.toFixed(2)}</span></div>}
             <div className="flex justify-between font-bold text-lg border-t border-slate-700 pt-2 mt-2">
               <span>Total a Pagar</span>
               <span className="text-blue-400 text-xl">${totales.total.toFixed(2)}</span>
             </div>
          </div>
        </div>
      </div>
    );
  };

  // ====================== MAIN RENDER ============================

  if (cargando) return <Layout><div className="p-8 text-center text-slate-500 font-bold">Cargando datos en tiempo real de Facturama y Base de Datos...</div></Layout>;

  return (
    <Layout>
      <div className="w-full h-full font-sans text-slate-900">
        <FacturamaSubNav />
        
        <div className="pb-16 px-1">
          {activeSubModule === 'panel' && <RenderPanel />}
          {activeSubModule === 'facturas' && <RenderFacturas />}
          {activeSubModule === 'cotizaciones' && <RenderPlaceHolder title="Cotizaciones" />}
          {activeSubModule === 'catalogos' && <RenderPlaceHolder title="Catálogos SAT" />}
          {activeSubModule === 'cuentas' && <RenderPlaceHolder title="Mis Cuentas" />}
          {activeSubModule === 'estadisticas' && <RenderPlaceHolder title="Estadísticas" />}
        </div>
      </div>

      {/* --- MODALES IMPORTADOS --- */}
      <ModalEmisor 
        isOpen={modalEmisor} 
        onClose={() => setModalEmisor(false)} 
        onSave={handleGuardarEmisor} 
      />

      <ModalReceptor 
        isOpen={modalReceptor} 
        onClose={() => setModalReceptor(false)} 
        onSave={handleGuardarReceptor} 
      />

    </Layout>
  );
};

export default CrearFactura;