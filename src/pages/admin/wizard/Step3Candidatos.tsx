import { useEffect, useRef, useState } from "react"
import { ChevronRight, ImageIcon, Loader2, Pencil, Save, Trash2, UserPlus, Users, X } from "lucide-react"
import { ErrorBanner } from "@/components/ErrorBanner"
import { EmptyState } from "@/components/EmptyState"
import { SectionHeader } from "@/components/wizard/SectionHeader"
import { BtnPrimary, BtnSecondary, BtnAccent } from "@/components/wizard/WizardButtons"
import { WizardBottomBar } from "@/components/wizard/WizardBottomBar"
import { BRAND, ACCENT } from "@/lib/brand"
import { resolveImageUrl } from "@/lib/api"
import {
  type ApiAssociation,
  type ApiAssociationMember,
  createAssociationMember,
  updateAssociationMember,
  deleteAssociationMember,
  listAssociations,
  uploadImage,
} from "@/services/admin.service"

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

interface Step3Props {
  electionId: string
  token: string
  isReadOnly?: boolean
  hideHeader?: boolean
  onNext: () => void
  onBack: () => void
  onExit: () => void
}

interface CareerGroup {
  career_id: string
  career_name: string
  career_code: string
  associations: ApiAssociation[]
}

export function Step3({ electionId, token, isReadOnly = false, hideHeader = false, onNext, onBack, onExit }: Step3Props) {
  const [associations, setAssociations] = useState<ApiAssociation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeAssoc, setActiveAssoc] = useState<string | null>(null)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [memberForm, setMemberForm] = useState({ full_name: "", role: "", photo_url: "" })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listAssociations(token, { election_id: electionId })
      .then(setAssociations)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, electionId])

  // Group associations by career
  const careerGroups: CareerGroup[] = (() => {
    const map = new Map<string, CareerGroup>()
    for (const assoc of associations) {
      const career = assoc.election_career?.career
      const cid = career?.career_id ?? "sin-carrera"
      if (!map.has(cid)) {
        map.set(cid, {
          career_id: cid,
          career_name: career?.name ?? "Sin carrera",
          career_code: career?.code ?? "",
          associations: [],
        })
      }
      map.get(cid)!.associations.push(assoc)
    }
    return [...map.values()]
  })()

  function openEditMember(assocId: string, member: ApiAssociationMember) {
    setActiveAssoc(assocId)
    setEditingMemberId(member.association_member_id)
    setMemberForm({
      full_name: member.full_name,
      role: member.role ?? "",
      photo_url: member.photo_url ?? "",
    })
    setError(null)
  }

  async function handleSaveMember(assocId: string) {
    setError(null)
    if (!memberForm.full_name.trim()) { setError("El nombre del candidato es requerido"); return }
    setSaving(true)
    try {
      if (editingMemberId) {
        const full_name = memberForm.full_name.trim()
        const role = memberForm.role.trim() || null
        const photo_url = memberForm.photo_url || null
        await updateAssociationMember(token, assocId, editingMemberId, {
          full_name,
          role: role ?? undefined,
          photo_url: photo_url ?? undefined,
        })
        setAssociations((prev) =>
          prev.map((a) =>
            a.association_id === assocId
              ? {
                  ...a,
                  association_member: (a.association_member ?? []).map((m) =>
                    m.association_member_id === editingMemberId ? { ...m, full_name, role, photo_url } : m,
                  ),
                }
              : a,
          ),
        )
      } else {
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
      }
      setMemberForm({ full_name: "", role: "", photo_url: "" })
      setActiveAssoc(null)
      setEditingMemberId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : editingMemberId ? "Error al actualizar el candidato" : "Error al agregar candidato")
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

  const inputCls =
    "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"

  return (
    <>
      {!hideHeader && (
        <SectionHeader
          title="Candidatos por Asociación"
          subtitle="Paso 3 de 5 - Agrega los candidatos de cada asociación."
        />
      )}
      {error && <ErrorBanner message={error} />}
      {removeError && <ErrorBanner message={removeError} />}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : associations.length === 0 ? (
        <EmptyState
          icon={<Users size={30} style={{ color: ACCENT }} />}
          title="No hay planillas creadas"
          description="Regresa al paso 2 para crear asociaciones antes de agregar candidatos."
        />
      ) : (
        <div className="space-y-6">
          {careerGroups.map((group) => (
            <div key={group.career_id} className="space-y-3">
              {/* Career divider header */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: BRAND }}>
                  {group.career_name}
                </span>
                {group.career_code && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-600">
                    {group.career_code}
                  </span>
                )}
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              {/* Association cards */}
              {group.associations.map((assoc) => {
                const isActive = activeAssoc === assoc.association_id
                return (
                  <div
                    key={assoc.association_id}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm"
                  >
                    {/* Association header */}
                    <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                      {assoc.logo_url ? (
                        <img
                          src={resolveImageUrl(assoc.logo_url)}
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
                      {!isReadOnly && (
                        <button
                          onClick={() => {
                            setActiveAssoc(isActive ? null : assoc.association_id)
                            setEditingMemberId(null)
                            setError(null)
                            setMemberForm({ full_name: "", role: "", photo_url: "" })
                          }}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                          style={{ backgroundColor: isActive ? "#64748B" : BRAND }}
                        >
                          {isActive ? <X size={13} /> : <UserPlus size={13} />}
                          {isActive ? "Cancelar" : "Agregar candidato"}
                        </button>
                      )}
                    </div>

                    {/* Add candidate form */}
                    {!isReadOnly && isActive && (
                      <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <input
                            type="text"
                            placeholder="Nombre completo *"
                            value={memberForm.full_name}
                            onChange={(e) =>
                              setMemberForm((p) => ({ ...p, full_name: e.target.value }))
                            }
                            className={`${inputCls} w-full`}
                          />
                          <input
                            type="text"
                            placeholder="Cargo / Rol"
                            value={memberForm.role}
                            onChange={(e) =>
                              setMemberForm((p) => ({ ...p, role: e.target.value }))
                            }
                            className={`${inputCls} w-full`}
                          />
                          <div>
                            {memberForm.photo_url ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={resolveImageUrl(memberForm.photo_url)}
                                  alt="preview"
                                  className="h-9 w-9 rounded-full border border-gray-200 object-cover"
                                />
                                <button
                                  onClick={() => setMemberForm((p) => ({ ...p, photo_url: "" }))}
                                  className="text-xs text-red-500 hover:underline"
                                >
                                  Quitar
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => { if (!uploading) fileRef.current?.click() }}
                                className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 text-xs text-gray-500 transition hover:border-blue-400"
                              >
                                {uploading ? (
                                  <Loader2 size={13} className="animate-spin text-blue-400" />
                                ) : (
                                  <ImageIcon size={13} className="text-gray-400" />
                                )}
                                {uploading ? "Subiendo…" : "Foto (opcional)"}
                              </div>
                            )}
                            <input
                              ref={fileRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                e.target.value = ""
                                if (!file) return
                                if (file.size > MAX_UPLOAD_BYTES) {
                                  setError("La imagen no puede superar 5MB")
                                  return
                                }
                                setError(null)
                                setUploading(true)
                                try {
                                  const url = await uploadImage(token, file)
                                  setMemberForm((p) => ({ ...p, photo_url: url }))
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "Error al subir la imagen")
                                } finally {
                                  setUploading(false)
                                }
                              }}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <BtnSecondary onClick={() => { setActiveAssoc(null); setEditingMemberId(null) }}>
                            <X size={14} />
                            Cancelar
                          </BtnSecondary>
                          <BtnPrimary
                            loading={saving}
                            disabled={uploading}
                            onClick={() => handleSaveMember(assoc.association_id)}
                          >
                            <Save size={14} />
                            {editingMemberId ? "Guardar Cambios" : "Guardar"}
                          </BtnPrimary>
                        </div>
                      </div>
                    )}

                    {/* Candidates list */}
                    {(assoc.association_member ?? []).length === 0 ? (
                      <p className="px-5 py-4 text-xs text-gray-400">
                        Sin candidatos registrados.
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-50 px-5">
                        {(assoc.association_member ?? []).map((m) => (
                          <div
                            key={m.association_member_id}
                            className="flex items-center gap-3 py-3"
                          >
                            {m.photo_url ? (
                              <img
                                src={resolveImageUrl(m.photo_url)}
                                alt={m.full_name}
                                className="h-8 w-8 rounded-full border border-gray-100 object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-400">
                                {m.full_name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-800">
                                {m.full_name}
                              </p>
                              {m.role && (
                                <p className="text-xs text-gray-400">{m.role}</p>
                              )}
                            </div>
                            {!isReadOnly && (
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => openEditMember(assoc.association_id, m)}
                                  aria-label={`Editar candidato ${m.full_name}`}
                                  className="text-gray-400 transition hover:text-blue-600"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(assoc.association_id, m)}
                                  aria-label={`Eliminar candidato ${m.full_name}`}
                                  className="text-red-400 transition hover:text-red-600"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <WizardBottomBar>
        {isReadOnly ? (
          <BtnSecondary onClick={onExit}>Cerrar</BtnSecondary>
        ) : (
          <>
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
          </>
        )}
      </WizardBottomBar>
    </>
  )
}
