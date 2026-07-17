import { api } from "@/lib/api"

export interface AuditLogEntry {
  audit_id: string
  user_id: string | null
  user_email: string | null
  user_full_name: string | null
  user_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface AuditLogFilters {
  entity_type?: string
  action?: string
  user_id?: string
  from?: string
  to?: string
  exclude_ai?: boolean
  limit?: number
  offset?: number
}

export interface AuditLogResponse {
  data: AuditLogEntry[]
  meta: { total: number; limit: number; offset: number }
}

export interface AuditLogFilterOptions {
  actions: string[]
  entity_types: string[]
}

export const listAuditLog = (token: string, filters: AuditLogFilters = {}): Promise<AuditLogResponse> => {
  const qs = new URLSearchParams()
  if (filters.entity_type) qs.set("entity_type", filters.entity_type)
  if (filters.action) qs.set("action", filters.action)
  if (filters.user_id) qs.set("user_id", filters.user_id)
  if (filters.from) qs.set("from", filters.from)
  if (filters.to) qs.set("to", filters.to)
  qs.set("exclude_ai", String(filters.exclude_ai ?? true))
  qs.set("limit", String(filters.limit ?? 50))
  qs.set("offset", String(filters.offset ?? 0))
  return api<AuditLogResponse>(`/audit-log?${qs.toString()}`, { token })
}

export const getAuditLogFilters = (token: string): Promise<AuditLogFilterOptions> =>
  api<{ data: AuditLogFilterOptions }>("/audit-log/filters", { token }).then((r) => r.data)
