import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Bell, Plus, Trash2, Calendar, FileText, User, AlertCircle, Search, Clock } from 'lucide-react';

const Documentos = () => {
  const [recordatorios, setRecordatorios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    clientId: '',
    documentType: '',
    rfc: '',
    expirationDate: ''
  });

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Cargamos los recordatorios de forma independiente
      try {
        const resReminders = await axios.get('http://localhost:3500/api/reminders', { headers });
        const recordatoriosData = resReminders.data?.data || resReminders.data || [];
        setRecordatorios(Array.isArray(recordatoriosData) ? recordatoriosData : []);
      } catch (err) {
        console.error('Error cargando recordatorios:', err);
        setRecordatorios([]);
      }

      // 2. Cargamos los clientes de forma independiente
      try {
        const resClients = await axios.get('http://localhost:3500/api/clients?limit=1000', { headers });
        const clientesData = resClients.data?.data || resClients.data || [];
        setClientes(Array.isArray(clientesData) ? clientesData : []);
      } catch (err) {
        console.error('Error cargando clientes:', err);
        setClientes([]);
      }

    } catch (error) {
      console.error('Error general cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3500/api/reminders', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsModalOpen(false);
      setFormData({ clientId: '', documentType: '', rfc: '', expirationDate: '' });
      cargarDatos();
    } catch (error) {
      alert('Error al guardar: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcesando(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este recordatorio?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3500/api/reminders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarDatos();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const recordatoriosFiltrados = recordatorios.filter(rec => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nombreCliente = `${rec.client?.firstName || ''} ${rec.client?.lastName1 || ''}`.toLowerCase();
    const rfc = (rec.rfc || '').toLowerCase();
    return nombreCliente.includes(term) || rfc.includes(term);
  });

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="text-blue-600" size={28} />
            Recordatorios de Documentos
          </h1>
          <p className="text-slate-500 mt-1">El bot de Telegram te avisará 7 días antes de que venzan.</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-200 font-medium"
        >
          <Plus size={20} />
          Nuevo Recordatorio
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o RFC..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm">
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Documento</th>
                <th className="p-4 font-medium">Vencimiento</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Cargando recordatorios...
                    </div>
                  </td>
                </tr>
              ) : recordatoriosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 flex flex-col items-center">
                    <FileText size={48} className="text-slate-200 mb-3" />
                    No hay recordatorios registrados.
                  </td>
                </tr>
              ) : (
                recordatoriosFiltrados.map((recordatorio) => (
                  <tr key={recordatorio.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {recordatorio.client?.firstName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">
                            {recordatorio.client?.firstName} {recordatorio.client?.lastName1}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <User size={12} /> {recordatorio.rfc}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      {recordatorio.documentType}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={16} className="text-slate-400" />
                        {new Date(recordatorio.expirationDate).toLocaleDateString('es-MX', {
                          timeZone: 'UTC',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="p-4">
                      {recordatorio.notified7Days ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          Notificado
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDelete(recordatorio.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar recordatorio"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Recordatorio */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="text-blue-600" size={20} />
                Nuevo Recordatorio
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Cliente Asociado</label>
                <select 
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.clientId}
                  onChange={e => {
                    const selectedClient = clientes.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData, 
                      clientId: e.target.value,
                      rfc: selectedClient ? selectedClient.rfc : '' 
                    });
                  }}
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName1} - {c.rfc || 'Sin RFC'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Tipo de Documento</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ej: Firma Electrónica, CSD, Contrato..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.documentType}
                  onChange={e => setFormData({...formData, documentType: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">RFC del Documento</label>
                <input 
                  required
                  type="text" 
                  placeholder="XAXX010101000"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm uppercase"
                  value={formData.rfc}
                  onChange={e => setFormData({...formData, rfc: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Fecha de Vencimiento</label>
                <input 
                  required
                  type="date" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.expirationDate}
                  onChange={e => setFormData({...formData, expirationDate: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={procesando}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-200 transition-colors disabled:opacity-50 text-sm"
                >
                  {procesando ? 'Guardando...' : 'Activar Recordatorio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Documentos;