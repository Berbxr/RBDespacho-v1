import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from 'lucide-react';

const CalendarioFinanzas = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Controlador del filtro ('ALL', 'INCOME', 'EXPENSE')
  const [filtro, setFiltro] = useState('ALL');

  // Extraer mes y año actual
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // JS los meses van de 0 a 11

  const cargarDatosCalendario = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3500/api/finances/calendar?year=${year}&month=${month}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        const data = result.data;
        // Combinamos las transacciones reales con las proyecciones de suscripciones
        if (data.realTransactions || data.ghostTransactions) {
          setTransacciones([
            ...(data.realTransactions || []),
            ...(data.ghostTransactions || [])
          ]);
        } else if (Array.isArray(data)) {
          setTransacciones(data);
        }
      }
    } catch (error) {
      console.error("Error cargando calendario:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosCalendario();
  }, [year, month]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month, 1));
  const handleToday = () => setCurrentDate(new Date());

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 (Dom) a 6 (Sab)
  
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // 💰 Calcular el total a cobrar del mes actual (Ingresos pendientes o proyecciones)
  const totalACobrar = transacciones
    .filter(tx => tx.type === 'INCOME' && (tx.status === 'PENDING' || tx.isGhost))
    .reduce((acc, tx) => acc + Number(tx.amount), 0);

  // MODIFICADO: Uso seguro de fechas con UTC para evitar que los cobros brinquen de día
  const getTransaccionesDelDia = (dia) => {
    return transacciones.filter(tx => {
      // Usamos date (nuevo) o dueDate (soporte a datos viejos si los hay)
      const fechaTxStr = tx.date || tx.dueDate; 
      if (!fechaTxStr) return false;

      // Aplicamos el filtro de tipo (Ingreso/Gasto)
      if (filtro !== 'ALL' && tx.type !== filtro) return false;

      // Parseamos la fecha de forma segura
      const fechaTx = new Date(fechaTxStr);
      
      return fechaTx.getUTCDate() === dia && 
             (fechaTx.getUTCMonth() + 1) === month && 
             fechaTx.getUTCFullYear() === year;
    });
  };

  const formatoMoneda = (monto) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);

  return (
    <Layout>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        
        {/* TÍTULO Y TOTAL A COBRAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="text-blue-600" />
              Calendario de Pagos
            </h1>
            <p className="text-slate-500 text-sm">Vista mensual de ingresos y gastos programados</p>
          </div>
          
          {/* BADGE DE TOTAL A COBRAR */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm mt-2 sm:mt-0">
            <span className="text-sm font-medium">Total a Cobrar:</span>
            <span className="text-lg font-bold">
              {formatoMoneda(totalACobrar)}
            </span>
          </div>
        </div>
        
        {/* CONTROLES (Filtros y Navegación) */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Switch/Botones de Filtro */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Filter size={16} className="text-slate-400 mx-2" />
            <button 
              onClick={() => setFiltro('ALL')} 
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${filtro === 'ALL' ? 'bg-white shadow-sm font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Ambos
            </button>
            <button 
              onClick={() => setFiltro('INCOME')} 
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${filtro === 'INCOME' ? 'bg-green-100 shadow-sm font-semibold text-green-700' : 'text-slate-500 hover:text-green-600'}`}
            >
              Cobros
            </button>
            <button 
              onClick={() => setFiltro('EXPENSE')} 
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${filtro === 'EXPENSE' ? 'bg-red-100 shadow-sm font-semibold text-red-700' : 'text-slate-500 hover:text-red-600'}`}
            >
              Pagos
            </button>
          </div>

          {/* Navegación del mes */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-slate-200">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded text-slate-600">
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-slate-700 min-w-[120px] text-center capitalize">
              {nombresMeses[month - 1]} {year}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded text-slate-600">
              <ChevronRight size={20} />
            </button>
            <button onClick={handleToday} className="ml-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 font-medium rounded hover:bg-blue-100 transition-colors">
              Hoy
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Cabecera Días de la semana */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {diasSemana.map(dia => (
            <div key={dia} className="py-3 text-center text-sm font-semibold text-slate-600">
              {dia}
            </div>
          ))}
        </div>

        {/* Cuadrícula del Calendario */}
        <div className="grid grid-cols-7 auto-rows-[120px]">
          {/* Espacios vacíos antes del día 1 */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="border-r border-b border-slate-100 bg-slate-50/50"></div>
          ))}

          {/* Días del mes */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const isToday = day === new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear();
            const txsDelDia = getTransaccionesDelDia(day);

            return (
              <div key={day} className={`border-r border-b border-slate-100 p-2 overflow-y-auto transition-colors hover:bg-slate-50 ${isToday ? 'bg-blue-50/30' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>
                    {day}
                  </span>
                </div>
                
                <div className="space-y-1.5 mt-2">
                  {loading ? null : txsDelDia.map(tx => (
                    <div 
                      key={tx.id || Math.random()} 
                      className={`text-[11px] leading-tight p-1.5 rounded border-l-2 ${
                        tx.type === 'INCOME' 
                          ? 'bg-green-50 border-green-500 text-green-800' 
                          : 'bg-red-50 border-red-500 text-red-800'
                      }`}
                      title={tx.description}
                    >
                      <div className="font-semibold flex justify-between">
                        <span>{formatoMoneda(tx.amount)}</span>
                        {tx.status === 'PAID' && <span className="text-[9px] bg-white px-1 rounded-sm opacity-70">Pagado</span>}
                        {tx.isGhost && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded-sm border border-indigo-200 opacity-90">Recurrente</span>}
                      </div>
                      <div className="truncate opacity-90 mt-0.5 font-medium">
                        {tx.client ? `${tx.client.firstName} ${tx.client.lastName1 || ''}` : tx.description}
                      </div>
                      {tx.service && (
                        <div className="truncate text-[9px] opacity-75">
                          {tx.service.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default CalendarioFinanzas;