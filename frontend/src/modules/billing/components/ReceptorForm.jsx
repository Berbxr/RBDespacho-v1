import React, { useState } from 'react';
import { UserPlus, X, Save, Building2 } from 'lucide-react';
import { CATALOGO_REGIMEN_FISCAL } from '../../../utils/catalogos'; // Ajusta la ruta a tu archivo de catálogos

export default function ReceptorForm({ emisorId, onSave, onClose, loading }) {
  const [formData, setFormData] = useState({
    rfc: '',
    razonSocial: '',
    cpFiscal: '',
    regimenFiscal: '',
    email: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Le inyectamos el emisorId automáticamente para cumplir con tu base de datos
    onSave({ ...formData, emisorId });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Cabecera corporativa */}
        <div className="bg-[#1C2B1E] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-[#00B4D8]" />
            <span className="font-bold tracking-wide">Nuevo Cliente (Receptor)</span>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white hover:rotate-90 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">RFC *</label>
              <input 
                required 
                maxLength={13}
                placeholder="Ej. CAA221014NP5" 
                className="w-full p-2.5 border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-[#00B4D8] focus:border-[#00B4D8] outline-none transition-all" 
                onChange={e => setFormData({...formData, rfc: e.target.value.toUpperCase()})} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código Postal *</label>
              <input 
                required 
                maxLength={5}
                placeholder="Ej. 21229" 
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00B4D8] focus:border-[#00B4D8] outline-none transition-all" 
                onChange={e => setFormData({...formData, cpFiscal: e.target.value})} 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razón Social *</label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3 top-3 text-gray-400" />
              <input 
                required 
                placeholder="CORPORATIVO ADUANERO ARTEMIS" 
                className="w-full p-2.5 pl-10 border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-[#00B4D8] focus:border-[#00B4D8] outline-none transition-all" 
                onChange={e => setFormData({...formData, razonSocial: e.target.value.toUpperCase()})} 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Régimen Fiscal *</label>
            <select 
              required 
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#00B4D8] focus:border-[#00B4D8] outline-none transition-all" 
              onChange={e => setFormData({...formData, regimenFiscal: e.target.value})}
              defaultValue=""
            >
              <option value="" disabled>Seleccione un régimen...</option>
              {CATALOGO_REGIMEN_FISCAL.map((opcion) => {
                const clave = opcion.substring(0, 3);
                return <option key={clave} value={clave}>{opcion}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico (Opcional)</label>
            <input 
              type="email"
              placeholder="contacto@empresa.com" 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00B4D8] focus:border-[#00B4D8] outline-none transition-all" 
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all">
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-[#00B4D8] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#0096B4] shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Guardando...' : <><Save size={18} /> Guardar Cliente</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}