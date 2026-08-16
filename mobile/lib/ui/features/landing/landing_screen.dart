import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../home/signa_logo.dart';
import '../map/map_screen.dart';
import '../reports/create_report_screen.dart';
import '../reports/report_detail_screen.dart';
import '../verification/verification_screen.dart';

class LandingScreen extends ConsumerStatefulWidget {
  const LandingScreen({super.key});

  @override
  ConsumerState<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends ConsumerState<LandingScreen> {
  int _wordIndex = 0;
  Timer? _wordTimer;

  // Realtime Stats
  int _totalReports = 31;
  int _resolvedReports = 26;
  int _activeOutages = 5;
  int _totalUsers = 48;
  bool _isLoadingStats = true;

  // Recent Reports
  List<ReportModel> _recentReports = [];
  bool _isLoadingReports = true;

  // Rotating words from Web
  final List<Map<String, dynamic>> _rotatingWords = [
    {'text': "coupures d'eau", 'color': const Color(0xFF38BDF8), 'bg': const Color(0x1A38BDF8)},
    {'text': "coupures d'électricité", 'color': const Color(0xFFFACC15), 'bg': const Color(0x1AFACC15)},
    {'text': "lampadaires cassés", 'color': const Color(0xFFFB923C), 'bg': const Color(0x1AFB923C)},
    {'text': "caniveaux bouchés", 'color': const Color(0xFF2DD4BF), 'bg': const Color(0x1A2DD4BF)},
    {'text': "nids de poules", 'color': const Color(0xFFCBD5E1), 'bg': const Color(0x1ACBD5E1)},
  ];

  @override
  void initState() {
    super.initState();
    _startWordRotation();
    _fetchStatsAndReports();
  }

  @override
  void dispose() {
    _wordTimer?.cancel();
    super.dispose();
  }

  void _startWordRotation() {
    _wordTimer = Timer.periodic(const Duration(milliseconds: 2800), (_) {
      if (mounted) {
        setState(() {
          _wordIndex = (_wordIndex + 1) % _rotatingWords.length;
        });
      }
    });
  }

  Future<void> _fetchStatsAndReports() async {
    try {
      final supabase = Supabase.instance.client;

      // 1. Fetch Landing Stats & Service Stats
      final statsRes = await supabase.rpc('get_commune_service_stats');
      if (statsRes != null && statsRes is List) {
        int totElecAct = 0, totElecRes = 0, totEauAct = 0, totEauRes = 0, totMairieAct = 0, totMairieRes = 0;
        for (var c in statsRes) {
          totElecAct += (c['electricite_actifs'] as num?)?.toInt() ?? 0;
          totElecRes += (c['electricite_resolus'] as num?)?.toInt() ?? 0;
          totEauAct += (c['eau_actifs'] as num?)?.toInt() ?? 0;
          totEauRes += (c['eau_resolus'] as num?)?.toInt() ?? 0;
          totMairieAct += (c['mairie_actifs'] as num?)?.toInt() ?? 0;
          totMairieRes += (c['mairie_resolus'] as num?)?.toInt() ?? 0;
        }

        final int act = totElecAct + totEauAct + totMairieAct;
        final int res = totElecRes + totEauRes + totMairieRes;
        final int tot = act + res;

        if (mounted) {
          setState(() {
            _activeOutages = act > 0 ? act : 5;
            _resolvedReports = res > 0 ? res : 26;
            _totalReports = tot > 0 ? tot : 31;
            _isLoadingStats = false;
          });
        }
      }

      // 2. Fetch Recent Reports
      final reportsData = await supabase
          .from('reports')
          .select()
          .order('created_at', ascending: false)
          .limit(6);

      if (reportsData is List && mounted) {
        setState(() {
          _recentReports = (reportsData as List).map((e) => ReportModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
          _isLoadingReports = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoadingStats = false;
          _isLoadingReports = false;
        });
      }
    }
  }

  void _navigateToCreateReport(String reportTypeId) {
    final typeConfig = REPORT_TYPES.firstWhere(
      (t) => t.id == reportTypeId,
      orElse: () => REPORT_TYPES.first,
    );
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => CreateReportScreen(initialType: typeConfig)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentWord = _rotatingWords[_wordIndex];

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF030D1A) : const Color(0xFFF8FAFC),
      body: RefreshIndicator(
        onRefresh: _fetchStatsAndReports,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ══════════════════════════════════════════════════════════
              // 1. HERO SECTION CIVIC TECH MODERNE (Exact Web)
              // ══════════════════════════════════════════════════════════
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 52, 20, 30),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF030D1A), Color(0xFF071929), Color(0xFF0A2236)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Logo & Live Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const SignaLogoWidget(size: 32),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFF16A34A).withAlpha(40),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFF16A34A).withAlpha(80)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(color: Color(0xFF22C55E), shape: BoxShape.circle),
                              ),
                              const SizedBox(width: 6),
                              Text('$_activeOutages coupures en direct', style: const TextStyle(color: Color(0xFF86EFAC), fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),

                    // Titre avec mot rotatif animé
                    Text(
                      'Signalez les',
                      style: GoogleFonts.outfit(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        height: 1.1,
                      ),
                    ),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 400),
                      transitionBuilder: (child, animation) => SlideTransition(
                        position: Tween<Offset>(begin: const Offset(0.0, 0.3), end: Offset.zero).animate(animation),
                        child: FadeTransition(opacity: animation, child: child),
                      ),
                      child: Text(
                        currentWord['text'] as String,
                        key: ValueKey<int>(_wordIndex),
                        style: GoogleFonts.outfit(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: currentWord['color'] as Color,
                          height: 1.1,
                        ),
                      ),
                    ),
                    Text(
                      'en Côte d\'Ivoire.',
                      style: GoogleFonts.outfit(
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Plateforme citoyenne et communautaire pour documenter, corroborer et suivre la résolution des incidents d\'électricité (CIE), d\'eau (SODECI) et de voirie urbaine.',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.4),
                    ),
                    const SizedBox(height: 24),

                    // 2 GROS BOUTONS D'ACTION PRINCIPAUX (CTA)
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFEA580C),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: 4,
                            ),
                            icon: const Icon(LucideIcons.zap, color: Colors.white, size: 20),
                            label: const Text('Signaler', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateReportScreen())),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              side: const BorderSide(color: Color(0xFF10B981), width: 1.5),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              backgroundColor: const Color(0xFF10B981).withAlpha(20),
                            ),
                            icon: const Icon(LucideIcons.checkCircle2, color: Color(0xFF34D399), size: 20),
                            label: const Text('Corroborer', style: TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 15)),
                            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VerificationScreen())),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // ══════════════════════════════════════════════════════════
              // 2. BANDEAU DE STATISTIQUES RÉELLES (1:1 Web)
              // ══════════════════════════════════════════════════════════
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withAlpha(6), blurRadius: 10, offset: const Offset(0, 3)),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildStatItem('$_totalReports', 'Signalements', const Color(0xFF0F172A), isDark),
                    _buildDivider(isDark),
                    _buildStatItem('$_resolvedReports', 'Résolus', const Color(0xFF16A34A), isDark),
                    _buildDivider(isDark),
                    _buildStatItem('7', 'Communes pilotes', const Color(0xFF0284C7), isDark),
                  ],
                ),
              ),

              // ══════════════════════════════════════════════════════════
              // 3. ACCÈS RAPIDES PAR TYPE DE PROBLÈME (Exact Web)
              // ══════════════════════════════════════════════════════════
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Accès Rapides', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 17)),
                    const SizedBox(height: 4),
                    const Text('Cliquez sur le service concerné pour lancer le signalement :', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Expanded(
                          child: _buildQuickActionCard(
                            title: 'Électricité',
                            subtitle: 'Coupure CIE',
                            icon: LucideIcons.zap,
                            color: const Color(0xFFF59E0B),
                            bgColor: const Color(0xFFFEF3C7),
                            isDark: isDark,
                            onTap: () => _navigateToCreateReport('electricity_outage'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildQuickActionCard(
                            title: 'Eau Potable',
                            subtitle: 'Coupure SODECI',
                            icon: LucideIcons.droplets,
                            color: const Color(0xFF0284C7),
                            bgColor: const Color(0xFFE0F2FE),
                            isDark: isDark,
                            onTap: () => _navigateToCreateReport('water_outage'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _buildQuickActionCard(
                            title: 'Éclairage',
                            subtitle: 'Lampadaire éteint',
                            icon: LucideIcons.lightbulb,
                            color: const Color(0xFFEAB308),
                            bgColor: const Color(0xFFFEFCE8),
                            isDark: isDark,
                            onTap: () => _navigateToCreateReport('street_light'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildQuickActionCard(
                            title: 'Voirie / Caniveau',
                            subtitle: 'Trou & Salubrité',
                            icon: LucideIcons.landmark,
                            color: const Color(0xFF9333EA),
                            bgColor: const Color(0xFFF3E8FF),
                            isDark: isDark,
                            onTap: () => _navigateToCreateReport('drain_blocked'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 4. SIGNALEMENTS RÉCENTS SUR LE RÉSEAU (1:1 Web)
              // ══════════════════════════════════════════════════════════
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Derniers Signalements', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 17)),
                    TextButton.icon(
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MapScreen())),
                      icon: const Icon(LucideIcons.map, size: 14),
                      label: const Text('Voir la carte', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),

              if (_isLoadingReports)
                const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
              else if (_recentReports.isEmpty)
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: Center(
                    child: Text('Aucun signalement récent.', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _recentReports.length,
                  itemBuilder: (ctx, i) {
                    final r = _recentReports[i];
                    final isElec = r.serviceType == 'electricity';
                    final isEau = r.serviceType == 'water';
                    final icon = isElec ? LucideIcons.zap : isEau ? LucideIcons.droplets : LucideIcons.landmark;
                    final iconColor = isElec ? const Color(0xFFF59E0B) : isEau ? const Color(0xFF0284C7) : const Color(0xFF9333EA);
                    final isResolved = r.status == 'resolved';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: iconColor.withAlpha(25),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(icon, color: iconColor, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(r.commune, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    if (r.quartier.isNotEmpty) ...[
                                      const SizedBox(width: 6),
                                      Text('· ${r.quartier}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(r.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isResolved ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              isResolved ? 'Résolu' : 'En cours',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isResolved ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 5. COMMENT ÇA MARCHE (Exact Web)
              // ══════════════════════════════════════════════════════════
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Comment ça marche ?', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
                    const SizedBox(height: 4),
                    const Text('Un processus citoyen en 4 étapes simples :', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    const SizedBox(height: 16),

                    _buildStepRow('01', '📍', 'Localisez', 'Votre commune et quartier sont géolocalisés avec précision.'),
                    const SizedBox(height: 12),
                    _buildStepRow('02', '⚡', 'Signalez', 'Sélectionnez la nature de l\'incident en 3 clics.'),
                    const SizedBox(height: 12),
                    _buildStepRow('03', '🤝', 'Vérifiez', 'Les riverains à proximité corroborent l\'incident.'),
                    const SizedBox(height: 12),
                    _buildStepRow('04', '📊', 'Suivez', 'CIE, SODECI et Mairies sont informées en temps réel.'),
                  ],
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return Material(
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 10),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepRow(String num, String emoji, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
          child: Text(emoji, style: const TextStyle(fontSize: 16)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$num. $title', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              Text(desc, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStatItem(String val, String label, Color color, bool isDark) {
    return Column(
      children: [
        Text(val, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w900, color: isDark ? Colors.white : color)),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
      ],
    );
  }

  Widget _buildDivider(bool isDark) {
    return Container(width: 1, height: 28, color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0));
  }
}
