'use client'

import { useEffect } from 'react'

export default function ScannerServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/scanner-sw.js')
        .then(() => console.log('Scanner SW registered'))
        .catch(() => console.log('Scanner SW registration failed'))
    }
  }, [])

  return null
} 