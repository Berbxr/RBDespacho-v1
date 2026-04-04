import React, { useState, useEffect } from 'react';
import { Mail, Send, Eye, FileText, AlertCircle, Save } from 'lucide-react';
import { billingApi } from '../api/billing.api';
import { useCalculoCfdi } from '../hooks/useCalculoCfdi';
import ConceptosTable from '../components/ConceptosTable';
import ReceptorForm from '../components/ReceptorForm';
import { CATALOGO_USO_CFDI, CATALOGO_FORMA_PAGO } from '../../../utils/catalogos'; 

const PanelHeader = ({ title, rightElement }) => (
  <div className="bg-[#5b738b] text-white px-3 py-2 text-sm font-bold flex justify-between items-center border border-gray-300">
    <div className="flex items-center gap-2">{title}</div>
    {rightElement}
  </div>
);

export default function EmitirCfdi() {
  const { conceptos, totales, agregarConcepto, actualizarConcepto, eliminarConcepto } = useCalculoCfdi();
  
  const [emisores, setEmisores] = useState([]);
  const [receptores, setReceptores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReceptorForm, setShowReceptorForm] = useState(false);

  // Función para obtener la fecha actual en formato local (YYYY-MM-DDTHH:mm)
  const getLocalDatetime = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; 
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  };

  // ESTADO ACTUALIZADO CON LOS NUEVOS CAMPOS
  const [cfdiData, setCfdiData] = useState({
    rfcEmisor: '', rfcReceptor: '', 
    tipoComprobante: 'I', usoCFDI: 'G03',
    metodoPago: 'PUE', formaPago: '03', 
    moneda: 'MXN', serie: '', folio: '', 
    fecha: getLocalDatetime(),
    condicionesPago: '', observaciones: '',
    emailEmisor: '', emailReceptor: '' 
  });

  // 1. CARGAMOS LOS EMISORES AL INICIAR
  useEffect(() => {
    billingApi.listarCsds()
      .then(res => setEmisores(res.data?.data || []))
      .catch(err => console.error("Error al cargar emisores:", err));
  }, []);

  // 2. CARGAMOS LOS RECEPTORES CUANDO SE ELIGE UN EMISOR
  useEffect(() => {
    if (cfdiData.rfcEmisor) {
      const emisorSeleccionado = emisores.find(e => (e.rfc || e.Rfc) === cfdiData.rfcEmisor);
      const idEmisor = emisorSeleccionado?.idLocal || emisorSeleccionado?.id;
      
      if (idEmisor) {
        billingApi.listarReceptores(idEmisor)
          .then(res => setReceptores(res.data?.data || []))
          .catch(err => console.error("Error al cargar receptores:", err));
        
        // Aquí podrías agregar la lógica para obtener el último folio automáticamente
        // billingApi.obtenerUltimoFolio(idEmisor).then(res => setCfdiData(prev => ({...prev, folio: res.data.siguienteFolio})));
      }
    } else {
      setReceptores([]); 
    }
  }, [cfdiData.rfcEmisor, emisores]);

  const emisorActual = emisores.find(e => (e.rfc || e.Rfc) === cfdiData.rfcEmisor);
  const receptorActual = receptores.find(r => r.rfc === cfdiData.rfcReceptor);

  // NUEVA FUNCIÓN QUE MANEJA LAS TRES ACCIONES: BORRADOR, VISTA PREVIA Y TIMBRAR
  const handleAccion = async (accion) => {
    if (!cfdiData.rfcEmisor || !cfdiData.rfcReceptor || conceptos.length === 0) {
      return alert("Por favor completa los datos de Emisor, Receptor y agrega al menos un concepto.");
    }
    
    setLoading(true);
    try {
      const payload = {
        ...cfdiData,
        emisor: { rfc: cfdiData.rfcEmisor, email: cfdiData.emailEmisor },
        receptor: { rfc: cfdiData.rfcReceptor, email: cfdiData.emailReceptor }, 
        conceptos,
        totales,
        estado: accion === 'BORRADOR' ? 'DRAFT' : 'TIMBRADA' // Diferenciamos el estado
      };

      if (accion === 'VISTA_PREVIA') {
        alert("Generando Vista Previa...");
        setLoading(false);
        return;
      }

      await billingApi.emitirCfdi(payload);
      alert(`✅ Factura ${accion === 'BORRADOR' ? 'guardada como borrador' : 'timbrada exitosamente'}. Enviada a: ${cfdiData.emailEmisor || 'Sin correo (Emisor)'} y ${cfdiData.emailReceptor || 'Sin correo (Receptor)'}`);
    } catch (err) {
      alert(`Error al ${accion === 'BORRADOR' ? 'guardar' : 'timbrar'}: ` + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* SECCION EMISOR Y RECEPTOR (TU CÓDIGO INTACTO) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow-sm border border-gray-200">
            <PanelHeader title="DATOS DEL EMISOR" />
            <div className="p-4 space-y-3 text-sm">
              <select 
                className="w-full p-2 border rounded" 
                value={cfdiData.rfcEmisor} 
                onChange={e => {
                  const rfc = e.target.value;
                  const emisor = emisores.find(x => (x.rfc || x.Rfc) === rfc);
                  setCfdiData({
                    ...cfdiData, 
                    rfcEmisor: rfc, 
                    emailEmisor: emisor?.emailEnvio || '' 
                  });
                }}
              >
                <option value="">Seleccionar Empresa (Emisor)...</option>
                {emisores.map(e => (
                  <option key={e.id || e.Rfc || e.rfc} value={e.rfc || e.Rfc}>
                    {e.razonSocial || e.RazonSocial}
                  </option>
                ))}
              </select>

              {emisorActual && (
                <div className="bg-gray-50 p-3 rounded text-xs border border-gray-200 space-y-2">
                  <p><b>RFC:</b> {emisorActual.rfc || emisorActual.Rfc}</p>
                  <p><b>Régimen:</b> {emisorActual.regimenFiscal || emisorActual.FiscalRegime || emisorActual.RegimenFiscal || 'No especificado'}</p>
                  <p><b>CP:</b> {emisorActual.cp || emisorActual.TaxZipCode || emisorActual.LugarExpedicion || 'N/A'}</p>
                  
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                    <label className="font-bold text-blue-700 w-12">Email:</label>
                    <input 
                      type="email" 
                      placeholder="Correo para copia del emisor"
                      className="flex-1 p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 outline-none"
                      value={cfdiData.emailEmisor}
                      onChange={e => setCfdiData({...cfdiData, emailEmisor: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200">
            <PanelHeader 
              title="DATOS DEL RECEPTOR" 
              rightElement={
                <button onClick={() => setShowReceptorForm(true)} disabled={!emisorActual} className="text-[10px] bg-white text-[#5b738b] px-2 py-0.5 rounded font-bold disabled:opacity-50">
                  + NUEVO
                </button>
              } 
            />
            <div className="p-4 space-y-3 text-sm">
              <select 
                className="w-full p-2 border rounded" 
                value={cfdiData.rfcReceptor} 
                onChange={e => {
                  const rfc = e.target.value;
                  const receptor = receptores.find(x => x.rfc === rfc);
                  setCfdiData({
                    ...cfdiData, 
                    rfcReceptor: rfc, 
                    emailReceptor: receptor?.email || ''
                  });
                }}
                disabled={!emisorActual}
              >
                <option value="">Seleccionar Cliente (Receptor)...</option>
                {receptores.map(r => <option key={r.id} value={r.rfc}>{r.razonSocial}</option>)}
              </select>

              {receptorActual && (
                <div className="bg-gray-50 p-3 rounded text-xs border border-gray-200 space-y-2">
                  <p><b>RFC:</b> {receptorActual.rfc}</p>
                  <p><b>Régimen:</b> {receptorActual.regimenFiscal}</p>
                  <p><b>CP:</b> {receptorActual.cpFiscal || receptorActual.cp}</p>
                  
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                    <label className="font-bold text-blue-700 w-12">Email:</label>
                    <input 
                      type="email" 
                      placeholder="Correo para enviar al cliente"
                      className="flex-1 p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 outline-none"
                      value={cfdiData.emailReceptor}
                      onChange={e => setCfdiData({...cfdiData, emailReceptor: e.target.value})}
                    />
                  </div>
                </div>
              )}
              {!emisorActual && (
                <p className="text-xs text-red-500 italic">Selecciona un emisor primero para ver a sus clientes.</p>
              )}
            </div>
          </div>
        </div>

        {/* CONFIGURACION CFDI (AMPLIADA CON TUS NUEVOS CAMPOS Y CATÁLOGOS ORIGINALES) */}
        <div className="bg-white shadow-sm border border-gray-200">
          <PanelHeader title="CONFIGURACIÓN DEL COMPROBANTE" />
          <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <label className="block text-xs font-bold mb-1">Tipo de CFDI</label>
              <select className="w-full p-2 border rounded" value={cfdiData.tipoComprobante} onChange={e => setCfdiData({...cfdiData, tipoComprobante: e.target.value})}>
                <option value="I">I - Ingreso</option>
                <option value="E">E - Egreso</option>
                <option value="T">T - Traslado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Fecha y Hora</label>
              <input type="datetime-local" className="w-full p-2 border rounded" value={cfdiData.fecha} onChange={e => setCfdiData({...cfdiData, fecha: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Serie</label>
              <select className="w-full p-2 border rounded" value={cfdiData.serie} onChange={e => setCfdiData({...cfdiData, serie: e.target.value})}>
                <option value="">Sin Serie</option>
                <option value="A">Serie A</option>
                <option value="B">Serie B</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Folio (Autocalculable)</label>
              <input type="text" className="w-full p-2 border rounded bg-gray-50" placeholder="Ej. 102" value={cfdiData.folio} onChange={e => setCfdiData({...cfdiData, folio: e.target.value})} />
            </div>
            
            <div>
              <label className="block text-xs font-bold mb-1">Moneda</label>
              <select className="w-full p-2 border rounded" value={cfdiData.moneda} onChange={e => setCfdiData({...cfdiData, moneda: e.target.value})}>
                <option value="MXN">MXN - Peso Mexicano</option>
                <option value="USD">USD - Dólar Estadounidense</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Uso CFDI</label>
              <select className="w-full p-2 border rounded" value={cfdiData.usoCFDI} onChange={e => setCfdiData({...cfdiData, usoCFDI: e.target.value})}>
                {CATALOGO_USO_CFDI.map(u => <option key={u} value={u.substring(0,3)}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Forma de Pago</label>
              <select className="w-full p-2 border rounded" value={cfdiData.formaPago} onChange={e => setCfdiData({...cfdiData, formaPago: e.target.value})}>
                {CATALOGO_FORMA_PAGO.map(f => <option key={f} value={f.substring(0,2)}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Método</label>
              <select className="w-full p-2 border rounded" value={cfdiData.metodoPago} onChange={e => setCfdiData({...cfdiData, metodoPago: e.target.value})}>
                <option value="PUE">PUE - Una sola exhibición</option>
                <option value="PPD">PPD - Diferido o parcialidades</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Condiciones de Pago (Opcional)</label>
              <input type="text" className="w-full p-2 border rounded" placeholder="Ej. Crédito a 30 días" value={cfdiData.condicionesPago} onChange={e => setCfdiData({...cfdiData, condicionesPago: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1">Observaciones (Opcional)</label>
              <input type="text" className="w-full p-2 border rounded" placeholder="Comentarios adicionales..." value={cfdiData.observaciones} onChange={e => setCfdiData({...cfdiData, observaciones: e.target.value})} />
            </div>
          </div>
        </div>

        <ConceptosTable 
          emisorId={emisorActual?.id || emisorActual?.idLocal}
          conceptos={conceptos} 
          totales={totales}
          onAgregar={agregarConcepto} 
          onActualizar={actualizarConcepto} 
          onEliminar={eliminarConcepto} 
        />

        {/* NOTIFICACION DE CORREOS AUTOMÁTICA */}
        {(cfdiData.emailEmisor || cfdiData.emailReceptor) && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 flex items-center gap-3">
            <Mail className="text-blue-400" size={20} />
            <p className="text-xs text-blue-700">
              Al timbrar, se enviarán los archivos a: <b>{cfdiData.emailEmisor || 'Sin especificar'}</b> y <b>{cfdiData.emailReceptor || 'Sin especificar'}</b>
            </p>
          </div>
        )}
      </div>

      {/* FOOTER ACCIONES CON LOS 3 BOTONES NUEVOS */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 flex justify-end gap-4 shadow-lg z-40">
        <button 
          onClick={() => handleAccion('BORRADOR')} 
          disabled={loading} 
          className="flex items-center gap-2 px-6 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600 transition-colors shadow-md"
        >
          <Save size={18} /> Guardar Borrador
        </button>
        <button 
          onClick={() => handleAccion('VISTA_PREVIA')} 
          className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded font-bold hover:bg-gray-300 transition-colors shadow-md"
        >
          <Eye size={18} /> Vista Previa
        </button>
        <button 
          onClick={() => handleAccion('TIMBRAR')}
          disabled={loading}
          className="flex items-center gap-2 px-8 py-2 bg-[#00B4D8] text-white rounded font-bold hover:bg-[#0096b4] disabled:opacity-50 transition-colors shadow-md"
        >
          {loading ? 'Procesando...' : <><Send size={18} /> Timbrar y Enviar</>}
        </button>
      </div>

      {/* MODAL DE NUEVO RECEPTOR */}
      {showReceptorForm && (
        <ReceptorForm 
          emisorId={emisorActual?.id || emisorActual?.idLocal} 
          onClose={() => setShowReceptorForm(false)} 
          onSave={() => {
             setShowReceptorForm(false);
             if(emisorActual?.id || emisorActual?.idLocal) {
               billingApi.listarReceptores(emisorActual.id || emisorActual.idLocal)
                 .then(res => setReceptores(res.data?.data || []));
             }
          }} 
        />
      )}
    </div>
  );
}