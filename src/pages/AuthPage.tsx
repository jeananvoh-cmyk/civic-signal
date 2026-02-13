import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, User, Phone, Building2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthPage = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [identifier, setIdentifier] = useState(""); // email or phone
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState<"household" | "business">("household");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isPhone = (value: string) => /^\+?\d[\d\s-]{6,}$/.test(value.trim());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmed = identifier.trim();
      let result;
      if (isPhone(trimmed)) {
        result = await supabase.auth.signInWithPassword({ phone: trimmed, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email: trimmed, password });
      }
      if (result.error) throw result.error;
      toast.success("Connexion réussie !");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmed = identifier.trim();
      let result;
      if (isPhone(trimmed)) {
        result = await supabase.auth.signUp({
          phone: trimmed,
          password,
          options: { data: { display_name: displayName } },
        });
      } else {
        result = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName },
          },
        });
      }
      if (result.error) throw result.error;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          user_type: userType,
          phone: isPhone(trimmed) ? trimmed : phone,
          display_name: displayName,
        }).eq("user_id", user.id);
      }

      toast.success(
        isPhone(trimmed)
          ? "Compte créé ! Vérifiez votre téléphone pour le code de confirmation."
          : "Compte créé ! Vérifiez votre email pour confirmer."
      );
      setMode("login");
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmed = identifier.trim();
      if (isPhone(trimmed)) {
        toast.error("La réinitialisation par téléphone n'est pas encore supportée. Utilisez votre email.");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Email de réinitialisation envoyé !");
      setMode("login");
    } catch (error: any) {
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>

        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-hero">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            Signal<span className="text-water">Énergie</span>
          </span>
        </div>

        {/* LOGIN */}
        {mode === "login" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                placeholder="Email ou numéro de téléphone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 rounded-lg border-border bg-background text-base"
                required
              />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-lg border-border bg-background text-base"
                required
                minLength={6}
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-lg bg-[hsl(217,90%,55%)] text-white text-lg font-bold hover:bg-[hsl(217,90%,48%)]"
              >
                {loading ? "Chargement..." : "Se connecter"}
              </Button>
            </form>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-sm text-water hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <div className="my-5 border-t border-border" />

            <div className="flex justify-center">
              <Button
                type="button"
                onClick={() => setMode("signup")}
                className="h-12 rounded-lg bg-[hsl(135,55%,48%)] px-8 text-base font-bold text-white hover:bg-[hsl(135,55%,40%)]"
              >
                Créer un nouveau compte
              </Button>
            </div>
          </div>
        )}

        {/* SIGNUP */}
        {mode === "signup" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-1 font-display text-xl font-bold text-foreground">Créer un compte</h2>
            <p className="mb-5 text-sm text-muted-foreground">Rejoignez la communauté SignalÉnergie</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nom complet"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-12 pl-10 rounded-lg text-base"
                  required
                />
              </div>

              <Input
                placeholder="Email ou numéro de téléphone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 rounded-lg text-base"
                required
              />

              {!isPhone(identifier) && (
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Téléphone (optionnel)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-12 pl-10 rounded-lg text-base"
                  />
                </div>
              )}

              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-lg text-base"
                required
                minLength={6}
              />

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Type de profil</Label>
                <RadioGroup
                  value={userType}
                  onValueChange={(v) => setUserType(v as "household" | "business")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="household" id="auth-household" />
                    <Label htmlFor="auth-household" className="flex items-center gap-1.5 text-sm">
                      <Home className="h-4 w-4" /> Ménage
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="business" id="auth-business" />
                    <Label htmlFor="auth-business" className="flex items-center gap-1.5 text-sm">
                      <Building2 className="h-4 w-4" /> Entreprise
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-lg bg-[hsl(135,55%,48%)] text-white text-lg font-bold hover:bg-[hsl(135,55%,40%)]"
              >
                {loading ? "Chargement..." : "Créer mon compte"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Déjà un compte ? <span className="font-semibold text-water">Se connecter</span>
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {mode === "forgot" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-1 font-display text-xl font-bold text-foreground">Mot de passe oublié</h2>
            <p className="mb-5 text-sm text-muted-foreground">Entrez votre email pour recevoir un lien de réinitialisation</p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                placeholder="Votre email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 rounded-lg text-base"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-lg bg-[hsl(217,90%,55%)] text-white text-lg font-bold hover:bg-[hsl(217,90%,48%)]"
              >
                {loading ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Retour à la <span className="font-semibold text-water">connexion</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AuthPage;
