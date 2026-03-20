export default function NoAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin acceso</h1>
        <p className="text-gray-500 mb-6">
          Tu cuenta no tiene una membresía activa en ninguna organización.
          Contacta al administrador de tu empresa.
        </p>
        <a
          href="/login"
          className="inline-block bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
        >
          Volver al login
        </a>
      </div>
    </div>
  )
}
