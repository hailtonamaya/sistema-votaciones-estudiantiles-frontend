import { useEffect, useState } from "react"
import { ObserverLayout } from "@/components/ObserverLayout"
import { useAuth } from "@/context/AuthContext"
import { listElections, listOrganizations, type ApiElection, type ApiOrganization } from "@/services/admin.service"
import { ELECTION_STATUS_LABELS, ELECTION_STATUS_COLORS } from "@/lib/elections"
import { BRAND } from "@/lib/brand"
import { AlertTriangle, Calendar, ChevronDown, ChevronUp, Landmark, Loader2 } from "lucide-react"

function formatDate(iso: string | null): string {
  if (!iso) return "Sin definir"
  return new Date(iso).toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function ObserverElecciones() {
  const { token } = useAuth()
  const [elections, setElections] = useState<ApiElection[]>([])
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    if (!token) return
    Promise.all([listElections(token), listOrganizations(token)])
      .then(([elecs, orgs]) => {
        setElections(elecs)
        setOrganizations(orgs)
        setError(null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar las elecciones"))
      .finally(() => setLoading(false))
  }, [token])

  const orgName = (id: string) => organizations.find((o) => o.organization_id === id)?.name ?? "—"

  const filtered = statusFilter ? elections.filter((e) => e.status === statusFilter) : elections

  return (
    <ObserverLayout>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND }}>Elecciones</h1>
          <p className="mt-1 text-sm text-gray-500">Consulta el estado y los detalles de los procesos electorales.</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm outline-none focus:border-blue-400"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ELECTION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-light">
              <Landmark size={28} style={{ color: BRAND }} />
            </div>
            <p className="font-semibold" style={{ color: BRAND }}>Sin elecciones registradas</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const isOpen = expandedId === e.election_id
            return (
              <div key={e.election_id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <button
                  onClick={() => setExpandedId(isOpen ? null : e.election_id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold" style={{ color: BRAND }}>{e.title}</p>
                    <p className="text-xs text-gray-400">{orgName(e.organization_id)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: ELECTION_STATUS_COLORS[e.status] ?? "#475569" }}
                    >
                      {ELECTION_STATUS_LABELS[e.status] ?? e.status}
                    </span>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    {e.description && (
                      <p className="mb-4 text-sm text-gray-600">{e.description}</p>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <Calendar size={16} className="mt-0.5 shrink-0 text-gray-400" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Inicio</p>
                          <p className="text-sm text-gray-700">{formatDate(e.start_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar size={16} className="mt-0.5 shrink-0 text-gray-400" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Cierre</p>
                          <p className="text-sm text-gray-700">{formatDate(e.end_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </ObserverLayout>
  )
}
