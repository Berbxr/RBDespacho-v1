import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import ModalServicio from '../components/ModalServicio';
import { Briefcase, Edit2, Trash2, Plus } from 'lucide-react';

const Servicios = () => {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [servicioAEditar, setServicioAEditar] = useState(null);

  const fetchServicios = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3500/api/services', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const datos = response.data.data || response.data;
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
  };

  const abrirModalNuevo = () => {
    setServicioAEditar(null);
    setIsModalOpen(true);
  };

  const abrirModalEdicion = (servicio) => {
    setServicioAEditar(servicio);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas dar de baja este servicio?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3500/api/services/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setServicios(servicios.filter(servicio => servicio.id !== id));
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar el servicio.');
      }
    }
  };

return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Servicios</h1>
          <p className="text-slate-500 text-sm">Gestiona los servicios que ofreces en el despacho</p>
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Nuevo Servicio
        </button>
      </div>

      {/* Aquí quitamos el max-w-4xl para que la tabla abarque todo el ancho como en Clientes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nombre del Servicio</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 w-32 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="2" className="px-6 py-10 text-center text-slate-400">Cargando catálogo...</td></tr>
              ) : servicios.length === 0 ? (
                <tr><td colSpan="2" className="px-6 py-10 text-center text-slate-400">No hay servicios registrados.</td></tr>
              ) : (
                servicios.map((servicio) => (
                  <tr key={servicio.id} className="hover:bg-slate-50 transition-colors">
                    {/* Quitamos el icono del maletín y el flex para que se vea igual que el texto de Clientes */}
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {servicio.name}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                      <button 
                        onClick={() => abrirModalEdicion(servicio)} 
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title="Editar servicio"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(servicio.id)} 
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Eliminar servicio"
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