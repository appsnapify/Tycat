import { Loader2 } from 'lucide-react'

export default function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-4" />
        <p className="text-slate-600 text-lg">Carregando organização...</p>
      </div>
    </div>
  )
}
