import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { billingApi } from '../api/billing.api'; 

export default function ConceptosTable({ emisorId, conceptos, totales, onAgregar, onActualizar, onEliminar }) {
  
  const estadoInicialConcepto = {
    claveProdServ: '',
    noIdentificacion: '',
    claveUnidad: '',
    unidad: '',
    descripcion: '',
    valorUnitario: '',
    cantidad: '1',
    descuento: false,
    objetoImpuesto: '02',
    impuestos: []
  };

  const [nuevoConcepto, setNuevoConcepto] = useState(estadoInicialConcepto);
  const [productosGuardados, setProductosGuardados] = useState([]);
  const [nuevoImpuesto, setNuevoImpuesto] = useState({ tipo: 'IVA Trasladado', tasa: '' });

  useEffect(() => {
    if (emisorId) {
      if (billingApi.listarProductos) {
        billingApi.listarProductos(emisorId)
          .then(res => setProductosGuardados(res.data?.data || []))
          .catch(err => console.log("Aún no hay productos o falta endpoint", err));
      }
    }
  }, [emisorId]);

  const handleProductoSelect = (e) => {
    const prodId = e.target.value;
    if (!prodId) {
      setNuevoConcepto(estadoInicialConcepto);
      return;
    }
    const prod = productosGuardados.find(p => p.id === prodId);
    if (prod) {
      setNuevoConcepto({
        ...nuevoConcepto,
        claveProdServ: prod.claveProdServ || '',
        noIdentificacion: prod.noIdentificacion || '',
        claveUnidad: prod.claveUnidad || '',
        unidad: prod.unidad || '',
        descripcion: prod.descripcion || '',
        valorUnitario: prod.valorUnitario || '',
        objetoImpuesto: prod.objetoImpuesto || '02',
        impuestos: prod.impuestos || [] 
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNuevoConcepto(prev => ({ ...prev, [name]: value }));
  };

  const handleAgregarImpuesto = () => {
    if (!nuevoImpuesto.tasa || isNaN(nuevoImpuesto.tasa)) {
      alert("Por favor ingresa una tasa válida (ejemplo: 0.16 para 16%)");
      return;
    }
    setNuevoConcepto(prev => ({
      ...prev,
      impuestos: [
        ...prev.impuestos, 
        { tipo: nuevoImpuesto.tipo, tasa: Number(nuevoImpuesto.tasa) }
      ]
    }));
    setNuevoImpuesto({ ...nuevoImpuesto, tasa: '' }); 
  };

  // Función corregida: Calcula el importe final (Subtotal + Traslados - Retenciones)
  const handleAdd = () => {
    if (!nuevoConcepto.descripcion || !nuevoConcepto.valorUnitario || !nuevoConcepto.claveProdServ || !nuevoConcepto.claveUnidad) {
      alert("La descripción, Valor Unitario, Clave Prod/Serv y Clave Unidad son obligatorios.");
      return;
    }
    
    const cantidadNum = Number(nuevoConcepto.cantidad) || 0;
    const valorUnitarioNum = Number(nuevoConcepto.valorUnitario) || 0;
    
    // 1. Calculamos el subtotal (Cantidad * Precio Unitario)
    const subtotal = cantidadNum * valorUnitarioNum;

    // 2. Calculamos los impuestos basados en el subtotal
    let totalImpuestos = 0;
    if (nuevoConcepto.impuestos && nuevoConcepto.impuestos.length > 0) {
      nuevoConcepto.impuestos.forEach(imp => {
        const montoImpuesto = subtotal * (Number(imp.tasa) || 0);
        // Si el impuesto dice "Retenido", se resta. Si es "Trasladado", se suma.
        if (imp.tipo.includes('Retenido')) {
          totalImpuestos -= montoImpuesto;
        } else {
          totalImpuestos += montoImpuesto;
        }
      });
    }

    // 3. Importe total con impuestos incluidos
    const importeTotal = subtotal + totalImpuestos;

    onAgregar({
      ...nuevoConcepto,
      cantidad: cantidadNum,
      valorUnitario: valorUnitarioNum,
      subtotal: subtotal, // Guardamos el subtotal limpio por si lo necesitas
      importe: importeTotal, 
      impuestos: nuevoConcepto.impuestos 
    });
    
    setNuevoConcepto(estadoInicialConcepto);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      {/* Cabecera Principal */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-[#1C2B1E]">
          <Package size={20} className="text-[#00B4D8]" />
          <span>Conceptos / Servicios</span>
        </div>
      </div>

      {/* 1. Formulario de Captura Rápida */}
      <div className="p-4 border-b border-gray-200 bg-white">
        
        {/* Selector del Catálogo */}
        {productosGuardados.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargar producto del catálogo</label>
            <select 
              onChange={handleProductoSelect} 
              className="w-full md:w-1/2 p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#00B4D8] outline-none"
            >
              <option value="">-- Seleccionar un producto guardado --</option>
              {productosGuardados.map(p => (
                <option key={p.id} value={p.id}>{p.claveProdServ} - {p.descripcion}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Clave SAT*</label>
            <input type="text" name="claveProdServ" value={nuevoConcepto.claveProdServ} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#00B4D8] outline-none" placeholder="Ej. 84111506" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">SKU / Ident.</label>
            <input type="text" name="noIdentificacion" value={nuevoConcepto.noIdentificacion} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#00B4D8] outline-none" placeholder="Opcional" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-gray-500 mb-1">Descripción*</label>
            <input type="text" name="descripcion" value={nuevoConcepto.descripcion} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#00B4D8] outline-none" placeholder="Descripción del concepto" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Objeto Imp.</label>
            <select name="objetoImpuesto" value={nuevoConcepto.objetoImpuesto} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#00B4D8] outline-none">
              <option value="01">01 - No objeto</option>
              <option value="02">02 - Sí objeto</option>
              <option value="03">03 - Sí (no oblig)</option>
              <option value="04">04 - Sí objeto (no causa)</option>
            </select>
          </div>
          
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Clave Unidad*</label>
            <input type="text" name="claveUnidad" value={nuevoConcepto.claveUnidad} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#00B4D8] outline-none" placeholder="Ej. E48" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Unidad</label>
            <input type="text" name="unidad" value={nuevoConcepto.unidad} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#00B4D8] outline-none" placeholder="Ej. Servicio" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Cantidad*</label>
            <input type="number" min="0.01" step="0.01" name="cantidad" value={nuevoConcepto.cantidad} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#00B4D8] outline-none" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-gray-500 mb-1">Precio Unit.*</label>
            <input type="number" min="0" step="0.01" name="valorUnitario" value={nuevoConcepto.valorUnitario} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-[#00B4D8] outline-none" placeholder="0.00" />
          </div>

          {/* PANEL DE IMPUESTOS */}
          {nuevoConcepto.objetoImpuesto !== '01' && (
            <div className="md:col-span-6 bg-blue-50/50 p-3 mt-2 rounded-lg border border-blue-100 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 flex flex-col md:flex-row gap-2 items-end">
                <div className="w-full md:w-1/3">
                  <label className="block text-[11px] font-bold text-blue-800 mb-1 uppercase">Tipo de Impuesto</label>
                  <select 
                    className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none"
                    value={nuevoImpuesto.tipo}
                    onChange={e => setNuevoImpuesto({...nuevoImpuesto, tipo: e.target.value})}
                  >
                    <option value="IVA Trasladado">IVA Trasladado</option>
                    <option value="IVA Retenido">IVA Retenido</option>
                    <option value="ISR Retenido">ISR Retenido</option>
                    <option value="IEPS Trasladado">IEPS Trasladado</option>
                  </select>
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-[11px] font-bold text-blue-800 mb-1 uppercase">Tasa / Fracción</label>
                  <input 
                    type="number" step="0.000001" 
                    placeholder="Ej. 0.16" 
                    className="w-full p-2 border border-blue-200 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none"
                    value={nuevoImpuesto.tasa}
                    onChange={e => setNuevoImpuesto({...nuevoImpuesto, tasa: e.target.value})}
                  />
                </div>
                <button 
                  type="button" // IMPORTANTE PARA NO RECARGAR
                  onClick={handleAgregarImpuesto}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
                >
                  + Añadir Imp.
                </button>
              </div>

              <div className="flex-1 min-w-[250px]">
                {nuevoConcepto.impuestos.length > 0 ? (
                  <ul className="space-y-1">
                    {nuevoConcepto.impuestos.map((imp, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-blue-100 px-2 py-1 rounded text-xs text-blue-900 border border-blue-200">
                        <span className="font-semibold">{imp.tipo} - Tasa: {(imp.tasa * 100).toFixed(2)}%</span>
                        <button 
                          type="button" // IMPORTANTE PARA NO RECARGAR
                          onClick={() => setNuevoConcepto(prev => ({...prev, impuestos: prev.impuestos.filter((_, i) => i !== idx)}))} 
                          className="text-red-500 font-bold hover:text-red-700 ml-2"
                        >✕</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-blue-400 italic text-center md:text-left">Sin impuestos agregados aún.</p>
                )}
              </div>
            </div>
          )}

          <div className="md:col-span-6 flex justify-end mt-2">
            <button 
              type="button" // IMPORTANTE PARA NO RECARGAR LA PÁGINA O VACIAR EL ESTADO
              onClick={handleAdd}
              className="bg-[#1C2B1E] text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-all text-sm font-bold shadow-sm flex items-center justify-center gap-2 h-[38px]"
            >
              <Plus size={16} /> Agregar a Factura
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tabla de Conceptos Actuales */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-200">
            <tr>
              <th className="px-4 py-3">Concepto / Detalles</th>
              <th className="px-4 py-3 text-center">Cant.</th>
              <th className="px-4 py-3 text-right">Precio Unit.</th>
              <th className="px-4 py-3 text-right">Importe</th>
              <th className="px-4 py-3 text-center w-16">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {conceptos?.map((c, index) => {
              
              // Reflejo visual matemático por si los datos llegan de otro lado sin "importe"
              const calcSubtotal = (Number(c.cantidad) || 0) * (Number(c.valorUnitario) || 0);
              let calcImpuestos = 0;
              if (c.impuestos && c.impuestos.length > 0) {
                c.impuestos.forEach(imp => {
                  const val = calcSubtotal * (Number(imp.tasa) || 0);
                  imp.tipo.includes('Retenido') ? (calcImpuestos -= val) : (calcImpuestos += val);
                });
              }
              const importeCalculado = c.importe || (calcSubtotal + calcImpuestos);
              
              return (
                <tr key={index} className="hover:bg-gray-50/50 group transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#1C2B1E]">{c.descripcion}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {c.claveProdServ} | {c.claveUnidad} {c.unidad ? `(${c.unidad})` : ''} 
                      {c.noIdentificacion && ` | SKU: ${c.noIdentificacion}`}
                    </div>
                    {c.impuestos && c.impuestos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.impuestos.map((imp, i) => (
                          <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                            {imp.tipo} {(imp.tasa * 100)}%
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{c.cantidad}</td>
                  <td className="px-4 py-3 text-right">
                    ${Number(c.valorUnitario).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#1C2B1E]">
                    ${importeCalculado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      type="button" // IMPORTANTE PARA QUE EL BOTÓN ELIMINAR FUNCIONE
                      onClick={() => onEliminar(index)} 
                      className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar concepto"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
            
            {(!conceptos || conceptos.length === 0) && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-gray-400 text-sm">
                  No hay conceptos en esta factura. Ingresa los datos y haz clic en "Agregar a Factura".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Panel de Totales Integrado */}
      <div className="p-5 grid grid-cols-12 gap-4 bg-gray-50 border-t border-gray-200">
         <div className="col-span-12 md:col-span-7"></div>
         <div className="col-span-12 md:col-span-5 space-y-2 text-sm">
            <div className="flex justify-between items-center">
               <span className="text-gray-600 font-semibold uppercase text-xs tracking-wider">Subtotal:</span>
               <div className="font-medium text-gray-800">
                 ${totales?.subtotal?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
               </div>
            </div>
            
            {totales?.descuento > 0 && (
              <div className="flex justify-between items-center">
                 <span className="text-gray-600 font-semibold uppercase text-xs tracking-wider">Descuento:</span>
                 <div className="font-medium text-orange-500">
                   -${totales?.descuento?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
               <span className="text-gray-600 font-semibold uppercase text-xs tracking-wider">Imp. Trasladados:</span>
               <div className="font-medium text-[#00B4D8]">
                 +${totales?.traslados?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
               </div>
            </div>
            
            {totales?.retenciones > 0 && (
              <div className="flex justify-between items-center">
                 <span className="text-gray-600 font-semibold uppercase text-xs tracking-wider">Imp. Retenidos:</span>
                 <div className="font-medium text-red-500">
                   -${totales?.retenciones?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </div>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200 text-lg">
               <span className="font-black text-[#1C2B1E] uppercase tracking-wider text-xs">Total:</span>
               <div className="font-bold text-[#1C2B1E] bg-[#00B4D8]/10 px-3 py-1 rounded-lg">
                 ${totales?.total?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}