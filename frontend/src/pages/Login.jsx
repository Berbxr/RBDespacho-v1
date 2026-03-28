import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMensaje, setErrorMensaje] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Detiene la recarga de la página
    console.log("¡Botón presionado!"); // <--- SI NO VES ESTO, EL PROBLEMA ES EL BOTÓN
    setErrorMensaje('');

      try {
      const response = await axios.post('http://localhost:3500/api/auth/login', {
        username,
        password
      });

      console.log('Respuesta del servidor:', response.data);

      // SEGÚN TU CONSOLA, EL TOKEN VIENE EN: response.data.data.token
      const token = response.data.data?.token || response.data.token;

      if (token) {
        localStorage.setItem('token', token);
        console.log('Token extraído y guardado con éxito');
        navigate('/dashboard');
      } else {
        console.warn('No se encontró el token en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error capturado:', error);
      setErrorMensaje(error.response?.data?.message || 'Error de conexión');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">RB Control</h1>
          <p className="text-slate-500 mt-2">Panel de Administración</p>
        </div>

        {errorMensaje && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">
            {errorMensaje}
          </div>
        )}

        {/* ASEGÚRATE QUE EL ON-SUBMIT ESTÉ AQUÍ */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
              required
            />
          </div>

          <button
            type="submit" // <--- ESTO ES VITAL
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-md transition-all shadow-sm"
          >
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;