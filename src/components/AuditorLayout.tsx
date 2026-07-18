import { useEffect, useState, type ReactNode } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { BRAND } from "@/lib/brand"
import { ChevronDown, ChevronRight, Eye, FileSearch, Home, LogOut, Menu } from "lucide-react"

interface NavLeaf {
  label: string
  icon: ReactNode
  href: string
}

const NAV: NavLeaf[] = [
  { label: "Inicio", icon: <Home size={18} />, href: "/auditor/dashboard" },
  { label: "Registro de Auditoría", icon: <FileSearch size={18} />, href: "/auditor/log" },
]

interface AuditorLayoutProps {
  children: ReactNode
}

export function AuditorLayout({ children }: AuditorLayoutProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
      if (e.matches) setMobileOpen(false)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  function handleLogout() {
    logout()
    navigate("/login")
  }

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U"

  const showLabels = !isDesktop || !sidebarCollapsed
  const sidebarWidth = isDesktop && sidebarCollapsed ? "64px" : "256px"

  return (
    <div className="flex h-dvh bg-bg-light">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/45" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`flex flex-shrink-0 flex-col transition-all duration-300 ${!isDesktop ? "fixed inset-y-0 left-0 z-50" : ""}`}
        style={{
          backgroundColor: BRAND,
          width: sidebarWidth,
          transform: !isDesktop ? (mobileOpen ? "translateX(0)" : "translateX(-100%)") : undefined,
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: showLabels ? "16px 14px" : "12px 5px",
            minHeight: showLabels ? "88px" : "60px",
          }}
        >
          {showLabels ? (
            <img
              src="/unitec_logo_2.png"
              alt="UNITEC"
              className="object-contain object-left"
              style={{ height: "56px", maxWidth: "calc(100% - 36px)" }}
            />
          ) : (
            <img src="/unitec_logo_blanco.png" alt="UNITEC" className="h-6 w-6 flex-shrink-0 object-contain" />
          )}
          <button
            onClick={() => {
              if (!isDesktop) setMobileOpen(false)
              else setSidebarCollapsed((p) => !p)
            }}
            className="flex-shrink-0 rounded p-2 text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ marginLeft: showLabels ? "8px" : "4px" }}
            title={isDesktop && sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            aria-label={isDesktop && sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isDesktop && sidebarCollapsed ? (
                <path d="M5 12h14M13 6l6 6-6 6" />
              ) : (
                <path d="M19 12H5M5 12l7-7M5 12l7 7" />
              )}
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {NAV.map((item) => {
            const active = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className="mb-0.5 flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-white/10"
                style={{
                  backgroundColor: active ? "rgba(255,255,255,0.18)" : "transparent",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.85)",
                  gap: !showLabels ? 0 : "12px",
                  justifyContent: !showLabels ? "center" : undefined,
                }}
                title={!showLabels ? item.label : undefined}
              >
                {item.icon}
                {showLabels && item.label}
              </Link>
            )
          })}

          <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/50" style={{ justifyContent: !showLabels ? "center" : undefined }}>
            <Eye size={14} />
            {showLabels && <span>Modo solo lectura</span>}
          </div>
        </nav>

        <div className="border-t border-white/10 px-2 pb-5 pt-3">
          {showLabels && userMenuOpen && (
            <div className="mb-1 space-y-0.5">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-400/10"
              >
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          )}

          <button
            onClick={() => { if (showLabels) setUserMenuOpen((p) => !p) }}
            aria-expanded={showLabels ? userMenuOpen : undefined}
            aria-label="Menú de usuario"
            className="flex w-full items-center rounded-xl bg-white/10 px-3 py-2.5 transition"
            style={{
              gap: !showLabels ? 0 : "12px",
              justifyContent: !showLabels ? "center" : undefined,
              cursor: !showLabels ? "default" : "pointer",
            }}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
              {initials}
            </div>
            {showLabels && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-white/60">Auditor</p>
                </div>
                {userMenuOpen ? (
                  <ChevronDown size={14} className="shrink-0 text-white/50" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-white/50" />
                )}
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center gap-3 bg-[#06065C] px-4 py-2.5 lg:hidden">
          <button onClick={() => setMobileOpen(true)} aria-label="Abrir menú" className="rounded p-1.5 text-white/80 transition hover:text-white">
            <Menu size={22} />
          </button>
          <img src="/unitec_logo_2.png" alt="UNITEC" className="h-7 object-contain object-left" style={{ maxWidth: "140px" }} />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
          <footer className="mt-8 py-4 text-center text-xs text-gray-400">© 2026 UNITEC</footer>
        </main>
      </div>
    </div>
  )
}
