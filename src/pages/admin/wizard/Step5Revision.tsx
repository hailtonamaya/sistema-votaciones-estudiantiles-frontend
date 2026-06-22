import { useEffect, useState } from "react"
import { ChevronRight, Loader2, Save } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { ErrorBanner } from "@/components/ErrorBanner"
import { SectionHeader } from "@/components/wizard/SectionHeader"
import { StatusBadge, type RevisionStatus } from "@/components/wizard/StatusBadge"
import { BtnPrimary, BtnSecondary, BtnAccent } from "@/components/wizard/WizardButtons"
import { WizardBottomBar } from "@/components/wizard/WizardBottomBar"
import { BRAND } from "@/lib/brand"
import {
  type ApiCareer,
  type ApiElection,
  listAssociations,
  listCareers,
  listVoters,
  transitionElection,
} from "@/services/admin.service"

interface Step5Props {
  election: ApiElection | null
  electionId: string
  token: string
  onBack: () => void
  onFinish: () => void
}

interface RevisionRow {
  label: string
  detail: string | number
  status: RevisionStatus
  onVerify: () => void
}

export function Step5({ election, electionId, token, onBack, onFinish }: Step5Props) {
  const [assocCount, setAssocCount] = useState(0)
  const [voterCount, setVoterCount] = useState(0)
  const [careers, setCareers] = useState<ApiCareer[]>([])
  const [simulateCareer, setSimulateCareer] = useState("")
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      listAssociations(token, { election_id: electionId }),
      listVoters(token, electionId),
      listCareers(token),
    ])
      .then(([assocs, voters, c]) => {
        setAssocCount(assocs.length)
        setVoterCount(voters.length)
        setCareers(c)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, electionId])

  async function handleActivate() {
    if (!election) return
    const nextStatus = election.status === "draft" ? "scheduled" : "open"
    setActivateError(null)
    setActivating(true)
    try {
      await transitionElection(token, electionId, nextStatus)
      navigate("/admin/elecciones/detalles")
    } catch (e) {
      setActivateError(e instanceof Error ? e.message : "Error al activar la elección")
    } finally {
      setActivating(false)
    }
  }

  const electionOk: RevisionStatus =
    election?.title && election.organization_id ? "ok" : "incomplete"
  const assocStatus: RevisionStatus =
    assocCount >= 2 ? "ok" : assocCount === 1 ? "warning" : "incomplete"
  const voterStatus: RevisionStatus = voterCount >= 1 ? "ok" : "incomplete"
  const simStatus: RevisionStatus = simulateCareer ? "ok" : "incomplete"

  const rows: RevisionRow[] = [
    {
      label: "Detalles generales",
      detail: "Nombre, Fecha, Hora y más…",
      status: electionOk,
      onVerify: () => navigate(`/admin/elecciones/wizard?id=${electionId}&step=1`),
    },
    {
      label: "Cantidad de asociaciones",
      detail: assocCount,
      status: assocStatus,
      onVerify: () => navigate(`/admin/elecciones/wizard?id=${electionId}&step=2`),
    },
    {
      label: "Cantidad de votantes",
      detail: voterCount,
      status: voterStatus,
      onVerify: () => navigate(`/admin/elecciones/wizard?id=${electionId}&step=4`),
    },
  ]

  const statusLabel = {
    draft: "Borrador",
    scheduled: "Programada",
    open: "Activa",
    closed: "Finalizada",
    cancelled: "Archivada",
  }

  return (
    <>
      <SectionHeader title="Revisión" subtitle="Paso 5 de 5 - Revisión final antes de activar." />
      {activateError && <ErrorBanner message={activateError} />}
      <p className="mb-6 text-sm text-gray-600">
        Antes de iniciar la votación debes completar las siguientes tareas.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="w-full space-y-8 rounded-2xl bg-white p-8 shadow-sm">
          <div>
            <h2 className="mb-4 text-lg font-bold" style={{ color: BRAND }}>
              Resumen de Elección
            </h2>
            <div className="space-y-4">
              {rows.map((row) => (
                <div key={row.label} className="flex flex-wrap items-center gap-4">
                  <p className="flex-1 text-sm text-gray-700">{row.label}</p>
                  <span className="min-w-[80px] text-right text-sm text-gray-400">
                    {row.detail}
                  </span>
                  <button
                    onClick={row.onVerify}
                    className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: BRAND }}
                  >
                    Verificar
                  </button>
                  <StatusBadge status={row.status} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-lg font-bold" style={{ color: BRAND }}>
              Probar experiencia de votación
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={simulateCareer}
                onChange={(e) => setSimulateCareer(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"
              >
                <option value="">Selecciona una carrera para simular</option>
                {careers.map((c) => (
                  <option key={c.career_id} value={c.career_id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <button
                disabled={!simulateCareer}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: BRAND }}
              >
                Simular
              </button>
              <StatusBadge status={simStatus} />
            </div>
          </div>

          {election && (
            <div className="rounded-xl bg-gray-50 px-5 py-4 text-sm text-gray-600">
              Estado actual:{" "}
              <span className="font-semibold" style={{ color: BRAND }}>
                {statusLabel[election.status] ?? election.status}
              </span>
            </div>
          )}
        </div>
      )}

      <WizardBottomBar>
        <BtnSecondary onClick={onBack}>← Anterior</BtnSecondary>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <BtnAccent onClick={onFinish}>
            <Save size={15} />
            Guardar y Salir
          </BtnAccent>
          {election &&
            election.status !== "open" &&
            election.status !== "closed" &&
            election.status !== "cancelled" && (
              <BtnPrimary loading={activating} onClick={handleActivate}>
                {election.status === "draft" ? "Programar Elección" : "Iniciar Elección"}
                <ChevronRight size={16} />
              </BtnPrimary>
            )}
        </div>
      </WizardBottomBar>
    </>
  )
}
