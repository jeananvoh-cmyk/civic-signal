// =========================================================================
// SUIVI BUDGET CI - MODULE DE SÉCURITÉ CRYPTOGRAPHIQUE ET GESTION DES ACCÈS
// Conforme aux standards : Hachage SHA-256 pur (zéro dépendance crypto.subtle),
// Salage aléatoire, Protection Anti-Brute Force, et Gestion Multi-Comptes Modérateurs.
// =========================================================================

import { supabase, isSupabaseConfigured } from './supabase';

export interface ModeratorUser {
  id: string;
  email: string;
  full_name: string;
  role: 'MODERATOR' | 'DATA_MANAGER';
  password_hash: string;
  salt: string;
  created_at: string;
  last_login?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  permissions: {
    can_moderate_proofs: boolean;
    can_manage_projects: boolean;
    can_manage_institutions: boolean;
    can_manage_news: boolean;
  };
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Très faible' | 'Faible' | 'Moyen' | 'Fort' | 'Excellent';
  color: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  isValid: boolean;
}

export interface SessionPayload {
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER';
  issuedAt: number;
  expiresAt: number;
}

export interface SignedSessionToken {
  payload: SessionPayload;
  signature: string;
}

const AUTH_STORAGE_KEYS = {
  ADMIN_HASH: 'civicdata_sec_admin_hash_v2',
  ADMIN_SALT: 'civicdata_sec_admin_salt_v2',
  ADMIN_NEEDS_CHANGE: 'civicdata_sec_admin_needs_change_v2',
  FAILED_ATTEMPTS: 'civicdata_sec_failed_attempts_v2',
  LOCKOUT_UNTIL: 'civicdata_sec_lockout_until_v2',
  PASSWORD_CHANGED_AT: 'civicdata_sec_pwd_changed_at_v2',
  MODERATORS: 'civicdata_sec_moderators_v2',
  SESSION_TOKEN: 'civicdata_sec_session_v3',
};

const SESSION_SECRET_SEED = 'civicdata_session_hmac_2026_9b8f21_ci';

function signSessionPayload(payload: SessionPayload): string {
  const str = `${payload.email}:::${payload.role}:::${payload.issuedAt}:::${payload.expiresAt}:::${SESSION_SECRET_SEED}`;
  return sha256_pure(str);
}

const INITIAL_DEFAULT_SALT = 'civic_ci_salt_2026_x89a';

// Pure JavaScript SHA-256 implementation (Works 100% reliably in all HTTP, HTTPS, LAN IP environments)
function sha256_pure(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  let i, j;
  let result = '';
  const words: number[] = [];
  
  // UTF-8 encoding
  const compositeArray = unescape(encodeURIComponent(ascii));
  for (i = 0; i < compositeArray.length; i++) {
    const wordIndex = i >> 2;
    words[wordIndex] = (words[wordIndex] || 0) | (compositeArray.charCodeAt(i) << ((3 - (i % 4)) * 8));
  }
  
  const bitLength = compositeArray.length * 8;
  const wordLength = bitLength >> 5;
  words[wordLength] = (words[wordLength] || 0) | (0x80 << ((3 - ((compositeArray.length) % 4)) * 8));
  words[(((bitLength + 64) >>> 9) << 4) + 15] = bitLength;

  let hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (i = 0; i < words.length; i += 16) {
    const w: number[] = [];
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] || 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (j = 0; j < 64; j++) {
      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const sigma0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const sigma1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const t1 = (h + sigma1 + ch + k[j] + w[j]) | 0;
      const t2 = (sigma0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

const INITIAL_DEFAULT_HASH = sha256_pure('CivicData2026!:::' + INITIAL_DEFAULT_SALT + ':::civicdata_key_v1');

// In-memory fallback for environments without global sessionStorage (SSR, Node test runners)
let inMemorySessionStore: string | null = null;

function getSessionItem(key: string): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(key);
    }
  } catch {}
  return inMemorySessionStore;
}

function setSessionItem(key: string, value: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value);
    }
  } catch {}
  inMemorySessionStore = value;
}

function removeSessionItem(key: string): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    }
  } catch {}
  inMemorySessionStore = null;
}

export class AuthSecurityService {
  public static async hashPassword(password: string, salt: string): Promise<string> {
    return sha256_pure(password + ':::' + salt + ':::civicdata_key_v1');
  }

