import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import axios from 'axios'

axios.interceptors.request.use(
  (config) => {
    // Buscamos el token que guardaste en el Login
    const token = localStorage.getItem('token');
    
    // Si el token existe, se lo pegamos a los "headers" de la petición
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
