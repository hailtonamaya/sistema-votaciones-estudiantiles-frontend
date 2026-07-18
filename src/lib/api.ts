const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1"

// Las imagenes subidas (logos/fotos) se sirven en la raiz del backend,
// fuera de /api/v1 — derivamos ese origin quitando el sufijo de la API.
// En prod VITE_API_URL es relativo ("/api/v1"), asi que ASSET_ORIGIN queda
// vacio y las URLs resultan relativas al propio dominio (van por el proxy
// de nginx); en dev apunta directo al backend (ej. http://localhost:3000).
const ASSET_ORIGIN = BASE_URL.replace(/\/api\/?.*$/, "")

export function resolveImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^(https?:|data:)/.test(path)) return path
  return `${ASSET_ORIGIN}${path}`
}

type ApiOptions = Omit<RequestInit, "body"> & {
  token?: string
  body?: unknown
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown
  constructor(status: number, message: string, details?: unknown, code?: string) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

interface ApiErrorPayload {
  error?: string | { message?: string; details?: unknown; code?: string }
  message?: string
  details?: unknown
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  let payload: ApiErrorPayload | null = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      throw new ApiError(res.status, `Respuesta inesperada del servidor (${res.status})`)
    }
  }

  if (!res.ok) {
    // Soporta el formato nuevo { success: false, error: { code, message, details } }
    // y el antiguo { error: "string" } por si hubiera alguna respuesta legacy.
    const errorObj = payload?.error
    const isErrorObject = typeof errorObj === "object" && errorObj !== null
    const message: string =
      (isErrorObject ? (errorObj as { message?: string }).message : (errorObj as string | undefined)) ??
      payload?.message ??
      `Error ${res.status}`
    const details = isErrorObject
      ? (errorObj as { details?: unknown }).details
      : payload?.details
    const code: string | undefined = isErrorObject
      ? (errorObj as { code?: string }).code
      : undefined
    throw new ApiError(res.status, message, details, code)
  }

  return payload as T
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers)
  if (opts.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (opts.token) headers.set("Authorization", `Bearer ${opts.token}`)

  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  return parseResponse<T>(res)
}

/**
 * Sube un archivo como multipart/form-data. No usa api() porque el
 * Content-Type con boundary lo debe fijar el navegador, no nosotros —
 * si lo forzamos a JSON el backend nunca logra parsear el archivo.
 */
export async function apiUpload<T>(path: string, file: File, token: string): Promise<T> {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  return parseResponse<T>(res)
}
