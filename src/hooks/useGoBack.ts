import { useNavigate } from "react-router-dom";

/**
 * Retourne une fonction "retour" qui utilise l'historique du navigateur
 * si disponible, sinon navigue vers le fallback fourni.
 */
export function useGoBack(fallback = "/") {
  const navigate = useNavigate();
  return () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback, { replace: true });
    }
  };
}
