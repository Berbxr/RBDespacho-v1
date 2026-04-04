import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Estilos del PDF (Basado en la identidad Inowebs / Artemis)
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica', color: '#333333' },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  logoSpace: { width: 120, height: 60, objectFit: 'contain' },
  emisorBox: { width: '55%' },
  cfdiBox: { width: '40%', border: '1pt solid #00B4D8', borderRadius: 4, overflow: 'hidden' },
  cfdiBoxHeader: { backgroundColor: '#00B4D8', color: 'white', padding: 4, textAlign: 'center', fontSize: 10, fontWeight: 'bold' },
  cfdiBoxBody: { padding: 5 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#1C2B1E', marginBottom: 5, borderBottom: '1pt solid #eeeeee', paddingBottom: 2 },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 90, fontWeight: 'bold', color: '#555555' },
  value: { flex: 1 },
  // Estilos de la Tabla
  table: { width: '100%', marginTop: 15, border: '1pt solid #eeeeee' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#00B4D8', color: 'white', fontWeight: 'bold', padding: 5, fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottom: '1pt solid #eeeeee', padding: 5, fontSize: 8 },
  colProdServ: { width: '15%' },
  colCant: { width: '10%', textAlign: 'center' },
  colClaveUnidad: { width: '15%' },
  colDesc: { width: '35%' },
  colValUnitario: { width: '12%', textAlign: 'right' },
  colImporte: { width: '13%', textAlign: 'right' },
  // Totales
  totalesContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },
  totalesBox: { width: '35%', border: '1pt solid #eeeeee', padding: 5 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  totalLabel: { fontWeight: 'bold' },
  totalValue: { textAlign: 'right' },
  totalFinalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, paddingTop: 5, borderTop: '1pt solid #00B4D8', fontWeight: 'bold', fontSize: 10 }
});

export default function InvoicePDF({ factura, emisor, receptor, conceptos, totales }) {
  // Asegurarnos de que los valores existan para evitar errores al renderizar
  const safeTotales = totales || { subtotal: 0, descuento: 0, traslados: 0, retenciones: 0, total: 0 };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* ENCABEZADO: Emisor y Datos del CFDI */}
        <View style={styles.headerContainer}>
          <View style={styles.emisorBox}>
            {emisor?.logoBase64 ? (
              <Image style={styles.logoSpace} src={emisor.logoBase64} />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1C2B1E', marginBottom: 10 }}>
                {emisor?.razonSocial || 'EMPRESA EMISORA'}
              </Text>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>R.F.C. Emisor:</Text>
              <Text style={styles.value}>{emisor?.rfc}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Nombre del Emisor:</Text>
              <Text style={styles.value}>{emisor?.razonSocial}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Régimen Fiscal:</Text>
              <Text style={styles.value}>{emisor?.regimenFiscal}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Lugar de expedición:</Text>
              <Text style={styles.value}>C.P. {emisor?.cp}</Text>
            </View>
          </View>

          <View style={styles.cfdiBox}>
            <Text style={styles.cfdiBoxHeader}>CFDI {factura?.tipoComprobante === 'I' ? 'INGRESO' : factura?.tipoComprobante}</Text>
            <View style={styles.cfdiBoxBody}>
              <View style={styles.row}><Text style={styles.label}>Folio:</Text><Text style={styles.value}>{factura?.folio || 'Borrador'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>No. Certificado:</Text><Text style={styles.value}>{factura?.noCertificado || 'Pendiente'}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Fecha:</Text><Text style={styles.value}>{factura?.fecha || new Date().toLocaleString()}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Versión:</Text><Text style={styles.value}>4.0</Text></View>
            </View>
          </View>
        </View>

        {/* DATOS DEL RECEPTOR Y PAGO */}
        <View style={styles.headerContainer}>
          <View style={{ width: '48%' }}>
            <Text style={styles.sectionTitle}>Datos del Receptor</Text>
            <View style={styles.row}><Text style={styles.label}>R.F.C. Receptor:</Text><Text style={styles.value}>{receptor?.rfc}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Nombre Receptor:</Text><Text style={styles.value}>{receptor?.razonSocial}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Uso del CFDI:</Text><Text style={styles.value}>{factura?.usoCFDI}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Domicilio Fiscal:</Text><Text style={styles.value}>{receptor?.cpFiscal}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Régimen fiscal:</Text><Text style={styles.value}>{receptor?.regimenFiscal}</Text></View>
          </View>

          <View style={{ width: '48%' }}>
            <Text style={styles.sectionTitle}>Datos de Pago</Text>
            <View style={styles.row}><Text style={styles.label}>Forma de Pago:</Text><Text style={styles.value}>{factura?.formaPago}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Método de Pago:</Text><Text style={styles.value}>{factura?.metodoPago}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Moneda:</Text><Text style={styles.value}>{factura?.moneda || 'MXN'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Condiciones:</Text><Text style={styles.value}>{factura?.condicionesPago || 'Ninguna'}</Text></View>
          </View>
        </View>

        {/* TABLA DE CONCEPTOS */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colProdServ}>PROD/SERV</Text>
            <Text style={styles.colCant}>CANT.</Text>
            <Text style={styles.colClaveUnidad}>CLAVE UNIDAD</Text>
            <Text style={styles.colDesc}>DESCRIPCIÓN</Text>
            <Text style={styles.colValUnitario}>VAL. UNITARIO</Text>
            <Text style={styles.colImporte}>IMPORTE</Text>
          </View>
          
          {conceptos && conceptos.map((c, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colProdServ}>{c.claveProdServ}</Text>
              <Text style={styles.colCant}>{c.cantidad}</Text>
              <Text style={styles.colClaveUnidad}>{c.claveUnidad}</Text>
              <Text style={styles.colDesc}>{c.descripcion}</Text>
              <Text style={styles.colValUnitario}>${Number(c.valorUnitario).toFixed(2)}</Text>
              <Text style={styles.colImporte}>${(Number(c.cantidad) * Number(c.valorUnitario)).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALES */}
        <View style={styles.totalesContainer}>
          <View style={styles.totalesBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>${safeTotales.subtotal.toFixed(2)}</Text>
            </View>
            {safeTotales.descuento > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Descuento:</Text>
                <Text style={styles.totalValue}>-${safeTotales.descuento.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Imp. Trasladados:</Text>
              <Text style={styles.totalValue}>+${safeTotales.traslados.toFixed(2)}</Text>
            </View>
            {safeTotales.retenciones > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Imp. Retenidos:</Text>
                <Text style={styles.totalValue}>-${safeTotales.retenciones.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.totalFinalRow}>
              <Text>TOTAL:</Text>
              <Text>${safeTotales.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* FOOTER DEL SAT (Solo se muestra si la factura ya está timbrada) */}
        {factura?.satUuid && (
          <View style={{ marginTop: 30, borderTop: '1pt solid #eeeeee', paddingTop: 10 }}>
            <Text style={{ fontSize: 7, fontWeight: 'bold', marginBottom: 2 }}>UUID: {factura.satUuid}</Text>
            <Text style={{ fontSize: 6, color: '#666', marginBottom: 4 }}>Sello Digital del CFDI: {factura.selloCFDI}</Text>
            <Text style={{ fontSize: 6, color: '#666' }}>Sello del SAT: {factura.selloSAT}</Text>
            <Text style={{ fontSize: 6, color: '#666', marginTop: 4 }}>Este documento es una representación impresa de un CFDI.</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}