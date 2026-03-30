import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, Receipt, LogOut, Calendar, RefreshCcw, FileTextIcon, Landmark } from 'lucide-react';

// IMPORTAMOS EL LOGO AQUÍ
import logoRB from '../assets/RB.svg'; 

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation(); 

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Clientes', icon: <Users size={20} />, path: '/clientes' },
    { name: 'Servicios', icon: <Briefcase size={20} />, path: '/servicios' },
    { name: 'Finanzas', icon: <Receipt size={20} />, path: '/finanzas' },
    { name: 'Calendario', icon: <Calendar size={20} />, path: '/calendario' },
    { name: 'Recurrentes', icon: <RefreshCcw size={20} />, path: '/suscripciones' },
    { name: 'Documentos', icon: <FileTextIcon size={20} />, path: '/documentos' },
    { name: 'Facturas', icon: <Landmark size={20} />, path: '/facturas' },
   
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Sidebar Lateral - Tema Verde Militar */}
      <aside className="w-64 bg-[#2C3524] flex flex-col fixed h-full shadow-2xl z-10">
        
        {/* Logo Modificado */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-[#E9EED9] tracking-tight flex items-center gap-3">
            {/* Usamos la etiqueta img con la variable del logo */}
            <img 
              src={logoRB} 
              alt="Logo RB Control" 
              className="w-25 h-25 object-contain drop-shadow-md" 
            />
            RB Despacho
          </h2>
        </div>
        
        {/* Menú de Navegación */}
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#3F4A33] text-white shadow-inner shadow-black/20 border-l-4 border-[#A3B18A]' 
                    : 'text-[#A3B18A] hover:bg-[#3F4A33]/50 hover:text-white border-l-4 border-transparent'
                }`}
              >
                <span className={`${isActive ? 'text-[#A3B18A]' : 'text-[#849372] group-hover:text-[#A3B18A]'} transition-colors`}>
                  {item.icon}
                </span>
                <span className="font-medium tracking-wide text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Botón Cerrar Sesión */}
        <div className="p-4 border-t border-[#3F4A33]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm tracking-wide">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;