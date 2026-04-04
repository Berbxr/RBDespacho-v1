import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
// Ajusta esta ruta dependiendo de dónde esté tu archivo Layout.jsx principal
import Layout from '../../../components/Layout';

export default function FacturacionLayout() {
  const location = useLocation();

  const tabs = [
    { name: 'Historial', path: '/facturas' },
    { name: 'Emitir CFDI', path: '/facturas/emitir' },
    { name: 'Emisores y CSD', path: '/facturas/emisores' }
  ];

  return (
    <Layout>
      {/* Sub-menú de navegación del módulo */}
      <div className="bg-white border border-gray-200 p-2 mb-6 flex gap-2 rounded-xl shadow-sm max-w-7xl mx-auto overflow-x-auto">
        {tabs.map(tab => {
          // Lógica estricta para saber qué pestaña está activa
          const isActive = location.pathname === tab.path || (tab.path === '/facturas' && location.pathname === '/facturas/');
          
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isActive
                  ? 'bg-[#00B4D8] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>

      {/* Aquí React Router inyectará la vista que corresponda (List, Emitir, o Perfil) */}
      <Outlet />
    </Layout>
  );
}