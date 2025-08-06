'use client'

import { useState } from 'react'

interface EventDescriptionProps {
  description: string
}

export default function EventDescription({ description }: EventDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldShowButton = description.length > 150
  
  return (
    <div className="max-w-2xl mx-auto">
      <p className={`text-slate-600 leading-relaxed text-base sm:text-lg ${isExpanded ? '' : 'line-clamp-3'}`}>
        {description}
      </p>
      {shouldShowButton && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-emerald-600 hover:text-emerald-700 font-medium text-sm mt-3 transition-colors"
        >
          {isExpanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  )
}