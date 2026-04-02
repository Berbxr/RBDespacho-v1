import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import ModalCliente from '../components/ModalCliente';
import ModalHistorial from '../components/ModalHistorial';
import { UserPlus, Edit2, Trash2, History, UserX, UserCheck, Search } from 'lucide-react';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); 
  
  // Estados para Modal de Edición/Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clienteAEditar, setClienteAEditar] = useState(null);

  // Estados para Modal de Historial
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Utilizamos useCallback para poder llamar a fetchClientes desde useEffect sin problemas de dependencias
  const fetchClientes = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Enviamos el término de búsqueda al backend
      const url = `http://localhost:3500/api/clients${searchQuery ? `?search=${searchQuery}` : ''}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Adaptado a la nueva estructura del backend: { success: true, data: { clients: [...], total: X } }
      const fetchedClients = response.data?.data?.clients || [];
      setClientes(Array.isArray(fetchedClients) ? fetchedClients : []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      // Opcional: Mostrar un toast de error
    } finally {
      setLoading(false);
    }
  }, []);

  // Efecto inicial y cuando cambia el término de búsqueda (con un ligero "debounce" manual)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchClientes(searchTerm);
    }, 300); // Espera 300ms después de que el usuario deja de escribir para hacer la petición

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchClientes]);

  const handleSaveSuccess = () => {
    fetchClientes(searchTerm); // Recargar manteniendo la búsqueda actual
    setIsModalOpen(false);
    setClienteAEditar(null);
  };

  const abrirModalNuevo = () => {
    setClienteAEditar(null);
    setIsModalOpen(true);
  };

  const abrirModalEdicion = (cliente) => {
    setClienteAEditar(cliente);
    setIsModalOpen(true);
  };

  const abrirModalHistorial = (cliente) => {
    setClienteSeleccionado(cliente);
    setIsHistoryModalOpen(true);
  };

  // FUNCIÓN: Dar de baja / Activar (Borrado Lógico)
  const handleToggleStatus = async (cliente) => {
    const accion = cliente.isActive ? 'dar de baja' : 'reactivar';
    if (!window.confirm(`¿Estás seguro de que deseas ${accion} a este cliente?`)) return;

    try {
      const token = localStorage.getItem('token');
      
      if (cliente.isActive) {
        // Para "dar de baja" (soft delete), usamos el método DELETE del nuevo backend
        await axios.delete(`http://localhost:3500/api/clients/${cliente.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Para "reactivar", usamos PUT para actualizar el estado isActive a true
        await axios.put(`http://localhost:3500/api/clients/${cliente.id}`, 
          { isActive: true }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      fetchClientes(searchTerm); // Recargar la lista
    } catch (error) {
      alert(error.response?.data?.message || `Error al intentar ${accion} al cliente`);
    }
  };

  // FUNCIÓN: Eliminar (Borrado Físico - Opcional, depende de si tu BD lo permite)
  // Nota: En tu Prisma schema, borrar un cliente fallará si tiene transacciones por la integridad referencial
  const handleDelete = async (id) => {
    alert("Por seguridad financiera e integridad de datos (CFDI, Transacciones), la eliminación física está deshabilitada. Por favor, usa la opción de 'Dar de baja' (Inactivar).");
    /*
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente este cliente? Esta acción no se puede deshacer y borrará TODO su historial.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3500/api/clients/${id}/force`, { // Necesitarías crear este endpoint
          headers: { Authorization: `Bearer ${token}` }
        });
        setClientes(clientes.filter(cliente => cliente.id !== id));
      } catch (error) {
        console.error('Error al eliminar:', error);
        alert(error.response?.data?.message || 'Error al eliminar el cliente.');
      }
    }
    */
  };

  return (
    <Layout>
      {/* Encabezado con buscador adaptativo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm">Gestiona la base de datos de tu despacho</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* BARRA DE BÚSQUEDA */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o RFC..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-700 bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* BOTÓN NUEVO CLIENTE */}
          <button 
            onClick={abrirModalNuevo}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm whitespace-nowrap"
          >
            <UserPlus size={18} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nombre / Razón Social</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">RFC</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Teléfono</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Email</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400">Cargando clientes...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400">
                  {searchTerm ? `No se encontraron resultados para "${searchTerm}".` : "No hay clientes registrados en el sistema."}
                </td></tr>
              ) : (
                clientes.map((cliente) => (
                  <tr 
                    key={cliente.id} 
                    className={`transition-colors ${!cliente.isActive ? 'bg-slate-50/50 opacity-70' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`font-medium ${!cliente.isActive ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {`${cliente.firstName} ${cliente.lastName1} ${cliente.lastName2 || ''}`}
                        </span>
                        {!cliente.isActive && (
                          <span className="text-[10px] text-red-500 font-bold uppercase mt-0.5">Inactivo - Sin cobros permitidos</span>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm uppercase ${!cliente.isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                      {cliente.rfc || 'N/A'}
                    </td>
                    <td className={`px-6 py-4 text-sm ${!cliente.isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                      {cliente.phone || 'N/A'}
                    </td>
                    <td className={`px-6 py-4 text-sm ${!cliente.isActive ? 'text-slate-400' : 'text-slate-600'}`}>
                      {cliente.email || 'N/A'}
                    </td>
                    
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {/* Botón Historial */}
                      <button 
                        onClick={() => abrirModalHistorial(cliente)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Historial de cobros y recurrencia"
                      >
                        <History size={18} />
                      </button>

                      {/* Botón Editar */}
                      <button 
                        onClick={() => abrirModalEdicion(cliente)} 
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar datos"
                      >
                        <Edit2 size={18} />
                      </button>

                      {/* Botón Baja/Alta */}
                      <button 
                        onClick={() => handleToggleStatus(cliente)} 
                        className={`p-2 rounded-lg transition-colors ${
                          cliente.isActive 
                            ? 'text-orange-500 hover:bg-orange-50' 
                            : 'text-green-500 hover:bg-green-50'
                        }`}
                        title={cliente.isActive ? 'Dar de baja (Inactivar)' : 'Reactivar cliente'}
                      >
                        {cliente.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>

                      {/* Botón Eliminar Físico */}
                      <button 
                        onClick={() => handleDelete(cliente.id)} 
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
      </div>

      {/* Modal de Registro/Edición */}
      <ModalCliente 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setClienteAEditar(null);
        }} 
        onSave={handleSaveSuccess}
        clienteEditando={clienteAEditar}
      />

      {/* Modal de Historial y Recurrencia */}
      <ModalHistorial 
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setClienteSeleccionado(null);
        }}
        cliente={clienteSeleccionado}
      />
    </Layout>
  );
};

export default Clientes;