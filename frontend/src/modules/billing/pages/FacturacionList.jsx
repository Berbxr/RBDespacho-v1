import React, { useState, useEffect } from 'react';
import { FileText, Download, Ban, CheckCircle, Search, AlertCircle, Building2 } from 'lucide-react';
import { billingApi } from '../api/billing.api';
import CancelationModal from '../components/CancelationModal'; // ¡NUEVO! Componente importado

export default function FacturacionList() {
  const [emisores, setEmisores] = useState([]);
  const [emisorSeleccionado, setEmisorSeleccionado] = useState('');
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');

  // Estados para Modal de Cancelación
  const [modalOpen, setModalOpen] = useState(false);
  const [facturaACancelar, setFacturaACancelar] = useState(null);

  // 1. Cargar emisores para el filtro
  useEffect(() => {
    billingApi.listarCsds().then(res => setEmisores(res.data.data || []));
  }, []);

  // 2. Cargar facturas cuando cambie el emisor seleccionado
  useEffect(() => {
    if (emisorSeleccionado) {
      setLoading(true);
      // Asumiendo que agregaste un endpoint en tu backend para listar facturas por emisor
      // ej: billingApi.listarFacturas(emisorSeleccionado)
      // Por ahora simularemos la respuesta si no tienes el endpoint:
      setTimeout(() => {
        setFacturas([
          { id: '1', folio: '1001', satUuid: '550E8400-E29B-41D4-A716-446655440000', receptor: { razonSocial: 'CORPORATIVO ARTEMIS', rfc: 'CAA221014NP5' }, fecha: '2026-04-02', total: 6960.00, estado: 'TIMBRADA' }
        ]);
        setLoading(false);
      }, 500);
    } else {
      setFacturas([]); // Limpiar si no hay emisor
    }
  }, [emisorSeleccionado]);

  // Manejador del Modal de Cancelación
  const abrirCancelacion = (factura) => {
    setFacturaACancelar(factura);
    setModalOpen(true);
  };

  const confirmarCancelacion = async (motivo, sustituto) => {
    try {
      await billingApi.cancelarCfdi(facturaACancelar.id, {
        motivo,
        rfcEmisor: emisorSeleccionado,
        uuidReemplazo: sustituto
      });
      alert('Cancelación solicitada con éxito al SAT');
      setModalOpen(false);
      // Aquí recargarías la lista de facturas
    } catch (error) {
      alert('Error al cancelar');
    }
  };

  // Manejadores de descargas (Apuntan a los endpoints de tu backend)
  const descargarXML = (id) => window.open(`http://localhost:3500/api/billing/cfdis/${id}/xml`, '_blank');
  // const descargarPDF = (id) => ... logica de PDF

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Modal de Cancelación */}
      {modalOpen && (
        <CancelationModal 
          factura={facturaACancelar} 
          onConfirm={confirmarCancelacion} 
          onClose={() => setModalOpen(false)} 
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-[#00B4D8]" size={32} /> Historial de Facturas
          </h1>
        </div>
      </div>

      {/* FILTROS SUPERIORES */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
            <Building2 size={14}/> Seleccionar Empresa (Emisor)
          </label>
          <select 
            className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#00B4D8] outline-none"
            value={emisorSeleccionado}
            onChange={(e) => setEmisorSeleccionado(e.target.value)}
          >
            <option value="">Seleccione una empresa...</option>
            {emisores.map(e => <option key={e.rfc || e.Rfc} value={e.rfc || e.Rfc}>{(e.razonSocial || e.RazonSocial)}</option>)}
          </select>
        </div>

        <div className="w-full md:w-1/3">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Buscar Folio o Cliente</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg outline-none"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {facturas.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {emisorSeleccionado ? 'No hay facturas emitidas para esta empresa.' : 'Selecciona un emisor arriba para ver su historial.'}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
              <tr>
                <th className="p-4">Folio / UUID</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Fecha</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facturas.map((fac) => (
                <tr key={fac.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{fac.folio}</div>
                    <div className="text-[10px] text-gray-400 truncate w-32" title={fac.satUuid}>{fac.satUuid || 'Borrador'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-[#1C2B1E]">{fac.receptor.razonSocial}</div>
                    <div className="text-xs text-gray-500">RFC: {fac.receptor.rfc}</div>
                  </td>
                  <td className="p-4 text-gray-600">{fac.fecha}</td>
                  <td className="p-4 text-right font-bold text-gray-900">${fac.total.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center justify-center gap-1 w-max mx-auto">
                      <CheckCircle size={12}/> Timbrada
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      {/* BOTONES DE DESCARGA */}
                      <button onClick={() => descargarXML(fac.id)} className="text-gray-500 hover:text-[#00B4D8] p-1.5 rounded bg-gray-50 border hover:bg-blue-50 transition" title="Descargar XML">
                        <Download size={16} />
                      </button>
                      <button className="text-gray-500 hover:text-[#00B4D8] p-1.5 rounded bg-gray-50 border hover:bg-blue-50 transition" title="Descargar PDF">
                        <FileText size={16} />
                      </button>
                      {/* BOTON DE CANCELAR */}
                      <button onClick={() => abrirCancelacion(fac)} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition" title="Cancelar Factura">
                        <Ban size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}