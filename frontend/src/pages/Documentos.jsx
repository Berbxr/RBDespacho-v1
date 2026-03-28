import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout'; // Ajusta la ruta si es necesario
// NUEVO: Importamos el icono Search
import { Bell, Plus, Trash2, Calendar, FileText, User, AlertCircle, Search } from 'lucide-react';

const Documentos = () => {
  const [recordatorios, setRecordatorios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [procesando, setProcesando] = useState(false);
  
  // NUEVO: Estado para el buscador
  const [searchTerm, setSearchTerm] = useState('');

  // Estado del formulario
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

      // Traemos recordatorios y clientes en paralelo
      const [resReminders, resClients] = await Promise.all([
        axios.get('http://localhost:3500/api/reminders', { headers }),
        axios.get('http://localhost:3500/api/clients?limit=1000', { headers })
      ]);

      setRecordatorios(resReminders.data.data);
      setClientes(resClients.data.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    const clienteSeleccionado = clientes.find(c => c.id === clientId);
    setFormData({
      ...formData,
      clientId,
      rfc: clienteSeleccionado ? clienteSeleccionado.rfc : ''
    });
  };

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
      alert(error.response?.data?.message || 'Error al crear el recordatorio');
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este recordatorio?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3500/api/reminders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      cargarDatos();
    } catch (error) {
      alert('Error al eliminar el recordatorio');
    }
  };

  // NUEVO: Lógica para filtrar los recordatorios en tiempo real
  const filteredRecordatorios = recordatorios.filter(rem => {
    const term = searchTerm.toLowerCase();
    const fullName = `${rem.client.firstName} ${rem.client.lastName1} ${rem.client.lastName2 || ''}`.toLowerCase();
    const rfc = rem.rfc.toLowerCase();
    const docType = rem.documentType.toLowerCase();

    // Retorna true si el término buscado está en el nombre, RFC o tipo de documento
    return fullName.includes(term) || rfc.includes(term) || docType.includes(term);
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Bell className="text-blue-600" size={28} />
              Centro de Alertas
            </h1>
            <p className="text-slate-500 text-sm mt-1">Configura recordatorios automáticos de documentos (FIEL, Sellos, etc.)</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 flex items-center gap-2 transition-all shrink-0"
          >
            <Plus size={18} />
            Nuevo Recordatorio
          </button>
        </div>

        {/* NUEVO: Barra de Búsqueda */}
        <div className="mb-6 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center max-w-md">
          <Search className="text-slate-400 ml-2" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, RFC o documento..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-1.5 outline-none text-sm text-slate-700 bg-transparent"
          />
        </div>

        {/* Tabla de Recordatorios */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Cargando alertas...</div>
          ) : recordatorios.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Bell size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No hay recordatorios configurados.</p>
              <p className="text-slate-400 text-sm mt-1">Las alertas se enviarán a Telegram 7 días antes de vencer.</p>
            </div>
          ) : filteredRecordatorios.length === 0 ? (
            // Mensaje por si la búsqueda no arroja resultados
            <div className="p-12 text-center text-slate-500 font-medium">
              No se encontraron coincidencias para "{searchTerm}".
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
                    <th className="p-4">Cliente</th>
                    <th className="p-4">Documento</th>
                    <th className="p-4">RFC</th>
                    <th className="p-4">Fecha de Vencimiento</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {/* REEMPLAZAMOS recordatorios.map POR filteredRecordatorios.map */}
                  {filteredRecordatorios.map((rem) => {
                    const fechaVencimiento = new Date(rem.expirationDate);
                    const hoy = new Date();
                    const diasFaltantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={rem.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-700">
                          {rem.client.firstName} {rem.client.lastName1}
                        </td>
                        <td className="p-4 flex items-center gap-2 text-slate-600">
                          <FileText size={16} className="text-slate-400" />
                          {rem.documentType}
                        </td>
                        <td className="p-4 text-slate-600 font-mono text-xs">{rem.rfc}</td>
                        <td className="p-4 text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-slate-400" />
                            {fechaVencimiento.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {rem.notified7Days ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Notificado</span>
                          ) : diasFaltantes < 0 ? (
                             <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Vencido</span>
                          ) : (
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Pendiente</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => handleEliminar(rem.id)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-2"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Nuevo Recordatorio */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Programar Alerta</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Cliente</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      required
                      value={formData.clientId}
                      onChange={handleClientChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                      <option value="">Selecciona un cliente...</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.firstName} {c.lastName1} {c.lastName2 || ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">RFC</label>
                  <input 
                    type="text"
                    required
                    readOnly
                    value={formData.rfc}
                    placeholder="Se autocompleta"
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Tipo de Documento</label>
                  <input 
                    type="text"
                    required
                    value={formData.documentType}
                    onChange={e => setFormData({...formData, documentType: e.target.value})}
                    placeholder="Ej. FIEL, Sello Digital, Contrato..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Fecha de Vencimiento</label>
                  <input 
                    type="date"
                    required
                    value={formData.expirationDate}
                    onChange={e => setFormData({...formData, expirationDate: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <AlertCircle size={14} /> El bot te avisará 7 días antes de esta fecha.
                  </p>
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
                    {procesando ? 'Guardando...' : 'Guardar Recordatorio'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Documentos;