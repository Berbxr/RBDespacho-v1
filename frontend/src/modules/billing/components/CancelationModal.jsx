import React, { useState } from 'react';
import { AlertTriangle, Send, X } from 'lucide-react';

export default function CancelationModal({ factura, onConfirm, onClose }) {
  const [motivo, setMotivo] = useState('02');
  const [sustituto, setSustituto] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle size={20} /> Cancelar Folio: {factura.folio}
          </h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Motivo de Cancelación</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full p-3 border rounded-xl mt-1">
              <option value="01">01 - Comprobante emitido con errores con relación</option>
              <option value="02">02 - Comprobante emitido con errores sin relación</option>
              <option value="03">03 - No se llevó a cabo la operación</option>
            </select>
          </div>
          {motivo === '01' && (
            <input placeholder="UUID que sustituye a esta factura" className="w-full p-3 border border-blue-200 rounded-xl bg-blue-50 text-sm" value={sustituto} onChange={(e) => setSustituto(e.target.value)} />
          )}
          <button onClick={() => onConfirm(motivo, sustituto)} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
            Confirmar Cancelación ante el SAT
          </button>
        </div>
      </div>
    </div>
  );
}