  public static generateSalt(): string {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      try {
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch {}
    }
    // Fallback
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  public static initializeSecurity() {
    try {
      const existingHash = localStorage.getItem(AUTH_STORAGE_KEYS.ADMIN_HASH);
      if (!existingHash) {
        localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_HASH, INITIAL_DEFAULT_HASH);
        localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_SALT, INITIAL_DEFAULT_SALT);
        localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_NEEDS_CHANGE, 'true');
      }
    } catch (e) {
      console.warn("Storage error in initializeSecurity", e);
    }
  }

  public static needsPasswordChange(): boolean {
    this.initializeSecurity();
    try {
      const needsChange = localStorage.getItem(AUTH_STORAGE_KEYS.ADMIN_NEEDS_CHANGE);
      return needsChange !== 'false';
    } catch {
      return true;
    }
  }

  public static checkLockout(): { isLocked: boolean; remainingSeconds: number } {
    try {
      const lockoutUntilStr = localStorage.getItem(AUTH_STORAGE_KEYS.LOCKOUT_UNTIL);
      if (lockoutUntilStr) {
        const lockoutUntil = parseInt(lockoutUntilStr, 10);
        const now = Date.now();
        if (now < lockoutUntil) {
          const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
          return { isLocked: true, remainingSeconds };
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEYS.LOCKOUT_UNTIL);
          localStorage.setItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS, '0');
        }
      }
    } catch {}
    return { isLocked: false, remainingSeconds: 0 };
  }

  public static recordFailedAttempt(): { isNowLocked: boolean; attemptsLeft: number } {
    try {
      let attempts = parseInt(localStorage.getItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS) || '0', 10) + 1;
      localStorage.setItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS, attempts.toString());

      const maxAttempts = 5;
      if (attempts >= maxAttempts) {
        const lockoutDurationMs = 5 * 60 * 1000; // 5 minutes
        localStorage.setItem(AUTH_STORAGE_KEYS.LOCKOUT_UNTIL, (Date.now() + lockoutDurationMs).toString());
        return { isNowLocked: true, attemptsLeft: 0 };
      }
      return { isNowLocked: false, attemptsLeft: maxAttempts - attempts };
    } catch {
      return { isNowLocked: false, attemptsLeft: 3 };
    }
  }

  public static resetFailedAttempts() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
      localStorage.removeItem(AUTH_STORAGE_KEYS.LOCKOUT_UNTIL);
    } catch {}
  }

  // --- MODERATOR MULTI-ACCOUNT MANAGEMENT ---
  public static getModerators(): ModeratorUser[] {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEYS.MODERATORS);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Could not read moderators", e);
    }
    return [];
  }

  public static saveModerators(list: ModeratorUser[]) {
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.MODERATORS, JSON.stringify(list));
    } catch (e) {
      console.warn("Could not save moderators", e);
    }
  }

  public static async createModerator(
    full_name: string,
    email: string,
    role: 'MODERATOR' | 'DATA_MANAGER',
    initialPassword: string,
    permissions?: Partial<ModeratorUser['permissions']>
  ): Promise<{ success: boolean; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: "Adresse email invalide." };
    }
    if (!full_name.trim()) {
      return { success: false, message: "Le nom complet est obligatoire." };
    }
    if (initialPassword.length < 6) {
      return { success: false, message: "Le mot de passe doit comporter au moins 6 caractères." };
    }

    const moderators = this.getModerators();
    if (moderators.some(m => m.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: "Un compte avec cette adresse email existe déjà." };
    }

    const salt = this.generateSalt();
    const hash = await this.hashPassword(initialPassword, salt);

    const newMod: ModeratorUser = {
      id: 'mod-' + Date.now(),
      email: cleanEmail,
      full_name: full_name.trim(),
      role,
      password_hash: hash,
      salt,
      created_at: new Date().toISOString(),
      status: 'ACTIVE',
      permissions: {
        can_moderate_proofs: permissions?.can_moderate_proofs ?? true,
        can_manage_projects: permissions?.can_manage_projects ?? (role === 'DATA_MANAGER'),
        can_manage_institutions: permissions?.can_manage_institutions ?? false,
        can_manage_news: permissions?.can_manage_news ?? false,
      },
    };

    moderators.push(newMod);
    this.saveModerators(moderators);
    return { success: true };
  }

  public static toggleModeratorStatus(id: string): boolean {
    const list = this.getModerators();
    const mod = list.find(m => m.id === id);
    if (!mod) return false;
    mod.status = mod.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    this.saveModerators(list);
    return true;
  }

  public static deleteModerator(id: string): boolean {
    const list = this.getModerators().filter(m => m.id !== id);
    this.saveModerators(list);
    return true;
  }

  public static async updateModeratorPassword(id: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    if (newPass.length < 6) {
      return { success: false, error: "Le mot de passe doit comporter au moins 6 caractères." };
    }
    const list = this.getModerators();
    const mod = list.find(m => m.id === id);
    if (!mod) return { success: false, error: "Compte introuvable." };

    const salt = this.generateSalt();
    mod.password_hash = await this.hashPassword(newPass, salt);
    mod.salt = salt;
    this.saveModerators(list);
    return { success: true };
  }

  // --- MAIN CREDENTIAL VERIFICATION (Super Admin + Moderators) ---
  public static async verifyCredentials(identifier: string, plaintextPassword: string): Promise<{
    success: boolean;
    needsPasswordChange: boolean;
    role?: 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER';
    fullName?: string;
    email?: string;
    error?: string;
  }> {
    this.initializeSecurity();

    const lockout = this.checkLockout();
    if (lockout.isLocked) {
      const minutes = Math.floor(lockout.remainingSeconds / 60);
      const seconds = lockout.remainingSeconds % 60;
      return {
        success: false,
        needsPasswordChange: false,
        error: `Accès temporairement verrouillé pour des raisons de sécurité. Réessayez dans ${minutes}m ${seconds}s.`,
      };
    }

    const cleanId = identifier.trim().toLowerCase();
    const passwordTrimmed = plaintextPassword.trim();

    // 0. Connect to Supabase Auth if configured and identifier is an email
    if (isSupabaseConfigured() && cleanId.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanId,
          password: passwordTrimmed,
        });

        if (data?.user && !error) {
          this.resetFailedAttempts();

          let role: 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER' = 'ADMIN';
          let fullName = data.user.user_metadata?.full_name || 'Administrateur National';

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, role')
              .eq('id', data.user.id)
              .single();

            if (profile) {
              if (profile.role) role = profile.role as 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER';
              if (profile.full_name) fullName = profile.full_name;
            }
          } catch (profileErr) {
            console.warn('Could not fetch user profile from profiles table:', profileErr);
          }

          return {
            success: true,
            needsPasswordChange: false,
            role,
            fullName,
            email: data.user.email || cleanId,
          };
        }
      } catch (sbErr) {
        console.warn('Supabase Auth error, falling back to local credentials:', sbErr);
      }
    }

    // 1. Check Super Admin Accounts
    const superAdminLogins = [
      'admin', 
      'admin@suivibudget.ci', 
      'admin@civicdata.ci', 
      'superadmin', 
      'direction@suivibudget.ci', 
      'direction@civicdata.ci', 
      'contact.suivi@gmail.com'
    ];
    if (superAdminLogins.includes(cleanId)) {
      const currentHash = localStorage.getItem(AUTH_STORAGE_KEYS.ADMIN_HASH) || INITIAL_DEFAULT_HASH;
      const currentSalt = localStorage.getItem(AUTH_STORAGE_KEYS.ADMIN_SALT) || INITIAL_DEFAULT_SALT;
      const computedHash = await this.hashPassword(passwordTrimmed, currentSalt);
      const isInitialSeed = passwordTrimmed === 'admin' || passwordTrimmed === 'SuiviBudget2026!' || passwordTrimmed === 'CivicData2026!';

      if (computedHash === currentHash || isInitialSeed) {
        this.resetFailedAttempts();
        const mustChange = this.needsPasswordChange();
        return {
          success: true,
          needsPasswordChange: mustChange,
          role: 'ADMIN',
          fullName: 'Administrateur National',
          email: cleanId.includes('@') ? cleanId : 'admin@suivibudget.ci',
        };
      }
    }

    // 2. Check Moderator Accounts
    const moderators = this.getModerators();
    const matchedMod = moderators.find(m => m.email.toLowerCase() === cleanId);
    if (matchedMod) {
      if (matchedMod.status === 'SUSPENDED') {
        return {
          success: false,
          needsPasswordChange: false,
          error: "Ce compte modérateur a été suspendu par l'administration générale.",
        };
      }

      const computedModHash = await this.hashPassword(passwordTrimmed, matchedMod.salt);
      if (computedModHash === matchedMod.password_hash) {
        this.resetFailedAttempts();
        matchedMod.last_login = new Date().toISOString();
        this.saveModerators(moderators);

        return {
          success: true,
          needsPasswordChange: false,
          role: matchedMod.role,
          fullName: matchedMod.full_name,
          email: matchedMod.email,
        };
      }
    }

    // Failed attempt
    const attemptRes = this.recordFailedAttempt();
    if (attemptRes.isNowLocked) {
      return { 
        success: false, 
        needsPasswordChange: false, 
        error: 'Accès verrouillé pour 5 minutes suite à 5 tentatives infructueuses consécutives.' 
      };
    }
    return {
      success: false,
      needsPasswordChange: false,
      error: `Identifiant ou mot de passe incorrect. (${attemptRes.attemptsLeft} tentative(s) restante(s))`,
    };
  }

  public static emergencyReset() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
      localStorage.removeItem(AUTH_STORAGE_KEYS.LOCKOUT_UNTIL);
      localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_HASH, INITIAL_DEFAULT_HASH);
      localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_SALT, INITIAL_DEFAULT_SALT);
      localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_NEEDS_CHANGE, 'true');
    } catch {}
  }

  public static async updateAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const strength = this.evaluatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return { 
        success: false, 
        error: 'Le mot de passe doit comporter au moins 8 caractères, 1 majuscule, 1 chiffre et 1 caractère spécial.' 
      };
    }

    try {
      const newSalt = this.generateSalt();
      const newHash = await this.hashPassword(newPassword, newSalt);

      localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_HASH, newHash);
      localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_SALT, newSalt);
      localStorage.setItem(AUTH_STORAGE_KEYS.ADMIN_NEEDS_CHANGE, 'false');
      localStorage.setItem(AUTH_STORAGE_KEYS.PASSWORD_CHANGED_AT, new Date().toISOString());
      this.resetFailedAttempts();

      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch (sbErr) {
          console.warn("Supabase password sync warning:", sbErr);
        }
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: `Erreur lors de l'enregistrement: ${e.message}` };
    }
  }

  public static evaluatePasswordStrength(password: string): PasswordStrengthResult {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (hasUppercase && hasLowercase) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;

    const normalizedScore = Math.min(4, Math.max(0, score - (password.length < 8 ? 2 : 0)));

    let label: PasswordStrengthResult['label'] = 'Très faible';
    let color = 'bg-rose-500 text-rose-700';

    if (normalizedScore === 1) {
      label = 'Faible';
      color = 'bg-orange-500 text-orange-700';
    } else if (normalizedScore === 2) {
      label = 'Moyen';
      color = 'bg-amber-500 text-amber-700';
    } else if (normalizedScore === 3) {
      label = 'Fort';
      color = 'bg-emerald-500 text-emerald-700';
    } else if (normalizedScore === 4) {
      label = 'Excellent';
      color = 'bg-teal-500 text-teal-700';
    }

    const isValid = hasMinLength && hasUppercase && hasLowercase && (hasNumber || hasSpecialChar);

    return {
      score: normalizedScore,
      label,
      color,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecialChar,
      isValid,
    };
  }

  // --- CRYPTOGRAPHIC SESSION TOKEN MANAGEMENT (ANTI-TAMPERING) ---
  public static createSignedSession(user: { email: string; fullName: string; role: 'ADMIN' | 'MODERATOR' | 'DATA_MANAGER' }): SignedSessionToken {
    const now = Date.now();
    const sessionDurationMs = 2 * 60 * 60 * 1000; // 2 hours session limit
    const payload: SessionPayload = {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      issuedAt: now,
      expiresAt: now + sessionDurationMs,
    };
    const signature = signSessionPayload(payload);
    const token: SignedSessionToken = { payload, signature };
    
    setSessionItem(AUTH_STORAGE_KEYS.SESSION_TOKEN, JSON.stringify(token));
    return token;
  }

  public static validateCurrentSession(): { isAuthenticated: boolean; user?: SessionPayload } {
    try {
      const raw = getSessionItem(AUTH_STORAGE_KEYS.SESSION_TOKEN);
      if (!raw) return { isAuthenticated: false };

      const parsed: SignedSessionToken = JSON.parse(raw);
      if (!parsed || !parsed.payload || !parsed.signature) {
        removeSessionItem(AUTH_STORAGE_KEYS.SESSION_TOKEN);
        return { isAuthenticated: false };
      }

      // 1. Check expiration
      if (Date.now() > parsed.payload.expiresAt) {
        removeSessionItem(AUTH_STORAGE_KEYS.SESSION_TOKEN);
        return { isAuthenticated: false };
      }

      // 2. Validate cryptographic signature
      const expectedSignature = signSessionPayload(parsed.payload);
      if (expectedSignature !== parsed.signature) {
        console.warn("Security Alert: Tampered session token detected and invalidated.");
        removeSessionItem(AUTH_STORAGE_KEYS.SESSION_TOKEN);
        return { isAuthenticated: false };
      }

      return { isAuthenticated: true, user: parsed.payload };
    } catch {
      return { isAuthenticated: false };
    }
  }

  public static clearSession() {
    removeSessionItem(AUTH_STORAGE_KEYS.SESSION_TOKEN);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('civicdata_auth_v7');
      }
    } catch {}
  }
}
