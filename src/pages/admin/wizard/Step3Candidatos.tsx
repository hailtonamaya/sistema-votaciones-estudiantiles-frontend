import { useEffect, useState } from "react"
import { ChevronRight, Loader2, Save, Trash2, UserPlus, Users, X } from "lucide-react"
import { ErrorBanner } from "@/components/ErrorBanner"
import { EmptyState } from "@/components/EmptyState"
import { SectionHeader } from "@/components/wizard/SectionHeader"
import { BtnPrimary, BtnSecondary, BtnAccent } from "@/components/wizard/WizardButtons"
import { WizardBottomBar } from "@/components/wizard/WizardBottomBar"
import { BRAND, ACCENT } from "@/lib/brand"
import {
  type ApiAssociation,
  type ApiAssociationMember,
  createAssociationMember,
  deleteAssociationMember,
  listAssociations,
} from "@/services/admin.service"

interface Step3Props {
  electionId: string
  token: string
  onNext: () => void
  onBack: () => void
  onExit: () => void
}

export function Step3({ electionId, token, onNext, onBack, onExit }: Step3Props) {
  const [associations, setAssociations] = useState<ApiAssociation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAssoc, setActiveAssoc] = useState<string | null>(null)
  const [memberForm, setMemberForm] = useState({ full_name: "", role: "", photo_url: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  useEffect(() => {
    listAssociations(token, { election_id: electionId })
      .then(setAssociations)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, electionId])

  async function handleAddMember(assocId: string) {
    setError(null)
    if (!memberForm.full_name.trim()) { setError("El nombre del candidato es requerido"); return }
    setSaving(true)
    try {
      const member = await createAssociationMember(token, assocId, {
        full_name: memberForm.full_name.trim(),
        role: memberForm.role.trim() || undefined,
        photo_url: memberForm.photo_url.trim() || undefined,
      })
      setAssociations((prev) =>
        prev.map((a) =>
          a.association_id === assocId
            ? { ...a, association_member: [...(a.association_member ?? []), member] }
            : a,
        ),
      )
      setMemberForm({ full_name: "", role: "", photo_url: "" })
      setActiveAssoc(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al agregar candidato")
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(assocId: string, member: ApiAssociationMember) {
    setRemoveError(null)
    try {
      await deleteAssociationMember(token, assocId, member.association_member_id)
      setAssociations((prev) =>
        prev.map((a) =>
          a.association_id === assocId
            ? {
                ...a,
                association_member: (a.association_member ?? []).filter(
                  (m) => m.association_member_id !== member.association_member_id,
                ),
              }
            : a,
        ),
      )
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : "Error al eliminar el candidato")
    }
  }

  return (
    <>
      <SectionHeader
        title="Candidatos"
        subtitle="Paso 3 de 5 - Agrega los candidatos de cada asociación."
      />
      {error && <ErrorBanner message={error} />}
      {removeError && <ErrorBanner message={removeError} />}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : associations.length === 0 ? (
        <EmptyState
          icon={<Users size={30} style={{ color: ACCENT }} />}
          title="No hay asociaciones creadas"
          description="Regresa al paso 2 para crear asociaciones antes de agregar candidatos."
        />
      ) : (
        <div className="space-y-4">
          {associations.map((assoc) => (
            <div
              key={assoc.association_id}
              className="overflow-hidden rounded-2xl bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                {assoc.logo_url ? (
                  <img
                    src={assoc.logo_url}
                    alt={assoc.name}
                    className="h-10 w-10 rounded-lg border border-gray-100 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-300">
                    <Users size={18} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: BRAND }}>
                    {assoc.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {assoc.association_member?.length ?? 0} candidato(s)
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveAssoc(
                      activeAssoc === assoc.association_id ? null : assoc.association_id,
                    )
                    setError(null)
                    setMemberForm({ full_name: "", role: "", photo_url: "" })
                  }}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: BRAND }}
                >
                  <UserPlus size={13} />
                  Agregar candidato
                </button>
              </div>

              {activeAssoc === assoc.association_id && (
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      <span className="sr-only">Nombre completo</span>
                      <input
                        type="text"
                        placeholder="Nombre completo *"
                        value={memberForm.full_name}
                        onChange={(e) =>
                          setMemberForm((p) => ({ ...p, full_name: e.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="sr-only">Cargo / Rol</span>
                      <input
                        type="text"
                        placeholder="Cargo / Rol"
                        value={memberForm.role}
                        onChange={(e) =>
                          setMemberForm((p) => ({ ...p, role: e.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="sr-only">URL de foto</span>
                      <input
                        type="url"
                        placeholder="URL de foto (opcional)"
                        value={memberForm.photo_url}
                        onChange={(e) =>
                          setMemberForm((p) => ({ ...p, photo_url: e.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <BtnSecondary onClick={() => setActiveAssoc(null)}>
                      <X size={14} />
                      Cancelar
                    </BtnSecondary>
                    <BtnPrimary
                      loading={saving}
                      onClick={() => handleAddMember(assoc.association_id)}
                    >
                      <Save size={14} />
                      Guardar
                    </BtnPrimary>
                  </div>
                </div>
              )}

              {(assoc.association_member ?? []).length > 0 ? (
                <div className="divide-y divide-gray-50 px-5">
                  {(assoc.association_member ?? []).map((m) => (
                    <div key={m.association_member_id} className="flex items-center gap-3 py-3">
                      {m.photo_url ? (
                        <img
                          src={m.photo_url}
                          alt={m.full_name}
                          className="h-8 w-8 rounded-full border border-gray-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400">
                          {m.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800">{m.full_name}</p>
                        {m.role && <p className="text-xs text-gray-400">{m.role}</p>}
                      </div>
                      <button
                        onClick={() => handleRemoveMember(assoc.association_id, m)}
                        aria-label={`Eliminar candidato ${m.full_name}`}
                        className="text-red-400 transition hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-3 text-xs text-gray-400">Sin candidatos registrados.</p>
              )}
            </div>
          ))}
        </div>
      )}

      <WizardBottomBar>
        <BtnSecondary onClick={onBack}>← Anterior</BtnSecondary>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <BtnAccent onClick={onExit}>
            <Save size={15} />
            Guardar y Salir
          </BtnAccent>
          <BtnPrimary onClick={onNext}>
            Continuar a Votantes
            <ChevronRight size={16} />
          </BtnPrimary>
        </div>
      </WizardBottomBar>
    </>
  )
}
