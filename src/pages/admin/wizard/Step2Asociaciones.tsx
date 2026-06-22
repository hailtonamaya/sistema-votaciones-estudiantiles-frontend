import { useEffect, useRef, useState } from "react"
import { ImageIcon, Plus, Trash2, Users, X } from "lucide-react"
import { Loader2 } from "lucide-react"
import { ChevronRight, Save } from "lucide-react"
import { ErrorBanner } from "@/components/ErrorBanner"
import { EmptyState } from "@/components/EmptyState"
import { SectionHeader } from "@/components/wizard/SectionHeader"
import { BtnPrimary, BtnSecondary, BtnAccent } from "@/components/wizard/WizardButtons"
import { WizardBottomBar } from "@/components/wizard/WizardBottomBar"
import { WizardToolbar } from "@/components/wizard/WizardToolbar"
import { BRAND, ACCENT } from "@/lib/brand"
import {
  type ApiAssociation,
  type ApiCareer,
  createAssociation,
  deleteAssociation,
  listAssociations,
  listCareers,
} from "@/services/admin.service"

interface Step2Props {
  electionId: string
  token: string
  onNext: () => void
  onBack: () => void
  onExit: () => void
}

export function Step2({ electionId, token, onNext, onBack, onExit }: Step2Props) {
  const [careers, setCareers] = useState<ApiCareer[]>([])
  const [associations, setAssociations] = useState<ApiAssociation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState<"grid" | "list">("list")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    career_id: "",
    name: "",
    description: "",
    logo_url: "",
  })

  useEffect(() => {
    Promise.all([
      listCareers(token),
      listAssociations(token, { election_id: electionId }),
    ])
      .then(([c, a]) => {
        setCareers(c)
        setAssociations(a)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, electionId])

  async function handleCreate() {
    setError(null)
    if (!form.career_id) { setError("Selecciona una carrera"); return }
    if (!form.name.trim()) { setError("El nombre es requerido"); return }
    setSaving(true)
    try {
      const created = await createAssociation(token, {
        election_id: electionId,
        career_id: form.career_id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        logo_url: form.logo_url || undefined,
      })
      setAssociations((prev) => [...prev, created])
      setForm({ career_id: "", name: "", description: "", logo_url: "" })
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear asociación")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null)
    try {
      await deleteAssociation(token, id)
      setAssociations((prev) => prev.filter((a) => a.association_id !== id))
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Error al eliminar la asociación")
    }
  }

  const filtered = associations.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()),
  )

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"

  return (
    <>
      <SectionHeader
        title="Crear Asociaciones"
        subtitle="Paso 2 de 5 - Registra las asociaciones que participarán en la elección."
      />

      <WizardToolbar
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
        addLabel="Agregar Asociación"
        onAdd={() => { setShowForm(true); setError(null) }}
      />

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: BRAND }}>Agregar Asociación</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={18} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          {error && <ErrorBanner message={error} />}

          <div className="mb-4">
            <p className="mb-1.5 text-sm font-semibold" style={{ color: BRAND }}>
              Portada de la Asociación
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 p-8 transition hover:border-blue-400"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <ImageIcon size={22} className="text-blue-400" />
              </div>
              <p className="text-sm text-gray-500">Arrastra una imagen o haz click para subir</p>
              <p className="text-xs text-gray-400">PNG, JPG hasta 1MB</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 1 * 1024 * 1024) {
                    setError("La imagen no puede superar 1MB")
                    return
                  }
                  const reader = new FileReader()
                  reader.onload = (ev) =>
                    setForm((p) => ({ ...p, logo_url: ev.target?.result as string }))
                  reader.readAsDataURL(file)
                }}
              />
            </div>
            {form.logo_url && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={form.logo_url}
                  alt="preview"
                  className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                />
                <button
                  onClick={() => setForm((p) => ({ ...p, logo_url: "" }))}
                  className="text-xs text-red-500 hover:underline"
                >
                  Quitar imagen
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold" style={{ color: BRAND }}>
                Carrera <span className="text-red-500">*</span>
              </label>
              <select
                value={form.career_id}
                onChange={(e) => setForm((p) => ({ ...p, career_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">Selecciona una carrera</option>
                {careers.map((c) => (
                  <option key={c.career_id} value={c.career_id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold" style={{ color: BRAND }}>
                Nombre de la Asociación <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej. Asociación de Ingeniería"
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold" style={{ color: BRAND }}>
                Descripción
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Descripción de la asociación…"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <BtnSecondary onClick={() => setShowForm(false)}>Cancelar</BtnSecondary>
            <BtnPrimary loading={saving} onClick={handleCreate}>
              <Save size={15} />
              Guardar Cambios
            </BtnPrimary>
          </div>
        </div>
      )}

      {deleteError && <ErrorBanner message={deleteError} />}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 && !showForm ? (
        <EmptyState
          icon={<Users size={30} style={{ color: ACCENT }} />}
          title="Aún no hay asociaciones creadas"
          description="Agrega las asociaciones que participarán en esta elección para configurar su papeleta."
          action={{
            label: "Agregar Asociación",
            onClick: () => { setShowForm(true); setError(null) },
            icon: <Plus size={15} />,
          }}
        />
      ) : (
        <div
          className={`grid gap-4 ${view === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
        >
          {filtered.map((assoc) => {
            const careerName = assoc.election_career?.career?.name
            return (
              <div
                key={assoc.association_id}
                className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
              >
                {assoc.logo_url ? (
                  <img
                    src={assoc.logo_url}
                    alt={assoc.name}
                    className="h-14 w-14 flex-shrink-0 rounded-lg border border-gray-100 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-300">
                    <Users size={24} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: BRAND }}>
                    {assoc.name}
                  </p>
                  {careerName && <p className="mt-0.5 text-xs text-gray-400">{careerName}</p>}
                  <p className="mt-0.5 text-xs text-gray-500">
                    {assoc.association_member?.length ?? 0} candidato(s)
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(assoc.association_id)}
                  aria-label={`Eliminar planilla ${assoc.name}`}
                  className="text-red-400 transition hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
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
            Continuar a Candidatos
            <ChevronRight size={16} />
          </BtnPrimary>
        </div>
      </WizardBottomBar>
    </>
  )
}
