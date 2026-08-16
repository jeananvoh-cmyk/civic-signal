import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/repositories/report_repository.dart';
import '../../../domain/models/report_model.dart';
import '../auth/auth_screen.dart';
import '../home/signa_logo.dart';
import '../legal/about_screen.dart';
import '../legal/cgu_screen.dart';
import '../legal/privacy_screen.dart';
import '../meter/meter_screen.dart';
import '../partner/partner_dashboard_screen.dart';
import '../reports/report_detail_screen.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ReportRepository _repo = ReportRepository();

  // Profile fields
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  String _selectedCommune = 'Cocody';
  final _cieClientController = TextEditingController();
  final _cieMeterController = TextEditingController();
  final _sodeciClientController = TextEditingController();
  final _sodeciMeterController = TextEditingController();
  bool _notificationsEnabled = true;

  bool _isLoading = false;
  List<ReportModel> _myReports = [];
  List<ReportModel> _historyReports = [];

  final List<String> _communesList = PILOT_COMMUNES.map((c) => c.nom).toList();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadUserProfile();
    _loadUserReports();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _cieClientController.dispose();
    _cieMeterController.dispose();
    _sodeciClientController.dispose();
    _sodeciMeterController.dispose();
    super.dispose();
  }

  Future<void> _loadUserProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    try {
      final data = await Supabase.instance.client
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

      if (data != null && mounted) {
        setState(() {
          _nameController.text = data['display_name'] ?? data['first_name'] ?? '';
          _phoneController.text = data['phone'] ?? '';
          _selectedCommune = data['commune'] ?? 'Cocody';
          _cieClientController.text = data['electricity_client_id'] ?? '';
          _cieMeterController.text = data['electricity_meter_number'] ?? '';
          _sodeciClientController.text = data['water_client_id'] ?? '';
          _sodeciMeterController.text = data['water_meter_number'] ?? '';
          _notificationsEnabled = data['notifications_enabled'] ?? true;
        });
      }
    } catch (_) {}
  }

  Future<void> _loadUserReports() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    try {
      final list = await _repo.fetchReports(limit: 100);
      final mine = list.where((r) => r.userId == user.id).toList();
      final resolved = list.where((r) => r.status == 'resolved').toList();

      if (mounted) {
        setState(() {
          _myReports = mine;
          _historyReports = resolved;
        });
      }
    } catch (_) {}
  }

  Future<void> _saveProfile() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);
    try {
      await Supabase.instance.client.from('profiles').upsert({
        'id': user.id,
        'display_name': _nameController.text.trim(),
        'phone': _phoneController.text.trim(),
        'commune': _selectedCommune,
        'electricity_client_id': _cieClientController.text.trim(),
        'electricity_meter_number': _cieMeterController.text.trim(),
        'water_client_id': _sodeciClientController.text.trim(),
        'water_meter_number': _sodeciMeterController.text.trim(),
        'notifications_enabled': _notificationsEnabled,
        'updated_at': DateTime.now().toIso8601String(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profil et compteurs sauvegardés avec succès !'), backgroundColor: AppTheme.secondaryEmerald),
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

  // ── Calculate CitizenScore (Exact like Web) ──
  int get _citizenScore {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return 10;
    // 50 pts per created report, 20 pts per verification, 10 pts welcome
    int points = 10;
    points += _myReports.length * 50;
    return points;
  }

  String get _citizenRank {
    final s = _citizenScore;
    if (s >= 500) return 'Citoyen d’Honneur ⭐⭐⭐';
    if (s >= 250) return 'Vigilant Expérimenté ⭐⭐';
    if (s >= 100) return 'Citoyen Engagé ⭐';
    return 'Nouveau Signaleur';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = Supabase.instance.client.auth.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const SignaLogoWidget(size: 26, showSlogan: false),
        actions: [
          if (user != null)
            IconButton(
              icon: const Icon(LucideIcons.logOut, color: AppTheme.dangerRose, size: 20),
              onPressed: () async {
                await Supabase.instance.client.auth.signOut();
                if (context.mounted) {
                  setState(() {});
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Déconnexion effectuée.')),
                  );
                }
              },
            )
          else
            TextButton.icon(
              icon: const Icon(LucideIcons.logIn, size: 16),
              label: const Text('Connexion'),
              onPressed: () async {
                final ok = await Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen()));
                if (ok == true) {
                  _loadUserProfile();
                  _loadUserReports();
                  setState(() {});
                }
              },
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ══════════════════════════════════════════════════════════
            // ── HEADER : CARTE CITIZENSCORE (Identique au Web React) ──
            // ══════════════════════════════════════════════════════════
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF064E3B), Color(0xFF047857)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF047857).withAlpha(80),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(40),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(LucideIcons.award, color: AppTheme.amberAccent, size: 28),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user != null ? (_nameController.text.isNotEmpty ? _nameController.text : user.email ?? 'Citoyen') : 'Mode Visiteur',
                              style: GoogleFonts.outfit(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 2),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.amberAccent,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _citizenRank,
                                style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('CitizenScore Total', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      Text('$_citizenScore pts', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: (_citizenScore % 250) / 250.0,
                      backgroundColor: Colors.white24,
                      valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.amberAccent),
                      minHeight: 8,
                    ),
                  ),
                ],
              ),
            ),

            // ══════════════════════════════════════════════════════════
            // ── 4 ONGLETS COMPLETS (Signalements, Historique, Droits, Paramètres)
            // ══════════════════════════════════════════════════════════
            TabBar(
              controller: _tabController,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              indicatorColor: AppTheme.secondaryEmerald,
              indicatorWeight: 3,
              labelColor: isDark ? Colors.white : AppTheme.primaryTeal,
              unselectedLabelColor: Colors.grey,
              labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13),
              tabs: const [
                Tab(icon: Icon(LucideIcons.fileText, size: 16), text: 'Mes Signalements'),
                Tab(icon: Icon(LucideIcons.history, size: 16), text: 'Historique'),
                Tab(icon: Icon(LucideIcons.scale, size: 16), text: 'Mes Droits & Lois'),
                Tab(icon: Icon(LucideIcons.settings, size: 16), text: 'Paramètres'),
              ],
            ),

            SizedBox(
              height: 520,
              child: TabBarView(
                controller: _tabController,
                children: [
                  // ── TAB 1 : MES SIGNALEMENTS ──
                  _buildMyReportsTab(user),

                  // ── TAB 2 : HISTORIQUE & RÉSOLUTIONS ──
                  _buildHistoryTab(),

                  // ── TAB 3 : MES DROITS & TEXTES DE LOIS ──
                  _buildRightsTab(),

                  // ── TAB 4 : PARAMÈTRES & COMPTEURS ──
                  _buildSettingsTab(user),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── 1. MES SIGNALEMENTS TAB ──
  Widget _buildMyReportsTab(User? user) {
    if (user == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.userX, size: 40, color: Colors.grey),
              const SizedBox(height: 12),
              const Text('Connectez-vous pour voir vos signalements.', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen())),
                child: const Text('Se connecter'),
              ),
            ],
          ),
        ),
      );
    }

    if (_myReports.isEmpty) {
      return const Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('Vous n’avez pas encore créé de signalement.\nCliquez sur « Signaler » pour contribuer !', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _myReports.length,
      itemBuilder: (ctx, i) {
        final r = _myReports[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: ListTile(
            leading: Icon(r.serviceType.contains('elec') ? LucideIcons.zap : LucideIcons.droplets, color: r.alertColor),
            title: Text(r.description.isEmpty ? 'Signalement à ${r.commune}' : r.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: Text('📍 ${r.commune} · ${r.elapsedFormatted} · Status: ${r.status}', style: const TextStyle(fontSize: 11)),
            trailing: const Icon(LucideIcons.chevronRight, size: 18),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ReportDetailScreen(report: r))),
          ),
        );
      },
    );
  }

  // ── 2. HISTORIQUE & RÉSOLUTIONS TAB ──
  Widget _buildHistoryTab() {
    if (_historyReports.isEmpty) {
      return const Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('Aucun historique de rétablissement disponible pour le moment.', style: TextStyle(color: Colors.grey)),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _historyReports.length,
      itemBuilder: (ctx, i) {
        final r = _historyReports[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBBF7D0)),
          ),
          child: Row(
            children: [
              const Icon(LucideIcons.checkCircle2, color: Color(0xFF16A34A), size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Rétabli · ${r.commune}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF15803D))),
                    Text(r.description.isEmpty ? 'Coupure rétablie' : r.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
                  ],
                ),
              ),
              const Text('✅ Résolu', style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold, fontSize: 11)),
            ],
          ),
        );
      },
    );
  }

  // ── 3. MES DROITS & TEXTES DE LOIS TAB (Identique à RightsTabContent) ──
  Widget _buildRightsTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Section CIE Électricité
        _buildLawCard(
          title: '⚡ Électricité — Vos droits face à la CIE',
          color: const Color(0xFFF59E0B),
          content: '• Obligation de continuité de service : La CIE doit rétablir l’électricité dans les meilleurs délais.\n'
              '• Indemnisation dommages matériels : En cas de surtension ayant endommagé vos appareils, vous avez droit à une expertise et dédommagement en déclarant le sinistre sous 15 jours auprès de l’ANARE.\n'
              '• Décompte prépayé : Tout kWh non distribué ne peut être déduit de votre solde.',
        ),
        const SizedBox(height: 12),

        // Section SODECI Eau
        _buildLawCard(
          title: '💧 Eau Potable — Vos droits face à la SODECI',
          color: const Color(0xFF0284C7),
          content: '• Qualité de l’eau : L’eau distribuée doit être conforme aux normes d’hygiène et d’analyse de l’ONEP.\n'
              '• Facturation minimale & fuite : En cas de fuite avant compteur, aucune surfacturation ne peut vous être imputée.\n'
              '• Préavis de coupure : Les coupures programmées pour travaux doivent être annoncées 48h à l’avance.',
        ),
        const SizedBox(height: 12),

        // Contacts d'urgence & WhatsApp Officiel
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text('📞 Contacts d’Urgence & Régulateurs', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              SizedBox(height: 8),
              Text('• CIE Dépannage 24/7 : 179 ou 27 20 20 20 20', style: TextStyle(fontSize: 12)),
              Text('• SODECI Urgence Eau : 175 ou 27 21 21 21 21', style: TextStyle(fontSize: 12)),
              Text('• ANARE (Régulateur Électricité) : 27 20 20 60 00', style: TextStyle(fontSize: 12)),
              Text('• ONEP (Office National Eau) : 27 22 51 43 00', style: TextStyle(fontSize: 12)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLawCard({required String title, required Color color, required String content}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withAlpha(6), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(height: 14, width: 4, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 8),
              Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14))),
            ],
          ),
          const SizedBox(height: 10),
          Text(content, style: const TextStyle(fontSize: 12, height: 1.5, color: Color(0xFF334155))),
        ],
      ),
    );
  }

  // ── 4. PARAMÈTRES & COMPTEURS TAB ──
  Widget _buildSettingsTab(User? user) {
    if (user == null) {
      return Center(
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AuthScreen())),
          child: const Text('Se connecter pour gérer vos paramètres'),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Nom & Téléphone
        TextFormField(
          controller: _nameController,
          decoration: InputDecoration(
            labelText: 'Nom & Prénom',
            prefixIcon: const Icon(LucideIcons.user, size: 20),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            labelText: 'Numéro de téléphone',
            prefixIcon: const Icon(LucideIcons.phone, size: 20),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          value: _selectedCommune,
          decoration: InputDecoration(
            labelText: 'Commune',
            prefixIcon: const Icon(LucideIcons.mapPin, size: 20),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          ),
          items: _communesList.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          onChanged: (v) => setState(() => _selectedCommune = v!),
        ),
        const SizedBox(height: 18),

        // Identifiants Compteurs
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('⚡ Compteur Électricité CIE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            TextButton.icon(
              icon: const Icon(LucideIcons.gauge, size: 14),
              label: const Text('Simulateur & Suivi', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MeterScreen())),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _cieClientController,
                decoration: InputDecoration(
                  labelText: 'N° Client CIE',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextFormField(
                controller: _cieMeterController,
                decoration: InputDecoration(
                  labelText: 'N° Compteur CIE',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),

        // Compteur Eau SODECI
        const Text('💧 Compteur Eau SODECI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _sodeciClientController,
                decoration: InputDecoration(
                  labelText: 'N° Client SODECI',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextFormField(
                controller: _sodeciMeterController,
                decoration: InputDecoration(
                  labelText: 'N° Compteur SODECI',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Notifications Switch
        SwitchListTile(
          title: const Text('Notifications Push', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
          subtitle: const Text('Recevoir les alertes immédiates en cas de coupure de quartier', style: TextStyle(fontSize: 12)),
          value: _notificationsEnabled,
          activeColor: AppTheme.secondaryEmerald,
          onChanged: (val) => setState(() => _notificationsEnabled = val),
        ),
        const SizedBox(height: 16),

        // Bouton Sauvegarder
        ElevatedButton(
          onPressed: _isLoading ? null : _saveProfile,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryTeal,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _isLoading
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Sauvegarder les modifications', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        ),
        const SizedBox(height: 24),

        // Espace Partenaires & Opérateurs
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFFEF3C7),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFDE68A)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(LucideIcons.shieldCheck, color: Color(0xFFD97706), size: 20),
                  SizedBox(width: 8),
                  Text('Espace Partenaires & Opérateurs', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF92400E))),
                ],
              ),
              const SizedBox(height: 6),
              const Text('Réservé aux techniciens et agents de maintenance CIE, SODECI et Mairies.', style: TextStyle(fontSize: 11, color: Color(0xFFB45309))),
              const SizedBox(height: 10),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD97706),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(LucideIcons.wrench, size: 14),
                label: const Text('Accéder au Dashboard Partenaire', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PartnerDashboardScreen())),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Pages d'informations & Légales
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            children: [
              ListTile(
                leading: const Icon(LucideIcons.info, color: AppTheme.primaryTeal),
                title: const Text('À propos de SIGNA·CI', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                trailing: const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AboutScreen())),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(LucideIcons.fileText, color: AppTheme.primaryTeal),
                title: const Text('Conditions Générales d\'Utilisation (CGU)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                trailing: const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CguScreen())),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(LucideIcons.shieldCheck, color: Color(0xFF16A34A)),
                title: const Text('Politique de Confidentialité', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                trailing: const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyScreen())),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}
