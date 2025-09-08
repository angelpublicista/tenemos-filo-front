import Navbar from '@/components/Dashboard/Navbar'
import Sidebar from '@/components/Dashboard/Sidebar'
import { EmailVerificationBanner } from '@/components/EmailVerificationBanner'
import React from 'react'

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-4">
            <EmailVerificationBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
