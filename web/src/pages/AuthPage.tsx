import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowLeft, User, Phone, Building2, Home, Eye, EyeOff, Mail, Sparkles, ShieldCheck } from "lucide-react";
import SignaLogo from "@/components/SignaLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";

// ── Force du mot de passe ─────────────────────────────────────────────────────
function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (pwd.length === 0) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { score, label: "Faible", color: "bg-red-500" };
  if (score === 3) return { score, label: "Moyen", color: "bg-orange-400" };
  return { score, label: "Fort", color: "bg-green-500" };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? color : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        score <= 2 ? "text-red-500" : score === 3 ? "text-orange-500" : "text-green-600"
      }`}>
        {label}
        {score <= 2 && " — ajoutez des chiffres et majuscules"}
        {score >= 4 && " — excellent !"}
      </p>
    </div>
  );
}

// ── Bouton Google ─────────────────────────────────────────────────────────────
function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border-2 border-border/80 bg-background hover:bg-muted/50 hover:border-emerald-500/40 transition-all font-bold text-sm text-foreground shadow-xs active:scale-[0.99] disabled:opacity-50 group cursor-pointer"
      aria-label="Continuer avec mon compte Google Gmail"
    >
      {/* Logo Google Officiel SVG */}
      <svg width="20" height="20" viewBox="0 0 18 18" className="shrink-0 transition-transform group-hover:scale-110">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
      <span className="truncate">
        {loading ? "Connexion à SIGNA.ci..." : "Continuer avec Google (Gmail)"}
      </span>
    </button>
  );
}

// ── Séparateur ────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium">ou</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
const AuthPage = () => {
  const [searchParams] = useSearchParams();
  // Block open redirect: only allow relative paths (must start with "/" but not "//")
  const raw = searchParams.get("redirect") || "/";
  const redirectAfter = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  const initialMode = (searchParams.get("tab") === "signup" || searchParams.get("action") === "signup") ? "signup" : "login";

  const [mode, setMode]           = useState<"login" | "signup" | "forgot">(initialMode);
  const [loginMethod, setLoginMethod] = useState<"magic" | "password">("magic");

  // Persist redirect target so it survives email verification round-trip
  useEffect(() => {
    if (redirectAfter && redirectAfter !== "/") {
      sessionStorage.setItem("signa_auth_redirect", redirectAfter);
    }
  }, [redirectAfter]);

  const [identifier, setIdentifier]   = useState("");
  const [password, setPassword]       = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone]             = useState("");
  const [userType, setUserType]       = useState<"household" | "business">("household");
  const [loading, setLoading]         = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [magicSent, setMagicSent]     = useState(false);

  const navigate  = useNavigate();
  const goBack    = useGoBack("/");
  const isPhone   = (v: string) => /^\+?\d[\d\s-]{6,}$/.test(v.trim());

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // La redirection est gérée par Supabase
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
      setGoogleLoading(false);
    }
  };

  // ── Magic Link ────────────────────────────────────────────────────────────
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = identifier.trim();
    if (!email || isPhone(email)) {
      toast.error("Entrez une adresse email valide pour recevoir le lien.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  // ── Connexion mot de passe ────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmed = identifier.trim();
      const result = isPhone(trimmed)
        ? await supabase.auth.signInWithPassword({ phone: trimmed, password })
        : await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (result.error) throw result.error;
      toast.success("Connexion réussie !");
      navigate(redirectAfter);
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  // ── Inscription ───────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPwd) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    try {
      const trimmed  = identifier.trim();
      const metadata = {
        display_name: displayName,
        user_type: userType,
        phone: isPhone(trimmed) ? trimmed : phone || undefined,
      };
      const result = isPhone(trimmed)
        ? await supabase.auth.signUp({ phone: trimmed, password, options: { data: metadata } })
        : await supabase.auth.signUp({ email: trimmed, password, options: { emailRedirectTo: window.location.origin, data: metadata } });

      if (result.error) throw result.error;

      const newUser = result.data.user;
      if (newUser && (!newUser.identities || newUser.identities.length === 0)) {
        toast.info("Vous avez déjà un compte ! Connectez-vous ou utilisez « Mot de passe oublié ».", { duration: 6000 });
        setMode("login");
        return;
      }
      toast.success(
        isPhone(trimmed)
          ? "Compte créé ! Vérifiez votre SMS pour confirmer."
          : "Compte créé ! Vérifiez votre email pour confirmer."
      );
      setMode("login");
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  // ── Réinitialisation ──────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmed = identifier.trim();
      if (isPhone(trimmed)) {
        toast.error("La réinitialisation par téléphone n'est pas disponible. Utilisez votre email.");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Lien de réinitialisation envoyé !");
      setMode("login");
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  const pwdStrength = getPasswordStrength(password);
  const signupValid = privacyConsent && password.length >= 8 && password === confirmPwd && pwdStrength.score >= 3;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-8 sm:p-6 lg:p-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        <div className="mb-4">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-background/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-border/60 shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l'application
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* ── PANNEAU GAUCHE : IDENTITÉ & VALEUR CIVIQUE (Desktop & Tablet) ── */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <Link to="/" className="inline-block transition-transform hover:scale-105 active:scale-95" title="Accueil SIGNA.ci">
                <SignaLogo size="lg" />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
                La plateforme citoyenne qui fait bouger les lignes à Abidjan 🇨🇮
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connectez-vous pour signaler des anomalies, corroborer les pannes de vos voisins et suivre l'avancement des réparations en temps réel.
              </p>
            </div>

            {/* 4 Avantages Clés */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-base shrink-0">
                  ⚡
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">CIE (Électricité &amp; Éclairage)</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug">Coupures de courant, transformateurs et lampadaires en panne.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold text-base shrink-0">
                  💧
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">SODECI (Eau Potable)</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug">Robinets à sec, baisses de pression et fuites sur la voie publique.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-base shrink-0">
                  🏛️
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">Mairies (Voirie &amp; Salubrité)</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug">Nids-de-poule, caniveaux bouchés et ramassage des ordures.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-base shrink-0">
                  🛡️
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">Vie Privée (Loi n° 2013-450)</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug">Coordonnées confidentielles et floutage GPS (~150 m) sur la carte.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl w-fit">
              <span>📍 14 Communes du Grand Abidjan</span>
              <span>·</span>
              <span>100% Citoyen &amp; Gratuit</span>
            </div>
          </div>

          {/* ── PANNEAU DROIT : FORMULAIRE AUTHENTIFICATION ── */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            {/* Onglets Rapides Connexion / Inscription */}
            <div className="flex rounded-2xl border border-border/80 bg-card p-1.5 mb-3 shadow-xs">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cn(
                  "flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all",
                  mode === "login"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={cn(
                  "flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all",
                  mode === "signup"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Créer un compte
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {/* ── CONNEXION ─────────────────────────────────────────────────── */}
            {mode === "login" && (
              <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-sm space-y-4">
                <div>
                  <h2 className="font-display text-xl font-black text-foreground">Connexion</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Accédez à votre espace citoyen SIGNA.ci</p>
                </div>

            {/* Google */}
            <GoogleButton loading={googleLoading} onClick={handleGoogle} />

            <Divider />

            {/* Toggle Lien / Mot de passe */}
            <div className="flex rounded-xl border border-border/80 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => { setLoginMethod("magic"); setMagicSent(false); }}
                className={cn(
                  "flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg transition-all",
                  loginMethod === "magic"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Sparkles className="h-3.5 w-3.5" /> Lien magique
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("password")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg transition-all",
                  loginMethod === "password"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="h-3.5 w-3.5" /> Mot de passe
              </button>
            </div>

            {/* Magic Link */}
            {loginMethod === "magic" && !magicSent && (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Votre adresse email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-11 pl-10 rounded-xl text-sm focus-visible:ring-emerald-500"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading ? "Envoi du lien..." : "Recevoir le lien magique →"}
                </Button>
                <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                  Connexion instantanée sécurisée par email sans avoir à retenir de mot de passe.
                </p>
              </form>
            )}

            {/* Magic Link envoyé */}
            {loginMethod === "magic" && magicSent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center space-y-2"
              >
                <div className="text-3xl">📬</div>
                <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Lien envoyé !</p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez votre boîte mail <strong>{identifier}</strong> et cliquez sur le lien pour vous connecter.
                </p>
                <button
                  type="button"
                  onClick={() => setMagicSent(false)}
                  className="text-xs text-emerald-600 hover:underline font-semibold"
                >
                  Changer d'email
                </button>
              </motion.div>
            )}

            {/* Mot de passe */}
            {loginMethod === "password" && (
              <form onSubmit={handleLogin} className="space-y-3">
                <Input
                  placeholder="Email ou numéro de téléphone"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-11 rounded-xl text-sm focus-visible:ring-emerald-500"
                  required
                />
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl text-sm pr-12 focus-visible:ring-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none rounded"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 text-center border-t border-border/70">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Pas encore de compte ?{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Créer un compte</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Données protégées · Respect de la Loi n° 2013-450</span>
            </div>
          </div>
        )}

        {/* ── INSCRIPTION ───────────────────────────────────────────────── */}
        {mode === "signup" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Créer un compte</h2>
              <p className="text-sm text-muted-foreground">Rejoignez la communauté SIGNA-CI</p>
            </div>

            {/* Google — le plus rapide */}
            <GoogleButton loading={googleLoading} onClick={handleGoogle} />

            <Divider />

            <form onSubmit={handleSignup} className="space-y-3">
              {/* Nom */}
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

              {/* Email ou téléphone */}
              <Input
                placeholder="Email ou numéro de téléphone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 rounded-lg text-base"
                required
              />

              {/* Téléphone optionnel si email */}
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

              {/* Mot de passe */}
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe (8 caractères min.)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg text-base pr-12"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {password && <PasswordStrengthBar password={password} />}
              </div>

              {/* Confirmation mot de passe */}
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirmer le mot de passe"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  aria-invalid={confirmPwd.length > 0 && confirmPwd !== password}
                  aria-describedby={confirmPwd !== password && confirmPwd.length > 0 ? "confirm-pwd-error" : undefined}
                  className={cn(
                    "h-12 rounded-lg text-base pr-12",
                    confirmPwd && confirmPwd !== password && "border-destructive focus-visible:ring-destructive",
                    confirmPwd && confirmPwd === password && "border-success focus-visible:ring-success"
                  )}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label={showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"}
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                {confirmPwd && confirmPwd !== password && (
                  <p id="confirm-pwd-error" role="alert" className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              {/* Type de profil */}
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

              {/* Consentement */}
              <div className="rounded-xl border border-border bg-muted/50 p-3">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="privacy-consent"
                    checked={privacyConsent}
                    onCheckedChange={(c) => setPrivacyConsent(c === true)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="privacy-consent"
                    className="text-xs leading-relaxed cursor-pointer text-muted-foreground"
                  >
                    Je certifie avoir <strong className="text-foreground">18 ans ou plus</strong> et j'accepte la{" "}
                    <Link to="/confidentialite" target="_blank" className="text-emerald-600 underline font-semibold">
                      politique de confidentialité
                    </Link>{" "}
                    et les{" "}
                    <Link to="/cgu" target="_blank" className="text-emerald-600 underline font-semibold">
                      conditions d'utilisation
                    </Link>.
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !signupValid}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? "Création..." : "Créer mon compte"}
              </Button>
              {!signupValid && !loading && (privacyConsent || password.length > 0) && (
                <p className="text-xs text-center text-muted-foreground">
                  {!privacyConsent
                    ? "Acceptez la politique de confidentialité pour continuer"
                    : password.length < 8
                    ? "Le mot de passe doit contenir au moins 8 caractères"
                    : pwdStrength.score < 3
                    ? "Renforcez votre mot de passe (ajoutez majuscules et chiffres)"
                    : password !== confirmPwd
                    ? "Les mots de passe ne correspondent pas"
                    : null}
                </p>
              )}
            </form>

            <div className="pt-2 text-center border-t border-border/70">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Déjà un compte ?{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Se connecter</span>
              </button>
            </div>
          </div>
        )}

        {/* ── MOT DE PASSE OUBLIÉ ───────────────────────────────────────── */}
        {mode === "forgot" && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-display text-xl font-extrabold text-foreground">Mot de passe oublié</h2>
              <p className="text-xs text-muted-foreground">Recevez un lien pour réinitialiser votre mot de passe</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Votre email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-11 pl-10 rounded-xl text-sm focus-visible:ring-emerald-500"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>
            <div className="pt-2 text-center border-t border-border/70">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Retour à la <span className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">connexion</span>
              </button>
            </div>
          </div>
        )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  </div>
);
};

export default AuthPage;
