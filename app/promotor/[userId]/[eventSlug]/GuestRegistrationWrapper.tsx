'use client'

import { useState } from 'react'
import GuestRegistrationForm from './GuestRegistrationForm'

interface GuestRegistrationWrapperProps {
  eventId: string
  promoterId: string
  eventTitle: string
}

export default function GuestRegistrationWrapper({ eventId, promoterId, eventTitle }: GuestRegistrationWrapperProps) {
  const [showingQRCode, setShowingQRCode] = useState(false)

  return (
    <div className="border-t border-slate-200 pt-6 sm:pt-8">
      {!showingQRCode && (
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            Registo Guest List
          </h2>
        </div>
      )}
      
      <GuestRegistrationForm
        eventId={eventId}
        promoterId={promoterId}
        eventTitle={eventTitle}
        onShowQRCode={setShowingQRCode}
      />
    </div>
  )
}