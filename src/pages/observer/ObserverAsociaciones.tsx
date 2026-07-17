import { useEffect, useState } from "react"
import { ObserverLayout } from "@/components/ObserverLayout"
import { useAuth } from "@/context/AuthContext"
import { listElections, listAssociations, type ApiElection, type ApiAssociation } from "@/services/admin.service"
import { BRAND } from "@/lib/brand"
import { resolveImageUrl } from "@/lib/api"
import { AlertTriangle, Loader2, User, Users } from "lucide-react"

export default function ObserverAsociaciones() {
  const { token } = useAuth()
  const [elections, setElections] = useState<ApiElection[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [associations, setAssociations] = useState<ApiAssociation[]>([])
  const [loadingElections, setLoadingElections] = useState(true)
  const [loadingAssoc, setLoadingAssoc] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    listElections(token)
      .then((elecs) => {
        setElections(elecs)
        const best = elecs.find((e) => e.status === "open") ?? elecs.find((e) => e.status === "closed") ?? elecs[0] ?? null
        if (best) setSelectedId(best.election_id)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar las elecciones"))
      .finally(() => setLoadingElections(false))
  }, [token])

  useEffect(() => {
    if (!token || !selectedId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingAssoc(true)
    listAssociations(token, { election_id: selectedId })
      .then((a) => { setAssociations(a); setError(null) })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar las asociaciones"))
      .finally(() => setLoadingAssoc(false))
  }, [token, selectedId])

  return (
    <ObserverLayout>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND }}>Asociaciones y Candidatos</h1>
          <p className="mt-1 text-sm text-gray-500">Planillas registradas y sus integrantes por elección.</p>
        </div>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="min-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm outline-none focus:border-blue-400"
        >
          {elections.length === 0 && <option value="">Sin elecciones</option>}
          {elections.map((e) => (
            <option key={e.election_id} value={e.election_id}>{e.title}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {loadingElections || loadingAssoc ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : associations.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-light">
              <Users size={28} style={{ color: BRAND }} />
            </div>
            <p className="font-semibold" style={{ color: BRAND }}>Sin planillas registradas</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {associations.map((a) => (
            <div key={a.association_id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                {a.logo_url ? (
                  <img src={resolveImageUrl(a.logo_url)} alt={a.name} className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl font-bold text-white" style={{ backgroundColor: BRAND }}>
                    {a.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold" style={{ color: BRAND }}>{a.name}</p>
                  {a.election_career?.career && (
                    <p className="truncate text-xs text-gray-400">{a.election_career.career.name}</p>
                  )}
                </div>
              </div>

              {a.description && (
                <p className="mb-3 text-xs text-gray-500">{a.description}</p>
              )}

              <div className="border-t border-gray-100 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Candidatos ({a.association_member?.length ?? 0})
                </p>
                {!a.association_member || a.association_member.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin candidatos registrados</p>
                ) : (
                  <ul className="space-y-2">
                    {a.association_member.map((m) => (
                      <li key={m.association_member_id} className="flex items-center gap-2">
                        {m.photo_url ? (
                          <img src={resolveImageUrl(m.photo_url)} alt={m.full_name} className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-light text-gray-400">
                            <User size={13} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-gray-800">{m.full_name}</p>
                          {m.role && <p className="truncate text-[10px] text-gray-400">{m.role}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ObserverLayout>
  )
}
