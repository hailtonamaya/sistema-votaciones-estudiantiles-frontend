import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import { VotingProvider } from "@/context/VotingContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { ChatWidget } from "@/components/ChatWidget"

import LoginPage from "@/pages/LoginPage"
import OTPPage from "@/pages/OTPPage"

import AdminDashboard from "@/pages/admin/AdminDashboard"
import ObserverDashboard from "@/pages/observer/ObserverDashboard"

import StudentVotingPage from "@/pages/student/StudentVotingPage"
import StudentAssociationDetailPage from "@/pages/student/StudentAssociationDetailPage"
import StudentConfirmPage from "@/pages/student/StudentConfirmPage"
import StudentSuccessPage from "@/pages/student/StudentSuccessPage"

import AdminPlaceholder from "@/pages/admin/AdminPlaceholder"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VotingProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/otp" element={<OTPPage />} />

            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/archivados"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminPlaceholder title="Archivados" />
                </ProtectedRoute>
              }
            />

            {[
              "detalles",
              "asociaciones",
              "candidatos",
              "votantes",
              "revision",
              "resultados",
            ].map((slug) => (
              <Route
                key={slug}
                path={`/admin/elecciones/${slug}`}
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <AdminPlaceholder
                      title={slug.charAt(0).toUpperCase() + slug.slice(1)}
                    />
                  </ProtectedRoute>
                }
              />
            ))}

            {[
              { slug: "perfil", title: "Mi Perfil" },
              { slug: "usuarios", title: "Gestión de Usuarios" },
              { slug: "carreras", title: "Banco de Carreras" },
              { slug: "campus", title: "Banco de Campus" },
              { slug: "parametros", title: "Parámetros Globales" },
            ].map(({ slug, title }) => (
              <Route
                key={slug}
                path={`/admin/configuracion/${slug}`}
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <AdminPlaceholder title={title} />
                  </ProtectedRoute>
                }
              />
            ))}

            <Route
              path="/admin/ayuda"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminPlaceholder title="Ayuda" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/observer/dashboard"
              element={
                <ProtectedRoute roles={["observer"]}>
                  <ObserverDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/student/votar"
              element={
                <ProtectedRoute roles={["student"]}>
                  <StudentVotingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/detalle"
              element={
                <ProtectedRoute roles={["student"]}>
                  <StudentAssociationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/confirmar"
              element={
                <ProtectedRoute roles={["student"]}>
                  <StudentConfirmPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exito"
              element={
                <ProtectedRoute roles={["student"]}>
                  <StudentSuccessPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          <ChatWidget />
        </VotingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
