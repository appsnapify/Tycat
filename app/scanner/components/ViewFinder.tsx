'use client'

export default function ViewFinder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative w-64 h-64">
        {/* Cantos do ViewFinder */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white" />
        
        {/* Linha de scan animada */}
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500 animate-scan" />
      </div>
    </div>
  )
} 