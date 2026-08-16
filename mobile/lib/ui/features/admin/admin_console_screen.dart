import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../reports/report_detail_screen.dart';

class AdminConsoleScreen extends StatefulWidget {
  const AdminConsoleScreen({super.key});

  @override
  State<AdminConsoleScreen> createState() => _AdminConsoleScreenState();
}

class _AdminConsoleScreenState extends State<AdminConsoleScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isAdmin = false;
  bool _isCheckingRole = true;

  // Overview metrics
  int _totalReports = 0;
  int _pendingCount = 0;
  int _resolvedCount = 0;
  int _usersCount = 0;

  // Reports tab
  List<ReportModel> _adminReports = [];
  bool _isLoadingReports = false;
  String _statusFilter = 'all';

  // Vulnerable Households tab (1:1 AdminVulnerablePage)
  List<Map<String, dynamic>> _vulnerableReports = [];
  bool _isLoadingVulnerable = false;
  int _totalBabies = 0;
  int _totalPregnant = 0;
  int _totalElderly = 0;

  // Users Management tab (1:1 AdminUsersPage)
  List<Map<String, dynamic>> _usersList = [];
  bool _isLoadingUsers = false;
  String _userSearchQuery = '';

  // Site Settings toggles
  bool _transparencyEnabled = true;
  bool _donationsEnabled = true;
  bool _partnersEnabled = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _checkAdminRole();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _checkAdminRole() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      setState(() {
        _isAdmin = false;
        _isCheckingRole = false;
      });
      return;
    }

    try {
      final res = await Supabase.instance.client.rpc('has_role', params: {
        '_user_id': user.id,
        '_role': 'admin',
      });

      final hasRole = res == true;
      setState(() {
        _isAdmin = hasRole;
        _isCheckingRole = false;
      });

      if (hasRole) {
        _fetchOverviewData();
        _fetchAdminReports();
        _fetchVulnerableData();
        _fetchUsersData();
      }
    } catch (_) {
      setState(() {
        _isAdmin = false;
        _isCheckingRole = false;
      });
    }
  }

  Future<void> _fetchOverviewData() async {
    try {
      final reportsRes = await Supabase.instance.client.from('reports').select('id, status, validated');
      final usersRes = await Supabase.instance.client.from('profiles').select('id');

      if (reportsRes is List && mounted) {
        final list = reportsRes as List;
        final total = list.length;
        final pending = list.where((r) => r['validated'] == false || r['status'] == 'pending').length;
        final resolved = list.where((r) => r['status'] == 'resolved').length;

        setState(() {
          _totalReports = total;
          _pendingCount = pending;
          _resolvedCount = resolved;
          _usersCount = usersRes is List ? (usersRes as List).length : 0;
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchAdminReports() async {
    setState(() => _isLoadingReports = true);
    try {
      final res = await Supabase.instance.client
          .from('reports')
          .select()
          .order('created_at', ascending: false)
          .limit(50);

      if (res is List && mounted) {
        setState(() {
          _adminReports = (res as List).map((e) => ReportModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
          _isLoadingReports = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingReports = false);
    }
  }

  Future<void> _fetchVulnerableData() async {
    setState(() => _isLoadingVulnerable = true);
    try {
      final res = await Supabase.instance.client
          .from('reports')
          .select('id, commune, quartier, description, status, urgency, has_babies, has_pregnant, has_elderly, medical_equipment, created_at')
          .or('has_babies.eq.true,has_pregnant.eq.true,has_elderly.eq.true,medical_equipment.eq.true')
          .order('created_at', ascending: false);

      if (res is List && mounted) {
        final list = List<Map<String, dynamic>>.from(res as List);
        int babies = 0;
        int pregnant = 0;
        int elderly = 0;

        for (final r in list) {
          if (r['has_babies'] == true) babies++;
          if (r['has_pregnant'] == true) pregnant++;
          if (r['has_elderly'] == true) elderly++;
        }

        setState(() {
          _vulnerableReports = list;
          _totalBabies = babies;
          _totalPregnant = pregnant;
          _totalElderly = elderly;
          _isLoadingVulnerable = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingVulnerable = false);
    }
  }

  Future<void> _fetchUsersData() async {
    setState(() => _isLoadingUsers = true);
    try {
      final res = await Supabase.instance.client
          .from('profiles')
          .select('id, display_name, first_name, last_name, phone, role, commune, created_at')
          .order('created_at', ascending: false)
          .limit(50);

      if (res is List && mounted) {
        setState(() {
          _usersList = List<Map<String, dynamic>>.from(res as List);
          _isLoadingUsers = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingUsers = false);
    }
  }

  Future<void> _updateReportStatus(String reportId, String newStatus) async {
    try {
      await Supabase.instance.client
          .from('reports')
          .update({'status': newStatus, 'resolved_at': newStatus == 'resolved' ? DateTime.now().toIso8601String() : null})
          .eq('id', reportId);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✓ Statut mis à jour : $newStatus'), backgroundColor: AppTheme.secondaryEmerald),
      );
      _fetchAdminReports();
      _fetchOverviewData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur : $e'), backgroundColor: AppTheme.dangerRose),
      );
    }
  }

  Future<void> _updateUserRole(String userId, String newRole) async {
    try {
      await Supabase.instance.client
          .from('profiles')
          .update({'role': newRole})
          .eq('id', userId);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('✓ Rôle utilisateur mis à jour : $newRole'), backgroundColor: AppTheme.secondaryEmerald),
      );
      _fetchUsersData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur modification rôle : $e'), backgroundColor: AppTheme.dangerRose),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isCheckingRole) {
      return Scaffold(
        appBar: AppBar(title: const Text('Console d\'Administration')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (!_isAdmin) {
      return Scaffold(
        appBar: AppBar(title: const Text('Accès Restreint')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(LucideIcons.shieldAlert, size: 56, color: AppTheme.dangerRose),
                const SizedBox(height: 16),
                Text('Accès Super-Administrateur Requis', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18), textAlign: TextAlign.center),
                const SizedBox(height: 8),
                const Text(
                  'Cette section est strictement réservée à l\'équipe de supervision SIGNA·CI et aux modérateurs accrédités.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal, foregroundColor: Colors.white),
                  icon: const Icon(LucideIcons.arrowLeft, size: 16),
                  label: const Text('Retour'),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text('Super-Admin SIGNA·CI', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          indicatorColor: AppTheme.primaryTeal,
          labelColor: isDark ? Colors.white : AppTheme.primaryTeal,
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(icon: Icon(LucideIcons.layoutDashboard, size: 16), text: 'Vue Générale'),
            Tab(icon: Icon(LucideIcons.fileCheck, size: 16), text: 'Modération'),
            Tab(icon: Icon(LucideIcons.heartPulse, size: 16), text: 'Foyers Vulnérables'),
            Tab(icon: Icon(LucideIcons.users, size: 16), text: 'Utilisateurs'),
            Tab(icon: Icon(LucideIcons.sliders, size: 16), text: 'Paramètres Site'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── TAB 1 : VUE GÉNÉRALE ──
          _buildOverviewTab(isDark),

          // ── TAB 2 : MODÉRATION DES SIGNALEMENTS ──
          _buildModerationTab(isDark),

          // ── TAB 3 : FOYERS VULNÉRABLES ──
          _buildVulnerableTab(isDark),

          // ── TAB 4 : GESTION DES UTILISATEURS ──
          _buildUsersTab(isDark),

          // ── TAB 5 : PARAMÈTRES ET COMMANDE SITE ──
          _buildSettingsTab(isDark),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Statistiques Globales Plateforme', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildMetricCard('Total Incidents', '$_totalReports', LucideIcons.fileText, const Color(0xFF0284C7), isDark)),
              const SizedBox(width: 10),
              Expanded(child: _buildMetricCard('En Attente', '$_pendingCount', LucideIcons.clock, const Color(0xFFD97706), isDark)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _buildMetricCard('Résolus', '$_resolvedCount', LucideIcons.checkCircle2, const Color(0xFF16A34A), isDark)),
              const SizedBox(width: 10),
              Expanded(child: _buildMetricCard('Citoyens Inscrits', '$_usersCount', LucideIcons.users, const Color(0xFF8B5CF6), isDark)),
            ],
          ),
          const SizedBox(height: 24),

          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: const [
                    Icon(LucideIcons.shieldCheck, color: AppTheme.secondaryEmerald, size: 20),
                    SizedBox(width: 8),
                    Text('Console de Contrôle Opérationnel', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'En tant qu\'administrateur, vous disposez de tous les droits d\'arbitrage, de validation des signalements urgents et de régulation des partenariats CIE/SODECI.',
                  style: TextStyle(fontSize: 11, color: Colors.grey, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModerationTab(bool isDark) {
    final filtered = _adminReports.where((r) {
      if (_statusFilter == 'active') return r.status == 'active' || r.status == 'pending';
      if (_statusFilter == 'processing') return r.status == 'processing';
      if (_statusFilter == 'resolved') return r.status == 'resolved';
      return true;
    }).toList();

    return Column(
      children: [
        // Filter bar
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              _buildFilterChip('Tous', _statusFilter == 'all', () => setState(() => _statusFilter = 'all'), isDark),
              const SizedBox(width: 6),
              _buildFilterChip('À traiter', _statusFilter == 'active', () => setState(() => _statusFilter = 'active'), isDark),
              const SizedBox(width: 6),
              _buildFilterChip('En cours', _statusFilter == 'processing', () => setState(() => _statusFilter = 'processing'), isDark),
              const SizedBox(width: 6),
              _buildFilterChip('Résolus', _statusFilter == 'resolved', () => setState(() => _statusFilter = 'resolved'), isDark),
            ],
          ),
        ),
        Expanded(
          child: _isLoadingReports
              ? const Center(child: CircularProgressIndicator())
              : filtered.isEmpty
                  ? const Center(child: Text('Aucun signalement dans cette catégorie'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (ctx, i) {
                        final r = filtered[i];
                        return _buildAdminReportCard(r, isDark);
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildVulnerableTab(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Registre Prioritaire des Foyers Vulnérables', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 4),
          const Text('Suivi en temps réel des ménages à risque impactés par les coupures.', style: TextStyle(fontSize: 11, color: Colors.grey)),
          const SizedBox(height: 14),

          Row(
            children: [
              Expanded(child: _buildMetricCard('👶 Bébés / Nourrissons', '$_totalBabies', LucideIcons.baby, const Color(0xFFEC4899), isDark)),
              const SizedBox(width: 8),
              Expanded(child: _buildMetricCard('🤰 Femmes Enceintes', '$_totalPregnant', LucideIcons.heart, const Color(0xFF8B5CF6), isDark)),
              const SizedBox(width: 8),
              Expanded(child: _buildMetricCard('🧓 Personnes Âgées', '$_totalElderly', LucideIcons.users, const Color(0xFFF59E0B), isDark)),
            ],
          ),
          const SizedBox(height: 18),

          if (_isLoadingVulnerable)
            const Center(child: Padding(padding: EdgeInsets.all(30), child: CircularProgressIndicator()))
          else if (_vulnerableReports.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
              child: const Center(child: Text('Aucun foyer vulnérable actif signalé en ce moment')),
            )
          else
            ..._vulnerableReports.map((r) => Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : const Color(0xFFFFF1F2),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFECDD3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('🚨 ${r['commune']} · ${r['quartier']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFFBE123C))),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: const Color(0xFFBE123C), borderRadius: BorderRadius.circular(6)),
                            child: const Text('PRIORITÉ ÉLEVÉE', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(r['description'] ?? '', style: const TextStyle(fontSize: 12, color: Color(0xFF4C0519))),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        children: [
                          if (r['has_babies'] == true) const Chip(label: Text('👶 Bébés', style: TextStyle(fontSize: 10)), visualDensity: VisualDensity.compact),
                          if (r['has_pregnant'] == true) const Chip(label: Text('🤰 Enceinte', style: TextStyle(fontSize: 10)), visualDensity: VisualDensity.compact),
                          if (r['has_elderly'] == true) const Chip(label: Text('🧓 Âgée', style: TextStyle(fontSize: 10)), visualDensity: VisualDensity.compact),
                          if (r['medical_equipment'] == true) const Chip(label: Text('🩺 Respirateur', style: TextStyle(fontSize: 10)), visualDensity: VisualDensity.compact),
                        ],
                      ),
                    ],
                  ),
                )),
        ],
      ),
    );
  }

  Widget _buildUsersTab(bool isDark) {
    final filtered = _usersList.where((u) {
      if (_userSearchQuery.isEmpty) return true;
      final q = _userSearchQuery.toLowerCase();
      final name = '${u['first_name'] ?? ''} ${u['last_name'] ?? ''} ${u['display_name'] ?? ''}'.toLowerCase();
      final phone = (u['phone'] ?? '').toLowerCase();
      final commune = (u['commune'] ?? '').toLowerCase();
      return name.contains(q) || phone.contains(q) || commune.contains(q);
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            onChanged: (v) => setState(() => _userSearchQuery = v),
            decoration: InputDecoration(
              hintText: 'Rechercher un utilisateur (nom, téléphone, commune)...',
              prefixIcon: const Icon(LucideIcons.search, size: 18),
              filled: true,
              fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
          ),
        ),
        Expanded(
          child: _isLoadingUsers
              ? const Center(child: CircularProgressIndicator())
              : filtered.isEmpty
                  ? const Center(child: Text('Aucun utilisateur trouvé'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(12),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (ctx, i) {
                        final u = filtered[i];
                        final name = '${u['first_name'] ?? ''} ${u['last_name'] ?? ''}'.trim();
                        final displayName = name.isNotEmpty ? name : (u['display_name'] ?? 'Citoyen');
                        final role = u['role'] ?? 'citoyen';

                        return Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1E293B) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: AppTheme.primaryTeal.withAlpha(40),
                                child: const Icon(LucideIcons.user, color: AppTheme.primaryTeal, size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(displayName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                    Text('${u['phone'] ?? 'Pas de numéro'} · ${u['commune'] ?? 'Abidjan'}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                  ],
                                ),
                              ),
                              DropdownButton<String>(
                                value: ['citoyen', 'moderateur', 'admin', 'partenaire'].contains(role) ? role : 'citoyen',
                                underline: const SizedBox.shrink(),
                                items: const [
                                  DropdownMenuItem(value: 'citoyen', child: Text('Citoyen', style: TextStyle(fontSize: 11))),
                                  DropdownMenuItem(value: 'moderateur', child: Text('Modérateur', style: TextStyle(fontSize: 11, color: Colors.orange))),
                                  DropdownMenuItem(value: 'admin', child: Text('Admin', style: TextStyle(fontSize: 11, color: Colors.red))),
                                  DropdownMenuItem(value: 'partenaire', child: Text('Partenaire', style: TextStyle(fontSize: 11, color: Colors.blue))),
                                ],
                                onChanged: (newRole) {
                                  if (newRole != null) _updateUserRole(u['id'], newRole);
                                },
                              ),
                            ],
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildSettingsTab(bool isDark) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Visibilité des Modules Publics', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        _buildSettingSwitch('Module de Dons Citoyens', 'Activer la collecte de dons Mobile Money sur l\'application.', _donationsEnabled, (v) => setState(() => _donationsEnabled = v), isDark),
        _buildSettingSwitch('Espace Transparence & Délais', 'Afficher les compteurs nationaux et délais moyens de résolution.', _transparencyEnabled, (v) => setState(() => _transparencyEnabled = v), isDark),
        _buildSettingSwitch('Vitrine Partenaires CIE / SODECI', 'Afficher la page institutionnelle des partenariats.', _partnersEnabled, (v) => setState(() => _partnersEnabled = v), isDark),
      ],
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis)),
              Icon(icon, color: color, size: 16),
            ],
          ),
          const SizedBox(height: 10),
          Text(value, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, bool isSelected, VoidCallback onTap, bool isDark) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryTeal : (isDark ? const Color(0xFF1E293B) : Colors.white),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? AppTheme.primaryTeal : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0))),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildAdminReportCard(ReportModel r, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('#SIG-${r.id.substring(0, 6).toUpperCase()}', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.primaryTeal)),
              Text('${r.commune} · ${r.quartier}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 6),
          Text(r.description.isEmpty ? 'Signalement de panne' : r.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ReportDetailScreen(report: r))),
                child: const Text('Détails', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
              ),
              Row(
                children: [
                  if (r.status != 'processing')
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4)),
                      onPressed: () => _updateReportStatus(r.id, 'processing'),
                      child: const Text('En cours', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  const SizedBox(width: 6),
                  if (r.status != 'resolved')
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A), foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4)),
                      onPressed: () => _updateReportStatus(r.id, 'resolved'),
                      child: const Text('Résolu', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSettingSwitch(String title, String desc, bool value, ValueChanged<bool> onChanged, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ],
            ),
          ),
          Switch(
            value: value,
            activeColor: AppTheme.primaryTeal,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
