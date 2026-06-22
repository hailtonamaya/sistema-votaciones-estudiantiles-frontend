import { useEffect, useState } from "react"
import { ChevronRight, Loader2, Plus, Save, Trash2, Users, X } from "lucide-react"
import { ErrorBanner } from "@/components/ErrorBanner"
import { EmptyState } from "@/components/EmptyState"
import { SectionHeader } from "@/components/wizard/SectionHeader"
import { BtnPrimary, BtnSecondary, BtnAccent } from "@/components/wizard/WizardButtons"
import { WizardBottomBar } from "@/components/wizard/WizardBottomBar"
import { WizardToolbar } from "@/components/wizard/WizardToolbar"
import { BRAND, ACCENT } from "@/lib/brand"
import {
  type ApiCareer,
  type ApiVoter,
  createVoter,
  deleteVoter,
  listCareers,
  listVoters,
} from "@/services/admin.service"

interface Step4Props {
  electionId: string
  token: string
  onNext: () => void
  onBack: () => void
  onExit: () => void
}

export function Step4({ electionId, token, onNext, onBack, onExit }: Step4Props) {
  const [careers, setCareers] = useState<ApiCareer[]>([])
  const [voters, setVoters] = useState<ApiVoter[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"grid" | "list">("list")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: "",
    institutional_id: "",
    email: "",
    career_id: "",
  })

  useEffect(() => {
    Promise.all([listCareers(token), listVoters(token, electionId)])
      .then(([c, v]) => {
        setCareers(c)
        setVoters(v)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, electionId])

  async function handleCreate() {
    setError(null)
    if (!form.full_name.trim()) { setError("El nombre es requerido"); return }
    if (!form.institutional_id.trim()) { setError("El número de cuenta es requerido"); return }
    if (!form.email.trim()) { setError("El correo institucional es requerido"); return }
    if (!form.career_id) { setError("Selecciona una carrera"); return }
    setSaving(true)
    try {
      const created = await createVoter(token, {
        election_id: electionId,
        career_id: form.career_id,
        full_name: form.full_name.trim(),
        institutional_id: form.institutional_id.trim(),
        email: form.email.trim(),
      })
      setVoters((prev) => [...prev, created])
      setForm({ full_name: "", institutional_id: "", email: "", career_id: "" })
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al agregar votante")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null)
    try {
      await deleteVoter(token, id)
      setVoters((prev) => prev.filter((v) => v.election_voter_id !== id))
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Error al eliminar el votante")
    }
  }

  const filtered = voters.filter(
    (v) =>
      (v.voter?.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (v.voter?.email ?? "").toLowerCase().includes(search.toLowerCase()),
  )

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400"

  return (
    <>
      <SectionHeader
        title="Crear Votantes"
        subtitle="Paso 4 de 5 - Registra los estudiantes habilitados para votar."
      />
      {deleteError && <ErrorBanner message={deleteError} />}

      <WizardToolbar
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
        addLabel="Agregar Votante"
        onAdd={() => { setShowForm(true); setError(null) }}
      />

      {showForm && (
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: BRAND }}>Agregar Votante</h3>
            <button onClick={() => setShowForm(false)}>
              <X size={18} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          {error && <ErrorBanner message={error} />}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-semibold" style={{ color: BRAND }}>
                Nombre del Estudiante <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Nombre completo"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" style={{ color: BRAND }}>
                Número de Cuenta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.institutional_id}
                onChange={(e) => setForm((p) => ({ ...p, institutional_id: e.target.value }))}
                placeholder="Ej. 20211001234"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" style={{ color: BRAND }}>
                Correo Institucional <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="estudiante@unitec.edu.hn"
                className={inputCls}
              />
            </div>
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

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 && !showForm ? (
        <EmptyState
          icon={<Users size={30} style={{ color: ACCENT }} />}
          title="Aún no hay votantes registrados"
          description="Registra los estudiantes habilitados para participar en esta elección."
          action={{
            label: "Agregar Votante",
            onClick: () => { setShowForm(true); setError(null) },
            icon: <Plus size={15} />,
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-400">Nombre</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-400">N° Cuenta</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-400">Correo</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-400">Carrera</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase text-gray-400">Votó</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((v) => (
                  <tr key={v.election_voter_id} className="transition-colors hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {v.voter?.full_name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {v.voter?.institutional_id ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{v.voter?.email ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-500">{v.career?.name ?? "—"}</td>
                    <td className="px-5 py-3">
                      {v.has_voted ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-600">
                          Sí
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-400">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(v.election_voter_id)}
                        aria-label={`Eliminar votante ${v.voter?.institutional_id ?? ""}`}
                        className="text-red-400 transition hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            Continuar a Revisión
            <ChevronRight size={16} />
          </BtnPrimary>
        </div>
      </WizardBottomBar>
    </>
  )
}
