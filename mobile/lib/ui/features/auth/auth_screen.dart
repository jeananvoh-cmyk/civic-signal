import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../legal/cgu_screen.dart';
import '../legal/privacy_screen.dart';

/// 🎨 Google Multi-color "G" Icon Painter (Pixel-perfect Vector)
class GoogleIcon extends StatelessWidget {
  final double size;
  const GoogleIcon({super.key, this.size = 18});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size),
      painter: _GoogleIconPainter(),
    );
  }
}

class _GoogleIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 18.0;
    canvas.save();
    canvas.scale(s, s);

    // Blue segment
    final bluePaint = Paint()..color = const Color(0xFF4285F4)..style = PaintingStyle.fill;
    final bluePath = Path()
      ..moveTo(17.64, 9.2)
      ..cubicTo(17.64, 8.563, 17.583, 7.949, 17.476, 7.36)
      ..lineTo(9.0, 7.36)
      ..lineTo(9.0, 10.841)
      ..lineTo(13.844, 10.841)
      ..cubicTo(13.635, 11.966, 13.001, 12.919, 12.048, 13.558)
      ..lineTo(14.956, 15.816)
      ..cubicTo(16.658, 14.249, 17.64, 11.942, 17.64, 9.2)
      ..close();
    canvas.drawPath(bluePath, bluePaint);

    // Green segment
    final greenPaint = Paint()..color = const Color(0xFF34A853)..style = PaintingStyle.fill;
    final greenPath = Path()
      ..moveTo(9.0, 18.0)
      ..cubicTo(11.43, 18.0, 13.467, 17.194, 14.956, 15.816)
      ..lineTo(12.048, 13.558)
      ..cubicTo(11.242, 14.098, 10.211, 14.418, 9.0, 14.418)
      ..cubicTo(6.656, 14.418, 4.672, 12.834, 3.964, 10.707)
      ..lineTo(0.957, 13.039)
      ..cubicTo(2.409, 15.866, 5.467, 18.0, 9.0, 18.0)
      ..close();
    canvas.drawPath(greenPath, greenPaint);

    // Yellow segment
    final yellowPaint = Paint()..color = const Color(0xFFFBBC05)..style = PaintingStyle.fill;
    final yellowPath = Path()
      ..moveTo(3.964, 10.707)
      ..cubicTo(3.784, 10.17, 3.682, 9.593, 3.682, 9.0)
      ..cubicTo(3.682, 8.407, 3.784, 7.83, 3.964, 7.293)
      ..lineTo(0.957, 4.961)
      ..cubicTo(0.348, 6.173, 0.0, 7.548, 0.0, 9.0)
      ..cubicTo(0.0, 10.452, 0.348, 11.827, 0.957, 13.039)
      ..lineTo(3.964, 10.707)
      ..close();
    canvas.drawPath(yellowPath, yellowPaint);

    // Red segment
    final redPaint = Paint()..color = const Color(0xFFEA4335)..style = PaintingStyle.fill;
    final redPath = Path()
      ..moveTo(9.0, 3.58)
      ..cubicTo(10.321, 3.58, 11.508, 4.034, 12.44, 4.925)
      ..lineTo(15.022, 2.345)
      ..cubicTo(13.463, 0.891, 11.426, 0.0, 9.0, 0.0)
      ..cubicTo(5.467, 0.0, 2.409, 2.134, 0.957, 4.961)
      ..lineTo(3.964, 7.293)
      ..cubicTo(4.672, 5.163, 6.656, 3.58, 9.0, 3.58)
      ..close();
    canvas.drawPath(redPath, redPaint);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 📱 Écran d'Authentification SIGNA-CI (Parité Exacte 1:1 avec le Web React)
class AuthScreen extends StatefulWidget {
  final String initialTab; // 'login', 'signup', 'forgot'

  const AuthScreen({super.key, this.initialTab = 'login'});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  // Modes: 'login', 'signup', 'forgot'
  late String _mode;

  // Méthode de connexion: 'magic' (Lien magique) vs 'password' (Mot de passe)
  String _loginMethod = 'magic';

  // Contrôleurs
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _displayNameController = TextEditingController();
  final _phoneController = TextEditingController();

  // Signup options
  String _userType = 'household'; // 'household' | 'business'
  bool _privacyConsent = false;

  // UI States
  bool _isLoading = false;
  bool _googleLoading = false;
  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _magicLinkSent = false;
  bool _forgotSent = false;

  @override
  void initState() {
    super.initState();
    _mode = (widget.initialTab == 'signup')
        ? 'signup'
        : (widget.initialTab == 'forgot')
            ? 'forgot'
            : 'login';
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _displayNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  bool _isPhone(String value) {
    return RegExp(r'^\+?\d[\d\s-]{6,}$').hasMatch(value.trim());
  }

  // ── Calcul de la force du mot de passe ─────────────────────────────────────
  int _calculatePasswordScore(String pwd) {
    if (pwd.isEmpty) return 0;
    int score = 0;
    if (pwd.length >= 8) score++;
    if (RegExp(r'[A-Z]').hasMatch(pwd)) score++;
    if (RegExp(r'[a-z]').hasMatch(pwd)) score++;
    if (RegExp(r'[0-9]').hasMatch(pwd)) score++;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(pwd)) score++;
    return score;
  }

