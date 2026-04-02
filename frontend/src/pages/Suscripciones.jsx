import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { CalendarClock, FastForward, CheckCircle2, Search, AlertCircle } from 'lucide-react';

// 👇 1. IMPORTAMOS EL GENERADOR DE PDF
import { generarReciboPDF } from '../utils/pdfGenerator'; 

const Suscripciones = () => {
  const [clientesSuscritos, setClientesSuscritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
      setClientesSuscritos(Array.isArray(response.data.data) ? response.data.data : []);
    } catch (error) {
      console.error('Error al cargar suscripciones:', error);
      setClientesSuscritos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuscripciones();
  }, []);

  const abrirModalAdelanto = (sub) => {
    setSubSeleccionada(sub);
    setMesesAAdelantar(1);
    setIsModalOpen(true);
  };

  // 👇 2. MODIFICAMOS LA FUNCIÓN PARA GENERAR LOS TICKETS AUTOMÁTICAMENTE
  const handleAdelantarPago = async () => {
    if (!subSeleccionada) return;
    setProcesando(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:3500/api/finances/subscriptions/${subSeleccionada.id}/advance`, 
        { periodsToAdvance: mesesAAdelantar },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // 🔍 CORRECCIÓN 1: Buscamos las transacciones de forma segura en cualquier nivel de la respuesta
      const transaccionesGeneradas = response.data?.data?.transactions || response.data?.transactions || [];
      
      console.log("Datos recibidos del servidor para el PDF:", transaccionesGeneradas);

      if (transaccionesGeneradas.length === 0) {
        alert("El pago se procesó en la base de datos, pero el servidor no devolvió los datos para generar el PDF.");
      }

      // CORRECCIÓN 2: Generamos los PDFs directamente sin setTimeout para que el navegador no los bloquee
      transaccionesGeneradas.forEach((tx) => {
        try {
          const txParaPDF = {
            ...tx,
            client: subSeleccionada.client, 
            service: { name: subSeleccionada.serviceName || 'Servicio Recurrente' },
            description: tx.description || 'Cobro Adelantado'
          };
          
          generarReciboPDF(txParaPDF);
        } catch (pdfError) {
          console.error("Error interno al crear el PDF:", pdfError);
        }
      });
      
      setIsModalOpen(false);
      fetchSuscripciones(); 
      
      // Mensaje de éxito
      alert(`¡Cobro exitoso! Se generaron ${mesesAAdelantar} recibo(s).`);

    } catch (error) {
      console.error('Error adelantando pagos:', error);
      alert('Hubo un error al procesar el adelanto.');
    } finally {
      setProcesando(false);
    }
  };

  const suscripcionesFiltradas = clientesSuscritos.filter((sub) => {
    if (!sub || !sub.client) return false;
    const nombreCompleto = `${sub.client.firstName || ''} ${sub.client.lastName1 || ''} ${sub.client.lastName2 || ''}`.toLowerCase();
    return nombreCompleto.includes(searchTerm.toLowerCase());
  });

  return (
    <Layout title="Suscripciones y Pagos Recurrentes">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nombre de cliente..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Servicio</th>
                <th className="px-6 py-4 font-medium">Frecuencia</th>
                <th className="px-6 py-4 font-medium">Monto</th>
                <th className="px-6 py-4 font-medium">Próximo Cobro</th>
                <th className="px-6 py-4 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500">Cargando suscripciones...</td>
                </tr>
              ) : suscripcionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500">No se encontraron suscripciones activas.</td>
                </tr>
              ) : (
                suscripcionesFiltradas.map((sub) => {
                  const nombreCliente = `${sub.client?.firstName || ''} ${sub.client?.lastName1 || ''}`.trim();
                  const nombreServicio = sub.serviceName || sub.service?.name || 'Servicio Recurrente';
                  const fechaProximoCobro = sub.nextGenerationDate || sub.nextBilling; 

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{nombreCliente || 'Sin Nombre'}</div>
                        {sub.client?.rfc && <div className="text-xs text-slate-500">{sub.client.rfc}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {nombreServicio}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          {sub.frequency === 'MONTHLY' ? 'Mensual' : 'Anual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        ${Number(sub.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <CalendarClock size={16} className="text-amber-500"/>
                          <span>
                            {fechaProximoCobro 
                              ? new Date(fechaProximoCobro).toLocaleDateString('es-MX', { timeZone: 'UTC' }) 
                              : 'No definida'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => abrirModalAdelanto(sub)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors"
                          title="Adelantar Pagos"
                        >
                          <FastForward size={16} />
                          Adelantar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && subSeleccionada && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FastForward className="text-emerald-500" />
                Adelantar Pagos
              </h2>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-1">Cliente:</p>
                <p className="font-medium text-slate-800">
                  {`${subSeleccionada.client?.firstName || ''} ${subSeleccionada.client?.lastName1 || ''}`}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  RFC: {subSeleccionada.client?.rfc || 'No registrado'}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ¿Cuántos periodos deseas adelantar?
                </label>
                <input 
                  type="number" 
                  min="1" 
                  max="24"
                  value={mesesAAdelantar}
                  onChange={(e) => setMesesAAdelantar(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-medium"
                />
                <p className="text-xs text-slate-500 mt-2 flex items-start gap-1">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  Esto generará {mesesAAdelantar} recibo(s) en automático y se descargarán en formato PDF al confirmar.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg mb-6 flex justify-between items-center border border-slate-200">
                <span className="text-sm font-medium text-slate-600">Total a recibir hoy:</span>
                <span className="text-xl font-bold text-emerald-600">
                  ${(Number(subSeleccionada.amount || 0) * mesesAAdelantar).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                  {procesando ? 'Procesando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Suscripciones;