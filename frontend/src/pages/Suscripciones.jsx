import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { CalendarClock, FastForward, CheckCircle2, Search } from 'lucide-react'; // Agregamos Search

const Suscripciones = () => {
  const [clientesSuscritos, setClientesSuscritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); // Estado para el buscador
  
  // Estados para el Modal de Adelantar Pago
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subSeleccionada, setSubSeleccionada] = useState(null);
  const [mesesAAdelantar, setMesesAAdelantar] = useState(1);
  const [procesando, setProcesando] = useState(false);

  const fetchSuscripciones = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3500/api/finances/subscriptions/clients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientesSuscritos(response.data.data || []);
    } catch (error) {
      console.error('Error al cargar suscripciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuscripciones();
  }, []);

  const abrirModalAdelanto = (suscripcion, clienteNombre) => {
    setSubSeleccionada({ ...suscripcion, clienteNombre });
    setMesesAAdelantar(1);
    setIsModalOpen(true);
  };

  const handleAdelantarPago = async () => {
    if (!subSeleccionada) return;
    setProcesando(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3500/api/finances/subscriptions/${subSeleccionada.recurrenceId}/advance`,
        { periodsToAdvance: parseInt(mesesAAdelantar) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('¡Pagos adelantados registrados con éxito!');
      setIsModalOpen(false);
      fetchSuscripciones(); // Recargamos para actualizar las fechas de los fantasmas
    } catch (error) {
      console.error('Error al adelantar pago:', error);
      alert('Hubo un error al procesar el adelanto.');
    } finally {
      setProcesando(false);
    }
  };

  // Formateador de fechas
  const formatearFecha = (fechaString) => {
    if (!fechaString) return '';
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fechaString).toLocaleDateString('es-MX', opciones);
  };

  // Lógica de Filtrado
  const clientesFiltrados = clientesSuscritos.filter((grupo) => {
    const nombreCliente = grupo.client.name.toLowerCase();
    const rfcCliente = (grupo.client.rfc || '').toLowerCase();
    const termino = searchTerm.toLowerCase();
    
    return nombreCliente.includes(termino) || rfcCliente.includes(termino);
  });

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recurrencias</h1>
          <p className="text-slate-500 text-sm">Gestiona los cobros recurrentes por cliente y registra anticipos</p>
        </div>
        
        {/* BUSCADOR */}
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por cliente o RFC..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-700 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Cargando pagos recurrentes...</div>
      ) : clientesSuscritos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center text-slate-500">
          No hay clientes con cobros recurrentes activos en este momento.
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center text-slate-500">
          No se encontraron clientes que coincidan con "{searchTerm}".
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {clientesFiltrados.map((grupo) => (
            <div key={grupo.client.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Encabezado del Cliente */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{grupo.client.name}</h2>
                  <p className="text-xs text-slate-500 uppercase">RFC: {grupo.client.rfc || 'N/A'}</p>
                </div>
                <div className="text-sm font-medium text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
                  {grupo.subscriptions.length} recurrente(s)
                </div>
              </div>

              {/* Lista de Suscripciones del Cliente */}
              <div className="divide-y divide-slate-100">
                {grupo.subscriptions.map((sub) => (
                  <div key={sub.recurrenceId} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-colors">
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${sub.frequency === 'MONTHLY' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {sub.frequency === 'MONTHLY' ? 'MENSUAL' : 'ANUAL'}
                        </span>
                        <h3 className="font-semibold text-slate-800">{sub.description}</h3>
                      </div>
                      <p className="text-slate-600 text-sm">Servicio: {sub.serviceName}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <CalendarClock size={16} className="text-orange-500" />
                        <span className="text-slate-500">Próximo cobro proyectado:</span>
                        <span className="font-medium text-slate-700">{formatearFecha(sub.nextGenerationDate)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                      <div className="text-xl font-bold text-slate-800">
                        ${Number(sub.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                      <button 
                        onClick={() => abrirModalAdelanto(sub, grupo.client.name)}
                        className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full md:w-auto justify-center"
                      >
                        <FastForward size={16} />
                        Adelantar Pago
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PARA ADELANTAR PAGOS (Integrado) */}
      {isModalOpen && subSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Adelantar Pagos</h3>
            <p className="text-slate-500 text-sm mb-6">
              Registra pagos por anticipado para <span className="font-semibold">{subSeleccionada.clienteNombre}</span> en el concepto de "{subSeleccionada.description}".
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">¿Cuántos periodos pagará por adelantado?</label>
              <input 
                type="number" 
                min="1" 
                max="24"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={mesesAAdelantar}
                onChange={(e) => setMesesAAdelantar(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-2">
                Esto generará {mesesAAdelantar} cobro(s) con estado "Pagado" y empujará la fecha del próximo cobro hacia adelante.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg mb-6 flex justify-between items-center border border-slate-200">
              <span className="text-sm font-medium text-slate-600">Total recibido:</span>
              <span className="text-lg font-bold text-emerald-600">
                ${(Number(subSeleccionada.amount) * mesesAAdelantar).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={procesando}
              >
                Cancelar
              </button>
              <button 
                onClick={handleAdelantarPago}
                disabled={procesando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={18} />
                {procesando ? 'Procesando...' : 'Confirmar Anticipo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Suscripciones;