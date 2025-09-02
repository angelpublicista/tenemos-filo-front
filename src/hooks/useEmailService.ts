import { useState } from 'react';

interface EmailRequest {
  type: 'welcome' | 'password-reset' | 'email-verification';
  email: string;
  name?: string;
  role?: 'guest' | 'host';
  token?: string;
}

interface EmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
  error?: string;
}

export const useEmailService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async (emailData: EmailRequest): Promise<EmailResponse> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error enviando email');
      }

      return {
        success: true,
        message: data.message,
        messageId: data.messageId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
        message: 'Error enviando email',
      };
    } finally {
      setLoading(false);
    }
  };

  const sendWelcomeEmail = async (email: string, name: string, role: 'guest' | 'host') => {
    return sendEmail({
      type: 'welcome',
      email,
      name,
      role,
    });
  };

  const sendPasswordResetEmail = async (email: string, token: string) => {
    return sendEmail({
      type: 'password-reset',
      email,
      token,
    });
  };

  const sendEmailVerification = async (email: string, token: string) => {
    return sendEmail({
      type: 'email-verification',
      email,
      token,
    });
  };

  return {
    sendEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendEmailVerification,
    loading,
    error,
  };
};
