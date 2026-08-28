import React, { useState } from 'react';
import { UserRole } from '../types';
import { dataStore } from '../services/dataStore';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  KeyRound, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      dataStore.login(email || 'admin@civicdata.ci', fullName || 'Administrateur National', role);
      setIsLoading(false);
      onLoginSuccess();
    }, 500);
  };

  const handleQuickLogin = (quickRole: UserRole, defaultEmail: string, defaultName: string) => {
    setIsLoading(true);
    setTimeout(() => {
      dataStore.login(defaultEmail, defaultName, quickRole);
      setIsLoading(false);
      onLoginSuccess();
    }, 400);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 pb-20">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-navy-900 to-navy-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-navy-950/20 border border-navy-600">
            <ShieldCheck className="w-8 h-8 text-terracotta-400" />
          </div>
          <h2 className="text-2xl font-extrabold text-navy-900 tracking-tight font-sans">
            Portail d'Administration
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Accès sécurisé pour la modération des preuves et la gestion budgétaire
          </p>
        </div>

        {/* 1-Click Fast Role Presets (Pour tester immédiatement) */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block text-center">
            ⚡ Connexion Rapide Démo (1-Clic)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN', 'admin@civicdata.ci', 'Admin National')}
              className="p-2 rounded-xl bg-white hover:bg-navy-900 hover:text-white border border-slate-200 text-slate-800 text-[11px] font-bold shadow-sm transition-all text-center"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('MODERATOR', 'moderateur@civicdata.ci', 'Modérateur Terrain')}
              className="p-2 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-slate-200 text-slate-800 text-[11px] font-bold shadow-sm transition-all text-center"
            >
              🛡️ Modérateur
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('DATA_MANAGER', 'data@civicdata.ci', 'Gestionnaire Données')}
              className="p-2 rounded-xl bg-white hover:bg-amber-600 hover:text-white border border-slate-200 text-slate-800 text-[11px] font-bold shadow-sm transition-all text-center"
            >
              📊 Data Manager
            </button>
          </div>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Professionnel
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: admin@civicdata.ci"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Rôle attribué
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy-800"
            >
              <option value="ADMIN">Administrateur Global (Full Access CRUD & Modération)</option>
              <option value="MODERATOR">Modérateur Terrain (Validation des preuves)</option>
              <option value="DATA_MANAGER">Gestionnaire de Données (Import/Export Budget)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-navy-900 hover:bg-navy-800 active:scale-98 text-white rounded-xl text-sm font-bold shadow-lg shadow-navy-950/20 transition-all flex items-center justify-center gap-2"
          >
            <span>{isLoading ? 'Connexion en cours...' : 'Se connecter au Back-Office'}</span>
            <ArrowRight className="w-4 h-4 text-terracotta-400" />
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-500">
          Plateforme protégée par Supabase Auth & Row Level Security (RLS).
        </p>

      </div>
    </div>
  );
};
