import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../home/signa_logo.dart';

class AuthScreen extends StatefulWidget {
  final String initialTab; // 'login', 'signup', 'forgot'

  const AuthScreen({super.key, this.initialTab = 'login'});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKeyLogin = GlobalKey<FormState>();
  final _formKeySignup = GlobalKey<FormState>();
  final _formKeyForgot = GlobalKey<FormState>();

  // Login mode: 'password' vs 'magic'
  String _loginMethod = 'password';

  // Controllers - Login
  final _loginIdentifierController = TextEditingController();
  final _loginPasswordController = TextEditingController();

  // Controllers - Signup
  final _signupIdentifierController = TextEditingController();
  final _signupDisplayNameController = TextEditingController();
  final _signupPhoneController = TextEditingController();
  final _signupPasswordController = TextEditingController();
  final _signupConfirmPasswordController = TextEditingController();
  String _signupUserType = 'household'; // 'household' or 'business'
  String _signupCommune = 'Cocody';
  bool _privacyConsent = false;

  // Controllers - Forgot Password
  final _forgotEmailController = TextEditingController();

  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _magicLinkSent = false;
  bool _forgotSent = false;

  final List<String> _communesList = [
    'Abobo',
    'Adjamé',
    'Attécoubé',
    'Bingerville',
    'Cocody',
    'Koumassi',
    'Marcory',
    'Plateau',
    'Port-Bouët',
    'Treichville',
    'Yopougon',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 2,
      vsync: this,
      initialIndex: widget.initialTab == 'signup' ? 1 : 0,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    _loginIdentifierController.dispose();
    _loginPasswordController.dispose();
    _signupIdentifierController.dispose();
    _signupDisplayNameController.dispose();
    _signupPhoneController.dispose();
    _signupPasswordController.dispose();
    _signupConfirmPasswordController.dispose();
    _forgotEmailController.dispose();
    super.dispose();
  }

  bool _isPhone(String value) {
    return RegExp(r'^\+?\d[\d\s-]{6,}$').hasMatch(value.trim());
  }

  // ── Password Strength Calculation (Exact 1:1 with Web) ──
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

  // ── Google OAuth Sign-in ──
  Future<void> _handleGoogleSignIn() async {
    setState(() => _isLoading = true);
    try {
      await Supabase.instance.client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'ci.signa.app://login-callback',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur Google: $e'), backgroundColor: AppTheme.dangerRose),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Magic Link OTP ──
  Future<void> _handleMagicLink() async {
    final email = _loginIdentifierController.text.trim();
    if (email.isEmpty || _isPhone(email) || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Entrez une adresse email valide pour recevoir le lien.'),
          backgroundColor: AppTheme.dangerRose,
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lien magique envoyé ! Vérifiez votre boîte email.'),
            backgroundColor: AppTheme.secondaryEmerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: AppTheme.dangerRose),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Standard Password Login ──
  Future<void> _handleLogin() async {
    if (!_formKeyLogin.currentState!.validate()) return;
    setState(() => _isLoading = true);

    try {
      final identifier = _loginIdentifierController.text.trim();
      final password = _loginPasswordController.text.trim();

      AuthResponse res;
      if (_isPhone(identifier)) {
        res = await Supabase.instance.client.auth.signInWithPassword(
          phone: identifier,
          password: password,
        );
      } else {
        res = await Supabase.instance.client.auth.signInWithPassword(
          email: identifier,
          password: password,
        );
      }

      if (mounted && res.user != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Connexion réussie ! Bienvenue sur SIGNA·CI.'),
            backgroundColor: AppTheme.secondaryEmerald,
          ),
        );
        Navigator.of(context).pop(true);
      }
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: AppTheme.dangerRose),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur de connexion: $e'), backgroundColor: AppTheme.dangerRose),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Signup (Household / Business) ──
  Future<void> _handleSignup() async {
    if (!_formKeySignup.currentState!.validate()) return;
    if (!_privacyConsent) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez accepter la politique de confidentialité pour continuer.'),
          backgroundColor: AppTheme.dangerRose,
        ),
      );
      return;
    }

    final pwd = _signupPasswordController.text;
    final confirmPwd = _signupConfirmPasswordController.text;

