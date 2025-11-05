import { Experience } from '@/types';

interface QuoteEmailData {
  quoteId: string;
  customerName: string;
  customerEmail: string;
  hostName: string;
  companyName: string;
  experiences: Experience[];
  eventDate: string;
  eventTime: string;
  guests: number;
  location?: string;
  notes?: string;
  totals: {
    subtotal: number;
    total: number;
  };
}

export const sendQuoteEmail = async (data: QuoteEmailData): Promise<void> => {
  try {
    console.log('🔄 Iniciando envío de cotización...');
    
    const response = await fetch('/api/send-quote-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    console.log('📨 Respuesta del servidor:', result);

    if (!response.ok) {
      throw new Error(result.message || 'Error al enviar el email');
    }

    console.log('✅ Email enviado correctamente');
    return result;
  } catch (error) {
    console.error('❌ Error en sendQuoteEmail:', error);
    throw error;
  }
};





