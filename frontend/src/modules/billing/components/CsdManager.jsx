import React, { useState } from 'react';
import { Upload, FileKey, ShieldCheck, X, Save, Image as ImageIcon, Building2, Mail, MapPin } from 'lucide-react';
import { billingApi } from '../api/billing.api'; // Ajusta la ruta a tu api
import { CATALOGO_REGIMEN_FISCAL } from '../../../utils/catalogos'; // Ajusta la ruta a tu catálogo

export default function CsdManager({ onUploadSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    rfc: '',
    razonSocial: '',
    regimen: '',
    cp: '',
    email: '',
    password: '',
    cerFile: null,
    keyFile: null,
    logoBase64: null
  });

  // Convertir archivo a Base64 puro (sin el prefijo de data:image...) para el SAT
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  // Convertir Logo a Base64 (conservando el prefijo para usarlo directamente en <img> y el PDF)
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setFormData(prev => ({ ...prev, logoBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cerFile || !formData.keyFile) {
      alert("Debes subir los archivos .cer y .key de tu Certificado de Sello Digital.");
      return;
    }

    setLoading(true);
    try {
      const cerBase64 = await fileToBase64(formData.cerFile);
      const keyBase64 = await fileToBase64(formData.keyFile);

      // Enviamos la petición a tu API
      await billingApi.subirCsd({
        rfc: formData.rfc,
        razonSocial: formData.razonSocial,
        regimen: formData.regimen,
        cp: formData.cp,
        email: formData.email,
        password: formData.password,
        cerBase64,
        keyBase64,
        logoBase64: formData.logoBase64 
      });

      // Si es exitoso, llamamos la función del padre para recargar la lista y cerrar
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (error) {
      console.error("Error al subir CSD:", error);
      alert("Error: " + (error.response?.data?.message || "Revisa tus contraseñas y archivos."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-300 mb-8">
      <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[#00B4D8]" size={28} />
          <div>
            <h2 className="text-xl font-bold text-[#1C2B1E]">Configurar Nuevo Emisor</h2>
            <p className="text-sm text-gray-500">Ingresa los datos fiscales y los sellos (CSD) de la empresa a facturar.</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-700 transition-colors">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLUMNA 1: Archivos (Logo, Cer, Key) */}
          <div className="space-y-4 lg:col-span-1">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition relative">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-24 object-contain mb-2" />
              ) : (
                <ImageIcon size={40} className="text-gray-300 mb-2" />
              )}
              <label className="cursor-pointer text-[#00B4D8] font-bold text-sm text-center">
                {logoPreview ? 'Cambiar Logo' : 'Subir Logo (Para PDF)'}
                <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleLogoChange} />
              </label>
              <p className="text-[10px] text-gray-400 mt-1">Opcional. Formatos: PNG, JPG.</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Upload size={16} className="text-[#00B4D8]"/> Archivo .CER *
              </label>
              <input required type="file" accept=".cer" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#00B4D8] hover:file:bg-blue-100 cursor-pointer" onChange={e => setFormData({...formData, cerFile: e.target.files[0]})} />
            </div>

            <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileKey size={16} className="text-amber-500"/> Archivo .KEY *
              </label>
              <input required type="file" accept=".key" className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-600 hover:file:bg-amber-100 cursor-pointer" onChange={e => setFormData({...formData, keyFile: e.target.files[0]})} />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de la Llave Privada *</label>
              <input required type="password" placeholder="Contraseña del .KEY" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
          </div>

          {/* COLUMNA 2 y 3: Datos Fiscales */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">RFC del Emisor *</label>
                <input required maxLength={13} placeholder="Ej. ABC123456T1" className="w-full p-2.5 border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formData.rfc} onChange={e => setFormData({...formData, rfc: e.target.value.toUpperCase()})} />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Código Postal (Expedición) *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input required maxLength={5} placeholder="Ej. 21399" className="w-full p-2.5 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formData.cp} onChange={e => setFormData({...formData, cp: e.target.value})} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre o Razón Social *</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-3 text-gray-400" />
                <input required placeholder="Ej. CORPORATIVO ADUANERO ARTEMIS" className="w-full p-2.5 pl-9 border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formData.razonSocial} onChange={e => setFormData({...formData, razonSocial: e.target.value.toUpperCase()})} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Régimen Fiscal *</label>
              <select required className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formData.regimen} onChange={e => setFormData({...formData, regimen: e.target.value})}>
                <option value="" disabled>Seleccione un régimen...</option>
                {CATALOGO_REGIMEN_FISCAL.map((opcion) => {
                  const clave = opcion.substring(0, 3);
                  return <option key={clave} value={clave}>{opcion}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico (Notificaciones)</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                <input type="email" placeholder="contacto@empresa.com" className="w-full p-2.5 pl-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
              <button type="button" onClick={onCancel} className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-all">
                Cancelar
              </button>
              <button disabled={loading} type="submit" className="bg-[#1C2B1E] text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                {loading ? 'Subiendo archivos al SAT...' : <><Save size={18} /> Guardar Emisor y CSD</>}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}