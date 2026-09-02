import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";

const UpdatePasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase envoie le token dans le hash de l'URL (#access_token=...)
  // onAuthStateChange le détecte automatiquement avec l'event PASSWORD_RECOVERY
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Si l'utilisateur arrive déjà avec une session active (token déjà échangé)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message || "Erreur lors de la mise à jour");
      return;
    }

    setDone(true);
    toast.success("Mot de passe mis à jour !");
    setTimeout(() => navigate("/profil"), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo / Titre */}
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Nouveau mot de passe
          </h1>
          <p className="text-sm text-muted-foreground">
            Choisissez un mot de passe sécurisé pour votre compte SIGNA-CI
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {done ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="font-semibold text-foreground">Mot de passe mis à jour !</p>
              <p className="text-sm text-muted-foreground">Redirection vers votre profil…</p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center py-8 space-y-3">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Vérification du lien…</p>
              <p className="text-xs text-muted-foreground">
                Si rien ne se passe, le lien a peut-être expiré.{" "}
                <button
                  className="text-primary underline"
                  onClick={() => navigate("/auth")}
                >
                  Faire une nouvelle demande
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    autoFocus
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <Input
                  id="confirm"
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Répétez le mot de passe"
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !password || !confirm || password !== confirm}
              >
                {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
