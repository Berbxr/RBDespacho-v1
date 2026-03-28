import { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const ModalTransaccion = ({ isOpen, onClose, onSave, transaccionEditando }) => {
  const [clientes, setClientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    type: 'INCOME',
    amount: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    frequency: 'ONCE',
    clientId: '',
    serviceId: ''
  });

  // Efecto principal: Cargar catálogos y rellenar formulario si es edición
  useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
      
      if (transaccionEditando) {
        // MODO EDICIÓN: Rellenar los campos
        setFormData({
          type: transaccionEditando.type,
          amount: transaccionEditando.amount,
          description: transaccionEditando.description || '',
          // Cortamos la fecha para que el input type="date" la entienda (YYYY-MM-DD)
          dueDate: new Date(transaccionEditando.dueDate).toISOString().split('T')[0],
          frequency: transaccionEditando.recurrenceId ? 'RECURRENT' : 'ONCE',
          clientId: transaccionEditando.clientId || '',
          serviceId: transaccionEditando.serviceId || ''
        });
      } else {
        // MODO CREACIÓN: Limpiar el formulario
        setFormData({
          type: 'INCOME', amount: '', description: '', 
          dueDate: new Date().toISOString().split('T')[0],
          frequency: 'ONCE', clientId: '', serviceId: ''
        });
      }
    }
  }, [isOpen, transaccionEditando]);

  const cargarCatalogos = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [resClientes, resServicios] = await Promise.all([
        axios.get('http://localhost:3500/api/clients', config),
        axios.get('http://localhost:3500/api/services', config)
      ]);
      
      setClientes(resClientes.data.data || []);
      setServicios(resServicios.data.data || []);
    } catch (error) {
      console.error('Error al cargar catálogos:', error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        clientId: formData.clientId === '' ? null : formData.clientId,
        serviceId: formData.serviceId === '' ? null : formData.serviceId,
      };

      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (transaccionEditando) {
        // MODO EDICIÓN (PUT)
        await axios.put(`http://localhost:3500/api/finances/${transaccionEditando.id}`, payload, config);
      } else {
        // MODO CREACIÓN (POST)
        await axios.post('http://localhost:3500/api/finances', payload, config);
      }
      
      onSave(); 
      onClose(); 
    } catch (error) {
      console.error('Error:', error.response?.data);
      alert(error.response?.data?.message || 'Error al guardar la transacción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {transaccionEditando ? 'Editar Transacción' : 'Nueva Transacción'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              disabled={!!transaccionEditando} // Bloqueamos cambio de tipo en edición
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${formData.type === 'INCOME' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'} ${transaccionEditando ? 'opacity-70 cursor-not-allowed' : 'hover:text-slate-700'}`}
              onClick={() => setFormData({...formData, type: 'INCOME'})}
            >
              Cobro / Ingreso
            </button>
            <button
              type="button"
              disabled={!!transaccionEditando} // Bloqueamos cambio de tipo en edición
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${formData.type === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'} ${transaccionEditando ? 'opacity-70 cursor-not-allowed' : 'hover:text-slate-700'}`}
              onClick={() => setFormData({...formData, type: 'EXPENSE', clientId: '', serviceId: ''})}
            >
              Gasto / Salida
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto ($)</label>
              <input 
                type="number" step="0.01" required 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.amount} 
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Límite</label>
              <input 
                type="date" required 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.dueDate} 
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción corta</label>
            <input 
              type="text" required
              placeholder={formData.type === 'INCOME' ? 'Ej. Mensualidad Marzo' : 'Ej. Pago de Luz'}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          {formData.type === 'INCOME' && (
            <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Cliente (Opcional)</label>
                <select 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700"
                  value={formData.clientId}
                  onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                >
                  <option value="">-- Seleccionar --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName1}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-1">Servicio (Opcional)</label>
                <select 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700"
                  value={formData.serviceId}
                  onChange={(e) => setFormData({...formData, serviceId: e.target.value})}
                >
                  <option value="">-- Seleccionar --</option>
                  {servicios.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cobro / Recurrencia</label>
            <select 
              disabled={!!transaccionEditando} // Bloqueamos cambio de recurrencia en edición
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${transaccionEditando ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white'}`}
              value={formData.frequency}
              onChange={(e) => setFormData({...formData, frequency: e.target.value})}
            >
              <option value="ONCE">Pago Único (Una sola vez)</option>
              <option value="MONTHLY">Recurrente: Mensual</option>
              <option value="ANNUAL">Recurrente: Anual</option>
              <option value="RECURRENT" disabled hidden>Pertenece a una Recurrencia</option>
            </select>
            {transaccionEditando && (
              <p className="text-[11px] text-slate-500 mt-1">
                * El tipo y la recurrencia no se pueden modificar en una transacción ya registrada.
              </p>
            )}
          </div>
          
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium text-slate-600">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 shadow-sm">
              {loading ? 'Guardando...' : (transaccionEditando ? 'Guardar Cambios' : 'Registrar Transacción')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalTransaccion;