import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Servicios from './pages/Servicios';
import Finanzas from './pages/Finanzas';
import CalendarioFinanzas from './pages/CalendarioFinanzas'
import Suscripciones from './pages/Suscripciones';
import Documentos from './pages/Documentos';
import Facturas from './pages/CrearFactura';

// Componente para proteger rutas: Si no hay token en el navegador, 
// no permite ver el contenido y expulsa al usuario al Login.
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* --- RUTAS PÚBLICAS --- */}
        <Route path="/login" element={<Login />} />
        
        {/* --- RUTAS PRIVADAS (PROTEGIDAS) --- */}
        {/* Usamos el componente ProtectedRoute como un "guardaespaldas" */}
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/clientes" 
          element={
            <ProtectedRoute>
              <Clientes />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/servicios" 
          element={
            <ProtectedRoute>
              <Servicios />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/finanzas" 
          element={
            <ProtectedRoute>
              <Finanzas />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calendario" 
          element={
            <ProtectedRoute>
              <CalendarioFinanzas />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/suscripciones" 
          element={
            <ProtectedRoute>
              <Suscripciones />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documentos" 
          element={
            <ProtectedRoute>
              <Documentos />
            </ProtectedRoute>
          } 
        />
                <Route 
          path="/facturas" 
          element={
            <ProtectedRoute>
              <Facturas />
            </ProtectedRoute>
          } 
        />

        
        {/* --- MANEJO DE RUTAS NO ENCONTRADAS --- */}
        {/* Si el usuario entra a "/" o a una ruta que no inventamos, lo mandamos al login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;