/**
 * Maps raw database/API errors to user-friendly messages.
 * Prevents leaking internal details (table names, columns, policies).
 */
export function getUserFriendlyError(error: any, fallback = "Une erreur est survenue. Veuillez réessayer."): string {
  if (!error) return fallback;

  const msg = error.message || "";
  const code = error.code || "";

  // Auth-specific errors
  if (msg.includes("Invalid login credentials")) return "Email/mot de passe incorrect";
  if (msg.includes("Email not confirmed")) return "Veuillez confirmer votre email avant de vous connecter";
  if (msg.includes("User already registered")) return "Un compte existe déjà avec cet identifiant";
  if (msg.includes("Password should be at least")) return "Le mot de passe doit contenir au moins 6 caractères";
  if (code === "weak_password" || msg.includes("Password should contain")) return "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre";
  if (msg.includes("rate limit") || code === "429") return "Trop de tentatives. Veuillez patienter quelques minutes.";

  // DB constraint errors
  if (code === "23505") {
    if (msg.includes("phone")) return "Ce numéro de téléphone est déjà associé à un compte.";
    return "Cette donnée existe déjà";
  }
  if (code === "23503") return "Référence invalide";
  if (code === "42501" || msg.includes("permission denied")) return "Accès refusé";
  if (code === "PGRST301" || msg.includes("JWT")) return "Session expirée. Veuillez vous reconnecter.";

  // Network
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) return "Erreur réseau. Vérifiez votre connexion.";

  // Log raw error for debugging but return generic message
  console.error("Operation error:", error);
  return fallback;
}
