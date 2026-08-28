/**
 * Feature: Auth
 * Encapsule la gestion de l'authentification, la connexion, l'inscription,
 * la récupération de mot de passe et le contexte Auth.
 */

export { default as AuthPage } from "@/pages/AuthPage";
export { default as UpdatePasswordPage } from "@/pages/UpdatePasswordPage";
export { default as ProtectedRoute } from "@/components/ProtectedRoute";
export { default as AdminRoute } from "@/components/AdminRoute";
export { useAuth, AuthProvider } from "@/contexts/AuthContext";
