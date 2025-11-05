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
    const response = await fetch('/api/send-quote-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al enviar el email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending quote email:', error);
    throw error;
  }
};



