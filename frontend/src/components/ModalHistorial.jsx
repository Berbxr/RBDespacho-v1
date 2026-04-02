import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Receipt, Calendar, Ban, CheckCircle2, Clock, History, CalendarClock } from 'lucide-react';

const ModalHistorial = ({ isOpen, onClose, cliente }) => {
  const [tab, setTab] = useState('pagos');
  const [history, setHistory] = useState({ 
    transactions: [],       
    recurrenceHistory: [], 
    subscription: null      
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && cliente) fetchHistory();
  }, [isOpen, cliente]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Asegúrate de tener esta ruta registrada en tu router de Express
      const res = await axios.get(`http://localhost:3500/api/clients/${cliente.id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data.data);
    } catch (error) {
      console.error("Error al cargar historial", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelarRecurrencia = async () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); 

    const tieneAdeudo = history.recurrenceHistory.some(t => {
        if (t.status !== 'PAID') { 
            // Corregido: Prisma devuelve 'date'
            const fechaVencimiento = new Date(t.date || t.dueDate || t.paymentDate);
            fechaVencimiento.setHours(0, 0, 0, 0);
            return fechaVencimiento <= hoy; 
        }
        return false;
    });

    if (tieneAdeudo) {
        alert("⚠️ ATENCIÓN: Para cancelar las membresías, tenemos que tener pagado el mes al corriente, no tener adeudos.");
        return; 
    }

    if (!window.confirm("El cliente no tiene adeudos. ¿Estás seguro que deseas cancelar su suscripción mensual?")) return;
    
    try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3500/api/finances/subscriptions/${history.subscription.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        alert("Suscripción cancelada correctamente");
        fetchHistory();
    } catch (error) {
        alert(error.response?.data?.message || "Error al cancelar la suscripción");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Expediente del Cliente</h2>
            <p className="text-sm text-slate-500 font-medium">{cliente?.firstName} {cliente?.lastName1} {cliente?.lastName2}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Tabs Estilizados */}
        <div className="flex border-b border-slate-100 bg-white">
          <button 
            onClick={() => setTab('pagos')}
            className={`flex-1 py-4 text-xs font-black tracking-widest transition-all ${tab === 'pagos' ? 'border-b-4 border-blue-600 text-blue-600 bg-blue-50/30' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            PAGOS MANUALES / ÚNICOS
          </button>
          <button 
            onClick={() => setTab('recurrencia')}
            className={`flex-1 py-4 text-xs font-black tracking-widest transition-all ${tab === 'recurrencia' ? 'border-b-4 border-blue-600 text-blue-600 bg-blue-50/30' : 'text-slate-400 hover:bg-slate-50'}`}
          >
             RECURRENCIA
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 text-slate-400 gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-sm font-bold tracking-widest uppercase opacity-50">Consultando Base de Datos...</p>
            </div>
          ) : tab === 'pagos' ? (
            <div className="space-y-4">
              {history.transactions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Receipt className="mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-slate-400 font-medium">Sin historial de pagos manuales.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] uppercase text-slate-400 font-black tracking-wider">
                            <th className="py-4 px-6">Fecha</th>
                            <th className="py-4 px-6">Concepto</th>
                            <th className="py-4 px-6 text-right">Monto</th>
                            <th className="py-4 px-6 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {history.transactions.map((t) => (
                        <tr key={t.id} className="text-sm hover:bg-blue-50/30 transition-colors">
                            <td className="py-4 px-6 font-bold text-slate-700">
                                {/* Corregido para que lea t.date que viene de Prisma */}
                                {new Date(t.date || t.dueDate || t.paymentDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </td>
                            <td className="py-4 px-6 text-slate-500 font-medium">{t.description || 'Cargo Administrativo'}</td>
                            <td className="py-4 px-6 text-right font-black text-slate-900">${Number(t.amount).toLocaleString('es-MX')}</td>
                            <td className="py-4 px-6 text-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                    t.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {t.status === 'PAID' ? 'Liquidado' : 'Pendiente'}
                                </span>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {history.subscription ? (
                <>
                  {/* Tarjeta de Membresía */}
                  <div className="max-w-md mx-auto bg-blue-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 opacity-10 text-white transform rotate-12">
                        <Calendar size={160} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <span className="bg-white/20 backdrop-blur-md text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/30">
                                {history.subscription.serviceName || history.subscription.description || 'PLAN ACTIVO'}
                            </span>
                            <div className="bg-white/20 p-2 rounded-xl">
                                <CalendarClock size={24} />
                            </div>
                        </div>
                        
                        <h3 className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Costo Mensual</h3>
                        <p className="text-5xl font-black mb-8 tracking-tighter">
                            ${Number(history.subscription.amount).toLocaleString('es-MX')}
                            <span className="text-lg font-light opacity-60 ml-1">/{history.subscription.frequency === 'ANNUAL' ? 'año' : 'mes'}</span>
                        </p>
                        
                        <div className="space-y-4 bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-sm mb-8">
                            <div className="flex items-center gap-4 text-sm font-medium">
                                <CheckCircle2 size={18} className="text-blue-300" /> 
                                <span>Próximo cobro: <b className="text-white">{new Date(history.subscription.nextBilling).toLocaleDateString()}</b></span>
                            </div>
                        </div>

                        <button 
                            onClick={cancelarRecurrencia}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20"
                        >
                            <Ban size={16} /> Cancelar Suscripción
                        </button>
                    </div>
                  </div>

                  {/* Historial de la Membresía */}
                  <div className="mt-10">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <History size={14} /> Registro de Cobros Automáticos
                        </h4>
                    </div>
                    
                    {history.recurrenceHistory?.length > 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[10px] text-slate-400 font-black uppercase">
                                        <th className="py-3 px-6">Fecha Aplicada</th>
                                        <th className="py-3 px-6 text-right">Monto</th>
                                        <th className="py-3 px-6 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {history.recurrenceHistory.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6 font-bold text-slate-700">
                                                {/* Corregido para usar t.date */}
                                                {new Date(t.date || t.dueDate || t.paymentDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-slate-900">${Number(t.amount).toLocaleString('es-MX')}</td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                                                    t.status === 'PAID' 
                                                    ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                                                    : 'text-amber-600 bg-amber-50 border-amber-100'
                                                }`}>
                                                    {t.status === 'PAID' ? 'PAGADO' : 'PENDIENTE'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-400 text-xs font-medium italic">No hay cobros automáticos procesados todavía.</p>
                        </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 max-w-lg mx-auto">
                  <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                    <Clock size={48} />
                  </div>
                  <h3 className="font-black text-slate-800 text-xl mb-2 tracking-tight">Sin pagos recurrentes activos</h3>
                  <p className="text-sm text-slate-500 mb-10 px-12 leading-relaxed">Este cliente no cuenta con un esquema de cobros recurrentes configurado en el sistema.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur-md text-right">
          <button 
            onClick={onClose} 
            className="px-8 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalHistorial;