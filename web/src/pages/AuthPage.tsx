import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap, ArrowLeft, User, Phone, Building2, Home, Eye, EyeOff, Mail, Sparkles } from "lucide-react";
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
      className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border-2 border-border bg-background hover:bg-muted/60 transition-colors font-semibold text-sm text-foreground disabled:opacity-50"
    >
      {/* Logo Google SVG */}
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
      {loading ? "Connexion..." : "Continuer avec Google"}
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
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <button
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>

        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-hero">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">
            SIGNA<span className="text-water">-CI</span>
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
        {/* ── CONNEXION ─────────────────────────────────────────────────── */}
        {mode === "login" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Connexion</h2>
              <p className="text-sm text-muted-foreground">Bienvenue sur SIGNA-CI</p>
            </div>

            {/* Google */}
            <GoogleButton loading={googleLoading} onClick={handleGoogle} />

            <Divider />

            {/* Toggle Lien / Mot de passe */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setLoginMethod("magic"); setMagicSent(false); }}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors",
                  loginMethod === "magic"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted/50"
                )}
              >
                <Sparkles className="h-3.5 w-3.5" /> Lien magique
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod("password")}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors",
                  loginMethod === "password"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted/50"
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
                    placeholder="Votre email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="h-12 pl-10 rounded-lg text-base"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-base font-bold"
                >
                  {loading ? "Envoi..." : "Recevoir le lien par email →"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Vous recevrez un lien sécurisé. Cliquez dessus pour vous connecter instantanément.
                </p>
              </form>
            )}

            {/* Magic Link envoyé */}
            {loginMethod === "magic" && magicSent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center space-y-2"
              >
                <div className="text-3xl">📬</div>
                <p className="font-semibold text-green-700 dark:text-green-400">Lien envoyé !</p>
                <p className="text-sm text-muted-foreground">
                  Vérifiez votre boîte mail <strong>{identifier}</strong> et cliquez sur le lien pour vous connecter.
                </p>
                <button
                  type="button"
                  onClick={() => setMagicSent(false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Changer d'email
                </button>
              </motion.div>
            )}

            {/* Mot de passe */}
            {loginMethod === "password" && (
              <form onSubmit={handleLogin} className="space-y-3">
                <Input
                  placeholder="Email ou téléphone"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-12 rounded-lg text-base"
                  required
                />
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg text-base pr-12"
                    required
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
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90"
                >
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-sm text-water hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </form>
            )}

            <div className="pt-1 text-center border-t border-border">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Pas encore de compte ?{" "}
                <span className="font-semibold text-water">Créer un compte</span>
              </button>
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
                    <Link to="/confidentialite" target="_blank" className="text-primary underline">
                      politique de confidentialité
                    </Link>{" "}
                    et les{" "}
                    <Link to="/a-propos" target="_blank" className="text-primary underline">
                      conditions d'utilisation
                    </Link>.
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !signupValid}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90 disabled:opacity-50"
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

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Déjà un compte ?{" "}
                <span className="font-semibold text-water">Se connecter</span>
              </button>
            </div>
          </div>
        )}

        {/* ── MOT DE PASSE OUBLIÉ ───────────────────────────────────────── */}
        {mode === "forgot" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Mot de passe oublié</h2>
              <p className="text-sm text-muted-foreground">Recevez un lien pour réinitialiser votre mot de passe</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Votre email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-12 pl-10 rounded-lg text-base"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-base font-bold hover:bg-primary/90"
              >
                {loading ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>
            <div className="text-center">
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
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AuthPage;
