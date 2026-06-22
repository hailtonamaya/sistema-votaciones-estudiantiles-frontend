import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { CheckCircle2, Loader2 } from "lucide-react"
import { AdminLayout } from "@/components/AdminLayout"
import { useAuth } from "@/context/AuthContext"
import { BRAND, ACCENT } from "@/lib/brand"
import { type ApiElection, listElections } from "@/services/admin.service"
import { Step1 } from "./wizard/Step1Detalles"
import { Step2 } from "./wizard/Step2Asociaciones"
import { Step3 } from "./wizard/Step3Candidatos"
import { Step4 } from "./wizard/Step4Votantes"
import { Step5 } from "./wizard/Step5Revision"

const STEP_TITLES: Record<number, string> = {
  1: "Detalles Generales",
  2: "Crear Asociaciones",
  3: "Candidatos",
  4: "Crear Votantes",
  5: "Revisión",
}

export default function AdminEleccionWizard() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const step = Math.max(1, Math.min(5, Number(searchParams.get("step")) || 1)) as
    | 1
    | 2
    | 3
    | 4
    | 5
  const electionId = searchParams.get("id") ?? null

  const [election, setElection] = useState<ApiElection | null>(null)
  const [loadingElection, setLoadingElection] = useState(!!electionId)

  useEffect(() => {
    if (!electionId || !token || election) return
    setLoadingElection(true)
    listElections(token)
      .then((list) => setElection(list.find((e) => e.election_id === electionId) ?? null))
      .catch(() => {})
      .finally(() => setLoadingElection(false))
  }, [electionId, token, election])

  function goTo(s: number, id?: string) {
    const p: Record<string, string> = { step: String(s) }
    const eid = id ?? electionId
    if (eid) p.id = eid
    setSearchParams(p, { replace: true })
  }

  function handleExit() {
    navigate("/admin/elecciones/detalles")
  }

  return (
    <AdminLayout>
      {/* Step indicator */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max items-center gap-2 pb-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition"
                style={{
                  backgroundColor: s === step ? BRAND : s < step ? ACCENT : "#E5E7EB",
                  color: s <= step ? "#fff" : "#9CA3AF",
                }}
              >
                {s < step ? <CheckCircle2 size={14} /> : s}
              </div>
              {s < 5 && (
                <div
                  className="h-0.5 w-8 shrink-0 rounded"
                  style={{ backgroundColor: s < step ? ACCENT : "#E5E7EB" }}
                />
              )}
            </div>
          ))}
          <span className="ml-3 shrink-0 text-sm font-medium text-gray-500">
            {STEP_TITLES[step]}
          </span>
        </div>
      </div>

      {loadingElection ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {step === 1 && (
            <Step1
              election={election}
              token={token!}
              onSaved={(e) => { setElection(e); goTo(2, e.election_id) }}
              onSaveAndExit={(e) => { setElection(e); handleExit() }}
              onCancel={handleExit}
            />
          )}
          {step === 2 && electionId && (
            <Step2
              electionId={electionId}
              token={token!}
              onNext={() => goTo(3)}
              onBack={() => goTo(1)}
              onExit={handleExit}
            />
          )}
          {step === 3 && electionId && (
            <Step3
              electionId={electionId}
              token={token!}
              onNext={() => goTo(4)}
              onBack={() => goTo(2)}
              onExit={handleExit}
            />
          )}
          {step === 4 && electionId && (
            <Step4
              electionId={electionId}
              token={token!}
              onNext={() => goTo(5)}
              onBack={() => goTo(3)}
              onExit={handleExit}
            />
          )}
          {step === 5 && electionId && (
            <Step5
              election={election}
              electionId={electionId}
              token={token!}
              onBack={() => goTo(4)}
              onFinish={handleExit}
            />
          )}
        </>
      )}
    </AdminLayout>
  )
}
