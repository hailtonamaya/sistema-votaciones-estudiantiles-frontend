import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { AdminLayout } from "@/components/AdminLayout"
import { StatCard } from "@/components/StatCard"
import { TabBar } from "@/components/TabBar"
import { useAuth } from "@/context/AuthContext"
import { useClickOutside } from "@/lib/useClickOutside"
import {
  getElections,
  getDashboard,
  getPrediction,
  getInsights,
  type DashboardData,
  type Prediction,
  type Insights,
  type ElectionSummary,
  type HourlyPoint,
} from "@/services/results.service"
import {
  ELECTION_STATUS_LABELS,
  ELECTION_STATUS_COLORS,
  formatPercent,
  renderMarkdown,
  toPercent,
} from "@/lib/elections"
import { BRAND, ACCENT } from "@/lib/brand"
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  Clock,
  GraduationCap,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  FileText,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from "lucide-react"

const ASSOC_COLORS = [BRAND, ACCENT, "#1D4ED8", "#7C3AED", "#0891B2", "#059669"]

function HourlyChart({ data }: { data: HourlyPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-sm text-gray-400">Sin datos de participación por hora</p>
      </div>
    )
  }
  const W = 380
  const H = 180
  const PAD = { top: 12, right: 10, bottom: 30, left: 30 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...data.map((d) => d.cumulative), 1)
  const GRID = 4

  const pts = data.map((d, i) => ({
    x: PAD.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: PAD.top + (1 - d.cumulative / maxVal) * chartH,
    d,
  }))

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const area =
    pts.length > 1
      ? `${line} L ${pts[pts.length - 1].x} ${PAD.top + chartH} L ${pts[0].x} ${PAD.top + chartH} Z`
      : ""

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {Array.from({ length: GRID + 1 }).map((_, i) => {
        const frac = i / GRID
        const y = PAD.top + frac * chartH
        const val = Math.round(maxVal * (1 - frac))
        return (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={y}
              x2={W - PAD.right}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4"
            />
            <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
              {val}
            </text>
          </g>
        )
      })}
      {area && <path d={area} fill={ACCENT} fillOpacity="0.08" />}
      <path
        d={line}
        fill="none"
        stroke={ACCENT}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={ACCENT} stroke="white" strokeWidth="1.5" />
      ))}
      {pts.map((p, i) => {
        if (data.length > 8 && i % 2 !== 0) return null
        return (
          <text key={i} x={p.x} y={H - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {p.d.label}
          </text>
        )
      })}
    </svg>
  )
}

function CardHeader({
  title,
  subtitle,
  icon,
}: {
  title: string
  subtitle: string
  icon: ReactNode
}) {
  return (
    <div className="mb-3 flex items-start justify-between">
      <div>
        <p className="text-sm font-semibold" style={{ color: BRAND }}>
          {title}
        </p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-light"
        style={{ color: BRAND }}
      >
        {icon}
      </div>
    </div>
  )
}

