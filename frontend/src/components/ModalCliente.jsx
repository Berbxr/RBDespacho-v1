import { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const ModalCliente = ({ isOpen, onClose, onSave, clienteEditando }) => {
  const [formData, setFormData] = useState({
    firstName: '', lastName1: '', lastName2: '', rfc: '', email: '', phone: ''
  });
  const [loading, setLoading] = useState(false);

  // Efecto para cargar los datos si estamos editando
  useEffect(() => {
    if (clienteEditando) {
      setFormData({
        firstName: clienteEditando.firstName || '',
        lastName1: clienteEditando.lastName1 || '',
        lastName2: clienteEditando.lastName2 || '',
        rfc: clienteEditando.rfc || '',
        email: clienteEditando.email || '',
        phone: clienteEditando.phone || ''
      });
    } else {
      // Limpiamos si es un nuevo cliente
      setFormData({ firstName: '', lastName1: '', lastName2: '', rfc: '', email: '', phone: '' });
    }
  }, [clienteEditando, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let response;

      if (clienteEditando) {
        // MODO EDICIÓN (PUT)
        response = await axios.put(`http://localhost:3500/api/clients/${clienteEditando.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // MODO CREACIÓN (POST)
        response = await axios.post('http://localhost:3500/api/clients', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      onSave(response.data.data || response.data);
      onClose();
    } catch (error) {
      console.error('Error detallado:', error.response?.data);
      alert(error.response?.data?.message || 'Error al guardar el cliente. Revisa los datos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {clienteEditando ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre(s)</label>
            <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">1er Apellido</label>
              <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.lastName1} onChange={(e) => setFormData({...formData, lastName1: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">2do Apellido</label>
              <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.lastName2} onChange={(e) => setFormData({...formData, lastName2: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">RFC (Obligatorio)</label>
            <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              value={formData.rfc} onChange={(e) => setFormData({...formData, rfc: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email (Opcional)</label>
            <input type="email" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (Opcional)</label>
            <input type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : (clienteEditando ? 'Actualizar' : 'Guardar Cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCliente;