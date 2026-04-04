import axios from 'axios';

// Ajusta esta URL a la configuración de tu proyecto (Vite usa import.meta.env)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3500/api';

const api = axios.create({
  baseURL: `${API_URL}/billing`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ==========================================
// INTERCEPTOR DE AUTENTICACIÓN
// ==========================================
// Esto se ejecuta automáticamente antes de que cada petición salga al servidor
api.interceptors.request.use(
  (config) => {
    // Buscamos el token en el almacenamiento del navegador
    const token = localStorage.getItem('token');
    
    // Si el usuario ya se logueó y tiene token, se lo pegamos a la petición
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const billingApi = {
  // ==========================================
  // EMISORES Y CERTIFICADOS (CSD)
  // ==========================================
  subirCsd: (data) => api.post('/csds', data),
  listarCsds: () => api.get('/csds'),
  obtenerCsd: (rfc) => api.get(`/csds/${rfc}`),
  actualizarCsd: (rfc, data) => api.put(`/csds/${rfc}`, data),
  eliminarCsd: (rfc) => api.delete(`/csds/${rfc}`),

  // ==========================================
  // RECEPTORES (CLIENTES)
  // ==========================================
  // Nota: data debe incluir { rfcEmisor: "..." }
  crearReceptor: (data) => api.post('/receptores', data),
  listarReceptores: () => api.get('/receptores'),

  // ==========================================
  // FACTURACIÓN Y CFDIS
  // ==========================================
  emitirCfdi: (invoiceData) => api.post('/emitir', invoiceData),
  descargarCfdi: (id) => api.get(`/cfdis/${id}`),
  cancelarCfdi: (id, data) => api.delete(`/cfdis/${id}`, { data }),
  // Nota: data debe ser { motivo: "02", rfcEmisor: "...", uuidReemplazo: "..." }
  cancelarCfdi: (id, data) => api.delete(`/cfdis/${id}`, { data }),

  listarProductos: (emisorId) => api.get(`/productos?emisorId=${emisorId}`),
  crearProducto: (producto) => api.post('/productos', producto),
};