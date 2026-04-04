import { useState, useMemo } from 'react';

export const useCalculoCfdi = () => {
  const [conceptos, setConceptos] = useState([]);

  // Agrega una nueva fila en blanco a la factura
  const agregarConcepto = () => {
    setConceptos([
      ...conceptos,
      {
        id: Date.now().toString(),
        claveProdServ: '',
        claveUnidad: 'E48',
        unidad: 'Servicio',
        descripcion: '',
        cantidad: 1,
        valorUnitario: 0,
        descuento: 0,
        objetoImpuesto: '02', // 02 = Sí objeto de impuesto por defecto
        impuestos: [] 
      }
    ]);
  };

  const actualizarConcepto = (id, campo, valor) => {
    setConceptos(conceptos.map(c => c.id === id ? { ...c, [campo]: valor } : c));
  };

  const eliminarConcepto = (id) => {
    setConceptos(conceptos.filter(c => c.id !== id));
  };

  // Manejo de impuestos dentro de un concepto específico
  const agregarImpuesto = (conceptoId, nuevoImpuesto) => {
    setConceptos(conceptos.map(c => {
      if (c.id === conceptoId) {
        return { ...c, impuestos: [...c.impuestos, nuevoImpuesto] };
      }
      return c;
    }));
  };

  const eliminarImpuesto = (conceptoId, indexImpuesto) => {
    setConceptos(conceptos.map(c => {
      if (c.id === conceptoId) {
        const nuevosImpuestos = [...c.impuestos];
        nuevosImpuestos.splice(indexImpuesto, 1);
        return { ...c, impuestos: nuevosImpuestos };
      }
      return c;
    }));
  };

  // ==========================================
  // CÁLCULOS EN TIEMPO REAL (useMemo para optimizar)
  // ==========================================
  const totales = useMemo(() => {
    let subtotal = 0;
    let totalDescuento = 0;
    let totalTraslados = 0;
    let totalRetenciones = 0;

    const conceptosCalculados = conceptos.map(c => {
      const base = (Number(c.cantidad) * Number(c.valorUnitario)) - Number(c.descuento || 0);
      subtotal += (Number(c.cantidad) * Number(c.valorUnitario));
      totalDescuento += Number(c.descuento || 0);

      const impuestosCalculados = c.impuestos.map(imp => {
        // Cálculo del importe del impuesto (Base * Tasa)
        const importeImpuesto = base * Number(imp.tasaCuota);
        
        if (imp.tipo === 'Traslado') totalTraslados += importeImpuesto;
        if (imp.tipo === 'Retención' || imp.tipo === 'Retencion') totalRetenciones += importeImpuesto;

        return { ...imp, base, importe: importeImpuesto };
      });

      return { ...c, importe: base, impuestos: impuestosCalculados };
    });

    const total = subtotal - totalDescuento + totalTraslados - totalRetenciones;

    return {
      subtotal,
      descuento: totalDescuento,
      traslados: totalTraslados,
      retenciones: totalRetenciones,
      total,
      conceptosListos: conceptosCalculados
    };
  }, [conceptos]);

  return {
    conceptos,
    totales,
    agregarConcepto,
    actualizarConcepto,
    eliminarConcepto,
    agregarImpuesto,
    eliminarImpuesto
  };
};