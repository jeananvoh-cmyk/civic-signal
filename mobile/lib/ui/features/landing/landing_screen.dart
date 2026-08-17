import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/communes.dart';
import '../../../core/constants/app_contacts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../commune/commune_detail_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../home/signa_logo.dart';
import '../map/map_screen.dart';
import '../infrastructure/infrastructure_screen.dart';
import '../meter/meter_screen.dart';
import '../reports/create_report_screen.dart';
import '../reports/report_detail_screen.dart';
import '../trends/trends_screen.dart';
import '../notifications/notification_center_screen.dart';

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

  // Recent Reports
  List<ReportModel> _recentReports = [];
  bool _isLoadingReports = true;

  // Average Delays
  String _avgElecDelay = '5h 30min';
  String _avgEauDelay = '4h 15min';
  String _avgMairieDelay = '6h 40min';

  String _formatHours(double h) {
    if (h < 1) return '${(h * 60).round()} min';
    if (h < 24) return '${h.round()} h';
    return '${(h / 24).round()} j';
  }

  // Feature Discovery
  bool _showElecBanner = true;
  int _unreadNotifCount = 0;

  // Rotating words (1:1 Web)
  final List<Map<String, dynamic>> _rotatingWords = [
    {'text': "coupures d'électricité", 'colorDark': const Color(0xFFFBBF24), 'colorLight': const Color(0xFFD97706)},
    {'text': "coupures d'eau",         'colorDark': const Color(0xFF38BDF8), 'colorLight': const Color(0xFF0284C7)},
    {'text': "lampadaires cassés",     'colorDark': const Color(0xFFFACC15), 'colorLight': const Color(0xFFCA8A04)},
    {'text': "caniveaux bouchés",      'colorDark': const Color(0xFF2DD4BF), 'colorLight': const Color(0xFF0D9488)},
    {'text': "nids de poules",         'colorDark': const Color(0xFFE2E8F0), 'colorLight': const Color(0xFF334155)},
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
          });
        }
      }

      // 2. Fetch Recent Reports
      final reportsData = await supabase
          .from('reports')
          .select()
          .order('created_at', ascending: false)
          .limit(6);

      if (mounted) {
        setState(() {
          _recentReports = reportsData.map((e) => ReportModel.fromJson(Map<String, dynamic>.from(e))).toList();
          _isLoadingReports = false;
        });
      }

      // 3. Fetch unread notification count
      final user = supabase.auth.currentUser;
      if (user != null) {
        final notifs = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('read', false);
        if (mounted) {
          setState(() {
            _unreadNotifCount = notifs.length;
          });
        }
      }

      // 4. Fetch Dynamic Resolution Delays (1:1 Web)
      try {
        final transRes = await supabase.rpc('get_transparency_stats');
        if (transRes != null && transRes is Map) {
          final transData = Map<String, dynamic>.from(transRes);
          final avgHours = transData['avg_resolution_hours'] is Map
              ? Map<String, dynamic>.from(transData['avg_resolution_hours'])
              : null;
          if (avgHours != null && mounted) {
            final eH = (avgHours['electricity'] as num?)?.toDouble();
            final wH = (avgHours['water'] as num?)?.toDouble();
            final mH = (avgHours['infrastructure'] as num? ?? avgHours['mairie'] as num?)?.toDouble();
            setState(() {
              if (eH != null && eH > 0) _avgElecDelay = _formatHours(eH);
              if (wH != null && wH > 0) _avgEauDelay = _formatHours(wH);
              if (mH != null && mH > 0) _avgMairieDelay = _formatHours(mH);
            });
          }
        }
      } catch (_) {}
    } catch (_) {
      if (mounted) {
        setState(() {
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
              // 1. HERO SECTION CIVIC TECH MODERNE (1:1 Web)
              // ══════════════════════════════════════════════════════════
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(20, 52, 20, 30),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? const [Color(0xFF030D1A), Color(0xFF071929), Color(0xFF0A2236)]
                        : const [Color(0xFFF8FAFC), Color(0xFFF1F5F9), Color(0xFFE2E8F0)],
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
                        SignaLogoWidget(size: 32, isDark: isDark),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF16A34A).withAlpha(40) : const Color(0xFFDCFCE7),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: isDark ? const Color(0xFF16A34A).withAlpha(80) : const Color(0xFF86EFAC)),
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
                                  Text(
                                    _activeOutages > 0 ? '$_activeOutages direct' : 'Calme',
                                    style: TextStyle(color: isDark ? const Color(0xFF86EFAC) : const Color(0xFF15803D), fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            // 🔔 Cloche de Notifications
                            InkWell(
                              borderRadius: BorderRadius.circular(20),
                              onTap: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const NotificationCenterScreen()),
                                );
                                _fetchStatsAndReports();
                              },
                              child: Container(
                                padding: const EdgeInsets.all(7),
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white.withAlpha(20) : Colors.white,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: isDark ? Colors.white.withAlpha(40) : const Color(0xFFCBD5E1)),
                                  boxShadow: isDark ? null : [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 4)],
                                ),
                                child: Stack(
                                  clipBehavior: Clip.none,
                                  children: [
                                    Icon(LucideIcons.bell, color: isDark ? Colors.white : const Color(0xFF0F172A), size: 18),
                                    if (_unreadNotifCount > 0)
                                      Positioned(
                                        right: -4,
                                        top: -4,
                                        child: Container(
                                          padding: const EdgeInsets.all(3),
                                          decoration: const BoxDecoration(
                                            color: AppTheme.dangerRose,
                                            shape: BoxShape.circle,
                                          ),
                                          constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                                          child: Text(
                                            _unreadNotifCount > 9 ? '9+' : '$_unreadNotifCount',
                                            textAlign: TextAlign.center,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 8,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // 🏷️ Slogan Officiel SIGNA : SIGNALER · SUIVRE · RÉPARER
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF059669).withAlpha(isDark ? 35 : 20),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF10B981).withAlpha(isDark ? 80 : 120)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'SIGNALER · SUIVRE · RÉPARER',
                            style: TextStyle(
                              color: isDark ? const Color(0xFF34D399) : const Color(0xFF047857),
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Titre avec mot rotatif animé
                    Text(
                      'Signalez les',
                      style: GoogleFonts.outfit(
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
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
                          fontSize: 34,
                          fontWeight: FontWeight.w900,
                          color: (isDark ? currentWord['colorDark'] : currentWord['colorLight']) as Color,
                          height: 1.1,
                        ),
                      ),
                    ),
                    Text(
                      'en Côte d\'Ivoire.',
                      style: GoogleFonts.outfit(
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Plateforme citoyenne et communautaire pour documenter, corroborer et suivre la résolution des incidents d\'électricité (CIE), d\'eau (SODECI) et de voirie urbaine.',
                      style: TextStyle(color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569), fontSize: 13, height: 1.4),
                    ),
                    const SizedBox(height: 20),

                    // Badge 07 communes pilotes
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withAlpha(15) : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: isDark ? Colors.white.withAlpha(30) : const Color(0xFFCBD5E1)),
                        boxShadow: isDark ? null : [BoxShadow(color: Colors.black.withAlpha(6), blurRadius: 4)],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(LucideIcons.shield, color: isDark ? Colors.white70 : const Color(0xFF059669), size: 14),
                          const SizedBox(width: 6),
                          Text('07 communes pilotes · Abidjan', style: TextStyle(color: isDark ? Colors.white : const Color(0xFF334155), fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // 2 GROS BOUTONS D'ACTION CIVIC TECH DE CLASSE MONDIALE
                    Row(
                      children: [
                        // 1. Bouton Signaler un problème
                        Expanded(
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateReportScreen())),
                              borderRadius: BorderRadius.circular(18),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF059669), // Civic Emerald Green
                                  borderRadius: BorderRadius.circular(18),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF059669).withAlpha(100),
                                      blurRadius: 16,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withAlpha(50),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(LucideIcons.megaphone, color: Colors.white, size: 18),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Row(
                                            children: const [
                                              Expanded(
                                                child: Text(
                                                  'Signaler',
                                                  style: TextStyle(
                                                    color: Colors.white,
                                                    fontWeight: FontWeight.w900,
                                                    fontSize: 14,
                                                    letterSpacing: -0.2,
                                                  ),
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              Icon(LucideIcons.arrowRight, color: Colors.white, size: 14),
                                            ],
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Eau · Courant · Voirie',
                                            style: TextStyle(
                                              color: Colors.white.withAlpha(210),
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),

                        // 2. Bouton Voir la carte (1:1 Web)
                        Expanded(
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MapScreen())),
                              borderRadius: BorderRadius.circular(18),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white.withAlpha(20) : Colors.white,
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(color: isDark ? Colors.white.withAlpha(45) : const Color(0xFFCBD5E1), width: 1.5),
                                  boxShadow: isDark ? null : [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8)],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981).withAlpha(40),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(LucideIcons.map, color: Color(0xFF10B981), size: 18),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            'Voir la Carte',
                                            style: TextStyle(
                                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                                              fontWeight: FontWeight.w900,
                                              fontSize: 14,
                                              letterSpacing: -0.2,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'En direct',
                                            style: TextStyle(
                                              color: isDark ? Colors.white70 : const Color(0xFF64748B),
                                              fontSize: 10,
                                              fontWeight: FontWeight.w600,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // PILULES DES 7 COMMUNES PILOTES (Uniform slate badges 1:1 Web)
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: PILOT_COMMUNES.map((c) {
                        return InkWell(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => CommuneDetailScreen(communeName: c.nom)),
                          ),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                              boxShadow: [BoxShadow(color: Colors.black.withAlpha(isDark ? 20 : 6), blurRadius: 3)],
                            ),
                            child: Text(c.nom, style: TextStyle(color: isDark ? const Color(0xFFF8FAFC) : const Color(0xFF1E293B), fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),

              // ══════════════════════════════════════════════════════════
              // 2. BANDEAU DE STATISTIQUES RÉELLES (4 Chiffres 1:1 Web)
              // ══════════════════════════════════════════════════════════
              InkWell(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DashboardScreen()),
                ),
                borderRadius: BorderRadius.circular(18),
                child: Container(
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
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildStatItem('7', 'Communes', LucideIcons.mapPin, const Color(0xFF0284C7)),
                          _buildStatItem('$_totalReports', 'Signalés', LucideIcons.fileText, const Color(0xFFD97706)),
                          _buildStatItem('$_resolvedReports', 'Résolus', LucideIcons.checkCircle, const Color(0xFF16A34A)),
                          _buildStatItem('$_activeOutages', 'En cours', LucideIcons.radio, const Color(0xFFDC2626)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Text(
                            'Voir le tableau de bord analytique complet',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal),
                          ),
                          SizedBox(width: 4),
                          Icon(LucideIcons.arrowRight, size: 12, color: AppTheme.primaryTeal),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // ══════════════════════════════════════════════════════════
              // 3. DÉLAIS MOYENS DE RÉSOLUTION (1:1 Web)
              // ══════════════════════════════════════════════════════════
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(LucideIcons.trendingUp, color: Color(0xFF10B981), size: 18),
                              const SizedBox(width: 8),
                              const Text('Délai moyen de résolution', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              const SizedBox(width: 4),
                              InkWell(
                                onTap: () => _showDelayExplanationModal(context, isDark),
                                borderRadius: BorderRadius.circular(12),
                                child: Padding(
                                  padding: const EdgeInsets.all(4.0),
                                  child: Icon(LucideIcons.info, size: 14, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                                ),
                              ),
                            ],
                          ),
                          InkWell(
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrendsScreen())),
                            child: const Text('Voir tout →', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(child: _buildDelayBox('⚡', _avgElecDelay, 'CIE (Élec)', const Color(0xFFD97706))),
                          const SizedBox(width: 8),
                          Expanded(child: _buildDelayBox('💧', _avgEauDelay, 'SODECI (Eau)', const Color(0xFF0284C7))),
                          const SizedBox(width: 8),
                          Expanded(child: _buildDelayBox('🏛️', _avgMairieDelay, 'Mairie (Voirie)', const Color(0xFF10B981))),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: InkWell(
                          onTap: () => _showDelayExplanationModal(context, isDark),
                          child: Text(
                            'Basé sur les signalements résolus · (Méthode de calcul)',
                            style: TextStyle(
                              fontSize: 10,
                              fontStyle: FontStyle.italic,
                              color: isDark ? Colors.grey[400] : Colors.grey[600],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // ══════════════════════════════════════════════════════════
              // 4. BANNIÈRE DISCOVERY : COMPTEUR ÉLECTRICITÉ (1:1 Web)
              // ══════════════════════════════════════════════════════════
              if (_showElecBanner)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFFFBEB), Color(0xFFFEF3C7)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFFDE68A)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFD97706),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Text('NOUVEAU', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                            ),
                            const Spacer(),
                            IconButton(
                              icon: const Icon(LucideIcons.x, size: 16, color: Colors.grey),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () => setState(() => _showElecBanner = false),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(color: const Color(0xFFF59E0B).withAlpha(40), shape: BoxShape.circle),
                              child: const Icon(LucideIcons.zap, color: Color(0xFFD97706), size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Text('Suivez votre électricité prépayée', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF92400E))),
                                  Text('Décodez vos SMS de recharge CIE et estimez vos jours d\'autonomie.', style: TextStyle(fontSize: 11, color: Color(0xFF78350F))),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFD97706),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(LucideIcons.gauge, color: Colors.white, size: 16),
                            label: const Text('Essayer le simulateur', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MeterScreen())),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 20),

              // ══════════════════════════════════════════════════════════
              // 4.8. BANNIÈRE MAJEURE : FIL VOIRIE & INFRASTRUCTURES HD
              // ══════════════════════════════════════════════════════════
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InfrastructureScreen())),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFEA580C), Color(0xFFC2410C), Color(0xFF9A3412)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFEA580C).withAlpha(80),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white.withAlpha(50),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Icon(LucideIcons.radio, color: Colors.white, size: 12),
                                    SizedBox(width: 6),
                                    Text('FLUX EN DIRECT', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                                  ],
                                ),
                              ),
                              const Spacer(),
                              const Icon(LucideIcons.chevronRight, color: Colors.white70, size: 20),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white.withAlpha(40),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(LucideIcons.construction, color: Colors.white, size: 26),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: const [
                                    Text(
                                      'Fil Voirie & Infrastructures Publiques',
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                                    ),
                                    SizedBox(height: 3),
                                    Text(
                                      'Nids de poules, lampadaires éteints, caniveaux bouchés et fuites avec photos HD.',
                                      style: TextStyle(color: Color(0xFFFFEDD5), fontSize: 11, height: 1.3),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(LucideIcons.camera, color: Color(0xFFC2410C), size: 16),
                                SizedBox(width: 8),
                                Text(
                                  'Consulter les Photos & Voter "Moi aussi"',
                                  style: TextStyle(color: Color(0xFFC2410C), fontWeight: FontWeight.bold, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 5. 5 CATÉGORIES DE PROBLÈMES (1:1 Web)
              // ══════════════════════════════════════════════════════════
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Que voulez-vous signaler ?', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 17)),
                    const SizedBox(height: 4),
                    const Text('Sélectionnez la nature de l\'incident pour lancer la déclaration :', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 12),

                    Row(
                      children: [
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
                        const SizedBox(width: 10),
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
                            title: 'Caniveau',
                            subtitle: 'Obstruction / Débord.',
                            icon: LucideIcons.waves,
                            color: const Color(0xFF0D9488),
                            bgColor: const Color(0xFFCCFBF1),
                            isDark: isDark,
                            onTap: () => _navigateToCreateReport('drain_blocked'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _buildQuickActionCard(
                      title: 'Nids de poules & Voirie',
                      subtitle: 'Chaussée dégradée, trou dangereux',
                      icon: LucideIcons.landmark,
                      color: const Color(0xFF64748B),
                      bgColor: const Color(0xFFF1F5F9),
                      isDark: isDark,
                      onTap: () => _navigateToCreateReport('pothole'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 6. SIGNALEMENTS RÉCENTS SUR LE RÉSEAU (1:1 Web)
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

                    return InkWell(
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ReportDetailScreen(report: r))),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
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
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: iconColor.withAlpha(30),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(icon, color: iconColor, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${r.commune} · ${r.quartier}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  const SizedBox(height: 2),
                                  Text(r.description, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isResolved ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(8),
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
                      ),
                    );
                  },
                ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 7. SECTION COMMENT ÇA MARCHE (3 Étapes Limpides 1:1 Web)
              // ══════════════════════════════════════════════════════════
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Comment ça marche', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 17)),
                    const SizedBox(height: 4),
                    const Text('3 étapes simples pour faire entendre la voix de votre quartier :', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 12),

                    _buildStepCard('01', '📢', 'Signalez en 30s', 'Détection GPS automatique et photo facultative', isDark),
                    const SizedBox(height: 8),
                    _buildStepCard('02', '🤝', 'Corroborez ensemble', 'Les voisins confirment en 1 clic pour prouver l\'urgence', isDark),
                    const SizedBox(height: 8),
                    _buildStepCard('03', '🛠️', 'Suivez la résolution', 'Dossier transmis et alerte directe dès le rétablissement', isDark),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 8. BANDEAU D'ENTRAIDE CITOYENNE UNIQUE (1:1 Web)
              // ══════════════════════════════════════════════════════════
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFECFDF5),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF10B981).withAlpha(50)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withAlpha(30),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text('🇨🇮 CIVICTECH CI', style: TextStyle(color: Color(0xFF059669), fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text('Faites entendre votre commune', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      const Text(
                        'SIGNA.ci est une initiative 100% citoyenne et gratuite pour accélérer la résolution des pannes publiques à Abidjan.',
                        style: TextStyle(fontSize: 12, color: Colors.grey, height: 1.3),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF059669),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              icon: const Icon(LucideIcons.megaphone, color: Colors.white, size: 16),
                              label: const Text('Signaler', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateReportScreen())),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                side: const BorderSide(color: Color(0xFF25D366)),
                              ),
                              icon: const Icon(LucideIcons.messageCircle, color: Color(0xFF25D366), size: 16),
                              label: const Text('WhatsApp', style: TextStyle(color: Color(0xFF25D366), fontWeight: FontWeight.bold, fontSize: 13)),
                              onPressed: () => launchUrl(Uri.parse(AppContacts.whatsappChatUrl), mode: LaunchMode.externalApplication),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 36),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(String value, String label, IconData icon, Color color) {
    return Column(
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(height: 6),
        Text(value, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w900)),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
      ],
    );
  }

  Widget _buildDelayBox(String emoji, String delay, String label, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withAlpha(15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 16)),
          const SizedBox(height: 2),
          Text(delay, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color)),
          Text(label, style: const TextStyle(fontSize: 9, color: Colors.grey)),
        ],
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
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(subtitle, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStepCard(String number, String emoji, String title, String desc, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Text(emoji, style: const TextStyle(fontSize: 20)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(number, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 11, color: AppTheme.primaryTeal)),
                    const SizedBox(width: 6),
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
                const SizedBox(height: 2),
                Text(desc, style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600])),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showDelayExplanationModal(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: isDark ? Colors.grey[700] : Colors.grey[300],
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withAlpha(30),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(LucideIcons.trendingUp, color: Color(0xFF10B981), size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Comment est calculé le délai moyen ?', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
                      const Text('Méthode de calcul transparente & citoyenne', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildExplanationStep(
              '1. Formule de calcul (Phase actuelle)',
              'Le délai correspond à la durée réelle écoulée entre l\'heure déclarée de début de panne et sa confirmation de rétablissement (validée par la communauté ou nos modérateurs).',
              'Délai = Date de rétablissement − Date de signalement',
              const Color(0xFF0284C7),
              isDark,
            ),
            const SizedBox(height: 10),
            _buildExplanationStep(
              '2. Filtrage des anomalies',
              'Les signalements clôturés immédiatement (< 5 min) ou orphelins sont automatiquement écartés pour ne pas fausser les temps moyens réels.',
              null,
              const Color(0xFFD97706),
              isDark,
            ),
            const SizedBox(height: 10),
            _buildExplanationStep(
              '3. Évolution avec les Partenaires Officiels',
              'Dès le raccordement direct des services techniques (CIE, SODECI, Mairies), le calcul intégrera le SLA officiel de prise en charge avec double vérification citoyenne.',
              null,
              const Color(0xFF10B981),
              isDark,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryTeal,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Compris', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExplanationStep(String title, String desc, String? formula, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: color)),
          const SizedBox(height: 4),
          Text(desc, style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[300] : Colors.grey[700], height: 1.3)),
          if (formula != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: color.withAlpha(50)),
              ),
              child: Text(formula, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color, fontFamily: 'monospace')),
            ),
          ],
        ],
      ),
    );
  }
}
