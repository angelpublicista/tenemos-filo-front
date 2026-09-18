import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Experience } from '@/types';
import filoLogo from '../../../public/filo-logo.png';
import { colorValido, textoSobre } from '@/lib/marca';

/** #RRGGBB a los tres canales que pide jsPDF. */
function aRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Trae una imagen y la convierte en algo que jsPDF sepa dibujar.
 *
 * jsPDF no descarga nada por su cuenta: necesita los pixeles ya en mano, y el
 * unico camino en el navegador es pintar en un canvas y sacar el data URL. De
 * ahi el rodeo.
 *
 * Devuelve null ante cualquier tropiezo —la imagen no carga, el bucket no
 * autoriza el origen, el canvas queda contaminado— porque una cotizacion sin
 * logo se sigue pudiendo mandar, y quedarse sin cotizacion por un logo seria
 * un mal negocio.
 */
async function cargarImagen(
  url: string,
): Promise<{ datos: string; ancho: number; alto: number } | null> {
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new window.Image();
      // Sin esto el canvas queda contaminado y toDataURL lanza.
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;

    const lienzo = document.createElement('canvas');
    lienzo.width = img.naturalWidth;
    lienzo.height = img.naturalHeight;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return { datos: lienzo.toDataURL('image/png'), ancho: lienzo.width, alto: lienzo.height };
  } catch {
    return null;
  }
}

interface QuotePdfData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  hostName: string;
  companyName: string;
  experiences: Experience[];
  eventDate: string;
  eventTime: string;
  guests: number;
  location?: string;
  notes?: string;
  /**
   * Logo de quien cotiza. Sin el —o si no se puede descargar— se cae al de
   * Tenemos Filo, que es quien respalda la cotizacion en ese caso.
   */
  logoUrl?: string | null;
  /** Colores de marca del anfitrion; sin ellos, los de Tenemos Filo. */
  colorPrimario?: string | null;
  colorSecundario?: string | null;
}

