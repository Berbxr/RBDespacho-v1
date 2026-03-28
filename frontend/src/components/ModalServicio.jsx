import { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const ModalServicio = ({ isOpen, onClose, onSave, servicioEditando }) => {
  const [formData, setFormData] = useState({ name: '' });
  const [loading, setLoading] = useState(false);

  // Efecto para cargar el nombre si estamos editando
  useEffect(() => {
    if (servicioEditando) {
      setFormData({ name: servicioEditando.name || '' });
    } else {
      setFormData({ name: '' });
    }
  }, [servicioEditando, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let response;

      if (servicioEditando) {
        // MODO EDICIÓN (PUT)
        response = await axios.put(`http://localhost:3500/api/services/${servicioEditando.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // MODO CREACIÓN (POST)
        response = await axios.post('http://localhost:3500/api/services', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      onSave(response.data.data || response.data);
      onClose();
    } catch (error) {
      console.error('Error detallado:', error.response?.data);
      // Mostramos el mensaje exacto de tu backend (ej. "El servicio ya existe")
      alert(error.response?.data?.message || 'Error al guardar el servicio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {servicioEditando ? 'Editar Servicio' : 'Nuevo Servicio'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Servicio</label>
            <input 
              type="text" 
              required 
              placeholder="Ej. Declaración Anual"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.name} 
              onChange={(e) => setFormData({ name: e.target.value })} 
            />
          </div>
          
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
              {loading ? 'Guardando...' : (servicioEditando ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalServicio;