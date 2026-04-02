import jsPDF from 'jspdf';

export const generarReciboPDF = (transaccion) => {
  const doc = new jsPDF();

  // 1. Identificamos si es un Gasto o un Ingreso
  const isExpense = transaccion.type === 'EXPENSE';

  // 2. Definimos colores dinámicos
  // Rojo para gastos, Verde Militar para ingresos
  const colorEncabezado = isExpense ? [185, 28, 28] : [75, 83, 32]; 
  const colorGrisTexto = [80, 80, 80];

  const formatoMoneda = (monto) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto);
  const formatoFecha = (fecha) => new Date(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  // --- ENCABEZADO ---
  doc.setFillColor(...colorEncabezado);
  doc.rect(0, 0, 210, 40, 'F'); 

  doc.setTextColor(255, 255, 255); 
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('RB Control', 15, 25);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  // Cambiamos el título según el tipo
  doc.text(isExpense ? 'Comprobante de Gasto' : 'Recibo de Pago', 145, 25);

  // --- DATOS ---
  doc.setTextColor(...colorGrisTexto);
  doc.setFontSize(11);
  
  // Lógica dinámica para la entidad:
  // Si es gasto y no tiene cliente asociado, mostramos "Gasto Operativo"
  const nombreEntidad = transaccion.client 
    ? `${transaccion.client.firstName} ${transaccion.client.lastName1}` 
    : (isExpense ? 'Gasto Operativo / Interno' : 'Público en General');
    
  const rfcEntidad = transaccion.client?.rfc || (isExpense ? 'N/A' : 'XAXX010101000');
  const nombreConcepto = transaccion.service ? transaccion.service.name : (transaccion.description || 'Concepto General');
  
  let y = 60;
  
  // Columna Izquierda: Entidad
  doc.text(isExpense ? 'Detalles del Gasto:' : 'Detalles del Cliente:', 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(nombreEntidad, 15, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`RFC: ${rfcEntidad}`, 15, y + 14);
  
  // Columna Derecha: Fecha
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de Registro:', 130, y);
  doc.setFont('helvetica', 'normal');
  // Usamos la fecha de la transacción (date) que viene de la BD
  const fechaTx = transaccion.date || transaccion.dueDate || new Date();
  doc.text(formatoFecha(fechaTx), 130, y + 7); 

  y += 30;

  // Concepto y Descripción
  doc.setFont('helvetica', 'bold');
  doc.text('Concepto / Descripción:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(nombreConcepto, 15, y + 7);
  
  // Si hay una descripción adicional y es diferente al nombre del servicio/concepto base, la mostramos
  if (transaccion.description && transaccion.description !== nombreConcepto) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Nota: ${transaccion.description}`, 15, y + 14);
    doc.setFontSize(11);
    doc.setTextColor(...colorGrisTexto);
    y += 7; // Empujamos el espacio hacia abajo
  }

  y += 25;

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.line(15, y, 195, y);
  
  y += 15;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TOTAL:', 130, y);
  
  // Color del monto final según tipo
  if (isExpense) {
    doc.setTextColor(185, 28, 28); // Rojo para impacto visual de salida
  } else {
    doc.setTextColor(22, 163, 74); // Verde para ingreso
  }
  
  doc.text(formatoMoneda(transaccion.amount), 160, y);

  // Guardar PDF con nombre dinámico
  const prefix = isExpense ? 'Gasto' : 'Recibo';
  const safeEntityName = nombreEntidad.replace(/\s+/g, '_');
  doc.save(`${prefix}_${safeEntityName}_${new Date().getTime()}.pdf`);
};