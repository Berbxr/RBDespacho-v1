import jsPDF from 'jspdf';

export const generarReciboPDF = (transaccion) => {
  // Inicializamos el documento
  const doc = new jsPDF();

  // Definición de colores corporativos
  const colorVerdeMilitar = [75, 83, 32]; // RGB para verde militar
  const colorGrisTexto = [80, 80, 80];

  // Helpers de formato
  const formatoMoneda = (monto) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
  const formatoFecha = (fecha) => new Date(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  // 1. Fondo decorativo superior (encabezado)
  doc.setFillColor(...colorVerdeMilitar);
  doc.rect(0, 0, 210, 40, 'F'); // Ancho total A4 es 210mm

  // 2. Título de la empresa
  doc.setTextColor(255, 255, 255); // Texto blanco
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('RB Control', 15, 25);

  // 3. Título del documento
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('RECIBO DE PAGO', 150, 25);

  // 4. Información de la transacción (Cuerpo)
  doc.setTextColor(...colorGrisTexto);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  // Extraemos datos, manejando por si algún dato viene vacío
  const nombreCliente = transaccion.client ? `${transaccion.client.firstName} ${transaccion.client.lastName1 || ''}` : 'Cliente de Mostrador';
  const nombreServicio = transaccion.service ? transaccion.service.name : transaccion.description || 'Servicio General';
  
  // Dibujamos los textos
  let y = 60;
  
  doc.text('Detalles del Cliente:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(nombreCliente, 15, y + 7);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de Pago:', 130, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatoFecha(new Date()), 130, y + 7); // Usamos la fecha actual en la que se generó el recibo

  y += 25;

  doc.setFont('helvetica', 'bold');
  doc.text('Concepto / Servicio:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(nombreServicio, 15, y + 7);

  // 5. Caja del monto total
  y += 30;
  doc.setFillColor(245, 245, 220); // Beige muy clarito para el fondo del monto
  doc.rect(15, y, 180, 25, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorVerdeMilitar);
  doc.text('Total Pagado:', 25, y + 16);
  
  doc.setFontSize(16);
  doc.text(formatoMoneda(transaccion.amount), 140, y + 16);

  // 6. Pie de página
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('Este documento es un comprobante de pago generado automáticamente por RB Control.', 15, 280);

  // 7. Descargar el archivo
  const nombreArchivo = `Recibo_${nombreCliente.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  doc.save(nombreArchivo);
};