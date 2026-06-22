import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { VotingTimer } from "@/components/student/VotingTimer"
import {
  AssociationCard,
  BlankVoteCard,
} from "@/components/student/AssociationCard"
import { useVoting } from "@/context/VotingContext"
import { useAuth } from "@/context/AuthContext"
import { getStudentElection } from "@/services/voting.service"
import { BRAND } from "@/lib/brand"
import type { Association } from "@/types/voting"

export default function StudentVotingPage() {
  const navigate = useNavigate()
  const { election, voteStartTime, setElection, startVoting, selectAssociation } = useVoting()
  const { token } = useAuth()
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (election && voteStartTime) return

    if (!token) {
      navigate("/login", { replace: true })
      return
    }

    let cancelled = false
    setLoading(true)
    getStudentElection(token)
      .then((e) => {
        if (cancelled) return
        setElection(e)
        startVoting()
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(
          err instanceof Error
            ? err.message
            : "No tienes ninguna elección activa habilitada para tu carrera.",
        )
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [election, voteStartTime, token, navigate, setElection, startVoting])

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg-light">
        <p className="text-sm text-gray-500">Cargando elección...</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-bg-light px-4">
        <p className="text-center text-sm text-red-500">{loadError}</p>
      </main>
    )
  }

  if (!election || !voteStartTime) return null

  function handleSelect(association: Association | "blank") {
    selectAssociation(association)
    navigate(association === "blank" ? "/student/confirmar" : "/student/detalle")
  }

  return (
    <main className="min-h-dvh bg-bg-light">
      <div className="flex items-center justify-end px-6 py-4">
        <VotingTimer startTime={voteStartTime} />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <p className="mb-2 text-sm font-bold" style={{ color: BRAND }}>
          {election.title} / {election.careerName}
        </p>
        <p className="mb-8 text-sm text-gray-600">
          Elige la asociación por la que quieres votar.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {election.associations.map((assoc) => (
            <AssociationCard
              key={assoc.id}
              association={assoc}
              onClick={() => handleSelect(assoc)}
            />
          ))}
          <BlankVoteCard onClick={() => handleSelect("blank")} />
        </div>
      </div>
    </main>
  )
}
