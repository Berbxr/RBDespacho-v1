import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import ModalServicio from '../components/ModalServicio';
// Añadimos iconos para búsqueda y cambio de estado
import { Briefcase, Edit2, Trash2, Plus, Search, Power, PowerOff } from 'lucide-react';

const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para el buscador
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [servicioAEditar, setServicioAEditar] = useState(null);

  const fetchServicios = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Pasamos ?all=true para que el backend nos devuelva tanto activos como inactivos
      const response = await axios.get('http://localhost:3500/api/services?all=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const datos = response.data?.data || response.data;
      setServicios(Array.isArray(datos) ? datos : []);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicios();
  }, []);

  const handleSaveSuccess = () => {
    fetchServicios();
    setIsModalOpen(false);
    setServicioAEditar(null);
  };

  const abrirModalNuevo = () => {
    setServicioAEditar(null);
    setIsModalOpen(true);
  };

  const abrirModalEdicion = (servicio) => {
    setServicioAEditar(servicio);
    setIsModalOpen(true);
  };

  // FUNCIÓN: Inhabilitar / Reactivar (Borrado Lógico)
  const handleToggleStatus = async (servicio) => {
    const accion = servicio.isActive ? 'inhabilitar' : 'reactivar';
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} este servicio?`)) return;

    try {
      const token = localStorage.getItem('token');
      
      if (servicio.isActive) {
        // Para inhabilitar, usamos DELETE (Soft Delete en el backend)
        await axios.delete(`http://localhost:3500/api/services/${servicio.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Para reactivar, usamos PUT
        await axios.put(`http://localhost:3500/api/services/${servicio.id}`, 
          { isActive: true }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      fetchServicios();
    } catch (error) {
      alert(error.response?.data?.message || `Error al intentar ${accion} el servicio`);
    }
  };

  const handleDelete = async (id) => {
    alert("Para mantener la integridad de las facturas y cobros históricos, usa el botón de 'Inhabilitar' en lugar de borrar el servicio de la base de datos.");
  };

  // Filtrado local (como son pocos servicios, es muy rápido en el frontend)
  const serviciosFiltrados = servicios.filter(servicio => 
    servicio.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      {/* Encabezado con buscador adaptativo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Servicios</h1>
          <p className="text-slate-500 text-sm">Gestiona los servicios base que ofreces en el despacho</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* BARRA DE BÚSQUEDA */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar servicio..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-700 bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button 
            onClick={abrirModalNuevo}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={18} />
            Nuevo Servicio
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nombre del Servicio</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="2" className="px-6 py-8 text-center text-slate-400">Cargando servicios...</td></tr>
            ) : serviciosFiltrados.length === 0 ? (
              <tr><td colSpan="2" className="px-6 py-8 text-center text-slate-400">No se encontraron servicios.</td></tr>
            ) : (
              serviciosFiltrados.map((servicio) => (
                <tr 
                  key={servicio.id} 
                  className={`transition-colors ${!servicio.isActive ? 'bg-slate-50/50 opacity-70' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${servicio.isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Briefcase size={18} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-medium ${!servicio.isActive ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {servicio.name}
                        </span>
                        {!servicio.isActive && (
                          <span className="text-[10px] text-red-500 font-bold uppercase mt-0.5">Inactivo</span>
                        )}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    {/* Botón Editar */}
                    <button 
                      onClick={() => abrirModalEdicion(servicio)} 
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar servicio"
                    >
                      <Edit2 size={18} />
                    </button>

                    {/* Botón Inhabilitar / Reactivar */}
                    <button 
                      onClick={() => handleToggleStatus(servicio)} 
                      className={`p-2 rounded-lg transition-colors ${
                        servicio.isActive 
                          ? 'text-orange-500 hover:bg-orange-50' 
                          : 'text-green-500 hover:bg-green-50'
                      }`}
                      title={servicio.isActive ? 'Inhabilitar servicio' : 'Reactivar servicio'}
                    >
                      {servicio.isActive ? <PowerOff size={18} /> : <Power size={18} />}
                    </button>

                    {/* Botón Eliminar Físico (Deshabilitado intencionalmente) */}
                    <button 
                      onClick={() => handleDelete(servicio.id)} 
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar permanentemente"
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

      <ModalServicio 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setServicioAEditar(null);
        }} 
        onSave={handleSaveSuccess}
        servicioEditando={servicioAEditar}
      />
    </Layout>
  );
};

export default Servicios;