import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Save, Plus, Trash2, Building2, UserCircle, Receipt, Calculator, Eye, X, UploadCloud } from 'lucide-react';

const CrearFactura = () => {
  // --- ESTADOS DE DATOS REALES ---
  const [emisores, setEmisores] = useState([]);
  const [receptores, setReceptores] = useState([]);
  const [timbres, setTimbres] = useState('Cargando...');
  
  const [emisorSeleccionado, setEmisorSeleccionado] = useState(null);
  const [receptorActual, setReceptorActual] = useState(null);
  const [datosCFDI, setDatosCFDI] = useState({ tipo: 'I', uso: 'G03', formaPago: '03', metodoPago: 'PPD', moneda: 'MXN' });
  const [conceptos, setConceptos] = useState([]);
  
  // Modales
  const [showPreview, setShowPreview] = useState(false);
  const [modalEmisor, setModalEmisor] = useState(false);
  const [modalReceptor, setModalReceptor] = useState(false);

  // Formulario Nuevo Emisor (CSD)
  const [formEmisor, setFormEmisor] = useState({ rfc: '', nombre: '', regimen: '', password: '', cerFile: null, keyFile: null });
  // Formulario Nuevo Receptor
  const [formReceptor, setFormReceptor] = useState({ rfc: '', nombre: '', cp: '', regimen: '' });

  // Formularios de Conceptos e Impuestos
  const [formConcepto, setFormConcepto] = useState({ claveSat: '', descripcion: '', unidad: 'E48', precio: 0, cantidad: 1, descuento: 0, objetoImpuesto: '02' });
  const [impuestosTemp, setImpuestosTemp] = useState([]);
  const [impuestoForm, setImpuestoForm] = useState({ tipo: 'Traslado', impuesto: 'IVA', tasa: 16 });

  // --- CARGA INICIAL DESDE TU BACKEND ---
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Aquí llamas a tus propias rutas de Node.js
        // const resTimbres = await axios.get('http://localhost:3500/api/facturacion/timbres', { headers });
        // const resEmisores = await axios.get('http://localhost:3500/api/emisores', { headers });
        // const resReceptores = await axios.get('http://localhost:3500/api/clientes', { headers });

        // Simulando la respuesta real por ahora:
        setTimbres('950');
        setEmisores([{ id: 1, rfc: 'MEBH020306876', nombre: 'JOSE HECTOR MENDOZA BERBER', cp: '21399', regimen: '626 - RESICO' }]);
        setReceptores([{ id: 1, rfc: 'CAA221014NP5', nombre: 'CORPORATIVO ADUANERO ARTEMIS', cp: '21229', regimen: '601 - General de Ley' }]);
      } catch (error) {
        console.error("Error cargando catálogos", error);
      }
    };
    cargarDatos();
  }, []);

  // Seleccionar automáticamente el primero si existen
  useEffect(() => {
    if (emisores.length > 0 && !emisorSeleccionado) setEmisorSeleccionado(emisores[0]);
    if (receptores.length > 0 && !receptorActual) setReceptorActual(receptores[0]);
  }, [emisores, receptores]);

  // --- FUNCIÓN PARA CONVERTIR ARCHIVOS A BASE64 ---
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Extrae solo la cadena Base64
    reader.onerror = error => reject(error);
  });

  // --- GUARDAR NUEVO EMISOR CON CSD ---
  const handleGuardarEmisor = async (e) => {
    e.preventDefault();
    if (!formEmisor.cerFile || !formEmisor.keyFile) return alert("Debes subir los archivos .cer y .key");

    try {
      const cerBase64 = await fileToBase64(formEmisor.cerFile);
      const keyBase64 = await fileToBase64(formEmisor.keyFile);

      const payload = {
        rfc: formEmisor.rfc,
        nombre: formEmisor.nombre,
        regimen: formEmisor.regimen,
        cerBase64,
        keyBase64,
        password: formEmisor.password
      };

      // Aquí harías el POST a tu backend, quien llamará a Facturama y luego guardará en Prisma
      // await axios.post('http://localhost:3500/api/emisores', payload, { headers });

      // Simulación de éxito
      const nuevo = { id: Date.now(), ...payload };
      setEmisores([...emisores, nuevo]);
      setEmisorSeleccionado(nuevo);
      setModalEmisor(false);
      alert("Emisor dado de alta en Facturama y guardado en Base de Datos.");
    } catch (error) {
      alert("Error al procesar los certificados.");
    }
  };

  // --- GUARDAR NUEVO RECEPTOR ---
  const handleGuardarReceptor = async (e) => {
    e.preventDefault();
    // Validar duplicados localmente
    if (receptores.some(r => r.rfc === formReceptor.rfc.toUpperCase())) {
      return alert("Este RFC ya está registrado.");
    }

    const payload = { ...formReceptor, rfc: formReceptor.rfc.toUpperCase() };
    
    // POST a tu backend (Prisma)
    // await axios.post('http://localhost:3500/api/clientes', payload);
    
    const nuevo = { id: Date.now(), ...payload };
    setReceptores([...receptores, nuevo]);
    setReceptorActual(nuevo);
    setModalReceptor(false);
  };

  // --- LÓGICA DE CONCEPTOS E IMPUESTOS ---
  const agregarConcepto = () => {
    if (!formConcepto.descripcion || formConcepto.precio <= 0) return alert("Llena la descripción y el precio.");
    const importeBase = formConcepto.cantidad * formConcepto.precio;
    const baseCalculo = importeBase - formConcepto.descuento;
    const impuestosCalculados = impuestosTemp.map(imp => ({ ...imp, importeCalculado: baseCalculo * (imp.tasa / 100) }));

    setConceptos([...conceptos, { ...formConcepto, id: Date.now(), importe: importeBase, base: baseCalculo, impuestos: impuestosCalculados }]);
    setFormConcepto({ claveSat: '', descripcion: '', unidad: 'E48', precio: 0, cantidad: 1, descuento: 0, objetoImpuesto: '02' });
    setImpuestosTemp([]);
  };

  const totales = useMemo(() => {
    let subtotal = 0, descuentoTotal = 0, totalTraslados = 0, totalRetenciones = 0, desgloseImpuestos = {};
    conceptos.forEach(c => {
      subtotal += c.importe;
      descuentoTotal += Number(c.descuento);
      c.impuestos.forEach(imp => {
        const key = `${imp.impuesto} ${imp.tipo} ${imp.tasa}%`;
        desgloseImpuestos[key] = (desgloseImpuestos[key] || 0) + imp.importeCalculado;
        if (imp.tipo === 'Traslado') totalTraslados += imp.importeCalculado;
        if (imp.tipo === 'Retencion') totalRetenciones += imp.importeCalculado;
      });
    });
    return { subtotal, descuentoTotal, totalTraslados, totalRetenciones, total: subtotal - descuentoTotal + totalTraslados - totalRetenciones, desgloseImpuestos };
  }, [conceptos]);

  return (
    <Layout>
      <div className="min-h-screen bg-slate-50 pb-32 font-sans w-full">
        
        {/* BARRA SUPERIOR MULTIEMISOR */}
        <div className="bg-slate-800 text-white p-4 shadow-md flex flex-wrap justify-between items-center rounded-b-lg mb-6 mx-4 mt-2">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Building2 size={24} className="text-[#00B4D8]" />
            <div className="flex-1">
              <p className="text-xs text-slate-400">Emisor Actual (Multiemisor)</p>
              <div className="flex items-center gap-2 mt-1">
                <select 
                  className="bg-slate-700 text-sm font-bold border-none outline-none rounded p-1.5 w-full md:w-80"
                  value={emisorSeleccionado?.id || ''}
                  onChange={(e) => setEmisorSeleccionado(emisores.find(em => em.id === Number(e.target.value)))}
                >
                  {emisores.map(em => <option key={em.id} value={em.id}>{em.nombre} ({em.rfc})</option>)}
                </select>
                <button onClick={() => setModalEmisor(true)} className="bg-[#00B4D8] text-white p-1.5 rounded hover:bg-[#0096C7] transition-colors" title="Agregar Emisor">
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>
          <div className="text-sm mt-2 md:mt-0">Timbres Restantes: <span className="font-bold text-green-400">{timbres}</span></div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            {/* DATOS DEL RECEPTOR */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-[#00B4D8]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-slate-700 flex items-center gap-2"><UserCircle /> Datos del Receptor</h2>
                <button onClick={() => setModalReceptor(true)} className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded hover:bg-slate-200 font-medium">+ Nuevo</button>
              </div>
              <div className="space-y-3">
                <select className="w-full p-2 bg-slate-50 border rounded text-sm outline-none focus:border-[#00B4D8]"
                  value={receptorActual?.id || ''}
                  onChange={e => setReceptorActual(receptores.find(r => r.id === Number(e.target.value)))}>
                  {receptores.map(r => <option key={r.id} value={r.id}>{r.nombre} ({r.rfc})</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-slate-500">RFC</label><p className="font-semibold text-sm">{receptorActual?.rfc}</p></div>
                  <div><label className="text-xs text-slate-500">Uso CFDI</label>
                    <select className="w-full p-1 bg-transparent border-b text-sm outline-none" value={datosCFDI.uso} onChange={e => setDatosCFDI({...datosCFDI, uso: e.target.value})}>
                      <option value="G03">G03 - Gastos en general</option>
                      <option value="S01">S01 - Sin efectos fiscales</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* DATOS DEL COMPROBANTE */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-indigo-500">
              <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Receipt /> Datos del Comprobante</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-semibold text-slate-500">Tipo CFDI:</label>
                  <select className="w-full p-2 bg-slate-50 border rounded text-sm" value={datosCFDI.tipo} onChange={e => setDatosCFDI({...datosCFDI, tipo: e.target.value})}>
                    <option value="I">I - Ingreso</option><option value="E">E - Egreso</option><option value="P">P - Pago</option>
                  </select>
                </div>
                <div><label className="text-xs font-semibold text-slate-500">Método de Pago:</label>
                  <select className="w-full p-2 bg-slate-50 border rounded text-sm" value={datosCFDI.metodoPago} onChange={e => setDatosCFDI({...datosCFDI, metodoPago: e.target.value})}>
                    <option value="PPD">PPD - Parcialidades</option><option value="PUE">PUE - Una sola exhibición</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* CONSTRUCTOR DE CONCEPTOS (Simplificado visualmente para ahorrar espacio) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
            <h2 className="font-bold text-slate-700 mb-4">Agregar Concepto</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              <input type="text" className="p-2 border rounded text-sm md:col-span-1" placeholder="Clave SAT (Ej: 81111504)" value={formConcepto.claveSat} onChange={e => setFormConcepto({...formConcepto, claveSat: e.target.value})} />
              <input type="text" className="p-2 border rounded text-sm md:col-span-4" placeholder="Descripción del Servicio" value={formConcepto.descripcion} onChange={e => setFormConcepto({...formConcepto, descripcion: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div><label className="text-xs text-slate-500">Cant.</label><input type="number" className="w-full p-2 border rounded text-sm" value={formConcepto.cantidad} onChange={e => setFormConcepto({...formConcepto, cantidad: Number(e.target.value)})} /></div>
              <div><label className="text-xs text-slate-500">Precio U.</label><input type="number" className="w-full p-2 border rounded text-sm" value={formConcepto.precio} onChange={e => setFormConcepto({...formConcepto, precio: Number(e.target.value)})} /></div>
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500">Objeto Impuesto</label>
                <select className="w-full p-2 border rounded text-sm" value={formConcepto.objetoImpuesto} onChange={e => setFormConcepto({...formConcepto, objetoImpuesto: e.target.value})}>
                  <option value="01">01 - No objeto</option>
                  <option value="02">02 - Sí objeto</option>
                </select>
              </div>
            </div>

            {formConcepto.objetoImpuesto === '02' && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 flex flex-wrap gap-2 items-end">
                <select className="p-2 border rounded text-sm" value={impuestoForm.tipo} onChange={e => setImpuestoForm({...impuestoForm, tipo: e.target.value})}><option value="Traslado">Traslado</option><option value="Retencion">Retención</option></select>
                <select className="p-2 border rounded text-sm" value={impuestoForm.impuesto} onChange={e => setImpuestoForm({...impuestoForm, impuesto: e.target.value})}><option value="IVA">IVA</option><option value="ISR">ISR</option></select>
                <select className="p-2 border rounded text-sm" value={impuestoForm.tasa} onChange={e => setImpuestoForm({...impuestoForm, tasa: Number(e.target.value)})}><option value={16}>16%</option><option value={8}>8%</option><option value={10.6667}>10.66%</option><option value={1.25}>1.25%</option></select>
                <button onClick={() => setImpuestosTemp([...impuestosTemp, { ...impuestoForm, id: Date.now() }])} className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600">Añadir Impuesto</button>
                <div className="w-full flex gap-2 mt-2">
                  {impuestosTemp.map(imp => <span key={imp.id} className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">{imp.impuesto} {imp.tipo} {imp.tasa}%</span>)}
                </div>
              </div>
            )}
            <div className="flex justify-end"><button onClick={agregarConcepto} className="bg-green-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-600">AGREGAR AL TICKET</button></div>
          </div>

          {/* TABLA DE CONCEPTOS AGREGADOS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                <tr><th className="p-3">Clave SAT</th><th className="p-3">Descripción</th><th className="p-3">Importe</th><th className="p-3 text-center">Quitar</th></tr>
              </thead>
              <tbody>
                {conceptos.map(c => (
                  <tr key={c.id} className="border-b border-slate-50"><td className="p-3">{c.claveSat}</td><td className="p-3">{c.descripcion}</td><td className="p-3 font-bold">${c.importe.toFixed(2)}</td><td className="p-3 text-center"><button onClick={() => setConceptos(conceptos.filter(x => x.id !== c.id))} className="text-red-400"><Trash2 size={18} /></button></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALES */}
          <div className="flex justify-end">
            <div className="bg-slate-800 text-white rounded-xl p-6 w-full md:w-96 shadow-xl">
              <h3 className="text-lg font-bold border-b border-slate-600 pb-2 mb-4"><Calculator className="inline mr-2"/> Resumen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Subtotal:</span> <span>${totales.subtotal.toFixed(2)}</span></div>
                {Object.entries(totales.desgloseImpuestos).map(([nombre, monto]) => (
                   <div key={nombre} className="flex justify-between text-blue-300"><span>{nombre}:</span><span>${monto.toFixed(2)}</span></div>
                ))}
              </div>
              <div className="border-t border-slate-600 mt-4 pt-4 flex justify-between items-end">
                <span className="text-lg text-slate-300">Total:</span><span className="text-3xl font-black text-[#00B4D8]">${totales.total.toFixed(2)}</span>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowPreview(true)} className="flex-1 bg-slate-600 hover:bg-slate-500 py-3 rounded font-bold flex justify-center items-center gap-2"><Eye size={18}/> Vista Previa</button>
                <button className="flex-1 bg-[#00B4D8] hover:bg-[#0096C7] py-3 rounded font-bold">Timbrar CFDI</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALES ================= */}

      {/* MODAL NUEVO EMISOR (Bóveda de Facturama) */}
      {modalEmisor && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><UploadCloud size={20}/> Alta de Emisor (CSD)</h3>
              <button onClick={() => setModalEmisor(false)} className="hover:text-red-400"><X size={20}/></button>
            </div>
            <form onSubmit={handleGuardarEmisor} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 mb-4 bg-blue-50 p-2 rounded border border-blue-100">
                Facturama Multiemisor requiere el Certificado de Sello Digital (.CER y .KEY) y su contraseña para poder timbrar a nombre de este cliente.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-600 mb-1">RFC</label>
                <input required type="text" className="w-full p-2 border rounded text-sm uppercase" value={formEmisor.rfc} onChange={e => setFormEmisor({...formEmisor, rfc: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Régimen Fiscal</label>
                <input required type="text" placeholder="Ej: 601" className="w-full p-2 border rounded text-sm" value={formEmisor.regimen} onChange={e => setFormEmisor({...formEmisor, regimen: e.target.value})} /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">Razón Social</label>
                <input required type="text" className="w-full p-2 border rounded text-sm uppercase" value={formEmisor.nombre} onChange={e => setFormEmisor({...formEmisor, nombre: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Archivo .CER</label>
                <input required type="file" accept=".cer" className="text-xs w-full" onChange={e => setFormEmisor({...formEmisor, cerFile: e.target.files[0]})} /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Archivo .KEY</label>
                <input required type="file" accept=".key" className="text-xs w-full" onChange={e => setFormEmisor({...formEmisor, keyFile: e.target.files[0]})} /></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">Contraseña de la Clave Privada (CSD)</label>
                <input required type="password" className="w-full p-2 border rounded text-sm" value={formEmisor.password} onChange={e => setFormEmisor({...formEmisor, password: e.target.value})} />
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-[#00B4D8] text-white px-6 py-2 rounded font-bold hover:bg-[#0096C7]">Guardar y Subir a Facturama</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVO RECEPTOR (Guardar en Base de Datos Local) */}
      {modalReceptor && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-100 p-4 flex justify-between items-center border-b">
              <h3 className="font-bold text-slate-700">Agregar Nuevo Cliente (Receptor)</h3>
              <button onClick={() => setModalReceptor(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
            </div>
            <form onSubmit={handleGuardarReceptor} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-slate-600 mb-1">RFC</label>
                <input required type="text" className="w-full p-2 border rounded text-sm uppercase" value={formReceptor.rfc} onChange={e => setFormReceptor({...formReceptor, rfc: e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-slate-600 mb-1">Razón Social</label>
                <input required type="text" className="w-full p-2 border rounded text-sm uppercase" value={formReceptor.nombre} onChange={e => setFormReceptor({...formReceptor, nombre: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Código Postal</label>
                <input required type="text" maxLength={5} className="w-full p-2 border rounded text-sm" value={formReceptor.cp} onChange={e => setFormReceptor({...formReceptor, cp: e.target.value})} /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1">Régimen Fiscal</label>
                <input required type="text" placeholder="Ej: 601" className="w-full p-2 border rounded text-sm" value={formReceptor.regimen} onChange={e => setFormReceptor({...formReceptor, regimen: e.target.value})} /></div>
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="bg-slate-800 text-white px-6 py-2 rounded font-bold hover:bg-slate-700">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISTA PREVIA (Mismo de la versión anterior) */}
      {showPreview && (
         <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
         <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
           <button onClick={() => setShowPreview(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><X size={24}/></button>
           <div className="p-8 font-sans text-slate-800">
             <div className="border-b-2 border-[#00B4D8] pb-4 mb-6 flex justify-between items-start">
               <div>
                 <h2 className="text-xl font-black text-slate-800">{emisorSeleccionado?.nombre}</h2>
                 <p className="text-xs text-slate-500 mt-1">RFC: {emisorSeleccionado?.rfc}</p>
                 <p className="text-xs text-slate-500">Régimen: {emisorSeleccionado?.regimen}</p>
               </div>
               <div className="text-right">
                 <h1 className="text-2xl font-black text-[#00B4D8]">FACTURA (INGRESO)</h1>
                 <p className="text-sm font-bold mt-2">Versión 4.0</p>
               </div>
             </div>
             {/* El resto del HTML de la Vista Previa va aquí (igual al anterior) */}
             <div className="text-center text-slate-400 text-sm py-10">Vista Previa Generada</div>
           </div>
         </div>
       </div>
      )}
    </Layout>
  );
};

export default CrearFactura;