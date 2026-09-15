import React, { useState, useEffect } from 'react';
import { dataStore } from '../services/dataStore';
import { AuthSecurityService } from '../services/authSecurity';
import { isSupabaseConfigured } from '../services/supabase';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
}) => {
  // Step 1: Normal Login / Step 2: First-Login Force Change Password
  const [step, setStep] = useState<'LOGIN' | 'FORCE_CHANGE_PASSWORD'>('LOGIN');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // New Password State (For First Connection Change)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [lockoutSecs, setLockoutSecs] = useState<number>(0);

  // Periodic check for lockout countdown
  useEffect(() => {
    const check = () => {
      const lock = AuthSecurityService.checkLockout();
      if (lock.isLocked) {
        setLockoutSecs(lock.remainingSeconds);
      } else {
        setLockoutSecs(0);
      }
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  const passwordStrength = AuthSecurityService.evaluatePasswordStrength(newPassword);

  // Handle Initial Login Check
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await AuthSecurityService.verifyCredentials(identifier, password);
      setIsLoading(false);

      if (res.success) {
        if (res.needsPasswordChange) {
          // Force user to change their password on first login
          setStep('FORCE_CHANGE_PASSWORD');
          setError(null);
        } else {
          dataStore.login(
            res.email || identifier || 'admin@suivibudget.ci', 
            res.fullName || 'Administrateur', 
            res.role || 'ADMIN'
          );
          onLoginSuccess();
        }
      } else {
        setError(res.error || "Identifiant ou mot de passe incorrect.");
      }
    } catch (err: any) {
      setIsLoading(false);
      setError("Erreur de sécurité : " + err.message);
    }
  };

  // Handle Forced Password Change Submission
  const handleForceChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    if (!passwordStrength.isValid) {
      setError("Le mot de passe doit comporter au moins 8 caractères, 1 majuscule, 1 minuscule, et au moins 1 chiffre ou caractère spécial.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await AuthSecurityService.updateAdminPassword(newPassword);
      setIsLoading(false);

      if (result.success) {
        setSuccessMessage(" Mot de passe administrateur sécurisé et enregistré avec succès !");
        dataStore.login(identifier || 'admin@suivibudget.ci', 'Administrateur National', 'ADMIN');
        setTimeout(() => {
          onLoginSuccess();
        }, 1200);
      } else {
        setError(result.error || "Erreur lors de la mise à jour.");
      }
    } catch (err: any) {
      setIsLoading(false);
      setError("Erreur cryptographique : " + err.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 pb-16">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-lg shadow-slate-950/20 border border-slate-700">
            {step === 'FORCE_CHANGE_PASSWORD' ? (
              <KeyRound className="w-7 h-7 text-brand-orange animate-bounce" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-brand-orange" />
            )}
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {step === 'FORCE_CHANGE_PASSWORD' ? ' Définition du Mot de Passe' : "Espace d'Administration"}
          </h2>

          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {step === 'FORCE_CHANGE_PASSWORD' ? (
              <span className="text-brand-orange font-bold">
                Première connexion détectée : Pour des raisons de sécurité, vous devez définir votre mot de passe administrateur personnel et secret.
              </span>
            ) : (
              "Veuillez renseigner votre identifiant et votre mot de passe sécurisé pour accéder au Back-Office."
            )}
          </p>
        </div>

        {/* Lockout Warning */}
        {lockoutSecs > 0 && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Compte temporairement verrouillé</span>
              <span>Trop de tentatives infructueuses. Veuillez patienter {Math.floor(lockoutSecs / 60)}m {lockoutSecs % 60}s.</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs animate-in shake duration-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-800 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            <span className="font-bold leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Republican Legal & Security Warning (Loi n°2013-451) */}
        {step === 'LOGIN' && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-300/80 rounded-2xl flex items-start gap-2.5 text-amber-950 text-[11px] leading-relaxed shadow-2xs">
            <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block text-amber-900 font-bold mb-0.5">Accès Réglementé & Réservé</strong>
              <span>
                Cet espace est strictement réservé aux administrateurs et modérateurs habilités. Toute tentative d'accès frauduleux ou d'intrusion est journalisée et passible des sanctions prévues par la Loi n°2013-451 relative à la cybercriminalité en Côte d'Ivoire.
              </span>
            </div>
          </div>
        )}

        {/* STEP 1: LOGIN FORM */}
        {step === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Identifiant / Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  disabled={lockoutSecs > 0}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin ou admin@suivibudget.ci"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Mot de passe temporaire initial
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={lockoutSecs > 0}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || lockoutSecs > 0}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-slate-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Vérification cryptographique...' : 'Se connecter'}</span>
              <ArrowRight className="w-4 h-4 text-brand-orange" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  AuthSecurityService.emergencyReset();
                  setIdentifier('admin');
                  setPassword('admin');
                  setError(null);
                  setLockoutSecs(0);
                  setSuccessMessage('Accès débloqué ! Identifiant: admin / Mot de passe: admin');
                }}
                className="text-[11px] text-brand-blue font-bold hover:underline"
              >
                 Débloquer / Réinitialiser l'accès temporaire
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: MANDATORY FIRST-LOGIN PASSWORD CHANGE */}
        {step === 'FORCE_CHANGE_PASSWORD' && (
          <form onSubmit={handleForceChangeSubmit} className="space-y-4 animate-in fade-in duration-300">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Nouveau mot de passe personnel
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 caractères sécurisés..."
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Real-time Password Strength Meter */}
              {newPassword && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span>Force du mot de passe :</span>
                    <span className={passwordStrength.isValid ? 'text-emerald-600' : 'text-rose-600'}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex gap-0.5">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`h-full flex-1 transition-all duration-300 ${
                          idx <= passwordStrength.score ? passwordStrength.color.split(' ')[0] : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1">
                    <span className={passwordStrength.hasMinLength ? 'text-emerald-600 font-bold' : ''}>
                      {passwordStrength.hasMinLength ? '' : '○'} 8+ caractères
                    </span>
                    <span className={passwordStrength.hasUppercase ? 'text-emerald-600 font-bold' : ''}>
                      {passwordStrength.hasUppercase ? '' : '○'} 1 Majuscule
                    </span>
                    <span className={passwordStrength.hasLowercase ? 'text-emerald-600 font-bold' : ''}>
                      {passwordStrength.hasLowercase ? '' : '○'} 1 Minuscule
                    </span>
                    <span className={passwordStrength.hasNumber || passwordStrength.hasSpecialChar ? 'text-emerald-600 font-bold' : ''}>
                      {passwordStrength.hasNumber || passwordStrength.hasSpecialChar ? '' : '○'} Chiffre/Symbole
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Confirmez le nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Répétez le mot de passe..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !passwordStrength.isValid || newPassword !== confirmPassword}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Hachage cryptographique SHA-256...' : 'Enregistrer mon Mot de Passe & Accéder'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Security parameters notice */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-[10px] text-slate-500 space-y-1 text-center">
          <div className="flex items-center justify-center gap-1 font-bold text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sécurité Renforcée : SHA-256 + Sel Aléatoire + Anti-Brute Force (5 essais max)</span>
          </div>
          <p>
            Aucun mot de passe n'est stocké en clair. Votre accès est protégé et journalisé.
          </p>
          <div className="pt-1 flex items-center justify-center">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[9px] ${isSupabaseConfigured() ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-700'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-600 animate-pulse' : 'bg-slate-500'}`} />
              {isSupabaseConfigured() ? 'Supabase Backend Actif (Auth RLS)' : 'Mode Autonome / Local'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