export const generateQuotePDF = async (data: QuotePdfData): Promise<void> => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    hostName,
    companyName,
    experiences,
    eventDate,
    eventTime,
    guests,
    location,
    notes,
    logoUrl,
    colorPrimario,
    colorSecundario,
  } = data;

  // Crear documento PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Colores de marca: los del anfitrion si los eligio, si no los de Filo.
  const hexPrimario = colorValido(colorPrimario) ?? '#F26726';
  const hexSecundario = colorValido(colorSecundario) ?? '#E23694';
  const primaryColor = aRgb(hexPrimario);
  const accentColor = aRgb(hexSecundario);
  // El texto sobre la banda y sobre las cintas de cada opcion: blanco o negro
  // segun cual se lea, porque el color lo eligio alguien sin pensar en esto.
  const sobrePrimario = aRgb(textoSobre(hexPrimario));
  // Gris azulado de siempre para los titulos del cuerpo. No se toca: es texto
  // corrido, y dejarlo a eleccion acaba en cotizaciones ilegibles.
  const darkColor = [51, 76, 93] as [number, number, number]; // #334C5D
  const lightGray = [107, 114, 128] as [number, number, number]; // #6b7280

  // ========== HEADER ==========
  // Fondo degradado simulado con rectángulos
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // El logo del anfitrion; si no tiene o no se puede traer, el de Filo.
  const logo = (logoUrl ? await cargarImagen(logoUrl) : null) ?? (await cargarImagen(filoLogo.src));

  if (logo) {
    // Va sobre una tarjeta blanca y no suelto sobre el naranja: los logos se
    // diseñan para fondo claro, y muchos son oscuros o tienen texto negro que
    // sobre la banda no se leeria.
    const MARGEN = 3;
    const ALTO_TARJETA = 24;
    const ANCHO_MAXIMO = 44;

    let alto = ALTO_TARJETA - MARGEN * 2;
    let ancho = alto * (logo.ancho / logo.alto);
    if (ancho > ANCHO_MAXIMO) {
      ancho = ANCHO_MAXIMO;
      alto = ancho * (logo.alto / logo.ancho);
    }

    const anchoTarjeta = ancho + MARGEN * 2;
    const yTarjeta = (40 - ALTO_TARJETA) / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, yTarjeta, anchoTarjeta, ALTO_TARJETA, 2, 2, 'F');
    doc.addImage(
      logo.datos,
      'PNG',
      15 + MARGEN,
      yTarjeta + (ALTO_TARJETA - alto) / 2,
      ancho,
      alto,
    );
  }

  // Título
  doc.setTextColor(sobrePrimario[0], sobrePrimario[1], sobrePrimario[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIÓN', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, pageWidth / 2, 30, { align: 'center' });

  yPosition = 50;

  // ========== INFORMACIÓN DEL CLIENTE ==========
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Cliente', 15, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  
  doc.text(`Nombre: ${customerName}`, 15, yPosition);
  yPosition += 6;
  doc.text(`Email: ${customerEmail}`, 15, yPosition);
  yPosition += 6;
  if (customerPhone) {
    doc.text(`Teléfono: ${customerPhone}`, 15, yPosition);
    yPosition += 6;
  }

  yPosition += 5;

  // ========== DETALLES DEL EVENTO ==========
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalles del Evento', 15, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);

  const formattedDate = new Date(eventDate).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  doc.text(`Fecha: ${formattedDate}`, 15, yPosition);
  yPosition += 6;
  doc.text(`Hora: ${eventTime}`, 15, yPosition);
  yPosition += 6;
  doc.text(`Número de personas: ${guests}`, 15, yPosition);
  yPosition += 6;
  if (location) {
    doc.text(`Ubicación: ${location}`, 15, yPosition);
    yPosition += 6;
  }

  yPosition += 10;

  // ========== OPCIONES DE EXPERIENCIAS ==========
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Opciones para tu Evento', 15, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text(
    `A continuación encontrarás ${experiences.length} ${experiences.length === 1 ? 'opción' : 'opciones diferentes'} preparadas para tu evento.`,
    15,
    yPosition,
    { maxWidth: pageWidth - 30 }
  );
  yPosition += 10;

  // Iterar sobre cada experiencia como una opción
  experiences.forEach((exp, index) => {
    // Verificar si necesitamos una nueva página
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Encabezado de la opción con fondo de color
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(15, yPosition - 5, pageWidth - 30, 10, 2, 2, 'F');
    
    doc.setTextColor(sobrePrimario[0], sobrePrimario[1], sobrePrimario[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`OPCIÓN ${index + 1}`, 20, yPosition);
    yPosition += 12;

    // Título de la experiencia
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(exp.title, 15, yPosition, { maxWidth: pageWidth - 30 });
    yPosition += 7;

    // Descripción
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    const descriptionLines = doc.splitTextToSize(exp.description, pageWidth - 30);
    doc.text(descriptionLines, 15, yPosition);
    yPosition += descriptionLines.length * 5 + 5;

    // Detalles en tabla
    autoTable(doc, {
      startY: yPosition,
      head: [['Detalle', 'Información']],
      body: [
        ['Duración', `${exp.duration} minutos`],
        ['Capacidad', `${exp.minCapacity || 1} - ${exp.capacity} personas`],
        ['Precio por persona', `$${exp.basePrice.toLocaleString('es-CO')} ${exp.currency}`],
        ['Precio total', `$${(exp.basePrice * guests).toLocaleString('es-CO')} ${exp.currency}`],
      ],
      theme: 'striped',
      headStyles: {
        fillColor: darkColor,
        fontSize: 10,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 10,
        textColor: lightGray,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: 15, right: 15 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPosition = (doc as any).lastAutoTable.finalY + 5;

    // Incluye (si hay)
    if (exp.includes && exp.includes.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text('✓ Esta opción incluye:', 15, yPosition);
      yPosition += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);

      exp.includes.forEach((item) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`• ${item}`, 20, yPosition, { maxWidth: pageWidth - 35 });
        yPosition += 5;
      });

      yPosition += 5;
    }

    // Línea separadora
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.line(15, yPosition, pageWidth - 15, yPosition);
    yPosition += 10;
  });

  // ========== NOTAS ADICIONALES ==========
  if (notes) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFillColor(254, 243, 199); // Yellow-100
    doc.roundedRect(15, yPosition - 5, pageWidth - 30, 5, 2, 2, 'F');
    
    doc.setTextColor(146, 64, 14); // Yellow-900
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('📝 Notas Adicionales', 20, yPosition);
    yPosition += 7;

    // Ajustar altura del rectángulo según el contenido
    const notesLines = doc.splitTextToSize(notes, pageWidth - 40);
    const notesHeight = notesLines.length * 5 + 10;
    
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(15, yPosition - 10, pageWidth - 30, notesHeight, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 53, 15); // Yellow-800
    doc.text(notesLines, 20, yPosition);
    yPosition += notesHeight + 5;
  }

  // ========== FOOTER ==========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Línea superior del footer
    const footerY = doc.internal.pageSize.getHeight() - 25;
    doc.setDrawColor(229, 231, 235);
    doc.line(15, footerY, pageWidth - 15, footerY);
    
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175); // Gray-400
    doc.setFont('helvetica', 'normal');
    
    // Texto del footer
    doc.text(
      `Cotización válida por 7 días • Los precios están sujetos a disponibilidad`,
      pageWidth / 2,
      footerY + 7,
      { align: 'center' }
    );
    
    doc.text(
      `Preparado por ${hostName} • ${companyName}`,
      pageWidth / 2,
      footerY + 12,
      { align: 'center' }
    );
    
    // Número de página
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - 15,
      footerY + 17,
      { align: 'right' }
    );
  }

  // ========== GUARDAR PDF ==========
  const fileName = `Cotizacion_${customerName.replace(/\s+/g, '_')}_${new Date(eventDate).toLocaleDateString('es-ES').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};


