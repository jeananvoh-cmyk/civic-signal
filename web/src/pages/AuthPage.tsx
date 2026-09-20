import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Building2, 
  Home, 
  Eye, 
  EyeOff, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  Zap, 
  Droplets, 
  Landmark, 
  MapPin, 
  MailCheck 
} from "lucide-react";
import SignaLogo from "@/components/SignaLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  if (score === 3) return { score, label: "Moyen", color: "bg-amber-500" };
  return { score, label: "Robuste", color: "bg-emerald-600" };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1.5" aria-hidden="true">
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
        score <= 2 ? "text-red-500 dark:text-red-400" : score === 3 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
      }`}>
        {label}
        {score <= 2 && " — ajoutez des majuscules et des chiffres"}
        {score === 3 && " — ajoutez un caractère spécial"}
        {score >= 4 && " — mot de passe sécurisé"}
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
      className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-border/80 bg-background hover:bg-muted/50 hover:border-emerald-500/40 transition-all font-semibold text-sm text-foreground shadow-xs active:scale-[0.99] disabled:opacity-50 group cursor-pointer"
      aria-label="Continuer avec mon compte Google"
    >
      <svg width="20" height="20" viewBox="0 0 18 18" className="shrink-0 transition-transform group-hover:scale-105" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
      <span className="truncate">
        {loading ? "Connexion en cours..." : "Continuer avec Google (Gmail)"}
      </span>
    </button>
  );
}

// ── Séparateur ────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <div className="flex items-center gap-3 my-1" aria-hidden="true">
      <div className="flex-1 h-px bg-border/80" />
      <span className="text-xs text-muted-foreground font-medium">ou</span>
      <div className="flex-1 h-px bg-border/80" />
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
      const isNative = typeof (window as any)?.Capacitor !== "undefined" && (window as any)?.Capacitor?.isNativePlatform?.();
      const redirectUrl = isNative ? "ci.signa.app://auth/callback" : window.location.origin;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
      // La redirection est gérée par Supabase
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
      setGoogleLoading(false);
    }
  };

  // ── Lien par email (Magic Link sécurisé) ──────────────────────────────────
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = identifier.trim();
    if (!email || isPhone(email)) {
      toast.error("Veuillez saisir une adresse email valide.");
      return;
    }
    setLoading(true);
    try {
      const isNative = typeof (window as any)?.Capacitor !== "undefined" && (window as any)?.Capacitor?.isNativePlatform?.();
      const redirectUrl = isNative ? "ci.signa.app://auth/callback" : window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl },
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
      toast.success("Connexion réussie.");
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
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit comporter au moins 8 caractères.");
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
        toast.info("Un compte existe déjà avec cet identifiant. Connectez-vous ou réinitialisez votre mot de passe.", { duration: 6000 });
        setMode("login");
        return;
      }
      toast.success(
        isPhone(trimmed)
          ? "Compte créé. Veuillez consulter votre SMS pour confirmer l'inscription."
          : "Compte créé. Veuillez vérifier vos emails pour valider l'inscription."
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
        toast.error("La réinitialisation par numéro de téléphone n'est pas disponible. Utilisez votre adresse email.");
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success("Lien de réinitialisation transmis par email.");
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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-6 sm:p-6 lg:p-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl"
      >
        {/* Navigation retour */}
        <div className="mb-4 sm:mb-6">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-background/90 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-border/70 shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l'application
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ── PANNEAU GAUCHE : PRÉSENTATION DES SERVICES (Visible uniquement sur Desktop & Tablette large) ── */}
          <div className="hidden lg:block lg:col-span-6 space-y-6 pt-1">
            <div className="space-y-3">
              <Link to="/" className="inline-block transition-transform hover:scale-105 active:scale-95" title="Accueil SIGNA.ci">
                <SignaLogo size="lg" />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-tight">
                Plateforme citoyenne des services publics à Abidjan
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connectez-vous pour signaler des incidents, corroborer les anomalies de votre quartier et suivre l'avancement des réparations en temps réel.
              </p>
            </div>

            {/* Piliers de services publics avec icônes techniques */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">CIE (Électricité &amp; Éclairage)</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug">Coupures d'électricité, transformateurs et éclairage public hors service.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Droplets className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">SODECI (Eau Potable)</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug">Interruptions de distribution, baisses de pression et fuites sur voirie.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">Services Municipaux (Voirie &amp; Salubrité)</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug">Dégradations de chaussée, caniveaux obstrués et salubrité urbaine.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">Protection des données (Loi n° 2013-450)</h2>
                  <p className="text-[11px] text-muted-foreground leading-snug">Coordonnées confidentielles et floutage géographique des coordonnées privées.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl w-fit">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>14 communes du Grand Abidjan</span>
              <span className="text-emerald-400 dark:text-emerald-600">·</span>
              <span>Accès citoyen gratuit</span>
            </div>
          </div>

          {/* ── PANNEAU DROIT / MOBILE FIRST : FORMULAIRE D'ACCÈS ── */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            {/* En-tête compact spécifique pour smartphone */}
            <div className="lg:hidden text-center mb-4 space-y-1">
              <Link to="/" className="inline-block transition-transform hover:scale-105 active:scale-95" title="Accueil SIGNA.ci">
                <SignaLogo size="md" />
              </Link>
              <p className="text-xs text-muted-foreground font-medium">
                Services publics et voirie du Grand Abidjan
              </p>
            </div>

            {/* Onglets Rapides Connexion / Inscription */}
            <div className="flex rounded-2xl border border-border/80 bg-card p-1.5 mb-3 shadow-xs">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cn(
                  "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer",
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
                  "flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer",
                  mode === "signup"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Créer un compte
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={mode} 
                initial={{ opacity: 0, y: 6 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -6 }} 
                transition={{ duration: 0.16 }}
              >
                {/* ── FORMULAIRE : CONNEXION ─────────────────────────────────── */}
                {mode === "login" && (
                  <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-sm space-y-4">
                    <div>
                      <h2 className="font-display text-xl font-black text-foreground">Connexion</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Accédez à votre espace citoyen SIGNA.ci</p>
                    </div>

                    {/* Google OAuth */}
                    <GoogleButton loading={googleLoading} onClick={handleGoogle} />

                    <Divider />

                    {/* Sélecteur de méthode de connexion */}
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/80 bg-muted/40 p-1">
                      <button
                        type="button"
                        onClick={() => { setLoginMethod("magic"); setMagicSent(false); }}
                        className={cn(
                          "py-2 px-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer",
                          loginMethod === "magic"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span>Lien par email</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginMethod("password")}
                        className={cn(
                          "py-2 px-2 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer",
                          loginMethod === "password"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <KeyRound className="h-3.5 w-3.5 shrink-0" />
                        <span>Mot de passe</span>
                      </button>
                    </div>

                    {/* Méthode 1 : Lien par email */}
                    {loginMethod === "magic" && !magicSent && (
                      <form onSubmit={handleMagicLink} className="space-y-3">
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <Input
                            type="email"
                            placeholder="Votre adresse email"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="h-12 pl-10 rounded-xl text-base sm:text-sm focus-visible:ring-emerald-500"
                            autoComplete="email"
                            inputMode="email"
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                        >
                          {loading ? "Envoi du lien en cours..." : "Recevoir le lien de connexion"}
                        </Button>
                        <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                          Connexion sécurisée sans mot de passe à retenir.
                        </p>
                      </form>
                    )}

                    {/* État de confirmation d'envoi du lien */}
                    {loginMethod === "magic" && magicSent && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center space-y-2.5"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-600/15 text-emerald-600 mx-auto flex items-center justify-center">
                          <MailCheck className="h-6 w-6" />
                        </div>
                        <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Lien envoyé</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Consultez votre boîte mail <span className="font-semibold text-foreground">{identifier}</span> et cliquez sur le lien pour vous connecter.
                        </p>
                        <button
                          type="button"
                          onClick={() => setMagicSent(false)}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer pt-1"
                        >
                          Modifier l'adresse email
                        </button>
                      </motion.div>
                    )}

                    {/* Méthode 2 : Identifiant et mot de passe */}
                    {loginMethod === "password" && (
                      <form onSubmit={handleLogin} className="space-y-3">
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <Input
                            placeholder="Email ou numéro de téléphone"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="h-12 pl-10 rounded-xl text-base sm:text-sm focus-visible:ring-emerald-500"
                            autoComplete="username"
                            required
                          />
                        </div>
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 pl-10 pr-12 rounded-xl text-base sm:text-sm focus-visible:ring-emerald-500"
                            autoComplete="current-password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none rounded-lg cursor-pointer"
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                        >
                          {loading ? "Connexion..." : "Se connecter"}
                        </Button>
                        <div className="text-center pt-0.5">
                          <button
                            type="button"
                            onClick={() => setMode("forgot")}
                            className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
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
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Pas encore de compte ?{" "}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Créer un compte</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Données personnelles protégées · Loi n° 2013-450</span>
                    </div>
                  </div>
                )}

                {/* ── FORMULAIRE : CRÉATION DE COMPTE ───────────────────────── */}
                {mode === "signup" && (
                  <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-sm space-y-4">
                    <div>
                      <h2 className="font-display text-xl font-black text-foreground">Créer un compte</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Rejoignez la communauté citoyenne SIGNA.ci</p>
                    </div>

                    {/* Google */}
                    <GoogleButton loading={googleLoading} onClick={handleGoogle} />

                    <Divider />

                    <form onSubmit={handleSignup} className="space-y-3">
                      {/* Nom complet */}
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Nom complet"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="h-12 pl-10 rounded-xl text-base sm:text-sm focus-visible:ring-emerald-500"
                          autoComplete="name"
                          required
                        />
                      </div>

                      {/* Identifiant Email ou Téléphone */}
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Adresse email ou téléphone"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="h-12 pl-10 rounded-xl text-base sm:text-sm focus-visible:ring-emerald-500"
                          autoComplete="username"
                          required
                        />
                      </div>

                      {/* Téléphone optionnel si email renseigné */}
                      {!isPhone(identifier) && (
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <Input
                            placeholder="Téléphone (optionnel)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="h-12 pl-10 rounded-xl text-base sm:text-sm focus-visible:ring-emerald-500"
                            autoComplete="tel"
                            inputMode="tel"
                          />
                        </div>
                      )}

                      {/* Mot de passe */}
                      <div className="space-y-1.5">
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Mot de passe (8 caractères min.)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 pl-10 pr-12 rounded-xl text-base sm:text-sm focus-visible:ring-emerald-500"
                            autoComplete="new-password"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none rounded-lg cursor-pointer"
                            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {password && <PasswordStrengthBar password={password} />}
                      </div>

                      {/* Confirmation mot de passe */}
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Confirmer le mot de passe"
                          value={confirmPwd}
                          onChange={(e) => setConfirmPwd(e.target.value)}
                          aria-invalid={confirmPwd.length > 0 && confirmPwd !== password}
                          aria-describedby={confirmPwd !== password && confirmPwd.length > 0 ? "confirm-pwd-error" : undefined}
                          className={cn(
                            "h-12 pl-10 pr-12 rounded-xl text-base sm:text-sm focus-visible:ring-emerald-500",
                            confirmPwd && confirmPwd !== password && "border-destructive focus-visible:ring-destructive",
                            confirmPwd && confirmPwd === password && "border-emerald-500 focus-visible:ring-emerald-500"
                          )}
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none rounded-lg cursor-pointer"
                          aria-label={showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {confirmPwd && confirmPwd !== password && (
                          <p id="confirm-pwd-error" role="alert" className="text-xs text-destructive mt-1">
                            Les mots de passe ne correspondent pas
                          </p>
                        )}
                      </div>

                      {/* Type de profil (tactile sans émojis) */}
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-bold text-foreground">Type de compte</Label>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setUserType("household")}
                            className={cn(
                              "flex items-center justify-center gap-2 h-11 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                              userType === "household"
                                ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                                : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            )}
                          >
                            <Home className="h-4 w-4 shrink-0" />
                            <span>Particulier / Ménage</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserType("business")}
                            className={cn(
                              "flex items-center justify-center gap-2 h-11 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                              userType === "business"
                                ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs"
                                : "border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            )}
                          >
                            <Building2 className="h-4 w-4 shrink-0" />
                            <span>Professionnel / PME</span>
                          </button>
                        </div>
                      </div>

                      {/* Consentement confidentialité et conditions */}
                      <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5">
                        <label htmlFor="privacy-consent" className="flex items-start gap-3 cursor-pointer">
                          <Checkbox
                            id="privacy-consent"
                            checked={privacyConsent}
                            onCheckedChange={(c) => setPrivacyConsent(c === true)}
                            className="mt-0.5 shrink-0"
                          />
                          <span className="text-xs leading-relaxed text-muted-foreground select-none">
                            J'atteste avoir <strong className="text-foreground">18 ans ou plus</strong> et j'accepte la{" "}
                            <Link to="/confidentialite" target="_blank" className="text-emerald-600 dark:text-emerald-400 underline font-semibold">
                              politique de confidentialité
                            </Link>{" "}
                            ainsi que les{" "}
                            <Link to="/cgu" target="_blank" className="text-emerald-600 dark:text-emerald-400 underline font-semibold">
                              conditions d'utilisation
                            </Link>.
                          </span>
                        </label>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading || !signupValid}
                        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? "Création du compte..." : "Créer mon compte"}
                      </Button>

                      {!signupValid && !loading && (privacyConsent || password.length > 0) && (
                        <p className="text-[11px] text-center text-muted-foreground">
                          {!privacyConsent
                            ? "Cochez la case pour accepter les conditions"
                            : password.length < 8
                            ? "Le mot de passe doit comporter au moins 8 caractères"
                            : pwdStrength.score < 3
                            ? "Renforcez votre mot de passe avec des chiffres et majuscules"
                            : password !== confirmPwd
                            ? "Les deux mots de passe ne sont pas identiques"
                            : null}
                        </p>
                      )}
                    </form>

                    <div className="pt-2 text-center border-t border-border/70">
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Déjà inscrit ?{" "}
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">Se connecter</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── FORMULAIRE : MOT DE PASSE OUBLIÉ ───────────────────────── */}
                {mode === "forgot" && (
                  <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-sm space-y-4">
                    <div>
                      <h2 className="font-display text-xl font-black text-foreground">Mot de passe oublié</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Recevez un lien par email pour réinitialiser votre accès</p>
                    </div>

                    <form onSubmit={handleForgotPassword} className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Input
                          type="email"
                          placeholder="Votre adresse email"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="h-12 pl-10 rounded-xl text-base sm:text-sm focus-visible:ring-emerald-500"
                          autoComplete="email"
                          inputMode="email"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                      >
                        {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
                      </Button>
                    </form>

                    <div className="pt-2 text-center border-t border-border/70">
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
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
