import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/repositories/report_repository.dart';
import '../../../domain/models/report_model.dart';
import '../home/signa_logo.dart';
import '../reports/report_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ReportRepository _repo = ReportRepository();
  List<ReportModel> _allReports = [];
  bool _isLoading = true;
  RealtimeChannel? _realtimeChannel;

  // Filters (Exact 1:1 with Web Dashboard)
  String _selectedCommune = 'all'; // 'all' or 'Cocody', 'Yopougon', etc.
  String _selectedPeriod = 'all';  // 'all', 'today', '7d', '30d'

  final List<String> _communesList = [
    'Toutes les communes',
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
    _loadDashboardData();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  void _subscribeRealtime() {
    _realtimeChannel = Supabase.instance.client
        .channel('public:reports')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'reports',
          callback: (_) => _loadDashboardData(),
        )
        .subscribe();
  }

  Future<void> _loadDashboardData() async {
    try {
      final list = await _repo.fetchReports(limit: 100);
      if (mounted) {
        setState(() {
          _allReports = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<ReportModel> get _filteredReports {
    return _allReports.where((r) {
      // Commune filter
      if (_selectedCommune != 'all' && _selectedCommune != 'Toutes les communes') {
        if (r.commune != _selectedCommune) return false;
      }
      // Period filter
      if (_selectedPeriod != 'all') {
        final now = DateTime.now();
        final diff = now.difference(r.createdAt);
        if (_selectedPeriod == 'today' && diff.inHours > 24) return false;
        if (_selectedPeriod == '7d' && diff.inDays > 7) return false;
        if (_selectedPeriod == '30d' && diff.inDays > 30) return false;
      }
      return true;
    }).toList();
  }

  // ── Stats Calculations ──
  int get _elecTotal => _filteredReports.where((r) => r.serviceType == 'electricity' || r.serviceType == 'electricite').length;
  int get _elecActifs => _filteredReports.where((r) => (r.serviceType == 'electricity' || r.serviceType == 'electricite') && r.status != 'resolved').length;
  int get _elecResolus => _filteredReports.where((r) => (r.serviceType == 'electricity' || r.serviceType == 'electricite') && r.status == 'resolved').length;

  int get _waterTotal => _filteredReports.where((r) => r.serviceType == 'water' || r.serviceType == 'eau').length;
  int get _waterActifs => _filteredReports.where((r) => (r.serviceType == 'water' || r.serviceType == 'eau') && r.status != 'resolved').length;
  int get _waterResolus => _filteredReports.where((r) => (r.serviceType == 'water' || r.serviceType == 'eau') && r.status == 'resolved').length;

  int get _mairieTotal => _filteredReports.where((r) => r.reportCategory == 'infrastructure' || r.serviceType == 'voirie' || r.serviceType == 'salubrite').length;
  int get _mairieActifs => _filteredReports.where((r) => (r.reportCategory == 'infrastructure' || r.serviceType == 'voirie') && r.status != 'resolved').length;
  int get _mairieResolus => _filteredReports.where((r) => (r.reportCategory == 'infrastructure' || r.serviceType == 'voirie') && r.status == 'resolved').length;

  // ── Priority Reports (Calculated exactly like Web) ──
  List<ReportModel> get _priorityReports {
    final active = _filteredReports.where((r) => r.status != 'resolved').toList();
    active.sort((a, b) {
      final scoreA = (a.impactedPeople * 10) + (a.verifications * 5) + (a.urgency == 'critical' ? 50 : 20);
      final scoreB = (b.impactedPeople * 10) + (b.verifications * 5) + (b.urgency == 'critical' ? 50 : 20);
      return scoreB.compareTo(scoreA);
    });
    return active.take(5).toList();
  }

  // ── Communes Breakdown ──
  Map<String, Map<String, int>> get _communeStats {
    final Map<String, Map<String, int>> map = {};
    for (var r in _filteredReports) {
      final c = r.commune.isEmpty ? 'Inconnue' : r.commune;
      if (!map.containsKey(c)) {
        map[c] = {'total': 0, 'actifs': 0, 'resolus': 0};
      }
      map[c]!['total'] = (map[c]!['total'] ?? 0) + 1;
      if (r.status == 'resolved') {
        map[c]!['resolus'] = (map[c]!['resolus'] ?? 0) + 1;
      } else {
        map[c]!['actifs'] = (map[c]!['actifs'] ?? 0) + 1;
      }
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const SignaLogoWidget(size: 26, showSlogan: false),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            onPressed: () {
              setState(() => _isLoading = true);
              _loadDashboardData();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadDashboardData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── 1. LIVE SCROLLING TICKER ──
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.dangerRose,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Row(
                        children: [
                          Icon(LucideIcons.radio, color: Colors.white, size: 12),
                          SizedBox(width: 4),
                          Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _elecActifs + _waterActifs > 0
                            ? '⚡ $_elecActifs coupure(s) CIE · 💧 $_waterActifs coupure(s) SODECI en cours à Abidjan'
                            : '✅ Aucune coupure majeure en cours à Abidjan.',
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── 2. FILTRES COMMUNE & PÉRIODE (Comme sur Web) ──
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: DropdownButtonFormField<String>(
                      value: _selectedCommune == 'all' ? 'Toutes les communes' : _selectedCommune,
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        prefixIcon: const Icon(LucideIcons.mapPin, size: 16),
                      ),
                      items: _communesList.map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13)))).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedCommune = (val == 'Toutes les communes') ? 'all' : val!;
                        });
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 1,
                    child: DropdownButtonFormField<String>(
                      value: _selectedPeriod,
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'all', child: Text('Tout', style: TextStyle(fontSize: 13))),
                        DropdownMenuItem(value: 'today', child: Text('24h', style: TextStyle(fontSize: 13))),
                        DropdownMenuItem(value: '7d', child: Text('7j', style: TextStyle(fontSize: 13))),
                        DropdownMenuItem(value: '30d', child: Text('30j', style: TextStyle(fontSize: 13))),
                      ],
                      onChanged: (val) => setState(() => _selectedPeriod = val!),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // ── 3. CARTES KPIS SERVICES (Électricité, Eau, Mairie) ──
              Text(
                'Vue d’ensemble des Services Publics',
                style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              // Carte CIE
              _buildServiceKpiCard(
                title: 'Électricité (CIE)',
                icon: LucideIcons.zap,
                color: const Color(0xFFF59E0B),
                bgColor: const Color(0xFFFEF3C7),
                actifs: _elecActifs,
                resolus: _elecResolus,
                total: _elecTotal,
              ),
              const SizedBox(height: 10),

              // Carte SODECI
              _buildServiceKpiCard(
                title: 'Eau Potable (SODECI)',
                icon: LucideIcons.droplets,
                color: const Color(0xFF0284C7),
                bgColor: const Color(0xFFE0F2FE),
                actifs: _waterActifs,
                resolus: _waterResolus,
                total: _waterTotal,
              ),
              const SizedBox(height: 10),

              // Carte Voirie / Mairie
              _buildServiceKpiCard(
                title: 'Voirie & Salubrité (Mairies)',
                icon: LucideIcons.wrench,
                color: const Color(0xFF10B981),
                bgColor: const Color(0xFFD1FAE5),
                actifs: _mairieActifs,
                resolus: _mairieResolus,
                total: _mairieTotal,
              ),
              const SizedBox(height: 24),

              // ── 4. COUPURES PRIORITAIRES & URGENCES (Algorithme Score P) ──
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '🚨 Signalements Prioritaires',
                    style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Score P: Algorithmique',
                    style: TextStyle(color: Colors.grey[500], fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              if (_isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
              else if (_priorityReports.isEmpty)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: const Center(
                    child: Text('✅ Aucun signalement critique en attente dans cette zone !', style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                  ),
                )
              else
                ..._priorityReports.map((report) => _buildPriorityReportRow(context, report)),

              const SizedBox(height: 24),

              // ── 5. BILAN PAR COMMUNE D'ABIDJAN ──
              Text(
                '📍 Répartition par Commune',
                style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              ..._communeStats.entries.map((entry) {
                final communeName = entry.key;
                final data = entry.value;
                final total = data['total'] ?? 0;
                final actifs = data['actifs'] ?? 0;
                final resolus = data['resolus'] ?? 0;
                final double resolutionRate = total > 0 ? (resolus / total) : 0.0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(communeName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          Text('🔴 $actifs actifs · ✅ $resolus résolus', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: resolutionRate,
                          backgroundColor: Colors.grey[200],
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.secondaryEmerald),
                          minHeight: 6,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildServiceKpiCard({
    required String title,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required int actifs,
    required int resolus,
    required int total,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 10),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
              const Spacer(),
              Text('$total total', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildKpiNumber('🔴 Actifs', '$actifs', const Color(0xFFDC2626)),
              Container(height: 24, width: 1, color: Colors.grey[200]),
              _buildKpiNumber('✅ Résolus', '$resolus', const Color(0xFF16A34A)),
              Container(height: 24, width: 1, color: Colors.grey[200]),
              _buildKpiNumber('📈 Taux', total > 0 ? '${((resolus / total) * 100).round()}%' : '0%', AppTheme.primaryTeal),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiNumber(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
      ],
    );
  }

  Widget _buildPriorityReportRow(BuildContext context, ReportModel report) {
    final isElec = report.serviceType == 'electricity' || report.serviceType == 'electricite';
    final priorityScore = (report.impactedPeople * 10) + (report.verifications * 5) + (report.urgency == 'critical' ? 50 : 20);

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ReportDetailScreen(report: report)),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border(left: BorderSide(color: report.alertColor, width: 4)),
          boxShadow: [
            BoxShadow(color: Colors.black.withAlpha(10), blurRadius: 6, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: report.alertColor.withAlpha(20),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('Priorité P: $priorityScore', style: TextStyle(color: report.alertColor, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 8),
                Text(
                  '⏱️ ${report.elapsedFormatted}',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                ),
                const Spacer(),
                Text(
                  report.commune,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              report.description.isEmpty ? 'Coupure signalée à ${report.location}' : report.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(isElec ? LucideIcons.zap : LucideIcons.droplets, size: 14, color: isElec ? const Color(0xFFF59E0B) : const Color(0xFF0284C7)),
                const SizedBox(width: 4),
                Text(report.quartier.isEmpty ? report.location : report.quartier, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                const Spacer(),
                Text('👤 ${report.impactedPeople} impacté(s) · ✓ ${report.verifications} vérif.', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF16A34A))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
