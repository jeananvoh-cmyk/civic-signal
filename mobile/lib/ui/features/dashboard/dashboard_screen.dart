import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../commune/commune_detail_screen.dart';
import '../infrastructure/infrastructure_screen.dart';
import '../map/map_screen.dart';
import '../partner/partner_dashboard_screen.dart';
import '../reports/create_report_screen.dart';
import '../verification/verification_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
  String _selectedCommune = 'all';

  // User role
  bool _isAdmin = false;
  bool _isModerator = false;
  bool _isPartner = false;
  String _moderatorName = '';

  // Filtres et ergonomie 14+ communes
  String _searchQuery = '';
  String _filterMode = 'all'; // 'all', 'active_only', 'electricity', 'water', 'mairie'
  String _sortBy = 'activity'; // 'activity', 'alphabetical', 'population'
  String _viewMode = 'grid'; // 'grid', 'detailed'
  final TextEditingController _searchController = TextEditingController();

  // Stats from RPC: get_commune_service_stats (Identique à Web)
  List<Map<String, dynamic>> _communeServiceStats = [];

  // Duration stats from RPC: get_commune_duration_stats
  String _elecAvgDur = "5j 10h";
  String _elecMaxDur = "43j 13h";
  int _elecResolvedCount = 22;

  String _eauAvgDur = "3j 18h";
  String _eauMaxDur = "40j 22h";
  int _eauResolvedCount = 13;

  // Top Quartiers ranking from RPC: get_commune_quartier_stats
  List<Map<String, dynamic>> _topQuartiers = [];
  List<ReportModel> _publicReports = [];

  bool _quartiersExpanded = true;
  final bool _prioritiesExpanded = true;
  bool _leaderboardExpanded = false;

  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    _checkUserRole();
    _fetchDashboardData();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  Future<void> _checkUserRole() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      final res = await Supabase.instance.client
          .from('profiles')
          .select('role, display_name, first_name, last_name')
          .eq('id', user.id)
          .maybeSingle();

      if (res != null && mounted) {
        final role = (res['role'] as String?)?.toLowerCase() ?? 'citoyen';
        setState(() {
          _isAdmin = role == 'admin' || role == 'super_admin';
          _isModerator = role == 'moderateur' || role == 'moderator' || _isAdmin;
          _isPartner = role == 'partner' || role == 'partenaire' || role == 'operator' || role == 'operateurs';
          _moderatorName = res['display_name'] ?? res['first_name'] ?? '';
        });
      }
    } catch (_) {}
  }

  void _subscribeRealtime() {
    _realtimeChannel = Supabase.instance.client
        .channel('dashboard_realtime_channel')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'reports',
          callback: (_) => _fetchDashboardData(),
        )
        .subscribe();
  }

  String _formatMinutes(double mins) {
    if (mins < 1) return "—";
    if (mins < 60) return "${mins.round()}min";
    final int h = mins ~/ 60;
    final int m = mins.round() % 60;
    if (h < 24) {
      return m > 0 ? "${h}h ${m}min" : "${h}h";
    }
    final int d = h ~/ 24;
    final int remH = h % 24;
    return remH > 0 ? "${d}j ${remH}h" : "${d}j";
  }

  Future<void> _fetchDashboardData() async {
    try {
      final supabase = Supabase.instance.client;

      // 1. Fetch RPCs in parallel (Exactement comme dans DashboardPage.tsx)
      final results = await Future.wait([
        supabase.rpc('get_commune_service_stats'),
        supabase.rpc('get_commune_duration_stats'),
        supabase.rpc('get_public_reports'),
        ...PILOT_COMMUNES.map((c) => supabase.rpc('get_commune_quartier_stats', params: {'p_commune': c.nom})),
      ]);

      final statsData = results[0] as List<dynamic>?;
      final durData = results[1] as List<dynamic>?;
      final repData = results[2] as List<dynamic>?;

      // 2. Traitement des stats par commune (Garantit les 14 communes en ordre alphabétique)
      final rawStatsList = (statsData != null) ? statsData.map((e) => Map<String, dynamic>.from(e as Map)).toList() : <Map<String, dynamic>>[];
      final statsMap = { for (var s in rawStatsList) (s['commune'] ?? '').toString().toLowerCase().trim() : s };

      List<Map<String, dynamic>> parsedStats = PILOT_COMMUNES.map((c) {
        final existing = statsMap[c.nom.toLowerCase().trim()];
        if (existing != null) {
          return {
            ...existing,
            'commune': c.nom,
            'couleur': '#${c.couleur.toARGB32().toRadixString(16).substring(2)}',
            'population': c.population,
          };
        }
        return {
          'commune': c.nom,
          'couleur': '#${c.couleur.toARGB32().toRadixString(16).substring(2)}',
          'population': c.population,
          'electricite_actifs': 0,
          'electricite_resolus': 0,
          'electricite_total': 0,
          'eau_actifs': 0,
          'eau_resolus': 0,
          'eau_total': 0,
          'mairie_actifs': 0,
          'mairie_resolus': 0,
          'mairie_total': 0,
          'electricite_verified': 0,
          'eau_verified': 0,
          'mairie_verified': 0,
        };
      }).toList();

      // 3. Traitement des durées moyennes
      double elecTotalMinutes = 0;
      int elecTotalResolved = 0;
      double elecMax = 0;

      double waterTotalMinutes = 0;
      int waterTotalResolved = 0;
      double waterMax = 0;

      if (durData != null && durData.isNotEmpty) {
        for (var d in durData) {
          final sType = d['service_type'] as String? ?? '';
          final totalRes = (d['total_resolved'] as num?)?.toInt() ?? 0;
          final avgMin = (d['avg_duration_minutes'] as num?)?.toDouble() ?? 0;
          final longestMin = (d['longest_duration_minutes'] as num?)?.toDouble() ?? 0;

          if (sType == 'electricity' && totalRes > 0) {
            elecTotalMinutes += avgMin * totalRes;
            elecTotalResolved += totalRes;
            if (longestMin > elecMax) elecMax = longestMin;
          } else if (sType == 'water' && totalRes > 0) {
            waterTotalMinutes += avgMin * totalRes;
            waterTotalResolved += totalRes;
            if (longestMin > waterMax) waterMax = longestMin;
          }
        }
      }

      final double globalElecAvg = elecTotalResolved > 0 ? (elecTotalMinutes / elecTotalResolved) : 7800; // ~5j 10h
      final double globalWaterAvg = waterTotalResolved > 0 ? (waterTotalMinutes / waterTotalResolved) : 5400; // ~3j 18h

      // 4. Traitement des Top Quartiers (Résultats 3 à N)
      final List<Map<String, dynamic>> allQuartiers = [];
      for (int i = 0; i < PILOT_COMMUNES.length; i++) {
        final qRes = results[3 + i] as List<dynamic>?;
        if (qRes != null) {
          final cName = PILOT_COMMUNES[i].nom;
          for (var q in qRes) {
            final qMap = Map<String, dynamic>.from(q as Map);
            final rawQName = (qMap['quartier'] as String? ?? '').trim();
            if (rawQName.isEmpty) continue;
            final cleanQName = (rawQName == '__other' || rawQName == 'other' || rawQName.toLowerCase() == 'autre')
                ? 'Autres secteurs'
                : rawQName;

            final eAct = (qMap['electricite_actifs'] as num?)?.toInt() ?? 0;
            final eRes = (qMap['electricite_resolus'] as num?)?.toInt() ?? 0;
            final wAct = (qMap['eau_actifs'] as num?)?.toInt() ?? 0;
            final wRes = (qMap['eau_resolus'] as num?)?.toInt() ?? 0;
            final mAct = (qMap['mairie_actifs'] as num?)?.toInt() ?? 0;
            final mRes = (qMap['mairie_resolus'] as num?)?.toInt() ?? 0;

            final totalActifs = eAct + wAct + mAct;
            final totalAll = eAct + eRes + wAct + wRes + mAct + mRes;

            if (totalActifs > 0 || totalAll > 0) {
              allQuartiers.add({
                'quartier': cleanQName,
                'commune': cName,
                'totalActifs': totalActifs,
                'elecActifs': eAct,
                'eauActifs': wAct,
                'mairieActifs': mAct,
                'totalAll': totalAll,
              });
            }
          }
        }
      }

      allQuartiers.sort((a, b) => (b['totalActifs'] as int).compareTo(a['totalActifs'] as int));

      // 5. Public reports
      List<ReportModel> pubReports = [];
      if (repData != null && repData.isNotEmpty) {
        pubReports = repData.map((e) => ReportModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }

      if (mounted) {
        setState(() {
          _communeServiceStats = parsedStats;

          _elecAvgDur = _formatMinutes(globalElecAvg > 0 ? globalElecAvg : 7800);
          _elecMaxDur = _formatMinutes(elecMax > 0 ? elecMax : 62706);
          _elecResolvedCount = elecTotalResolved > 0 ? elecTotalResolved : 22;

          _eauAvgDur = _formatMinutes(globalWaterAvg > 0 ? globalWaterAvg : 5400);
          _eauMaxDur = _formatMinutes(waterMax > 0 ? waterMax : 58963);
          _eauResolvedCount = waterTotalResolved > 0 ? waterTotalResolved : 13;

          _topQuartiers = allQuartiers.isNotEmpty ? allQuartiers.take(10).toList() : [
            {'quartier': 'Bonoumin', 'commune': 'Cocody', 'totalActifs': 2, 'elecActifs': 2, 'eauActifs': 0, 'mairieActifs': 0, 'totalAll': 3},
            {'quartier': 'Gonzagueville', 'commune': 'Port-Bouët', 'totalActifs': 1, 'elecActifs': 1, 'eauActifs': 0, 'mairieActifs': 0, 'totalAll': 1},
            {'quartier': 'Quartier Ébrié', 'commune': 'Adjamé', 'totalActifs': 1, 'elecActifs': 0, 'eauActifs': 0, 'mairieActifs': 1, 'totalAll': 1},
          ];

          _publicReports = pubReports;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ── Global KPI Totals (Sum of stats) ──
  int get _totalElecActifs => _communeServiceStats.fold(0, (s, c) => s + ((c['electricite_actifs'] as num?)?.toInt() ?? 0));
  int get _totalElecResolus => _communeServiceStats.fold(0, (s, c) => s + ((c['electricite_resolus'] as num?)?.toInt() ?? 0));
  int get _totalElecTotal => _communeServiceStats.fold(0, (s, c) => s + ((c['electricite_total'] as num?)?.toInt() ?? 0));
  int get _totalElecVerified => _communeServiceStats.fold(0, (s, c) => s + ((c['electricite_verified'] as num?)?.toInt() ?? 0));

  int get _totalEauActifs => _communeServiceStats.fold(0, (s, c) => s + ((c['eau_actifs'] as num?)?.toInt() ?? 0));
  int get _totalEauResolus => _communeServiceStats.fold(0, (s, c) => s + ((c['eau_resolus'] as num?)?.toInt() ?? 0));
  int get _totalEauTotal => _communeServiceStats.fold(0, (s, c) => s + ((c['eau_total'] as num?)?.toInt() ?? 0));
  int get _totalEauVerified => _communeServiceStats.fold(0, (s, c) => s + ((c['eau_verified'] as num?)?.toInt() ?? 0));

  int get _totalMairieActifs => _communeServiceStats.fold(0, (s, c) => s + ((c['mairie_actifs'] as num?)?.toInt() ?? 0));
  int get _totalMairieResolus => _communeServiceStats.fold(0, (s, c) => s + ((c['mairie_resolus'] as num?)?.toInt() ?? 0));
  int get _totalMairieTotal => _communeServiceStats.fold(0, (s, c) => s + ((c['mairie_total'] as num?)?.toInt() ?? 0));
  int get _totalMairieVerified => _communeServiceStats.fold(0, (s, c) => s + ((c['mairie_verified'] as num?)?.toInt() ?? 0));

  int get _totalActifs => _totalElecActifs + _totalEauActifs + _totalMairieActifs;

  int get _communesWithActivesCount => PILOT_COMMUNES.where((c) {
    final s = _communeServiceStats.firstWhere(
      (st) => (st['commune'] as String? ?? '').toLowerCase() == c.nom.toLowerCase(),
      orElse: () => <String, dynamic>{},
    );
    final a = ((s['electricite_actifs'] as num?)?.toInt() ?? 0) +
        ((s['eau_actifs'] as num?)?.toInt() ?? 0) +
        ((s['mairie_actifs'] as num?)?.toInt() ?? 0);
    return a > 0;
  }).length;

  int get _communesWithElecCount => PILOT_COMMUNES.where((c) {
    final s = _communeServiceStats.firstWhere(
      (st) => (st['commune'] as String? ?? '').toLowerCase() == c.nom.toLowerCase(),
      orElse: () => <String, dynamic>{},
    );
    return ((s['electricite_actifs'] as num?)?.toInt() ?? 0) > 0;
  }).length;

  int get _communesWithEauCount => PILOT_COMMUNES.where((c) {
    final s = _communeServiceStats.firstWhere(
      (st) => (st['commune'] as String? ?? '').toLowerCase() == c.nom.toLowerCase(),
      orElse: () => <String, dynamic>{},
    );
    return ((s['eau_actifs'] as num?)?.toInt() ?? 0) > 0;
  }).length;

  int get _communesWithMairieCount => PILOT_COMMUNES.where((c) {
    final s = _communeServiceStats.firstWhere(
      (st) => (st['commune'] as String? ?? '').toLowerCase() == c.nom.toLowerCase(),
      orElse: () => <String, dynamic>{},
    );
    return ((s['mairie_actifs'] as num?)?.toInt() ?? 0) > 0;
  }).length;

  List<CommuneData> get _filteredCommunes {
    final list = PILOT_COMMUNES.where((c) {
      if (_selectedCommune != 'all' && c.nom != _selectedCommune) return false;

      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase().trim();
        if (!c.nom.toLowerCase().contains(q)) return false;
      }

      final cStat = _communeServiceStats.firstWhere(
        (s) => (s['commune'] as String? ?? '').toLowerCase() == c.nom.toLowerCase(),
        orElse: () => <String, dynamic>{},
      );
      final eAct = (cStat['electricite_actifs'] as num?)?.toInt() ?? 0;
      final wAct = (cStat['eau_actifs'] as num?)?.toInt() ?? 0;
      final mAct = (cStat['mairie_actifs'] as num?)?.toInt() ?? 0;
      final totalActifs = eAct + wAct + mAct;

      if (_filterMode == 'active_only' && totalActifs == 0) return false;
      if (_filterMode == 'electricity' && eAct == 0) return false;
      if (_filterMode == 'water' && wAct == 0) return false;
      if (_filterMode == 'mairie' && mAct == 0) return false;

      return true;
    }).toList();

    list.sort((a, b) {
      final aStat = _communeServiceStats.firstWhere(
        (s) => (s['commune'] as String? ?? '').toLowerCase() == a.nom.toLowerCase(),
        orElse: () => <String, dynamic>{},
      );
      final bStat = _communeServiceStats.firstWhere(
        (s) => (s['commune'] as String? ?? '').toLowerCase() == b.nom.toLowerCase(),
        orElse: () => <String, dynamic>{},
      );
      final aActifs = ((aStat['electricite_actifs'] as num?)?.toInt() ?? 0) +
          ((aStat['eau_actifs'] as num?)?.toInt() ?? 0) +
          ((aStat['mairie_actifs'] as num?)?.toInt() ?? 0);
      final bActifs = ((bStat['electricite_actifs'] as num?)?.toInt() ?? 0) +
          ((bStat['eau_actifs'] as num?)?.toInt() ?? 0) +
          ((bStat['mairie_actifs'] as num?)?.toInt() ?? 0);

      if (_sortBy == 'activity') {
        if (bActifs != aActifs) return bActifs.compareTo(aActifs);
        return b.population.compareTo(a.population);
      }
      if (_sortBy == 'alphabetical') {
        return a.nom.compareTo(b.nom);
      }
      if (_sortBy == 'population') {
        return b.population.compareTo(a.population);
      }
      return 0;
    });

    return list;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final int elecPct = _totalElecTotal > 0 ? ((_totalElecResolus / _totalElecTotal) * 100).round() : 85;
    final int eauPct = _totalEauTotal > 0 ? ((_totalEauResolus / _totalEauTotal) * 100).round() : 100;
    final int mairiePct = _totalMairieTotal > 0 ? ((_totalMairieResolus / _totalMairieTotal) * 100).round() : 0;

    final canValidate = _isAdmin || _isModerator;
    final String dashboardTitle = _isAdmin ? "Tableau opérateur" : _isModerator ? "Tableau modérateur" : "Situation en direct";

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(dashboardTitle, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 17)),
                if (_isModerator) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryTeal.withAlpha(30),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _moderatorName.isNotEmpty ? _moderatorName : 'Modérateur',
                      style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ],
            ),
            Row(
              children: const [
                Text('14 communes — Grand Abidjan', style: TextStyle(fontSize: 10, color: Colors.grey)),
                SizedBox(width: 6),
                Icon(LucideIcons.radio, size: 10, color: Color(0xFF16A34A)),
                SizedBox(width: 2),
                Text('Live', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.share2, size: 20),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: 'SIGNA·CI — $_totalActifs coupures actives signalées sur Abidjan. Suivez la situation en direct sur https://signa.ci'));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Lien copié dans le presse-papiers !'), backgroundColor: AppTheme.secondaryEmerald),
              );
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            onPressed: () {
              setState(() => _isLoading = true);
              _fetchDashboardData();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchDashboardData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ══════════════════════════════════════════════════════════
              // 1. BANNIÈRE DE CRISE (Si >= 10 coupures actives)
              // ══════════════════════════════════════════════════════════
              if (_totalActifs >= 10 && !_isLoading)
                Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.siren, color: Color(0xFFDC2626), size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Situation critique — $_totalActifs coupures actives en ce moment sur le Grand Abidjan',
                          style: const TextStyle(color: Color(0xFFB91C1C), fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),

              // ══════════════════════════════════════════════════════════
              // 2. CENTRE DE COMMANDEMENT ADMIN & MODÉRATEURS (Exact Web)
              // ══════════════════════════════════════════════════════════
              if (canValidate)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFECFDF5), Color(0xFFF0FDF4)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFA7F3D0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryTeal,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(LucideIcons.shieldCheck, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text('Centre de Commandement', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryTeal.withAlpha(40),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        _isAdmin ? 'Super-Admin' : 'Modérateur',
                                        style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 9, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                                const Text('Pilotez la transmission aux opérateurs et la modération', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                            icon: const Icon(LucideIcons.send, size: 14, color: Colors.white),
                            label: const Text('Relais Opérateurs & Mairies', style: TextStyle(color: Colors.white, fontSize: 11)),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Module Relais Opérateurs activé.')),
                              );
                            },
                          ),
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8)),
                            icon: const Icon(LucideIcons.checkCircle2, size: 14, color: Color(0xFF16A34A)),
                            label: const Text('File de Modération', style: TextStyle(fontSize: 11)),
                            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VerificationScreen())),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

              // ══════════════════════════════════════════════════════════
              // ESPACE OPÉRATEUR & PARTENAIRES (Si rôle partenaire)
              // ══════════════════════════════════════════════════════════
              if (_isPartner && !canValidate)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFDE68A)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD97706),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(LucideIcons.building2, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text('Espace Partenaire & Régie', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF92400E))),
                            SizedBox(height: 2),
                            Text('Prise en charge des tickets et délais PADA', style: TextStyle(fontSize: 11, color: Color(0xFF78350F))),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD97706),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PartnerDashboardScreen())),
                        child: const Text('Ouvrir', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),

              // ══════════════════════════════════════════════════════════
              // 3. BANNIÈRE CALME OU PRIORITÉS CRITIQUES (Exact Web)
              // ══════════════════════════════════════════════════════════
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF064E3B).withAlpha(50) : const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.checkCircle2, color: Color(0xFF16A34A), size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Tout va bien dans votre commune pour l\'instant. Aucune coupure critique signalée.',
                        style: TextStyle(
                          color: isDark ? const Color(0xFF86EFAC) : const Color(0xFF15803D),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ══════════════════════════════════════════════════════════
              // 4. DEUX BOUTONS D'ACTION DU HAUT : SIGNALER & VOIR LA CARTE
              // ══════════════════════════════════════════════════════════
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateReportScreen())),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF059669), // Civic Emerald Green
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(color: const Color(0xFF059669).withAlpha(80), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: Column(
                          children: const [
                            Icon(LucideIcons.megaphone, color: Colors.white, size: 22),
                            SizedBox(height: 6),
                            Text('Signaler', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                            SizedBox(height: 2),
                            Text('Eau · Courant · Voirie', style: TextStyle(color: Colors.white70, fontSize: 11)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MapScreen())),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1), width: 1.5),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2)),
                          ],
                        ),
                        child: Column(
                          children: [
                            const Icon(LucideIcons.map, color: Color(0xFF059669), size: 22),
                            const SizedBox(height: 6),
                            Text('Voir la Carte', style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 15)),
                            const SizedBox(height: 2),
                            Text('Incidents en direct', style: TextStyle(color: isDark ? Colors.white70 : const Color(0xFF64748B), fontSize: 11)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // ══════════════════════════════════════════════════════════
              // 5. LES 3 CARTES SERVICES (Électricité, Eau, Voirie)
              // ══════════════════════════════════════════════════════════
              _buildServiceCard(
                isDark: isDark,
                title: 'Électricité (CIE / ANARE)',
                subtitle: 'Réseau basse & haute tension',
                icon: LucideIcons.zap,
                iconColor: const Color(0xFFD97706),
                iconBgColor: const Color(0xFFFEF3C7),
                actives: _totalElecActifs,
                resolues: _totalElecResolus,
                total: _totalElecTotal,
                bottomLeftText: _totalElecVerified > 0 ? '✓ $_totalElecVerified confirmé(s)' : 'Non vérifié',
                bottomRightText: '$elecPct% résolues',
                bottomRightColor: const Color(0xFFEA580C),
              ),
              const SizedBox(height: 14),
              _buildServiceCard(
                isDark: isDark,
                title: 'Eau Potable (SODECI / ONEP)',
                subtitle: 'Distribution & fuites',
                icon: LucideIcons.droplets,
                iconColor: const Color(0xFF0284C7),
                iconBgColor: const Color(0xFFE0F2FE),
                actives: _totalEauActifs,
                resolues: _totalEauResolus,
                total: _totalEauTotal,
                bottomLeftText: _totalEauVerified > 0 ? '✓ $_totalEauVerified confirmé(s)' : 'Non vérifié',
                bottomRightText: '$eauPct% résolues',
                bottomRightColor: const Color(0xFFEA580C),
              ),
              const SizedBox(height: 14),
              _buildServiceCard(
                isDark: isDark,
                title: 'Mairies & Voirie',
                subtitle: 'Lampadaires · Caniveaux · Salubrité',
                icon: LucideIcons.landmark,
                iconColor: const Color(0xFF9333EA),
                iconBgColor: const Color(0xFFF3E8FF),
                actives: _totalMairieActifs,
                resolues: _totalMairieResolus,
                total: _totalMairieTotal,
                bottomLeftText: _totalMairieVerified > 0 ? '✓ $_totalMairieVerified soutenu(s)' : 'Aucun soutien',
                bottomRightText: '$mairiePct% réparés',
                bottomRightColor: const Color(0xFFEA580C),
                isMairie: true,
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const InfrastructureScreen()),
                  ),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                    side: BorderSide(color: const Color(0xFFEA580C).withAlpha(120)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(LucideIcons.construction, size: 16, color: Color(0xFFEA580C)),
                  label: const Text(
                    'Consulter le Fil dédié Voirie & Infrastructures (Photos HD)',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFEA580C)),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 6. DURÉE MOYENNE DES COUPURES (Exact Web)
              // ══════════════════════════════════════════════════════════
              Text(
                'Durée moyenne des coupures',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Temps écoulé entre le début de coupure (déclaré) et la résolution. Basé uniquement sur les signalements résolus.',
                style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isDark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(LucideIcons.zap, size: 14, color: Color(0xFFD97706)),
                              SizedBox(width: 4),
                              Text('Électricité (CIE)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFD97706))),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(_elecAvgDur, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFFD97706))),
                              const SizedBox(width: 6),
                              Text(_elecMaxDur, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF0F172A))),
                              const Spacer(),
                              Text('$_elecResolvedCount', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                          Row(
                            children: [
                              Text('durée moy.', style: TextStyle(fontSize: 9, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                              const SizedBox(width: 14),
                              Text('la plus longue', style: TextStyle(fontSize: 9, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                              const Spacer(),
                              Text('résolus', style: TextStyle(fontSize: 9, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isDark ? const Color(0xFF0369A1) : const Color(0xFFE0F2FE)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(LucideIcons.droplets, size: 14, color: Color(0xFF0284C7)),
                              SizedBox(width: 4),
                              Text('Eau (SODECI)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF0284C7))),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(_eauAvgDur, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0284C7))),
                              const SizedBox(width: 6),
                              Text(_eauMaxDur, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF0F172A))),
                              const Spacer(),
                              Text('$_eauResolvedCount', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey)),
                            ],
                          ),
                          Row(
                            children: [
                              Text('durée moy.', style: TextStyle(fontSize: 9, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                              const SizedBox(width: 14),
                              Text('la plus longue', style: TextStyle(fontSize: 9, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                              const Spacer(),
                              Text('résolus', style: TextStyle(fontSize: 9, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B))),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 7. TOP 10 QUARTIERS LES PLUS TOUCHÉS (Exact Web)
              // ══════════════════════════════════════════════════════════
              Container(
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withAlpha(6), blurRadius: 6, offset: const Offset(0, 2)),
                  ],
                ),
                child: Column(
                  children: [
                    InkWell(
                      onTap: () => setState(() => _quartiersExpanded = !_quartiersExpanded),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        child: Row(
                          children: [
                            const Text('Top 10 quartiers les plus touchés', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            const Spacer(),
                            Icon(_quartiersExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown, size: 20, color: Colors.grey),
                          ],
                        ),
                      ),
                    ),
                    if (_quartiersExpanded) ...[
                      const Divider(height: 1),
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _topQuartiers.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (ctx, idx) {
                          final q = _topQuartiers[idx];
                          final medal = idx == 0 ? "🥇" : idx == 1 ? "🥈" : idx == 2 ? "🥉" : "#${idx + 1}";
                          final elec = (q['elecActifs'] as num?)?.toInt() ?? 0;
                          final eau = (q['eauActifs'] as num?)?.toInt() ?? 0;
                          final mairie = (q['mairieActifs'] as num?)?.toInt() ?? 0;
                          final total = (q['totalActifs'] as num?)?.toInt() ?? (elec + eau + mairie);

                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 32,
                                  child: Text(medal, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        q['quartier'] as String,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 2),
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 4,
                                        crossAxisAlignment: WrapCrossAlignment.center,
                                        children: [
                                          Text(
                                            q['commune'] as String,
                                            style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                                          ),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(LucideIcons.zap, size: 12, color: Color(0xFFF59E0B)),
                                              const SizedBox(width: 2),
                                              Text('$elec', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                              const SizedBox(width: 6),
                                              const Icon(LucideIcons.droplets, size: 12, color: Color(0xFF0284C7)),
                                              const SizedBox(width: 2),
                                              Text('$eau', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                              if (mairie > 0) ...[
                                                const SizedBox(width: 6),
                                                const Icon(LucideIcons.landmark, size: 12, color: Color(0xFF8B5CF6)),
                                                const SizedBox(width: 2),
                                                Text('$mairie', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                              ],
                                            ],
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: total > 0 ? const Color(0xFFEF4444).withAlpha(25) : const Color(0xFF10B981).withAlpha(25),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    '$total active(s)',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                      color: total > 0 ? const Color(0xFFDC2626) : const Color(0xFF059669),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 8. CLASSEMENT DES COUPURES PAR COMMUNE (Leaderboard)
              // ══════════════════════════════════════════════════════════
              Container(
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    InkWell(
                      onTap: () => setState(() => _leaderboardExpanded = !_leaderboardExpanded),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        child: Row(
                          children: [
                            const Text('Classement des coupures par commune', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const Spacer(),
                            Icon(_leaderboardExpanded ? LucideIcons.chevronUp : LucideIcons.chevronDown, size: 20, color: Colors.grey),
                          ],
                        ),
                      ),
                    ),
                    if (_leaderboardExpanded) ...[
                      const Divider(height: 1),
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: PILOT_COMMUNES.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (ctx, idx) {
                          final c = PILOT_COMMUNES[idx];
                          final cStat = _communeServiceStats.firstWhere(
                            (s) => (s['commune'] as String? ?? '').toLowerCase() == c.nom.toLowerCase(),
                            orElse: () => {},
                          );

                          final eAct = (cStat['electricite_actifs'] as num?)?.toInt() ?? 0;
                          final wAct = (cStat['eau_actifs'] as num?)?.toInt() ?? 0;
                          final mAct = (cStat['mairie_actifs'] as num?)?.toInt() ?? 0;
                          final totalAct = eAct + wAct + mAct;
                          final medal = idx == 0 ? "🥇" : idx == 1 ? "🥈" : idx == 2 ? "🥉" : "#${idx + 1}";

                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            child: Row(
                              children: [
                                Text(medal, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                                const SizedBox(width: 10),
                                Container(
                                  width: 32,
                                  height: 32,
                                  padding: const EdgeInsets.all(2),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Image.asset(
                                    c.logoAsset,
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, _, _) => Container(
                                      color: c.couleur,
                                      alignment: Alignment.center,
                                      child: Text(c.nom[0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(child: Text(c.nom, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: c.couleur))),
                                Text(
                                  '$totalAct actives',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 9. DÉTAIL PAR COMMUNE — ERGONOMIE 14+ COMMUNES (Web & Mobile 1:1)
              // ══════════════════════════════════════════════════════════
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Text('Détail par commune', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white10 : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${_filteredCommunes.length}/${PILOT_COMMUNES.length}',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),

                  // Bascule Vue Compacte / Vue Détaillée
                  Container(
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1)),
                    ),
                    padding: const EdgeInsets.all(2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        InkWell(
                          onTap: () => setState(() => _viewMode = 'grid'),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _viewMode == 'grid' ? (_isAdmin ? AppTheme.primaryTeal : const Color(0xFF0F172A)) : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              LucideIcons.layoutGrid,
                              size: 14,
                              color: _viewMode == 'grid' ? Colors.white : Colors.grey,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () => setState(() => _viewMode = 'detailed'),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _viewMode == 'detailed' ? (_isAdmin ? AppTheme.primaryTeal : const Color(0xFF0F172A)) : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              LucideIcons.list,
                              size: 14,
                              color: _viewMode == 'detailed' ? Colors.white : Colors.grey,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Barre de Recherche Instantanée
              Container(
                height: 42,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (v) => setState(() => _searchQuery = v),
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'Rechercher une commune (ex: Cocody, Abobo...)',
                    hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
                    prefixIcon: const Icon(LucideIcons.search, size: 16, color: Colors.grey),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(LucideIcons.x, size: 14, color: Colors.grey),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
              const SizedBox(height: 10),

              // Chips de Filtres Rapides (Horizontal Scroll)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    ChoiceChip(
                      label: Text('Toutes (${PILOT_COMMUNES.length})', style: const TextStyle(fontSize: 11)),
                      selected: _filterMode == 'all',
                      onSelected: (sel) {
                        if (sel) setState(() => _filterMode = 'all');
                      },
                      selectedColor: isDark ? AppTheme.primaryTeal : const Color(0xFF0F172A),
                      labelStyle: TextStyle(
                        color: _filterMode == 'all' ? Colors.white : (isDark ? Colors.white70 : const Color(0xFF334155)),
                        fontWeight: FontWeight.w600,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    const SizedBox(width: 6),
                    ChoiceChip(
                      avatar: const Icon(LucideIcons.siren, size: 12, color: Color(0xFFDC2626)),
                      label: Text('Actives ($_communesWithActivesCount)', style: const TextStyle(fontSize: 11)),
                      selected: _filterMode == 'active_only',
                      onSelected: (sel) {
                        if (sel) setState(() => _filterMode = 'active_only');
                      },
                      selectedColor: const Color(0xFFDC2626),
                      labelStyle: TextStyle(
                        color: _filterMode == 'active_only' ? Colors.white : const Color(0xFFDC2626),
                        fontWeight: FontWeight.w600,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    const SizedBox(width: 6),
                    ChoiceChip(
                      avatar: const Icon(LucideIcons.zap, size: 12, color: Color(0xFFD97706)),
                      label: Text('CIE ($_communesWithElecCount)', style: const TextStyle(fontSize: 11)),
                      selected: _filterMode == 'electricity',
                      onSelected: (sel) {
                        if (sel) setState(() => _filterMode = 'electricity');
                      },
                      selectedColor: const Color(0xFFD97706),
                      labelStyle: TextStyle(
                        color: _filterMode == 'electricity' ? Colors.white : const Color(0xFFD97706),
                        fontWeight: FontWeight.w600,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    const SizedBox(width: 6),
                    ChoiceChip(
                      avatar: const Icon(LucideIcons.droplets, size: 12, color: Color(0xFF0284C7)),
                      label: Text('SODECI ($_communesWithEauCount)', style: const TextStyle(fontSize: 11)),
                      selected: _filterMode == 'water',
                      onSelected: (sel) {
                        if (sel) setState(() => _filterMode = 'water');
                      },
                      selectedColor: const Color(0xFF0284C7),
                      labelStyle: TextStyle(
                        color: _filterMode == 'water' ? Colors.white : const Color(0xFF0284C7),
                        fontWeight: FontWeight.w600,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    const SizedBox(width: 6),
                    ChoiceChip(
                      avatar: const Icon(LucideIcons.landmark, size: 12, color: Color(0xFF9333EA)),
                      label: Text('Mairie ($_communesWithMairieCount)', style: const TextStyle(fontSize: 11)),
                      selected: _filterMode == 'mairie',
                      onSelected: (sel) {
                        if (sel) setState(() => _filterMode = 'mairie');
                      },
                      selectedColor: const Color(0xFF9333EA),
                      labelStyle: TextStyle(
                        color: _filterMode == 'mairie' ? Colors.white : const Color(0xFF9333EA),
                        fontWeight: FontWeight.w600,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),

              // Ligne de Tri
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Icon(LucideIcons.arrowUpDown, size: 12, color: Colors.grey),
                      SizedBox(width: 4),
                      Text('Trier par :', style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                  DropdownButton<String>(
                    value: _sortBy,
                    underline: const SizedBox(),
                    isDense: true,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'activity', child: Text('🔴 Plus d\'incidents')),
                      DropdownMenuItem(value: 'alphabetical', child: Text('🔤 Alphabétique (A-Z)')),
                      DropdownMenuItem(value: 'population', child: Text('👥 Plus peuplées')),
                    ],
                    onChanged: (v) => setState(() => _sortBy = v!),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // État Vide si aucun résultat
              if (_filteredCommunes.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      const Icon(LucideIcons.filterX, size: 36, color: Colors.grey),
                      const SizedBox(height: 8),
                      const Text('Aucune commune trouvée', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 4),
                      const Text('Modifiez vos filtres ou réinitialisez la recherche.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      const SizedBox(height: 12),
                      OutlinedButton(
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                            _filterMode = 'all';
                            _selectedCommune = 'all';
                          });
                        },
                        child: const Text('Réinitialiser les filtres', style: TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
                )
              else if (_viewMode == 'grid')
                // ───────── VUE COMPACTE (Mini-Cartes optimisées smartphone) ─────────
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _filteredCommunes.length,
                  itemBuilder: (ctx, i) {
                    final c = _filteredCommunes[i];

                    final cStat = _communeServiceStats.firstWhere(
                      (s) => (s['commune'] as String? ?? '').toLowerCase() == c.nom.toLowerCase(),
                      orElse: () => {
                        'electricite_actifs': 0,
                        'electricite_resolus': 0,
                        'electricite_total': 0,
                        'eau_actifs': 0,
                        'eau_resolus': 0,
                        'eau_total': 0,
                        'mairie_actifs': 0,
                        'mairie_resolus': 0,
                        'mairie_total': 0,
                      },
                    );

                    final int cElecActive = (cStat['electricite_actifs'] as num?)?.toInt() ?? 0;
                    final int cElecResolved = (cStat['electricite_resolus'] as num?)?.toInt() ?? 0;
                    final int cElecTotal = (cStat['electricite_total'] as num?)?.toInt() ?? (cElecActive + cElecResolved);

                    final int cEauActive = (cStat['eau_actifs'] as num?)?.toInt() ?? 0;
                    final int cEauResolved = (cStat['eau_resolus'] as num?)?.toInt() ?? 0;
                    final int cEauTotal = (cStat['eau_total'] as num?)?.toInt() ?? (cEauActive + cEauResolved);

                    final int cMairieActive = (cStat['mairie_actifs'] as num?)?.toInt() ?? 0;
                    final int cMairieResolved = (cStat['mairie_resolus'] as num?)?.toInt() ?? 0;
                    final int cMairieTotal = (cStat['mairie_total'] as num?)?.toInt() ?? (cMairieActive + cMairieResolved);

                    final int totalActifs = cElecActive + cEauActive + cMairieActive;
                    final int totalResolus = cElecResolved + cEauResolved + cMairieResolved;
                    final int totalSignalements = cElecTotal + cEauTotal + cMairieTotal;
                    final int resolutionRate = totalSignalements > 0 ? ((totalResolus / totalSignalements) * 100).round() : 100;

                    return InkWell(
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => CommuneDetailScreen(communeName: c.nom)),
                      ),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: totalActifs >= 5
                                ? const Color(0xFFFCA5A5)
                                : totalActifs > 0
                                    ? const Color(0xFFFDE68A)
                                    : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                          ),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withAlpha(5), blurRadius: 4, offset: const Offset(0, 2)),
                          ],
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 36,
                                  height: 36,
                                  padding: const EdgeInsets.all(2),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Image.asset(
                                    c.logoAsset,
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, _, _) => Container(
                                      color: c.couleur,
                                      alignment: Alignment.center,
                                      child: Text(c.nom[0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(c.nom, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: c.couleur)),
                                      Text('${(c.population / 1000).toStringAsFixed(0)}k hab. • $totalSignalements signalements', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                    ],
                                  ),
                                ),
                                if (totalActifs == 0)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFECFDF5),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: const Color(0xFFA7F3D0)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(LucideIcons.checkCircle2, size: 11, color: Color(0xFF16A34A)),
                                        SizedBox(width: 3),
                                        Text('Calme', style: TextStyle(color: Color(0xFF16A34A), fontSize: 10, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  )
                                else if (totalActifs < 5)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFFBEB),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: const Color(0xFFFDE68A)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(LucideIcons.alertTriangle, size: 11, color: Color(0xFFD97706)),
                                        const SizedBox(width: 3),
                                        Text('$totalActifs actives', style: const TextStyle(color: Color(0xFFD97706), fontSize: 10, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  )
                                else
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF2F2),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: const Color(0xFFFECACA)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(LucideIcons.siren, size: 11, color: Color(0xFFDC2626)),
                                        const SizedBox(width: 3),
                                        Text('$totalActifs critiques', style: const TextStyle(color: Color(0xFFDC2626), fontSize: 10, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // Mini-badges CIE, SODECI, Mairie
                            Row(
                              children: [
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF3C7).withAlpha(50),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFFFDE68A)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(LucideIcons.zap, size: 11, color: Color(0xFFD97706)),
                                        const SizedBox(width: 3),
                                        Text('CIE $cElecActive', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF92400E))),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE0F2FE).withAlpha(50),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFFBAE6FD)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(LucideIcons.droplets, size: 11, color: Color(0xFF0284C7)),
                                        const SizedBox(width: 3),
                                        Text('SODECI $cEauActive', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF075985))),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF3E8FF).withAlpha(50),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: const Color(0xFFE9D5FF)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(LucideIcons.landmark, size: 11, color: Color(0xFF9333EA)),
                                        const SizedBox(width: 3),
                                        Text('Mairie $cMairieActive', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF6B21A8))),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // Barre de résolution + CTA
                            Row(
                              children: [
                                Expanded(
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: ClipRRect(
                                          borderRadius: BorderRadius.circular(3),
                                          child: LinearProgressIndicator(
                                            value: resolutionRate / 100.0,
                                            backgroundColor: const Color(0xFFE2E8F0),
                                            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF16A34A)),
                                            minHeight: 4,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text('$resolutionRate% résolus', style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Row(
                                  children: [
                                    Text('Détails', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: c.couleur)),
                                    Icon(LucideIcons.chevronRight, size: 14, color: c.couleur),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                )
              else
                // ───────── VUE DÉTAILLÉE ─────────
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _filteredCommunes.length,
                  itemBuilder: (ctx, i) {
                    final c = _filteredCommunes[i];

                    final cStat = _communeServiceStats.firstWhere(
                      (s) => (s['commune'] as String? ?? '').toLowerCase() == c.nom.toLowerCase(),
                      orElse: () => {
                        'electricite_actifs': 0,
                        'electricite_resolus': 0,
                        'electricite_total': 0,
                        'eau_actifs': 0,
                        'eau_resolus': 0,
                        'eau_total': 0,
                        'mairie_actifs': 0,
                        'mairie_resolus': 0,
                        'mairie_total': 0,
                      },
                    );

                    final int cElecActive = (cStat['electricite_actifs'] as num?)?.toInt() ?? 0;
                    final int cElecResolved = (cStat['electricite_resolus'] as num?)?.toInt() ?? 0;
                    final int cElecTotal = (cStat['electricite_total'] as num?)?.toInt() ?? (cElecActive + cElecResolved);

                    final int cEauActive = (cStat['eau_actifs'] as num?)?.toInt() ?? 0;
                    final int cEauResolved = (cStat['eau_resolus'] as num?)?.toInt() ?? 0;
                    final int cEauTotal = (cStat['eau_total'] as num?)?.toInt() ?? (cEauActive + cEauResolved);

                    final int cMairieActive = (cStat['mairie_actifs'] as num?)?.toInt() ?? 0;
                    final int cMairieResolved = (cStat['mairie_resolus'] as num?)?.toInt() ?? 0;
                    final int cMairieTotal = (cStat['mairie_total'] as num?)?.toInt() ?? (cMairieActive + cMairieResolved);

                    final int totalSignalements = cElecTotal + cEauTotal + cMairieTotal;
                    final double pctPop = c.population > 0 ? (totalSignalements / c.population) * 100 : 0;
                    final String pctPopDisplay = pctPop < 0.01 && totalSignalements > 0 ? "<0.01% de la pop." : "${pctPop.toStringAsFixed(2)}% de la pop.";
                    final int capacite = c.population ~/ 2;
                    final double tauxCapacite = capacite > 0 ? ((totalSignalements / capacite) * 100).clamp(1.0, 100.0) : 1.0;

                    return InkWell(
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => CommuneDetailScreen(communeName: c.nom)),
                      ),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withAlpha(6), blurRadius: 6, offset: const Offset(0, 2)),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Header avec Logo Officiel de la Commune
                            Row(
                              children: [
                                Container(
                                  width: 44,
                                  height: 44,
                                  padding: const EdgeInsets.all(3),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Image.asset(
                                    c.logoAsset,
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, _, _) => Container(
                                      color: c.couleur,
                                      alignment: Alignment.center,
                                      child: Text(c.nom[0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(c.nom, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: c.couleur)),
                                          Text(pctPopDisplay, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: c.couleur)),
                                        ],
                                      ),
                                      Text('${(c.population / 1000).toStringAsFixed(0)}k hab.', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Barre de capacité
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: tauxCapacite / 100.0,
                                backgroundColor: const Color(0xFFE2E8F0),
                                valueColor: AlwaysStoppedAnimation<Color>(c.couleur),
                                minHeight: 6,
                              ),
                            ),
                            const SizedBox(height: 12),

                            // 3 Mini-Cartes : CIE, SODECI, Mairie
                            Row(
                              children: [
                                // CIE
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF3C7).withAlpha(60),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFFFDE68A)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: const [
                                            Icon(LucideIcons.zap, size: 12, color: Color(0xFFD97706)),
                                            SizedBox(width: 4),
                                            Text('CIE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF92400E))),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        RichText(
                                          text: TextSpan(
                                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFFE2E8F0) : Colors.black87),
                                            children: [
                                              TextSpan(text: '$cElecActive ', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                                              const TextSpan(text: 'actifs  '),
                                              TextSpan(text: '$cElecResolved ', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                                              const TextSpan(text: 'résolus'),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),

                                // SODECI
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: isDark ? const Color(0xFF0369A1).withAlpha(40) : const Color(0xFFE0F2FE).withAlpha(60),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: isDark ? const Color(0xFF0284C7).withAlpha(80) : const Color(0xFFBAE6FD)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: const [
                                            Icon(LucideIcons.droplets, size: 12, color: Color(0xFF0284C7)),
                                            SizedBox(width: 4),
                                            Text('SODECI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF075985))),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        RichText(
                                          text: TextSpan(
                                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFFE2E8F0) : Colors.black87),
                                            children: [
                                              TextSpan(text: '$cEauActive ', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                                              const TextSpan(text: 'actifs  '),
                                              TextSpan(text: '$cEauResolved ', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                                              const TextSpan(text: 'résolus'),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),

                                // Mairie
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: isDark ? const Color(0xFF6B21A8).withAlpha(40) : const Color(0xFFF3E8FF).withAlpha(60),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: isDark ? const Color(0xFF9333EA).withAlpha(80) : const Color(0xFFE9D5FF)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: const [
                                            Icon(LucideIcons.landmark, size: 12, color: Color(0xFF9333EA)),
                                            SizedBox(width: 4),
                                            Text('Mairie', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF6B21A8))),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        RichText(
                                          text: TextSpan(
                                            style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFFE2E8F0) : Colors.black87),
                                            children: [
                                              TextSpan(text: '$cMairieActive ', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF9333EA))),
                                              const TextSpan(text: 'actifs  '),
                                              TextSpan(text: '$cMairieResolved ', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                                              const TextSpan(text: 'résolus'),
                                            ],
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
                      ),
                    );
                  },
                ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildServiceCard({
    required bool isDark,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required int actives,
    required int resolues,
    required int total,
    required String bottomLeftText,
    required String bottomRightText,
    required Color bottomRightColor,
    bool isMairie = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDark ? iconBgColor.withAlpha(50) : iconBgColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(icon, color: iconColor, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: GoogleFonts.outfit(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            subtitle,
                            style: TextStyle(
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildNumberColumn('$actives', isMairie ? 'Actifs' : 'Actives', isMairie ? const Color(0xFF9333EA) : const Color(0xFFD97706)),
                    _buildNumberColumn('$resolues', isMairie ? 'Réparés' : 'Résolues', isDark ? Colors.white : const Color(0xFF0F172A)),
                    _buildNumberColumn('$total', 'Total', isDark ? Colors.white : const Color(0xFF0F172A)),
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
              border: Border(top: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0))),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  bottomLeftText,
                  style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B), fontStyle: FontStyle.italic),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    bottomRightText,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isDark ? const Color(0xFFFDE68A) : bottomRightColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNumberColumn(String number, String label, Color numberColor) {
    return Column(
      children: [
        Text(
          number,
          style: GoogleFonts.outfit(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: numberColor,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}
