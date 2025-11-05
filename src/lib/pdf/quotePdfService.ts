import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Experience } from '@/types';

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
}

export const generateQuotePDF = (data: QuotePdfData): void => {
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
  } = data;

  // Crear documento PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Colores de marca
  const primaryColor = [242, 103, 38] as [number, number, number]; // #F26726
  const darkColor = [51, 76, 93] as [number, number, number]; // #334C5D
  const lightGray = [107, 114, 128] as [number, number, number]; // #6b7280

  // ========== HEADER ==========
  // Fondo degradado simulado con rectángulos
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Título
  doc.setTextColor(255, 255, 255);
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
    
    doc.setTextColor(255, 255, 255);
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
      doc.setTextColor(16, 185, 129); // Verde
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


