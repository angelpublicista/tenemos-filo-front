"use client";

import Navbar from '@/components/Dashboard/Navbar'
import Sidebar from '@/components/Dashboard/Sidebar'
import MobileFAB from '@/components/Dashboard/MobileFAB'
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner'
import GuardiaDeSuscripcion from '@/components/Suscripcion/GuardiaDeSuscripcion'
import React, { useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    // Con la suscripción vencida el panel se cierra: solo queda la pantalla de
    // pago, sin menú ni accesos a nada más.
    <GuardiaDeSuscripcion
      bloqueado={
        <div className="min-h-screen bg-gray-50">
          <Navbar onToggleSidebar={() => undefined} />
          <main className="p-3 sm:p-4 md:p-6">{children}</main>
        </div>
      }
    >
      <div className="min-h-screen bg-gray-50">
        <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex h-[calc(100vh-64px)]">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 overflow-auto min-w-0">
            <div className="p-3 sm:p-4 md:p-6">
              <EmailVerificationBanner />
              {children}
            </div>
          </main>
        </div>

        <MobileFAB hidden={sidebarOpen} />
      </div>
    </GuardiaDeSuscripcion>
  )
}
