import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { CATALOGO_REGIMEN_FISCAL, CATALOGO_USO_CFDI } from '../utils/catalogos'; 

const ModalReceptor = ({ isOpen, onClose, onSave }) => {
  const [formReceptor, setFormReceptor] = useState({ rfc: '', razonSocial: '', cp: '', regimenFiscal: '', usoCfdiDefault: '', email: '' });
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    await onSave(formReceptor);
    setCargando(false);
    setFormReceptor({ rfc: '', razonSocial: '', cp: '', regimenFiscal: '', usoCfdiDefault: '', email: '' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-slate-200">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="text-[#00B4D8]" size={20}/> Nuevo Receptor (Cliente)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">RFC</label>
            <input required className="w-full border border-slate-300 rounded p-2 text-sm uppercase focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formReceptor.rfc} onChange={e => setFormReceptor({...formReceptor, rfc: e.target.value.toUpperCase()})} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Razón Social</label>
            <input required className="w-full border border-slate-300 rounded p-2 text-sm uppercase focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formReceptor.razonSocial} onChange={e => setFormReceptor({...formReceptor, razonSocial: e.target.value.toUpperCase()})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">C.P. (Código Postal)</label>
              <input required maxLength="5" className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formReceptor.cp} onChange={e => setFormReceptor({...formReceptor, cp: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Uso de CFDI (Default)</label>
              <select required className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#00B4D8] outline-none bg-white" value={formReceptor.usoCfdiDefault} onChange={e => setFormReceptor({...formReceptor, usoCfdiDefault: e.target.value})}>
                <option value="">Seleccione...</option>
                {CATALOGO_USO_CFDI.map((uso, i) => <option key={i} value={uso}>{uso}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Régimen Fiscal</label>
            <select required className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#00B4D8] outline-none bg-white" value={formReceptor.regimenFiscal} onChange={e => setFormReceptor({...formReceptor, regimenFiscal: e.target.value})}>
              <option value="">Seleccione...</option>
              {CATALOGO_REGIMEN_FISCAL.map((reg, i) => <option key={i} value={reg}>{reg}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico (Para envío de Facturas)</label>
            <input type="email" className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-[#00B4D8] outline-none" value={formReceptor.email} onChange={e => setFormReceptor({...formReceptor, email: e.target.value})} placeholder="ejemplo@empresa.com" />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 mt-4 gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded text-sm font-semibold transition" disabled={cargando}>Cancelar</button>
            <button type="submit" className="px-5 py-2 bg-[#00B4D8] hover:bg-[#0096C7] text-white rounded text-sm font-semibold transition" disabled={cargando}>{cargando ? 'Guardando...' : 'Guardar Receptor'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalReceptor;