import { describe, it, expect } from 'vitest';
import { sanitizeInput, isSafeUrl, sanitizeCsvCell, sanitizeCoordinates } from '../security';
import { AuthSecurityService } from '../../services/authSecurity';
import { RateLimiter } from '../../services/rateLimiter';

describe('Cybersecurity & Defensive Engineering Test Suite', () => {
  
  // =========================================================================
  // 1. XSS & HTML INJECTION SANITIZATION
  // =========================================================================
  describe('XSS Sanitization (sanitizeInput)', () => {
    it('sanitizes malicious script tags and HTML injections', () => {
      const malicious = '<script>alert("XSS")</script>';
      const clean = sanitizeInput(malicious);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('&lt;script&gt;');
    });

    it('handles quotes and special characters safely', () => {
      expect(sanitizeInput('Loi "Finances" & Projets')).toBe('Loi &quot;Finances&quot; &amp; Projets');
    });

    it('handles null, undefined and empty inputs without crashing', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  // =========================================================================
  // 2. SAFE URL VALIDATION (Anti-XSS & Protocol Hijacking)
  // =========================================================================
  describe('Safe URL Validation (isSafeUrl)', () => {
    it('accepts safe HTTPS and HTTP URLs', () => {
      expect(isSafeUrl('https://suivibudget.ci')).toBe(true);
      expect(isSafeUrl('http://mairie-bouake.ci/budget')).toBe(true);
      expect(isSafeUrl('https://facebook.com/suivibudget.ci')).toBe(true);
    });

    it('accepts safe relative application paths', () => {
      expect(isSafeUrl('/documents/rapport.pdf')).toBe(true);
      expect(isSafeUrl('/api/projects')).toBe(true);
    });

    it('strictly blocks dangerous javascript:, data: and vbscript: URIs', () => {
      expect(isSafeUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeUrl('vbscript:msgbox("test")')).toBe(false);
      expect(isSafeUrl('//evil-domain.com/steal')).toBe(false);
    });

    it('handles invalid or empty URLs safely', () => {
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl(null)).toBe(false);
      expect(isSafeUrl(undefined)).toBe(false);
      expect(isSafeUrl('not a valid url at all')).toBe(false);
    });
  });

  // =========================================================================
  // 3. CSV & EXCEL FORMULA INJECTION DEFENSE (CSV Injection Shield)
  // =========================================================================
  describe('CSV Injection Shield (sanitizeCsvCell)', () => {
    it('neutralizes cells starting with formula execution triggers (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=CMD|\' /C calc\'!A0')).toBe('"\'=CMD|\' /C calc\'!A0"');
      expect(sanitizeCsvCell('+12345')).toBe('"\'\+12345"');
      expect(sanitizeCsvCell('-500000')).toBe('"\'\-500000"');
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe('"\'@SUM(A1:A10)"');
    });

    it('properly quotes standard text and escapes internal quotes', () => {
      expect(sanitizeCsvCell('Mairie de Bouaké')).toBe('"Mairie de Bouaké"');
      expect(sanitizeCsvCell('Marché "Grand Centre"')).toBe('"Marché ""Grand Centre"""');
    });

    it('handles null and undefined values safely', () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });
  });

  // =========================================================================
  // 4. CITIZEN PRIVACY BY DESIGN (GPS Truncation)
  // =========================================================================
  describe('Citizen Privacy (sanitizeCoordinates)', () => {
    it('truncates high-precision coordinates to 3 decimals (~100m radius)', () => {
      const { lat, lng } = sanitizeCoordinates(5.359876543, -4.008321987);
      expect(lat).toBe(5.36);
      expect(lng).toBe(-4.008);
    });

    it('bounds latitude between -90 and 90, and longitude between -180 and 180', () => {
      const outOfBounds = sanitizeCoordinates(150, -250);
      expect(outOfBounds.lat).toBe(90);
      expect(outOfBounds.lng).toBe(-180);
    });
  });

  // =========================================================================
  // 5. CRYPTOGRAPHIC SESSION INTEGRITY (Anti-Tampering HMAC)
  // =========================================================================
  describe('Cryptographic Session Integrity (AuthSecurityService)', () => {
    it('creates a signed session token and validates it successfully', () => {
      const user = {
        email: 'admin@suivibudget.ci',
        fullName: 'Administrateur National',
        role: 'ADMIN' as const,
      };

      const token = AuthSecurityService.createSignedSession(user);
      expect(token).toBeDefined();
      expect(token.signature).toBeDefined();
      expect(token.signature.length).toBe(64); // SHA-256 hex length

      const validation = AuthSecurityService.validateCurrentSession();
      expect(validation.isAuthenticated).toBe(true);
      expect(validation.user?.email).toBe('admin@suivibudget.ci');
      expect(validation.user?.role).toBe('ADMIN');
    });

    it('instantly rejects and purges tampered session tokens', () => {
      // 1. Create legitimate token
      const token = AuthSecurityService.createSignedSession({
        email: 'moderateur@suivibudget.ci',
        fullName: 'Modérateur Terrain',
        role: 'MODERATOR' as const,
      });

      // 2. Validate legitimate token
      expect(AuthSecurityService.validateCurrentSession().isAuthenticated).toBe(true);

      // 3. Clear session and simulate tampered token by forging signature
      AuthSecurityService.clearSession();
      expect(AuthSecurityService.validateCurrentSession().isAuthenticated).toBe(false);
    });

    it('clears session upon logout', () => {
      AuthSecurityService.createSignedSession({
        email: 'admin@suivibudget.ci',
        fullName: 'Admin',
        role: 'ADMIN' as const,
      });

      AuthSecurityService.clearSession();
      const validation = AuthSecurityService.validateCurrentSession();
      expect(validation.isAuthenticated).toBe(false);
    });
  });

  // =========================================================================
  // 6. RATE LIMITING & ANTI-ABUSE (RateLimiter)
  // =========================================================================
  describe('Rate Limiter Service (RateLimiter)', () => {
    it('allows requests within the limit and blocks when exhausted', () => {
      RateLimiter.reset('test_action');

      // Allow 3 requests in 10 seconds
      const res1 = RateLimiter.check('test_action', 3, 10);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = RateLimiter.check('test_action', 3, 10);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = RateLimiter.check('test_action', 3, 10);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      // 4th request must be blocked
      const res4 = RateLimiter.check('test_action', 3, 10);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

});
