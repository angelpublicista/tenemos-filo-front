"use client";

import React, { useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface RecaptchaProps {
  onVerify: (token: string | null) => void;
  onExpire?: () => void;
  onError?: () => void;
}

interface RecaptchaRef {
  reset: () => void;
}

const RecaptchaComponent = React.forwardRef<RecaptchaRef, RecaptchaProps>(({ onVerify, onExpire, onError }, ref) => {
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const handleRecaptchaChange = (token: string | null) => {
    onVerify(token);
  };

  const handleRecaptchaExpire = () => {
    if (onExpire) {
      onExpire();
    }
    // Limpiar el componente
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  };

  const handleRecaptchaError = () => {
    if (onError) {
      onError();
    }
  };

  const resetRecaptcha = () => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  };

  // Exponer la función reset para uso externo
  React.useImperativeHandle(ref, () => ({
    reset: resetRecaptcha,
  }));

  return (
    <div className="flex justify-center mb-4">
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
        onChange={handleRecaptchaChange}
        onExpired={handleRecaptchaExpire}
        onErrored={handleRecaptchaError}
        theme="light"
        size="normal"
        type="image"
      />
    </div>
  );
});

RecaptchaComponent.displayName = 'RecaptchaComponent';

export default RecaptchaComponent;