  // ── Google OAuth Sign-in ───────────────────────────────────────────────────
  Future<void> _handleGoogle() async {
    setState(() => _googleLoading = true);
    try {
      await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'ci.signa.app://login-callback',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur de connexion Google: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  // ── Lien Magique OTP ───────────────────────────────────────────────────────
  Future<void> _handleMagicLink() async {
    final email = _identifierController.text.trim();
    if (email.isEmpty || _isPhone(email) || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Entrez une adresse email valide pour recevoir le lien.'),
          backgroundColor: Color(0xFFEF4444),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await Supabase.instance.client.auth.signInWithOtp(
        email: email,
        emailRedirectTo: 'ci.signa.app://login-callback',
      );
      if (mounted) {
        setState(() => _magicLinkSent = true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Connexion par Mot de passe ─────────────────────────────────────────────
  Future<void> _handleLogin() async {
    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;

    if (identifier.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez renseigner votre identifiant et mot de passe.'),
          backgroundColor: Color(0xFFEF4444),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      if (_isPhone(identifier)) {
        await Supabase.instance.client.auth.signInWithPassword(
          phone: identifier,
          password: password,
        );
      } else {
        await Supabase.instance.client.auth.signInWithPassword(
          email: identifier,
          password: password,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Connexion réussie !'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Identifiants incorrects ou compte introuvable: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Inscription ───────────────────────────────────────────────────────────
  Future<void> _handleSignup() async {
    final identifier = _identifierController.text.trim();
    final displayName = _displayNameController.text.trim();
    final phone = _phoneController.text.trim();
    final password = _passwordController.text;
    final confirmPwd = _confirmPasswordController.text;

    if (displayName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez entrer votre nom complet.'), backgroundColor: Color(0xFFEF4444)),
      );
      return;
    }
    if (identifier.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez entrer un email ou numéro.'), backgroundColor: Color(0xFFEF4444)),
      );
      return;
    }
    if (password != confirmPwd) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Les mots de passe ne correspondent pas.'), backgroundColor: Color(0xFFEF4444)),
      );
      return;
    }
    if (password.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Le mot de passe doit contenir au moins 8 caractères.'), backgroundColor: Color(0xFFEF4444)),
      );
      return;
    }
    if (!_privacyConsent) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez accepter la politique de confidentialité.'), backgroundColor: Color(0xFFEF4444)),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final metadata = {
        'display_name': displayName,
        'user_type': _userType,
        'phone': _isPhone(identifier) ? identifier : (phone.isNotEmpty ? phone : null),
      };

      if (_isPhone(identifier)) {
        await Supabase.instance.client.auth.signUp(
          phone: identifier,
          password: password,
          data: metadata,
        );
      } else {
        await Supabase.instance.client.auth.signUp(
          email: identifier,
          password: password,
          data: metadata,
        );
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Compte créé ! Vérifiez vos messages pour confirmer.'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        setState(() => _mode = 'login');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Mot de passe oublié ───────────────────────────────────────────────────
  Future<void> _handleForgotPassword() async {
    final email = _identifierController.text.trim();
    if (email.isEmpty || _isPhone(email) || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez entrer une adresse email valide.'), backgroundColor: Color(0xFFEF4444)),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(
        email,
        redirectTo: 'ci.signa.app://reset-password',
      );
      if (mounted) {
        setState(() => _forgotSent = true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Widget: Jauge de force du mot de passe ─────────────────────────────────
  Widget _buildPasswordStrengthBar(String password, bool isDark) {
    final score = _calculatePasswordScore(password);
    if (password.isEmpty) return const SizedBox.shrink();

    Color color;
    String label;
    if (score <= 2) {
      color = const Color(0xFFEF4444);
      label = 'Faible — ajoutez des chiffres et majuscules';
    } else if (score == 3) {
      color = const Color(0xFFF97316);
      label = 'Moyen — ajoutez des symboles';
    } else {
      color = const Color(0xFF22C55E);
      label = 'Fort — excellent !';
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 6),
        Row(
          children: List.generate(5, (index) {
            final active = index < score;
            return Expanded(
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                height: 4,
                decoration: BoxDecoration(
                  color: active ? color : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Palette harmonisée avec le Web React & Theme Tokens
    final bgColor = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);
    final cardBg = isDark ? const Color(0xFF161F30) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF26334D) : const Color(0xFFE2E8F0);
    final inputBg = isDark ? const Color(0xFF0D1527) : const Color(0xFFF1F5F9);
    final inputBorder = isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1);
    const primaryCyan = Color(0xFF38BDF8); // Water/Teal Accent
    final textMuted = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── BOUTON RETOUR ──────────────────────────────────────────
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () => Navigator.of(context).pop(),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.arrowLeft, size: 16, color: textMuted),
                          const SizedBox(width: 6),
                          Text(
                            'Retour',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── LOGO SIGNA-CI CENTRÉ ───────────────────────────────────
                  Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF0369A1), Color(0xFF0284C7)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF0284C7).withAlpha(60),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Icon(
                            LucideIcons.zap,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 10),
                        RichText(
                          text: TextSpan(
                            style: GoogleFonts.outfit(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                            children: [
                              TextSpan(
                                text: 'SIGNA',
                                style: TextStyle(
                                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                                ),
                              ),
                              const TextSpan(
                                text: '-CI',
                                style: TextStyle(color: primaryCyan),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── CARTE CONTENEUR PRINCIPALE ─────────────────────────────
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: cardBorder, width: 1.2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(isDark ? 50 : 15),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_mode == 'login') ...[
                          // ── ENTÊTE CONNEXION ───────────────────────────────
                          Text(
                            'Connexion',
                            style: GoogleFonts.outfit(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Bienvenue sur SIGNA-CI',
                            style: TextStyle(fontSize: 13, color: textMuted),
                          ),
                          const SizedBox(height: 18),

                          // ── BOUTON GOOGLE ──────────────────────────────────
                          OutlinedButton(
                            onPressed: _googleLoading ? null : _handleGoogle,
                            style: OutlinedButton.styleFrom(
                              backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                              foregroundColor: isDark ? Colors.white : const Color(0xFF0F172A),
                              side: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1), width: 1.2),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: _googleLoading
                                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      GoogleIcon(size: 18),
                                      SizedBox(width: 10),
                                      Text(
                                        'Continuer avec Google',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                    ],
                                  ),
                          ),
                          const SizedBox(height: 16),

                          // ── SÉPARATEUR OU ──────────────────────────────────
                          Row(
                            children: [
                              Expanded(child: Divider(color: cardBorder)),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: Text('ou', style: TextStyle(fontSize: 12, color: textMuted)),
                              ),
                              Expanded(child: Divider(color: cardBorder)),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // ── SÉLECTEUR LIEN MAGIQUE / MOT DE PASSE ──────────
                          Container(
                            decoration: BoxDecoration(
                              color: inputBg,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: inputBorder, width: 1),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: InkWell(
                                    borderRadius: const BorderRadius.horizontal(left: Radius.circular(9)),
                                    onTap: () => setState(() {
                                      _loginMethod = 'magic';
                                      _magicLinkSent = false;
                                    }),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      decoration: BoxDecoration(
                                        color: _loginMethod == 'magic' ? primaryCyan : Colors.transparent,
                                        borderRadius: const BorderRadius.horizontal(left: Radius.circular(9)),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            LucideIcons.sparkles,
                                            size: 14,
                                            color: _loginMethod == 'magic' ? Colors.white : textMuted,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Lien magique',
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: _loginMethod == 'magic' ? Colors.white : textMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: InkWell(
                                    borderRadius: const BorderRadius.horizontal(right: Radius.circular(9)),
                                    onTap: () => setState(() => _loginMethod = 'password'),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      decoration: BoxDecoration(
                                        color: _loginMethod == 'password' ? primaryCyan : Colors.transparent,
                                        borderRadius: const BorderRadius.horizontal(right: Radius.circular(9)),
                                      ),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Icon(
                                            LucideIcons.eye,
                                            size: 14,
                                            color: _loginMethod == 'password' ? Colors.white : textMuted,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'Mot de passe',
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: _loginMethod == 'password' ? Colors.white : textMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),

                          // ── FORMULAIRE LIEN MAGIQUE ────────────────────────
                          if (_loginMethod == 'magic') ...[
                            if (!_magicLinkSent) ...[
                              TextField(
                                controller: _identifierController,
                                keyboardType: TextInputType.emailAddress,
                                style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                                decoration: InputDecoration(
                                  hintText: 'Votre email',
                                  hintStyle: TextStyle(color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8), fontSize: 14),
                                  prefixIcon: Icon(LucideIcons.mail, size: 18, color: textMuted),
                                  filled: true,
                                  fillColor: inputBg,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: BorderSide(color: inputBorder),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    borderSide: const BorderSide(color: primaryCyan, width: 1.5),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 14),
                              ElevatedButton(
                                onPressed: _isLoading ? null : _handleMagicLink,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: primaryCyan,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  elevation: 0,
                                ),
                                child: _isLoading
                                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                    : const Text(
                                        'Recevoir le lien par email →',
                                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                      ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Vous recevrez un lien sécurisé. Cliquez dessus pour vous connecter instantanément.',
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, color: textMuted, height: 1.3),
                              ),
                            ] else ...[
                              // Message de confirmation du lien envoyé
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981).withAlpha(20),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFF10B981).withAlpha(60)),
                                ),
                                child: Column(
                                  children: [
                                    const Text('📬', style: TextStyle(fontSize: 32)),
                                    const SizedBox(height: 6),
                                    const Text(
                                      'Lien envoyé !',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF10B981)),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Vérifiez votre boîte mail ${_identifierController.text.trim()} et cliquez sur le lien pour vous connecter.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(fontSize: 12, color: textMuted),
                                    ),
                                    const SizedBox(height: 10),
                                    TextButton(
                                      onPressed: () => setState(() => _magicLinkSent = false),
                                      child: const Text('Changer d\'email', style: TextStyle(fontSize: 12, color: primaryCyan)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ] else ...[
                            // ── FORMULAIRE MOT DE PASSE ──────────────────────
                            TextField(
                              controller: _identifierController,
                              keyboardType: TextInputType.emailAddress,
                              style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                              decoration: InputDecoration(
                                hintText: 'Email ou téléphone',
                                hintStyle: TextStyle(color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8), fontSize: 14),
                                prefixIcon: Icon(LucideIcons.user, size: 18, color: textMuted),
                                filled: true,
                                fillColor: inputBg,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide(color: inputBorder),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(color: primaryCyan, width: 1.5),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            TextField(
                              controller: _passwordController,
                              obscureText: !_showPassword,
                              style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                              decoration: InputDecoration(
                                hintText: 'Mot de passe',
                                hintStyle: TextStyle(color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8), fontSize: 14),
                                prefixIcon: Icon(LucideIcons.lock, size: 18, color: textMuted),
                                suffixIcon: IconButton(
                                  icon: Icon(_showPassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 18, color: textMuted),
                                  onPressed: () => setState(() => _showPassword = !_showPassword),
                                ),
                                filled: true,
                                fillColor: inputBg,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: BorderSide(color: inputBorder),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(color: primaryCyan, width: 1.5),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerRight,
                              child: InkWell(
                                onTap: () => setState(() => _mode = 'forgot'),
                                child: const Text(
                                  'Mot de passe oublié ?',
                                  style: TextStyle(fontSize: 12, color: primaryCyan, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            ElevatedButton(
                              onPressed: _isLoading ? null : _handleLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: primaryCyan,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 0,
                              ),
                              child: _isLoading
                                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : const Text(
                                      'Se connecter →',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                    ),
                            ),
                          ],

                          const SizedBox(height: 16),
                          Divider(color: cardBorder),
                          const SizedBox(height: 8),

                          // ── LIEN CRÉER UN COMPTE ───────────────────────────
                          Center(
                            child: InkWell(
                              onTap: () => setState(() => _mode = 'signup'),
                              child: RichText(
                                text: TextSpan(
                                  style: TextStyle(fontSize: 13, color: textMuted),
                                  children: const [
                                    TextSpan(text: 'Pas encore de compte ? '),
                                    TextSpan(
                                      text: 'Créer un compte',
                                      style: TextStyle(color: primaryCyan, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ] else if (_mode == 'signup') ...[
                          // ═══════════════════════════════════════════════════
                          // ── MODE INSCRIPTION ───────────────────────────────
                          // ═══════════════════════════════════════════════════
                          Text(
                            'Créer un compte',
                            style: GoogleFonts.outfit(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Rejoignez la communauté SIGNA-CI',
                            style: TextStyle(fontSize: 13, color: textMuted),
                          ),
                          const SizedBox(height: 16),

                          // Google
                          OutlinedButton(
                            onPressed: _googleLoading ? null : _handleGoogle,
                            style: OutlinedButton.styleFrom(
                              backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                              foregroundColor: isDark ? Colors.white : const Color(0xFF0F172A),
                              side: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1), width: 1.2),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: _googleLoading
                                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      GoogleIcon(size: 18),
                                      SizedBox(width: 10),
                                      Text(
                                        'Continuer avec Google',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                    ],
                                  ),
                          ),
                          const SizedBox(height: 14),

                          Row(
                            children: [
                              Expanded(child: Divider(color: cardBorder)),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: Text('ou', style: TextStyle(fontSize: 12, color: textMuted)),
                              ),
                              Expanded(child: Divider(color: cardBorder)),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Nom complet
                          TextField(
                            controller: _displayNameController,
                            style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Nom complet',
                              prefixIcon: Icon(LucideIcons.user, size: 18, color: textMuted),
                              filled: true,
                              fillColor: inputBg,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: inputBorder)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: primaryCyan, width: 1.5)),
                            ),
                          ),
                          const SizedBox(height: 10),

                          // Email ou téléphone
                          TextField(
                            controller: _identifierController,
                            onChanged: (_) => setState(() {}),
                            style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Email ou numéro de téléphone',
                              prefixIcon: Icon(LucideIcons.mail, size: 18, color: textMuted),
                              filled: true,
                              fillColor: inputBg,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: inputBorder)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: primaryCyan, width: 1.5)),
                            ),
                          ),
                          const SizedBox(height: 10),

                          // Téléphone si email
                          if (!_isPhone(_identifierController.text)) ...[
                            TextField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                              decoration: InputDecoration(
                                hintText: 'Téléphone (optionnel)',
                                prefixIcon: Icon(LucideIcons.phone, size: 18, color: textMuted),
                                filled: true,
                                fillColor: inputBg,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: inputBorder)),
                                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: primaryCyan, width: 1.5)),
                              ),
                            ),
                            const SizedBox(height: 10),
                          ],

                          // Mot de passe
                          TextField(
                            controller: _passwordController,
                            obscureText: !_showPassword,
                            onChanged: (_) => setState(() {}),
                            style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Mot de passe (8 car. min)',
                              prefixIcon: Icon(LucideIcons.lock, size: 18, color: textMuted),
                              suffixIcon: IconButton(
                                icon: Icon(_showPassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 18, color: textMuted),
                                onPressed: () => setState(() => _showPassword = !_showPassword),
                              ),
                              filled: true,
                              fillColor: inputBg,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: inputBorder)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: primaryCyan, width: 1.5)),
                            ),
                          ),
                          _buildPasswordStrengthBar(_passwordController.text, isDark),
                          const SizedBox(height: 10),

                          // Confirmer mot de passe
                          TextField(
                            controller: _confirmPasswordController,
                            obscureText: !_showConfirmPassword,
                            onChanged: (_) => setState(() {}),
                            style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                            decoration: InputDecoration(
                              hintText: 'Confirmer le mot de passe',
                              prefixIcon: Icon(LucideIcons.lock, size: 18, color: textMuted),
                              suffixIcon: IconButton(
                                icon: Icon(_showConfirmPassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 18, color: textMuted),
                                onPressed: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
                              ),
                              filled: true,
                              fillColor: inputBg,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: inputBorder)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: primaryCyan, width: 1.5)),
                            ),
                          ),
                          if (_confirmPasswordController.text.isNotEmpty &&
                              _confirmPasswordController.text != _passwordController.text) ...[
                            const Padding(
                              padding: EdgeInsets.only(top: 4, left: 4),
                              child: Text(
                                'Les mots de passe ne correspondent pas',
                                style: TextStyle(color: Color(0xFFEF4444), fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                          const SizedBox(height: 12),

                          // Type de profil (Ménage vs Entreprise)
                          Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(10),
                                  onTap: () => setState(() => _userType = 'household'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      color: _userType == 'household' ? primaryCyan.withAlpha(30) : inputBg,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: _userType == 'household' ? primaryCyan : inputBorder,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(LucideIcons.home, size: 15, color: _userType == 'household' ? primaryCyan : textMuted),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Ménage',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: _userType == 'household' ? primaryCyan : textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(10),
                                  onTap: () => setState(() => _userType = 'business'),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      color: _userType == 'business' ? primaryCyan.withAlpha(30) : inputBg,
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        color: _userType == 'business' ? primaryCyan : inputBorder,
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(LucideIcons.building2, size: 15, color: _userType == 'business' ? primaryCyan : textMuted),
                                        const SizedBox(width: 6),
                                        Text(
                                          'Entreprise',
                                          style: TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                            color: _userType == 'business' ? primaryCyan : textMuted,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Consentement CGU
                          InkWell(
                            onTap: () => setState(() => _privacyConsent = !_privacyConsent),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Checkbox(
                                  value: _privacyConsent,
                                  onChanged: (val) => setState(() => _privacyConsent = val ?? false),
                                  activeColor: primaryCyan,
                                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text.rich(
                                    TextSpan(
                                      style: TextStyle(fontSize: 11, color: textMuted, height: 1.3),
                                      children: [
                                        const TextSpan(text: 'Je certifie avoir 18 ans ou plus et j\'accepte la '),
                                        WidgetSpan(
                                          child: GestureDetector(
                                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyScreen())),
                                            child: const Text('politique de confidentialité', style: TextStyle(color: primaryCyan, fontSize: 11, decoration: TextDecoration.underline)),
                                          ),
                                        ),
                                        const TextSpan(text: ' et les '),
                                        WidgetSpan(
                                          child: GestureDetector(
                                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CguScreen())),
                                            child: const Text('conditions d\'utilisation', style: TextStyle(color: primaryCyan, fontSize: 11, decoration: TextDecoration.underline)),
                                          ),
                                        ),
                                        const TextSpan(text: '.'),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          ElevatedButton(
                            onPressed: _isLoading ? null : _handleSignup,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryCyan,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              elevation: 0,
                            ),
                            child: _isLoading
                                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text(
                                    'Créer mon compte →',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                  ),
                          ),
                          const SizedBox(height: 14),
                          Divider(color: cardBorder),
                          const SizedBox(height: 8),

                          Center(
                            child: InkWell(
                              onTap: () => setState(() => _mode = 'login'),
                              child: RichText(
                                text: TextSpan(
                                  style: TextStyle(fontSize: 13, color: textMuted),
                                  children: const [
                                    TextSpan(text: 'Déjà un compte ? '),
                                    TextSpan(
                                      text: 'Se connecter',
                                      style: TextStyle(color: primaryCyan, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ] else if (_mode == 'forgot') ...[
                          // ═══════════════════════════════════════════════════
                          // ── MODE MOT DE PASSE OUBLIÉ ───────────────────────
                          // ═══════════════════════════════════════════════════
                          Text(
                            'Mot de passe oublié',
                            style: GoogleFonts.outfit(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Recevez un lien pour réinitialiser votre mot de passe',
                            style: TextStyle(fontSize: 13, color: textMuted),
                          ),
                          const SizedBox(height: 18),

                          if (!_forgotSent) ...[
                            TextField(
                              controller: _identifierController,
                              keyboardType: TextInputType.emailAddress,
                              style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontSize: 14),
                              decoration: InputDecoration(
                                hintText: 'Votre email',
                                prefixIcon: Icon(LucideIcons.mail, size: 18, color: textMuted),
                                filled: true,
                                fillColor: inputBg,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: inputBorder)),
                                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: primaryCyan, width: 1.5)),
                              ),
                            ),
                            const SizedBox(height: 14),
                            ElevatedButton(
                              onPressed: _isLoading ? null : _handleForgotPassword,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: primaryCyan,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 0,
                              ),
                              child: _isLoading
                                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : const Text(
                                      'Envoyer le lien →',
                                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                                    ),
                            ),
                          ] else ...[
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withAlpha(20),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFF10B981).withAlpha(60)),
                              ),
                              child: Column(
                                children: [
                                  const Text('📧', style: TextStyle(fontSize: 32)),
                                  const SizedBox(height: 6),
                                  const Text(
                                    'Lien de réinitialisation envoyé !',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF10B981)),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    'Consultez votre messagerie ${_identifierController.text.trim()} pour définir un nouveau mot de passe.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(fontSize: 12, color: textMuted),
                                  ),
                                ],
                              ),
                            ),
                          ],

                          const SizedBox(height: 16),
                          Divider(color: cardBorder),
                          const SizedBox(height: 8),

                          Center(
                            child: InkWell(
                              onTap: () => setState(() {
                                _mode = 'login';
                                _forgotSent = false;
                              }),
                              child: RichText(
                                text: TextSpan(
                                  style: TextStyle(fontSize: 13, color: textMuted),
                                  children: const [
                                    TextSpan(text: 'Retour à la '),
                                    TextSpan(
                                      text: 'connexion',
                                      style: TextStyle(color: primaryCyan, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
