import { Fragment, useEffect, useState } from "react"
import { AuditorLayout } from "@/components/AuditorLayout"
import { useAuth } from "@/context/AuthContext"
import {
  listAuditLog,
  getAuditLogFilters,
  type AuditLogEntry,
  type AuditLogFilterOptions,
} from "@/services/audit.service"
import { actionLabel, describeEntry } from "@/lib/auditLog"
import { BRAND } from "@/lib/brand"
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileSearch,
  Loader2,
} from "lucide-react"

const PAGE_SIZE = 50

const ACTION_COLORS: Record<string, string> = {
  create: "#16A34A",
  bulk_import: "#16A34A",
  update: "#1D4ED8",
  transition: "#7C3AED",
  delete: "#DC2626",
  invalid: "#DC2626",
  blocked: "#DC2626",
  inactive: "#DC2626",
  unknown_email: "#D97706",
}

function actionColor(action: string): string {
  for (const key of Object.keys(ACTION_COLORS)) {
    if (action.includes(key)) return ACTION_COLORS[key]
  }
  return "#475569"
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function MetadataView({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <p className="text-xs text-gray-400">Sin detalles adicionales</p>
  }

  const before = metadata.before as Record<string, unknown> | undefined
  const after = metadata.after as Record<string, unknown> | undefined

  if (before && after) {
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-400">
            <th className="pb-1 pr-4 font-medium">Campo</th>
            <th className="pb-1 pr-4 font-medium">Antes</th>
            <th className="pb-1 font-medium">Después</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k} className="border-t border-gray-100">
              <td className="py-1 pr-4 font-medium text-gray-600">{k}</td>
              <td className="py-1 pr-4 text-red-600">{JSON.stringify(before[k]) ?? "—"}</td>
              <td className="py-1 text-green-700">{JSON.stringify(after[k]) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <pre className="max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-gray-600">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  )
}

export default function AuditorLog() {
  const { token } = useAuth()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [filterOptions, setFilterOptions] = useState<AuditLogFilterOptions>({ actions: [], entity_types: [] })
  const [entityType, setEntityType] = useState("")
  const [action, setAction] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [includeAi, setIncludeAi] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getAuditLogFilters(token).then(setFilterOptions).catch(() => {})
  }, [token])

  useEffect(() => {
    if (!token) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    listAuditLog(token, {
      entity_type: entityType || undefined,
      action: action || undefined,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(to).toISOString() : undefined,
      exclude_ai: !includeAi,
      limit: PAGE_SIZE,
      offset,
    })
      .then((res) => {
        setEntries(res.data)
        setTotal(res.meta.total)
        setError(null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar el registro de auditoría"))
      .finally(() => setLoading(false))
  }, [token, entityType, action, from, to, includeAi, offset])

  function resetFiltersAnd(fn: () => void) {
    setOffset(0)
    fn()
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <AuditorLayout>
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: BRAND }}>Registro de Auditoría</h1>
        <p className="mt-1 text-sm text-gray-500">Historial de acciones realizadas dentro del sistema.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <select
          value={entityType}
          onChange={(e) => resetFiltersAnd(() => setEntityType(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm outline-none focus:border-blue-400"
        >
          <option value="">Todas las entidades</option>
          {filterOptions.entity_types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={action}
          onChange={(e) => resetFiltersAnd(() => setAction(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm outline-none focus:border-blue-400"
        >
          <option value="">Todas las acciones</option>
          {filterOptions.actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => resetFiltersAnd(() => setFrom(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm outline-none focus:border-blue-400"
          title="Desde"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => resetFiltersAnd(() => setTo(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm outline-none focus:border-blue-400"
          title="Hasta"
        />

        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={includeAi}
            onChange={(e) => resetFiltersAnd(() => setIncludeAi(e.target.checked))}
            className="h-3.5 w-3.5 rounded border-gray-300"
          />
          Incluir uso de IA
        </label>

        {(entityType || action || from || to || includeAi) && (
          <button
            onClick={() => resetFiltersAnd(() => { setEntityType(""); setAction(""); setFrom(""); setTo(""); setIncludeAi(false) })}
            className="text-xs font-medium text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
          >
            Limpiar filtros
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">{total} registro{total !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actividad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">IP</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <Loader2 size={22} className="mx-auto animate-spin text-gray-400" />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <FileSearch size={24} />
                      <span className="text-sm">Sin registros para estos filtros</span>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const isOpen = expandedId === e.audit_id
                  return (
                    <Fragment key={e.audit_id}>
                      <tr
                        onClick={() => setExpandedId(isOpen ? null : e.audit_id)}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(e.created_at)}</td>
                        <td className="px-4 py-3">
                          {e.user_full_name ? (
                            <>
                              <p className="text-sm font-medium text-gray-800">{e.user_full_name}</p>
                              <p className="text-xs text-gray-400">{e.user_role}</p>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Anónimo</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: actionColor(e.action) }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800">{actionLabel(e.action)}</p>
                              <p className="truncate text-xs text-gray-400">
                                {describeEntry(e) ?? e.entity_type}
                                <span className="ml-1.5 font-mono text-[10px] text-gray-300">{e.action}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{e.ip_address ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-400">
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50 px-5 py-4">
                            <MetadataView metadata={e.metadata} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
            <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                disabled={offset === 0}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:border-gray-300 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <button
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:border-gray-300 disabled:opacity-40"
              >
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AuditorLayout>
  )
}
