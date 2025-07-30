import React from 'react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* Contenido principal */}
      <main>
        {children}
      </main>
      
      {/* Footer con copyright */}
      <footer className="py-4 text-center text-gray-500 text-xs border-t border-gray-200 space-y-1">
        <p>&copy; 2025 Tenemos Filo. Todos los derechos reservados.</p>
        <p>
           Filo App v.1.0.0
        </p>
      </footer>
    </div>
  )
}
