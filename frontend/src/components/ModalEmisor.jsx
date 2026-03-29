import React, { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';

const ModalEmisor = ({ isOpen, onClose, onSave }) => {
  const [formEmisor, setFormEmisor] = useState({ rfc: '', cer: null, key: null, password: '' });
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target.result.split(',')[1];
        setFormEmisor({ ...formEmisor, [type]: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    // Pasamos los datos ya procesados al padre (CrearFactura.jsx)
    await onSave({
      rfc: formEmisor.rfc,
      cerBase64: formEmisor.cer,
      keyBase64: formEmisor.key,
      password: formEmisor.password
    });
    setCargando(false);
    // Limpiar formulario al cerrar si todo salió bien se maneja desde el padre, 
    // pero podemos resetear el estado local por si acaso:
    setFormEmisor({ rfc: '', cer: null, key: null, password: '' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-slate-200">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <UploadCloud className="text-[#00B4D8]" size={20}/> 
            Vincular CSD (Emisor)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100 mb-4">
            Sube tus archivos .cer y .key para poder timbrar a nombre de este RFC.
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">RFC del Emisor</label>
            <input 
              required
              className="w-full border border-slate-300 rounded p-2 text-sm uppercase focus:ring-2 focus:ring-[#00B4D8] focus:border-[#00B4D8] outline-none" 
              placeholder="Ej. MEBH020306876" 
              value={formEmisor.rfc} 
              onChange={e => setFormEmisor({...formEmisor, rfc: e.target.value.toUpperCase()})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Certificado (.cer)</label>
              <input 
                required
                type="file" 
                accept=".cer" 
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded" 
                onChange={(e) => handleFileChange(e, 'cer')} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Llave Privada (.key)</label>
              <input 
                required
                type="file" 
                accept=".key" 
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded" 
                onChange={(e) => handleFileChange(e, 'key')} 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Contraseña de la Llave Privada</label>
            <input 
              required
              type="password" 
              className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#00B4D8] outline-none" 
              value={formEmisor.password} 
              onChange={e => setFormEmisor({...formEmisor, password: e.target.value})} 
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t border-slate-100 mt-4 gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded text-sm font-semibold transition"
              disabled={cargando}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 bg-[#00B4D8] hover:bg-[#0096C7] text-white rounded text-sm font-semibold transition flex items-center gap-2"
              disabled={cargando}
            >
              {cargando ? 'Guardando...' : 'Guardar CSD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEmisor;