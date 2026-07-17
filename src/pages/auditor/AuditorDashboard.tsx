import { Link } from "react-router-dom"
import { AuditorLayout } from "@/components/AuditorLayout"
import { useAuth } from "@/context/AuthContext"
import { FileSearch } from "lucide-react"

export default function AuditorDashboard() {
  const { user } = useAuth()

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches"

  return (
    <AuditorLayout>
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">{greeting}, bienvenido</p>
            <h1 className="mt-1 text-2xl font-bold">{user?.name}</h1>
            <p className="mt-2 text-sm text-white/70">
              Tienes acceso de solo lectura al registro de auditoría del sistema.
            </p>
          </div>
          <div className="hidden md:flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10">
            <FileSearch size={40} />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-400" />
            <span className="text-xs text-white/70">Sesión activa · {user?.email}</span>
          </div>
          <span className="text-white/30">·</span>
          <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-xs text-white/70">Solo lectura</span>
          </div>
        </div>
      </div>

      <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <svg className="mt-0.5 shrink-0 text-amber-600" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-800">Modo auditoría activo</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Puedes consultar el historial de acciones registradas en el sistema, pero no realizar modificaciones.
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Módulos disponibles</h2>
      <Link
        to="/auditor/log"
        className="group block max-w-md rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
          <FileSearch size={24} />
        </div>
        <h3 className="font-semibold text-gray-900 transition group-hover:text-amber-700">
          Registro de Auditoría
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Consulta el historial completo de acciones: quién hizo qué, cuándo, y qué cambió.
        </p>
      </Link>

      <div className="mt-10 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-center text-xs text-gray-400">
          Sistema de Votaciones Estudiantiles · UNITEC ·{" "}
          <span className="font-medium text-amber-700">Sesión como Auditor</span>
        </p>
      </div>
    </AuditorLayout>
  )
}
