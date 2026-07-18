import type { AuditLogEntry } from "@/services/audit.service"
import { ELECTION_STATUS_LABELS } from "@/lib/elections"

const ACTION_LABELS: Record<string, string> = {
  "election.create": "Creó una elección",
  "election.update": "Editó una elección",
  "election.delete": "Eliminó una elección",
  "organization.create": "Creó un campus",
  "organization.update": "Editó un campus",
  "organization.delete": "Eliminó un campus",
  "career.create": "Creó una carrera",
  "career.update": "Editó una carrera",
  "career.delete": "Eliminó una carrera",
  "user.create": "Creó un usuario administrativo",
  "user.update": "Editó un usuario administrativo",
  "user.delete": "Eliminó un usuario administrativo",
  "association.create": "Creó una planilla",
  "association.delete": "Eliminó una planilla",
  "association_member.create": "Agregó un candidato",
  "association_member.delete": "Eliminó un candidato",
  "voter.create": "Registró un votante",
  "voter.bulk_import": "Importó votantes en lote",
  "voter.delete": "Eliminó un votante del padrón",
  "ballot.cast": "Emitió un voto",
  "otp.request": "Solicitó código de acceso",
  "otp.request.inactive": "Intentó acceder con una cuenta inactiva",
  "otp.request.voter": "Solicitó código de acceso (votante)",
  "otp.request.unknown_email": "Intentó acceder con un correo no registrado",
  "otp.verify.ok": "Inició sesión correctamente",
  "otp.verify.invalid": "Ingresó un código de acceso incorrecto",
  "otp.verify.voter.ok": "Inició sesión correctamente (votante)",
  "otp.verify.voter.invalid": "Ingresó un código de acceso incorrecto (votante)",
  "voter_check.staff": "Verificó acceso (personal administrativo)",
  "voter_check.unknown_email": "Verificó acceso con un correo no registrado",
  "voter_check.blocked": "Intento de acceso bloqueado",
  "voter_check.ok": "Verificó acceso correctamente",
  "ai.chat": "Usó el asistente de IA",
  "ai.insights": "Generó un resumen ejecutivo con IA",
}

function titleCaseFallback(action: string): string {
  return action.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function actionLabel(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  if (action.startsWith("election.transition.")) {
    const status = action.replace("election.transition.", "")
    return `Cambió el estado de la elección a "${ELECTION_STATUS_LABELS[status] ?? status}"`
  }
  return titleCaseFallback(action)
}

const BLOCKED_REASON_LABELS: Record<string, string> = {
  no_election: "sin elección activa para su carrera",
  already_voted: "ya había emitido su voto",
}

/** Resumen de una línea a partir del metadata, para no depender de expandir cada fila. */
export function describeEntry(entry: AuditLogEntry): string | null {
  const m = entry.metadata
  if (!m) return null

  if (typeof m.from === "string" && typeof m.to === "string") {
    const from = ELECTION_STATUS_LABELS[m.from] ?? m.from
    const to = ELECTION_STATUS_LABELS[m.to] ?? m.to
    return `${from} → ${to}`
  }

  if (m.before && m.after && typeof m.before === "object" && typeof m.after === "object") {
    const fields = Object.keys(m.after as Record<string, unknown>)
    if (fields.length === 0) return null
    return `Campos modificados: ${fields.join(", ")}`
  }

  if (m.deleted && typeof m.deleted === "object") {
    const d = m.deleted as Record<string, unknown>
    const label = d.title ?? d.name ?? d.full_name ?? d.email
    return label ? String(label) : null
  }

  if (typeof m.reason === "string" && BLOCKED_REASON_LABELS[m.reason]) {
    return `Motivo: ${BLOCKED_REASON_LABELS[m.reason]}`
  }

  if (typeof m.email === "string") {
    return String(m.email)
  }

  if (typeof m.full_name === "string") {
    return String(m.full_name)
  }

  if (typeof m.title === "string") {
    return String(m.title)
  }

  return null
}
