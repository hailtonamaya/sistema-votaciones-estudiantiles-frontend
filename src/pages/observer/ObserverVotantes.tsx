import { useEffect, useMemo, useState } from "react"
import { ObserverLayout } from "@/components/ObserverLayout"
import { useAuth } from "@/context/AuthContext"
import { listElections, listVoters, type ApiElection, type ApiVoter } from "@/services/admin.service"
import { BRAND, ACCENT } from "@/lib/brand"
import { AlertTriangle, CheckCircle2, Clock, Loader2, Search, Users } from "lucide-react"

export default function ObserverVotantes() {
  const { token } = useAuth()
  const [elections, setElections] = useState<ApiElection[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [voters, setVoters] = useState<ApiVoter[]>([])
  const [loadingElections, setLoadingElections] = useState(true)
  const [loadingVoters, setLoadingVoters] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "voted" | "pending">("all")

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
    setLoadingVoters(true)
    listVoters(token, selectedId)
      .then((v) => { setVoters(v); setError(null) })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar el padrón"))
      .finally(() => setLoadingVoters(false))
  }, [token, selectedId])

  const filtered = useMemo(() => {
    return voters.filter((v) => {
      if (statusFilter === "voted" && !v.has_voted) return false
      if (statusFilter === "pending" && v.has_voted) return false
      if (search) {
        const q = search.toLowerCase()
        const name = v.voter?.full_name?.toLowerCase() ?? ""
        const id = v.voter?.institutional_id?.toLowerCase() ?? ""
        const email = v.voter?.email?.toLowerCase() ?? ""
        if (!name.includes(q) && !id.includes(q) && !email.includes(q)) return false
      }
      return true
    })
  }, [voters, search, statusFilter])

  const votedCount = voters.filter((v) => v.has_voted).length

  return (
    <ObserverLayout>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND }}>Padrón Electoral</h1>
          <p className="mt-1 text-sm text-gray-500">Consulta de votantes habilitados y su estado de participación.</p>
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

      {loadingElections ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : elections.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-white shadow-sm">
          <p className="text-sm text-gray-400">Sin elecciones registradas</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-light" style={{ color: BRAND }}>
              <Users size={18} />
            </div>
            <div className="mr-auto">
              <p className="text-sm font-semibold" style={{ color: BRAND }}>{voters.length} votantes habilitados</p>
              <p className="text-xs text-gray-400">
                {votedCount} han votado · {voters.length - votedCount} pendientes
              </p>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, carnet o correo"
                className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm outline-none focus:border-blue-400"
            >
              <option value="all">Todos</option>
              <option value="voted">Ya votaron</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estudiante</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Carnet</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Carrera</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingVoters ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center">
                        <Loader2 size={22} className="mx-auto animate-spin text-gray-400" />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-400">Sin resultados</td>
                    </tr>
                  ) : (
                    filtered.map((v) => (
                      <tr key={v.election_voter_id} className="transition-colors hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-gray-800">{v.voter?.full_name ?? "—"}</p>
                          <p className="text-xs text-gray-400">{v.voter?.email ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{v.voter?.institutional_id ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{v.career?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          {v.has_voted ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                              <CheckCircle2 size={12} /> Votó
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: ACCENT + "1a", color: ACCENT }}>
                              <Clock size={12} /> Pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </ObserverLayout>
  )
}
