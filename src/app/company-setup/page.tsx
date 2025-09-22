import CompanySetupForm from '@/components/CompanySetupForm';
import CompanySetupGuard from '@/components/CompanySetupGuard';
import FiloLogo from '@/components/FiloLogo';

export default function CompanySetupPage() {
  return (
    <CompanySetupGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header con logo */}
            <div className="text-center mb-8">
              <FiloLogo className="w-32 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-[#334C5D] mb-2">
                ¡Bienvenido a Tenemos Filo!
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Para comenzar a usar la plataforma, necesitamos conocer información básica 
                sobre tu empresa. Esto nos ayudará a personalizar tu experiencia.
              </p>
            </div>

            {/* Formulario */}
            <CompanySetupForm />

            {/* Información adicional */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                ¿Necesitas ayuda? Contacta a nuestro equipo de soporte.
              </p>
            </div>
          </div>
        </div>
      </div>
    </CompanySetupGuard>
  );
}