    if (pwd != confirmPwd) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Les mots de passe ne correspondent pas.'),
          backgroundColor: AppTheme.dangerRose,
        ),
      );
      return;
    }

    if (pwd.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Le mot de passe doit contenir au moins 8 caractères.'),
          backgroundColor: AppTheme.dangerRose,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final identifier = _signupIdentifierController.text.trim();
      final metadata = {
        'display_name': _signupDisplayNameController.text.trim(),
        'user_type': _signupUserType,
        'phone': _signupPhoneController.text.trim(),
        'commune': _signupCommune,
      };

      AuthResponse res;
      if (_isPhone(identifier)) {
        res = await Supabase.instance.client.auth.signUp(
          phone: identifier,
          password: pwd,
          data: metadata,
        );
      } else {
        res = await Supabase.instance.client.auth.signUp(
          email: identifier,
          password: pwd,
          data: metadata,
        );
      }

      if (mounted) {
        if (res.user != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Compte créé avec succès ! Bienvenue sur SIGNA·CI.'),
              backgroundColor: AppTheme.secondaryEmerald,
            ),
          );
          Navigator.of(context).pop(true);
        }
      }
    } on AuthException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message), backgroundColor: AppTheme.dangerRose),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors de l’inscription: $e'), backgroundColor: AppTheme.dangerRose),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Forgot Password ──
  Future<void> _handleForgotPassword() async {
    if (!_formKeyForgot.currentState!.validate()) return;
    setState(() => _isLoading = true);

    try {
      final email = _forgotEmailController.text.trim();
      await Supabase.instance.client.auth.resetPasswordForEmail(
        email,
        redirectTo: 'ci.signa.app://reset-password',
      );
      if (mounted) {
        setState(() => _forgotSent = true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Lien de réinitialisation envoyé par email !'),
            backgroundColor: AppTheme.secondaryEmerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e'), backgroundColor: AppTheme.dangerRose),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Widget: Password Strength Meter ──
  Widget _buildPasswordStrengthBar(String password) {
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
                  color: active ? color : Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const SignaLogoWidget(size: 28, showSlogan: false),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.secondaryEmerald,
          indicatorWeight: 3,
          labelColor: isDark ? Colors.white : AppTheme.primaryTeal,
          unselectedLabelColor: Colors.grey,
          labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15),
          tabs: const [
            Tab(text: 'Se connecter'),
            Tab(text: 'S’inscrire'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ══════════════════════════════════════════════════════════
          // TAB 1 : CONNEXION (Google, Magic Link OTP & Mot de passe)
          // ══════════════════════════════════════════════════════════
          SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKeyLogin,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Google Button
                  OutlinedButton.icon(
                    onPressed: _isLoading ? null : _handleGoogleSignIn,
                    icon: Image.network(
                      'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg',
                      height: 18,
                      width: 18,
                      errorBuilder: (_, __, ___) => const Icon(LucideIcons.globe, size: 18),
                    ),
                    label: const Text(
                      'Continuer avec Google',
                      style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87),
                    ),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: Color(0xFFE2E8F0), width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Divider "ou"
                  Row(
                    children: [
                      const Expanded(child: Divider()),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text('ou', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                      ),
                      const Expanded(child: Divider()),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Toggle Method : Mot de passe vs Lien Magique OTP
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: const Center(child: Text('Mot de passe')),
                          selected: _loginMethod == 'password',
                          onSelected: (_) => setState(() => _loginMethod = 'password'),
                          selectedColor: AppTheme.primaryTeal.withAlpha(40),
                          labelStyle: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _loginMethod == 'password' ? AppTheme.primaryTeal : Colors.grey,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Center(child: Text('✨ Lien Magique')),
                          selected: _loginMethod == 'magic',
                          onSelected: (_) => setState(() => _loginMethod = 'magic'),
                          selectedColor: AppTheme.primaryTeal.withAlpha(40),
                          labelStyle: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _loginMethod == 'magic' ? AppTheme.primaryTeal : Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Identifier Input (Email or Phone)
                  TextFormField(
                    controller: _loginIdentifierController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: _loginMethod == 'magic' ? 'Adresse Email' : 'Email ou Téléphone',
                      hintText: _loginMethod == 'magic' ? 'nom@exemple.com' : 'nom@exemple.com ou 0700000000',
                      prefixIcon: const Icon(LucideIcons.user, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) return 'Ce champ est requis.';
                      if (_loginMethod == 'magic' && !val.contains('@')) return 'Email valide requis pour le lien magique.';
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),

                  if (_loginMethod == 'password') ...[
                    // Password Input
                    TextFormField(
                      controller: _loginPasswordController,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        labelText: 'Mot de passe',
                        prefixIcon: const Icon(LucideIcons.lock, size: 20),
                        suffixIcon: IconButton(
                          icon: Icon(_obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 20),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Mot de passe requis.';
                        return null;
                      },
                    ),
                    const SizedBox(height: 8),

                    // Mot de passe oublié link
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () {
                          _showForgotPasswordDialog(context);
                        },
                        child: const Text('Mot de passe oublié ?', style: TextStyle(fontSize: 12)),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Submit Button
                    ElevatedButton(
                      onPressed: _isLoading ? null : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryTeal,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: _isLoading
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text('Se connecter →', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ] else ...[
                    // Magic Link Action
                    ElevatedButton.icon(
                      onPressed: _isLoading ? null : _handleMagicLink,
                      icon: const Icon(LucideIcons.sparkles, size: 18),
                      label: Text('Recevoir mon lien de connexion', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.secondaryEmerald,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                    if (_magicLinkSent) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFBBF7D0)),
                        ),
                        child: const Row(
                          children: [
                            Icon(LucideIcons.checkCircle, color: Color(0xFF16A34A), size: 20),
                            SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Lien envoyé ! Cliquez sur le lien reçu dans votre email pour vous connecter automatiquement.',
                                style: TextStyle(color: Color(0xFF15803D), fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),

          // ══════════════════════════════════════════════════════════
          // TAB 2 : INSCRIPTION (Foyer / Entreprise & Strength Meter)
          // ══════════════════════════════════════════════════════════
          SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKeySignup,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Rejoignez la communauté SIGNA·CI',
                    style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Participez activement à l’amélioration des services publics en Côte d’Ivoire',
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                  const SizedBox(height: 20),

                  // Type de compte (Foyer vs Entreprise)
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _signupUserType = 'household'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                            decoration: BoxDecoration(
                              color: _signupUserType == 'household' ? AppTheme.primaryTeal.withAlpha(20) : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _signupUserType == 'household' ? AppTheme.primaryTeal : Colors.grey[300]!,
                                width: 1.5,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.home, size: 16, color: _signupUserType == 'household' ? AppTheme.primaryTeal : Colors.grey),
                                const SizedBox(width: 6),
                                const Text('Foyer / Particulier', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _signupUserType = 'business'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                            decoration: BoxDecoration(
                              color: _signupUserType == 'business' ? AppTheme.primaryTeal.withAlpha(20) : Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _signupUserType == 'business' ? AppTheme.primaryTeal : Colors.grey[300]!,
                                width: 1.5,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(LucideIcons.building2, size: 16, color: _signupUserType == 'business' ? AppTheme.primaryTeal : Colors.grey),
                                const SizedBox(width: 6),
                                const Text('Entreprise / Commerce', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Display Name
                  TextFormField(
                    controller: _signupDisplayNameController,
                    decoration: InputDecoration(
                      labelText: _signupUserType == 'business' ? 'Nom de l’entreprise' : 'Nom & Prénom',
                      prefixIcon: const Icon(LucideIcons.user, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Ce champ est requis' : null,
                  ),
                  const SizedBox(height: 12),

                  // Email
                  TextFormField(
                    controller: _signupIdentifierController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: 'Adresse Email',
                      prefixIcon: const Icon(LucideIcons.mail, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    validator: (v) => (v == null || !v.contains('@')) ? 'Email valide requis' : null,
                  ),
                  const SizedBox(height: 12),

                  // Phone
                  TextFormField(
                    controller: _signupPhoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: 'Numéro de téléphone (ex: 0700000000)',
                      prefixIcon: const Icon(LucideIcons.phone, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    validator: (v) => (v == null || v.trim().isEmpty) ? 'Numéro de téléphone requis' : null,
                  ),
                  const SizedBox(height: 12),

                  // Commune Dropdown
                  DropdownButtonFormField<String>(
                    value: _signupCommune,
                    decoration: InputDecoration(
                      labelText: 'Commune de résidence',
                      prefixIcon: const Icon(LucideIcons.mapPin, size: 20),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    items: _communesList.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                    onChanged: (v) => setState(() => _signupCommune = v!),
                  ),
                  const SizedBox(height: 12),

                  // Password
                  TextFormField(
                    controller: _signupPasswordController,
                    obscureText: _obscurePassword,
                    onChanged: (_) => setState(() {}),
                    decoration: InputDecoration(
                      labelText: 'Mot de passe (min 8 caractères)',
                      prefixIcon: const Icon(LucideIcons.lock, size: 20),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 20),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    validator: (v) => (v == null || v.length < 8) ? 'Min 8 caractères' : null,
                  ),
                  _buildPasswordStrengthBar(_signupPasswordController.text),
                  const SizedBox(height: 12),

                  // Confirm Password
                  TextFormField(
                    controller: _signupConfirmPasswordController,
                    obscureText: _obscureConfirmPassword,
                    decoration: InputDecoration(
                      labelText: 'Confirmer le mot de passe',
                      prefixIcon: const Icon(LucideIcons.checkCheck, size: 20),
                      suffixIcon: IconButton(
                        icon: Icon(_obscureConfirmPassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 20),
                        onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    validator: (v) => (v != _signupPasswordController.text) ? 'Les mots de passe ne correspondent pas' : null,
                  ),
                  const SizedBox(height: 16),

                  // Privacy Policy Checkbox
                  Row(
                    children: [
                      Checkbox(
                        value: _privacyConsent,
                        onChanged: (v) => setState(() => _privacyConsent = v ?? false),
                        activeColor: AppTheme.secondaryEmerald,
                      ),
                      const Expanded(
                        child: Text(
                          'J’accepte les conditions d’utilisation et la politique de confidentialité de SIGNA·CI.',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Submit Signup
                  ElevatedButton(
                    onPressed: _isLoading ? null : _handleSignup,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryTeal,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _isLoading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text('Créer mon compte citoyen →', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showForgotPasswordDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Mot de passe oublié', style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
          content: Form(
            key: _formKeyForgot,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Saisissez votre adresse email pour recevoir un lien sécurisé de réinitialisation.',
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _forgotEmailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: 'Adresse Email',
                    prefixIcon: const Icon(LucideIcons.mail, size: 20),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  validator: (v) => (v == null || !v.contains('@')) ? 'Email valide requis' : null,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
              onPressed: () {
                _handleForgotPassword();
                Navigator.pop(ctx);
              },
              child: const Text('Envoyer le lien'),
            ),
          ],
        );
      },
    );
  }
}
