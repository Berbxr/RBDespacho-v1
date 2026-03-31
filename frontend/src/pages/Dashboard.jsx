import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, AlertCircle, CalendarClock, Activity, Wallet
} from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    try {
      // Usamos axios, el interceptor de main.jsx ya le pondrá el token automáticamente
      const response = await axios.get('http://localhost:3500/api/dashboard');
      const result = response.data;
      
      if (result.status === 'success') {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error al cargar métricas del dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatoMoneda = (monto) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full mt-20">
          <p className="text-slate-500 animate-pulse text-lg">Cargando métricas de RB Control...</p>
        </div>
      </Layout>
    );
  }

  if (!data) return <Layout><p>Error al cargar la información.</p></Layout>;

  const { financials, kpis, alerts, chart } = data;

  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
        <p className="text-slate-500 text-sm">Resumen financiero y métricas de RB Control</p>
      </header>

      {/* --- FILA 1: KPIs PRINCIPALES --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Tarjeta 1: Ingresos del Mes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresos del Mes</p>
            <div className="p-2 bg-green-50 rounded-lg text-green-600"><TrendingUp size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatoMoneda(financials.currentMonth.income)}</p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className={`font-medium ${financials.growth.incomePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {financials.growth.incomePct >= 0 ? '+' : ''}{financials.growth.incomePct}%
            </span>
            <span className="text-slate-400">vs mes anterior</span>
          </div>
        </div>

        {/* Tarjeta 2: Gastos del Mes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gastos del Mes</p>
            <div className="p-2 bg-red-50 rounded-lg text-red-600"><TrendingDown size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatoMoneda(financials.currentMonth.expense)}</p>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className={`font-medium ${financials.growth.expensePct <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {financials.growth.expensePct > 0 ? '+' : ''}{financials.growth.expensePct}%
            </span>
            <span className="text-slate-400">vs mes anterior</span>
          </div>
        </div>

        {/* Tarjeta 3: Utilidad Neta */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-600">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utilidad Neta</p>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Activity size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatoMoneda(financials.currentMonth.utility)}</p>
          <div className="mt-2 text-xs text-slate-400">Beneficio real del mes actual</div>
        </div>

        {/* Tarjeta 4: Tasa de Cobranza */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa de Cobranza</p>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><Wallet size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{kpis.collectionRate}%</p>
          <div className="mt-2 text-xs text-slate-400">Facturado vs Cobrado</div>
        </div>
      </div>

      {/* --- FILA 2: GRÁFICA Y MÉTRICAS SECUNDARIAS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Gráfica de 6 meses */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase mb-6">Flujo de Efectivo (Últimos 6 meses)</h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
                <RechartsTooltip 
                  formatter={(value) => formatoMoneda(value)}
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPIs Laterales */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full"><Users size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clientes Activos</p>
              <p className="text-2xl font-bold text-slate-800">{kpis.activeClients}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-full"><AlertCircle size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cuentas por Cobrar</p>
              <p className="text-2xl font-bold text-slate-800">{formatoMoneda(kpis.pendingCollections)}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full"><CalendarClock size={24} /></div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Membresías (Proy. Mensual)</p>
              <p className="text-2xl font-bold text-slate-800">{formatoMoneda(kpis.recurringProjection)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- FILA 3: TOP 10 DEUDORES --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-sm font-bold text-slate-700 uppercase">Top 10 Deudores (+30 días)</h2>
          <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-1 rounded-full">
            Prioridad Alta
          </span>
        </div>
        
        {alerts.top10Debtors.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            ¡Excelente! No tienes clientes con más de 30 días de atraso.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Concepto</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Vencimiento</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Deuda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alerts.top10Debtors.map((deuda, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-800">
                        {deuda.client ? `${deuda.client.firstName} ${deuda.client.lastName1}` : 'Cliente Eliminado'}
                      </p>
                      <p className="text-xs text-slate-500">{deuda.client?.phone || 'Sin teléfono'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{deuda.description}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                        {new Date(deuda.dueDate).toLocaleDateString('es-MX')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">
                      {formatoMoneda(deuda.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </Layout>
  );
};

export default Dashboard;