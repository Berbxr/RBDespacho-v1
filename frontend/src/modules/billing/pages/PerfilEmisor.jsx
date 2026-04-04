import React, { useState, useEffect } from 'react';
import { ShieldCheck, Trash2, PlusCircle, Building2, MapPin } from 'lucide-react';
import { billingApi } from '../api/billing.api';
import CsdManager from '../../billing/components/CsdManager'; // Importamos el nuevo formulario que creamos

export default function PerfilEmisor() {
  const [csds, setCsds] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // Cargar emisores desde la base de datos/API
  const fetchCsds = async () => {
    try {
      const response = await billingApi.listarCsds();
      // Soporta tanto el formato de Facturama (Rfc) como el de Prisma (rfc)
      setCsds(response.data.data || []);
    } catch (error) {
      console.error("Error al cargar CSDs:", error);
    }
  };

  useEffect(() => {
    fetchCsds();
  }, []);

  // Eliminar un emisor
  const handleDelete = async (rfc) => {
    if (window.confirm(`¿Estás seguro de eliminar el CSD para el RFC: ${rfc}? No podrás facturar con esta empresa hasta volver a subir los sellos.`)) {
      try {
        await billingApi.eliminarCsd(rfc);
        fetchCsds(); // Recargamos la lista
      } catch (error) {
        console.error("Error al eliminar CSD:", error);
        alert("Error al eliminar el emisor.");
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <ShieldCheck className="text-[#00B4D8]" size={32} />
            Emisores y Certificados (CSD)
          </h1>
          <p className="text-gray-500">Administra las empresas y sellos digitales habilitados para facturar.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="bg-[#1C2B1E] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md"
          >
            <PlusCircle size={20} /> Nuevo Emisor
          </button>
        )}
      </div>

      {/* FORMULARIO DE NUEVO EMISOR (Oculto por defecto) */}
      {showForm && (
        <CsdManager 
          onUploadSuccess={() => {
            setShowForm(false);
            fetchCsds(); // Recargar después de guardar
          }} 
          onCancel={() => setShowForm(false)} 
        />
      )}

      {/* LISTA DE EMISORES ACTUALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {csds.length === 0 && !showForm && (
          <div className="col-span-full p-8 text-center bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No hay emisores registrados. Haz clic en "Nuevo Emisor" para comenzar.</p>
          </div>
        )}
        
        {csds.map((csd) => {
          // Normalizamos nombres de variables por si vienen de Prisma (minúsculas) o Facturama (Mayúsculas)
          const rfc = csd.rfc || csd.Rfc;
          const razonSocial = csd.razonSocial || csd.RazonSocial;
          const regimen = csd.regimenFiscal || csd.FiscalRegime;
          const cp = csd.cp || csd.TaxZipCode;

          return (
            <div key={rfc} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-md uppercase">Activo</span>
                  <button onClick={() => handleDelete(rfc)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Eliminar Emisor">
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <h3 className="font-bold text-xl text-[#1C2B1E]">{rfc}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px] flex items-start gap-1">
                  <Building2 size={14} className="mt-0.5 shrink-0 text-[#00B4D8]" />
                  {razonSocial}
                </p>
                
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-2 border border-gray-100">
                  <p className="flex items-center gap-2 text-gray-600">
                    <span className="font-bold text-gray-800">Régimen:</span> {regimen}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} className="text-gray-400"/> 
                    <span className="font-bold text-gray-800">CP:</span> {cp}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}