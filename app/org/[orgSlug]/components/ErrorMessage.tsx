interface ErrorMessageProps {
  message: string
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-2xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-slate-800">Ocorreu um erro</h1>
        <p className="text-slate-600 mb-6">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
