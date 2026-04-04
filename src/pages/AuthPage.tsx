import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, ArrowLeft, User, Phone, Building2, Home, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { Separator } from "@/components/ui/separator";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#1877F2" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState<"household" | "business">("household");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const navigate = useNavigate();

  const isPhone = (value: string) => /^\+?\d[\d\s-]{6,}$/.test(value.trim());

  const handleOAuthLogin = async (provider: "google" | "facebook") => {
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
      setOauthLoading(null);
    }
  };

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
      toast.error(getUserFriendlyError(error));
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
      const metadata = {
        display_name: displayName,
        user_type: userType,
        phone: isPhone(trimmed) ? trimmed : phone || undefined,
      };

      if (isPhone(trimmed)) {
        result = await supabase.auth.signUp({
          phone: trimmed,
          password,
          options: { data: metadata },
        });
      } else {
        result = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: metadata,
          },
        });
      }
      if (result.error) throw result.error;

      const newUser = result.data.user;
      if (newUser && (!newUser.identities || newUser.identities.length === 0)) {
        toast.info(
          "😊 Bonne nouvelle, vous avez déjà un compte ! Connectez-vous avec cet identifiant ou cliquez sur « Mot de passe oublié » si besoin.",
          { duration: 6000 }
        );
        setMode("login");
        return;
      }

      toast.success(
        isPhone(trimmed)
          ? "Compte créé ! Vérifiez votre téléphone pour le code de confirmation."
          : "Compte créé ! Vérifiez votre email pour confirmer."
      );
      setMode("login");
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
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
      toast.error(getUserFriendlyError(error));
    } finally {
      setLoading(false);
    }
  };

  const OAuthButtons = ({ label }: { label: string }) => (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        disabled={!!oauthLoading}
        onClick={() => handleOAuthLogin("google")}
        className="w-full h-12 rounded-lg text-base font-medium gap-3 border-border hover:bg-muted/80"
      >
        {oauthLoading === "google" ? (
          <span className="animate-spin h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
        ) : (
          <GoogleIcon />
        )}
        {label} avec Google
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!!oauthLoading}
        onClick={() => handleOAuthLogin("facebook")}
        className="w-full h-12 rounded-lg text-base font-medium gap-3 border-border hover:bg-muted/80"
      >
        {oauthLoading === "facebook" ? (
          <span className="animate-spin h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
        ) : (
          <FacebookIcon />
        )}
        {label} avec Facebook
      </Button>

      <div className="flex items-center gap-3 my-1">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground font-medium">ou</span>
        <Separator className="flex-1" />
      </div>
    </div>
  );

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
            SIGNA<span className="text-water">-CI</span>
          </span>
        </div>

        {/* LOGIN */}
        {mode === "login" && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <OAuthButtons label="Se connecter" />

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                placeholder="Email ou numéro de téléphone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 rounded-lg border-border bg-background text-base"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-lg border-border bg-background text-base pr-12"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
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
            <p className="mb-5 text-sm text-muted-foreground">Rejoignez la communauté SIGNA-CI</p>

            <OAuthButtons label="S'inscrire" />

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

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg text-base pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="rounded-lg bg-muted/60 px-3 py-2.5 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Votre mot de passe doit contenir :</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${password.length >= 6 ? 'bg-[hsl(135,55%,48%)] text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>✓</span>
                      <span className={password.length >= 6 ? 'text-foreground' : 'text-muted-foreground'}>Au moins 6 caractères</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${/[A-Z]/.test(password) ? 'bg-[hsl(135,55%,48%)] text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>✓</span>
                      <span className={/[A-Z]/.test(password) ? 'text-foreground' : 'text-muted-foreground'}>Une lettre majuscule</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${/[a-z]/.test(password) ? 'bg-[hsl(135,55%,48%)] text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>✓</span>
                      <span className={/[a-z]/.test(password) ? 'text-foreground' : 'text-muted-foreground'}>Une lettre minuscule</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${/[0-9]/.test(password) ? 'bg-[hsl(135,55%,48%)] text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>✓</span>
                      <span className={/[0-9]/.test(password) ? 'text-foreground' : 'text-muted-foreground'}>Un chiffre</span>
                    </div>
                  </div>
                )}
              </div>

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

              <div className="space-y-3 rounded-xl border border-border bg-muted/50 p-3">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="privacy-consent"
                    checked={privacyConsent}
                    onCheckedChange={(c) => setPrivacyConsent(c === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="privacy-consent" className="text-xs leading-relaxed cursor-pointer text-muted-foreground">
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
                disabled={loading || !privacyConsent}
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