export default function AdminResultados() {
  const { token } = useAuth()

  const [elections, setElections] = useState<ElectionSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [elecOpen, setElecOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [insights, setInsights] = useState<Insights | null>(null)

  const [loadingElections, setLoadingElections] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState("resumen")

  const elecRef = useClickOutside<HTMLDivElement>(useCallback(() => setElecOpen(false), []))

  // Load elections list
  useEffect(() => {
    if (!token) return
    setFetchError(null)
    getElections(token)
      .then((elecs) => {
        setElections(elecs)
        const best =
          elecs.find((e) => e.status === "open") ??
          elecs.find((e) => e.status === "closed") ??
          elecs[0] ??
          null
        if (best) setSelectedId(best.election_id)
      })
      .catch((e) =>
        setFetchError(e instanceof Error ? e.message : "Error al cargar las elecciones"),
      )
      .finally(() => setLoadingElections(false))
  }, [token])

  // Load data whenever election or refreshKey changes
  useEffect(() => {
    if (!selectedId || !token) return
    setLoadingData(true)
    setDashboard(null)
    setPrediction(null)
    setInsights(null)
    setAiError(null)

    Promise.all([getDashboard(selectedId, token), getPrediction(selectedId, token)])
      .then(([dash, pred]) => {
        setDashboard(dash)
        setPrediction(pred)
      })
      .catch((e) =>
        setFetchError(e instanceof Error ? e.message : "Error al cargar los resultados"),
      )
      .finally(() => setLoadingData(false))

    setLoadingAI(true)
    getInsights(selectedId, token)
      .then(setInsights)
      .catch((e) => setAiError(e?.message ?? "No se pudo generar el resumen"))
      .finally(() => setLoadingAI(false))
  }, [selectedId, token, refreshKey])

  const selectedElection = useMemo(
    () => elections.find((e) => e.election_id === selectedId) ?? null,
    [elections, selectedId],
  )

  const renderedSummary = useMemo(
    () => (insights ? renderMarkdown(insights.summary) : null),
    [insights],
  )

  const tabs = [
    { id: "resumen", label: "Resumen", icon: <LayoutDashboard size={14} /> },
    { id: "planillas", label: "Planillas", icon: <ListOrdered size={14} /> },
    { id: "escrutinio", label: "Escrutinio", icon: <FileText size={14} /> },
  ]

  if (loadingElections) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: BRAND }}>
            Resultados
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {selectedElection
              ? `${selectedElection.title} — ${ELECTION_STATUS_LABELS[selectedElection.status] ?? selectedElection.status}`
              : "Selecciona una elección para ver sus resultados"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {selectedElection && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{
                backgroundColor:
                  ELECTION_STATUS_COLORS[selectedElection.status] ?? "#475569",
              }}
            >
              {ELECTION_STATUS_LABELS[selectedElection.status] ?? selectedElection.status}
            </span>
          )}

          {selectedId && (
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loadingData}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm transition hover:border-gray-300 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingData ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          )}

          {/* Election picker */}
          <div ref={elecRef} className="relative">
            <button
              onClick={() => setElecOpen((p) => !p)}
              aria-haspopup="listbox"
              aria-expanded={elecOpen}
              className="flex min-w-[200px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:border-gray-300"
            >
              <span className="flex-1 truncate text-left">
                {selectedElection?.title ?? "Seleccionar elección"}
              </span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
            {elecOpen && (
              <div
                role="listbox"
                aria-label="Seleccionar elección"
                className="absolute right-0 top-full z-20 mt-1 max-h-60 w-72 overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-xl"
              >
                {elections.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-400">Sin elecciones registradas</p>
                ) : (
                  elections.map((e) => (
                    <button
                      key={e.election_id}
                      role="option"
                      aria-selected={selectedId === e.election_id}
                      onClick={() => {
                        setSelectedId(e.election_id)
                        setElecOpen(false)
                        setActiveTab("resumen")
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="truncate">{e.title}</span>
                      <span
                        className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                        style={{
                          backgroundColor: ELECTION_STATUS_COLORS[e.status] ?? "#475569",
                        }}
                      >
                        {ELECTION_STATUS_LABELS[e.status] ?? e.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {fetchError}
        </div>
      )}

      {elections.length === 0 && (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3 px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-light">
              <BarChart2 size={28} style={{ color: BRAND }} />
            </div>
            <p className="font-semibold" style={{ color: BRAND }}>
              Sin elecciones registradas
            </p>
            <p className="text-sm text-gray-400">
              Crea una elección para comenzar a ver resultados
            </p>
          </div>
        </div>
      )}

      {elections.length > 0 && (
        <>
          <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {loadingData ? (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-sm">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 size={28} className="animate-spin" />
                <span className="text-sm">Cargando resultados…</span>
              </div>
            </div>
          ) : !dashboard ? (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-white shadow-sm">
              <p className="text-sm text-gray-400">
                Selecciona una elección para ver los resultados
              </p>
            </div>
          ) : (
            <>
              {/* TAB: RESUMEN */}
              {activeTab === "resumen" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
                    <StatCard
                      label="Elegibles"
                      value={dashboard.totals.eligible}
                      icon={<Users size={15} />}
                      color={BRAND}
                    />
                    <StatCard
                      label="Votaron"
                      value={dashboard.totals.voted}
                      icon={<CheckCircle2 size={15} />}
                      color="#16A34A"
                    />
                    <StatCard
                      label="Pendientes"
                      value={dashboard.totals.pending}
                      icon={<Clock size={15} />}
                      color="#A16207"
                    />
                    <StatCard
                      label="Participación"
                      value={formatPercent(dashboard.totals.turnout)}
                      icon={<TrendingUp size={15} />}
                      color={ACCENT}
                    />
                    <StatCard
                      label="Votos válidos"
                      value={dashboard.totals.valid_votes}
                      icon={<BarChart2 size={15} />}
                      color="#1D4ED8"
                    />
                    <StatCard
                      label="Votos en blanco"
                      value={dashboard.totals.blank_votes}
                      icon={<XCircle size={15} />}
                      color="#94A3B8"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {/* Association bars */}
                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                      <CardHeader
                        title="Votos por Planilla"
                        subtitle="Distribución actual de votos"
                        icon={<Trophy size={18} />}
                      />
                      {dashboard.by_association.length === 0 ? (
                        <p className="py-10 text-center text-sm text-gray-400">
                          Sin votos registrados aún
                        </p>
                      ) : (
                        <div className="space-y-3.5">
                          {dashboard.by_association.map((a, i) => {
                            const color = ASSOC_COLORS[i % ASSOC_COLORS.length]
                            const share = toPercent(a.share)
                            return (
                              <div key={a.association_id}>
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span
                                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                      style={{ backgroundColor: color }}
                                    >
                                      {i + 1}
                                    </span>
                                    <span className="truncate text-xs font-medium text-gray-700">
                                      {a.name}
                                    </span>
                                  </div>
                                  <span
                                    className="shrink-0 text-xs font-semibold"
                                    style={{ color }}
                                  >
                                    {a.votes}{" "}
                                    <span className="font-normal text-gray-400">
                                      ({formatPercent(a.share)})
                                    </span>
                                  </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-gray-100">
                                  <div
                                    className="h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${share}%`, backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Hourly line chart */}
                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                      <CardHeader
                        title="Participación por Hora"
                        subtitle="Votos acumulados durante la jornada"
                        icon={<TrendingUp size={18} />}
                      />
                      <HourlyChart data={dashboard.turnout_by_hour} />
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <CardHeader
                      title="Resumen Ejecutivo (IA)"
                      subtitle="Análisis generado automáticamente por el asistente"
                      icon={<Sparkles size={18} />}
                    />
                    {loadingAI ? (
                      <div className="flex h-24 flex-col items-center justify-center gap-2 text-gray-400">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-xs">Generando análisis…</span>
                      </div>
                    ) : aiError ? (
                      <p className="py-6 text-center text-sm text-gray-400">{aiError}</p>
                    ) : renderedSummary ? (
                      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                        {renderedSummary}
                      </div>
                    ) : (
                      <p className="py-6 text-center text-sm text-gray-400">
                        Sin datos para analizar.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: PLANILLAS */}
              {activeTab === "planillas" && (
                <div className="space-y-4">
                  {prediction?.has_enough_data && prediction.projected_winner && (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm">
                      <Trophy size={18} className="shrink-0 text-green-700" />
                      <span className="text-sm font-semibold text-green-800">
                        Líder proyectado: {prediction.projected_winner.name}
                      </span>
                      <span className="rounded-full bg-green-200 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        {prediction.confidence_label}
                      </span>
                      <span className="ml-auto text-xs text-green-700">
                        Probabilidad de victoria:{" "}
                        <strong>
                          {formatPercent(prediction.projected_winner.win_probability)}
                        </strong>
                      </span>
                    </div>
                  )}

                  {dashboard.by_association.length === 0 ? (
                    <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-white shadow-sm">
                      <p className="text-sm text-gray-400">Sin votos registrados aún</p>
                    </div>
                  ) : (
                    dashboard.by_association.map((assoc, i) => {
                      const color = ASSOC_COLORS[i % ASSOC_COLORS.length]
                      const share = toPercent(assoc.share)
                      const isLeader = i === 0
                      const proj = prediction?.projection?.find(
                        (p) => p.association_id === assoc.association_id,
                      )
                      return (
                        <div
                          key={assoc.association_id}
                          className="rounded-2xl bg-white p-5 shadow-sm"
                          style={
                            isLeader
                              ? { borderLeft: `4px solid ${ACCENT}` }
                              : { borderLeft: "4px solid transparent" }
                          }
                        >
                          <div className="flex flex-wrap items-start gap-4">
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold text-white"
                              style={{ backgroundColor: color }}
                            >
                              {i === 0 ? <Trophy size={20} /> : <span className="text-lg">{i + 1}</span>}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-bold" style={{ color: BRAND }}>
                                  {assoc.name}
                                </p>
                                {isLeader && (
                                  <span
                                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                    style={{ backgroundColor: ACCENT }}
                                  >
                                    LÍDER
                                  </span>
                                )}
                                {assoc.career_name && (
                                  <span className="text-xs text-gray-400">{assoc.career_name}</span>
                                )}
                              </div>
                              <div className="mt-2.5 h-2.5 w-full rounded-full bg-gray-100">
                                <div
                                  className="h-2.5 rounded-full transition-all duration-500"
                                  style={{ width: `${share}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>

                            <div className="flex shrink-0 items-start gap-6 text-right">
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                  Votos
                                </p>
                                <p className="text-2xl font-bold" style={{ color }}>
                                  {assoc.votes}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-400">
                                  Cuota
                                </p>
                                <p className="text-2xl font-bold text-gray-700">
                                  {formatPercent(assoc.share)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {proj && (
                            <div
                              className="mt-3 flex items-center gap-2 rounded-xl bg-bg-light px-3 py-2 text-xs text-gray-600"
                            >
                              <TrendingUp size={12} style={{ color: BRAND }} />
                              <span>
                                Proyección final estimada:{" "}
                                <strong>
                                  {proj.projected_votes_low}–{proj.projected_votes_high}
                                </strong>{" "}
                                votos
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}

                  {prediction && prediction.anomalies.length > 0 && (
                    <div className="rounded-2xl bg-amber-50 p-5 shadow-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-600" />
                        <p className="text-sm font-semibold text-amber-700">
                          Anomalías detectadas en la participación
                        </p>
                      </div>
                      <div className="space-y-2">
                        {prediction.anomalies.map((a, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                            <span className="mt-0.5 shrink-0 font-semibold">{a.label}:</span>
                            <span>{a.note}</span>
                            <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 font-mono text-amber-600">
                              z={a.z_score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ESCRUTINIO */}
              {activeTab === "escrutinio" && (
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: BRAND }}>
                          Escrutinio por Carrera
                        </p>
                        <p className="text-xs text-gray-400">
                          Participación detallada por facultad
                        </p>
                      </div>
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-light"
                        style={{ color: BRAND }}
                      >
                        <GraduationCap size={18} />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px]">
                        <thead>
                          <tr className="bg-blue-100">
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Carrera
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Elegibles
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Votaron
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Pendientes
                            </th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Participación
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dashboard.by_career.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-5 py-10 text-center text-sm text-gray-400"
                              >
                                Sin datos de carreras
                              </td>
                            </tr>
                          ) : (
                            dashboard.by_career.map((c) => {
                              const tp = toPercent(c.turnout)
                              return (
                                <tr
                                  key={c.career_id}
                                  className="transition-colors hover:bg-gray-50"
                                >
                                  <td className="px-5 py-3">
                                    <p className="text-sm font-medium text-gray-800">
                                      {c.career_name}
                                    </p>
                                    <p className="text-xs text-gray-400">{c.career_code}</p>
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                                    {c.eligible}
                                  </td>
                                  <td
                                    className="px-4 py-3 text-right text-sm font-semibold"
                                    style={{ color: "#16A34A" }}
                                  >
                                    {c.voted}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                                    {c.eligible - c.voted}
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 flex-1 rounded-full bg-gray-100">
                                        <div
                                          className="h-2 rounded-full"
                                          style={{ width: `${tp}%`, backgroundColor: ACCENT }}
                                        />
                                      </div>
                                      <span className="w-12 shrink-0 text-right text-xs font-semibold text-gray-700">
                                        {tp.toFixed(1)}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>

                        {dashboard.by_career.length > 0 && (
                          <tfoot>
                            <tr className="border-t-2 border-gray-200 bg-slate-50">
                              <td className="px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                                Total
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                                {dashboard.totals.eligible}
                              </td>
                              <td
                                className="px-4 py-3 text-right text-sm font-bold"
                                style={{ color: "#16A34A" }}
                              >
                                {dashboard.totals.voted}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-bold text-gray-500">
                                {dashboard.totals.pending}
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 flex-1 rounded-full bg-gray-100">
                                    <div
                                      className="h-2 rounded-full"
                                      style={{
                                        width: `${toPercent(dashboard.totals.turnout)}%`,
                                        backgroundColor: BRAND,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className="w-12 shrink-0 text-right text-xs font-bold"
                                    style={{ color: BRAND }}
                                  >
                                    {toPercent(dashboard.totals.turnout).toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* Association horizontal bar chart */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <CardHeader
                      title="Distribución de Votos por Planilla"
                      subtitle="Vista comparativa de todas las planillas"
                      icon={<BarChart2 size={18} />}
                    />
                    {dashboard.by_association.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-400">
                        Sin votos registrados aún
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dashboard.by_association.map((a, i) => {
                          const color = ASSOC_COLORS[i % ASSOC_COLORS.length]
                          const share = toPercent(a.share)
                          return (
                            <div key={a.association_id} className="flex items-center gap-3">
                              <span className="w-32 shrink-0 truncate text-xs font-medium text-gray-700 sm:w-40">
                                {a.name}
                              </span>
                              <div className="h-6 flex-1 overflow-hidden rounded-lg bg-gray-100">
                                <div
                                  className="flex h-6 items-center rounded-lg pl-2 transition-all duration-500"
                                  style={{
                                    width: `${share}%`,
                                    backgroundColor: color,
                                    minWidth: a.votes > 0 ? "28px" : "0",
                                  }}
                                >
                                  {a.votes > 0 && (
                                    <span className="text-[10px] font-bold text-white">
                                      {a.votes}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="w-12 shrink-0 text-right text-xs font-semibold text-gray-600">
                                {formatPercent(a.share)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </AdminLayout>
  )
}
