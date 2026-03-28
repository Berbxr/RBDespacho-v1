import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ModalTransaccion from '../components/ModalTransaccion';
// 1. IMPORTAMOS EL ÍCONO "Download"
import { Plus, CheckCircle, Clock, ArrowUpRight, ArrowDownRight, Edit, Trash2, Download } from 'lucide-react';
import { generarReciboPDF } from '../utils/pdfGenerator';

const Finanzas = () => {
  const [transacciones, setTransacciones] = useState([]);
  const [transaccionAEditar, setTransaccionAEditar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState(''); 
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    cargarTransacciones();
  }, [filtro]);

  const cargarTransacciones = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token'); 
      
      const url = filtro 
        ? `http://localhost:3500/api/finances?type=${filtro}` 
        : `http://localhost:3500/api/finances`;
        
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        setTransacciones(result.data);
      }
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarPagado = async (id) => {
    if (!window.confirm('¿Estás seguro de marcar esta transacción como pagada? Se generará el recibo automáticamente.')) return;

    const transaccionPagada = transacciones.find(tx => tx.id === id);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:3500/api/finances/${id}/pay`, { 
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        if (transaccionPagada) {
          generarReciboPDF(transaccionPagada);
        }
        cargarTransacciones(); 
      }
    } catch (error) {
      console.error('Error al registrar el pago:', error);
    }
  };

  // 2. NUEVA FUNCIÓN PARA DESCARGAR EL PDF MANUALMENTE
  const handleDescargarRecibo = (transaccion) => {
    generarReciboPDF(transaccion);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3500/api/finances/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const result = await response.json();
      
      if (result.status === 'success') {
        cargarTransacciones(); 
      } else {
        alert(result.message || 'Hubo un error al eliminar');
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const handleEditar = (transaccion) => {
    setTransaccionAEditar(transaccion);
    setIsModalOpen(true);
  };

  const formatoMoneda = (monto) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
  const formatoFecha = (fecha) => fecha ? new Date(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control Financiero</h1>
          <p className="text-slate-500 text-sm">Gestiona los ingresos, gastos y cuentas por cobrar</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Nueva Transacción
        </button>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button 
          className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${filtro === '' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setFiltro('')}
        >
          Todas
        </button>
        <button 
          className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${filtro === 'INCOME' ? 'border-green-600 text-green-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setFiltro('INCOME')}
        >
          Ingresos
        </button>
        <button 
          className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${filtro === 'EXPENSE' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setFiltro('EXPENSE')}
        >
          Gastos
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Registro</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Límite</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Pago</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Descripción / Cliente / Servicio</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Tipo</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Monto</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">Estatus</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="8" className="px-6 py-10 text-center text-slate-400">Cargando transacciones...</td></tr>
            ) : transacciones.length === 0 ? (
              <tr><td colSpan="8" className="px-6 py-10 text-center text-slate-400">No hay transacciones registradas.</td></tr>
            ) : (
              transacciones.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {formatoFecha(tx.createdAt)}
                  </td>
                  
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">
                    {formatoFecha(tx.dueDate)}
                  </td>

                  <td className="px-6 py-4 text-sm">
                    {tx.paymentDate ? (
                      <span className="text-emerald-600 font-medium">{formatoFecha(tx.paymentDate)}</span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Pendiente</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start gap-1">
                      <p className="text-sm font-medium text-slate-800">{tx.description || 'Transacción'}</p>
                      {tx.client && (
                        <p className="text-xs text-slate-500">{tx.client.firstName} {tx.client.lastName1}</p>
                      )}
                      {tx.service && (
                        <span className="inline-block font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] mt-0.5">
                          {tx.service.name}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    {tx.type === 'INCOME' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <ArrowUpRight size={14} /> Ingreso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <ArrowDownRight size={14} /> Gasto
                      </span>
                    )}
                  </td>
                  
                  <td className={`px-6 py-4 text-sm font-semibold ${tx.type === 'INCOME' ? 'text-green-600' : 'text-slate-800'}`}>
                    {formatoMoneda(tx.amount)}
                  </td>
                  
                  <td className="px-6 py-4">
                    {tx.status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle size={14} /> Pagado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Clock size={14} /> Pendiente
                      </span>
                    )}
                  </td>
                  
                  {/* 3. COLUMNA DE ACCIONES ACTUALIZADA */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      
                      {/* Si está pendiente, mostramos "Marcar Pagado". Si ya se pagó, mostramos el ícono de descarga */}
                      {tx.status === 'PENDING' ? (
                        <button 
                          onClick={() => handleMarcarPagado(tx.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                          title="Marcar como Pagado"
                        >
                          Marcar Pagado
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleDescargarRecibo(tx)}
                          className="text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Descargar Recibo"
                        >
                          <Download size={18} />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleEditar(tx)}
                        className="text-slate-400 hover:text-amber-500 transition-colors"
                        title="Editar Transacción"
                      >
                        <Edit size={16} />
                      </button>
                      
                      <button 
                        onClick={() => handleEliminar(tx.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Eliminar Transacción"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalTransaccion 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setTransaccionAEditar(null); 
        }} 
        onSave={cargarTransacciones} 
        transaccionEditando={transaccionAEditar} 
      />
      
    </Layout>
  );
};

export default Finanzas;