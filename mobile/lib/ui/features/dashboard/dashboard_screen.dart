import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/repositories/report_repository.dart';
import '../../../domain/models/report_model.dart';
import '../reports/report_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ReportRepository _repo = ReportRepository();
  List<ReportModel> _reports = [];
  bool _isLoading = true;
  RealtimeChannel? _realtimeChannel;

  int _elecOutages = 0;
  int _waterOutages = 0;
  int _infraCount = 0;

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
          callback: (payload) {
            _loadDashboardData();
          },
        )
        .subscribe();
  }

  Future<void> _loadDashboardData() async {
    try {
      final list = await _repo.fetchReports(limit: 50);
      int elec = 0;
      int water = 0;
      int infra = 0;

      for (var r in list) {
        if (r.status != 'resolved') {
          if (r.serviceType == 'electricity' || r.reportCategory == 'outage' && r.serviceType.contains('elec')) {
            elec++;
          } else if (r.serviceType == 'water' || r.reportCategory == 'outage' && r.serviceType.contains('eau')) {
            water++;
          }
          if (r.reportCategory == 'infrastructure') {
            infra++;
          }
        }
      }

      if (mounted) {
        setState(() {
          _reports = list;
          _elecOutages = elec;
          _waterOutages = water;
          _infraCount = infra;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Tableau de Bord Citoyen',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
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
              // ── TICKER DE DÉFILLEMENT LIVE ──
              Container(
                width: double.infinity,
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
                          Text(
                            'LIVE',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '⚡ Électricité: $_elecOutages pannes actives · 💧 Eau: $_waterOutages coupures en cours',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // ── CARTES KPI RESEAUX ──
              Row(
                children: [
                  Expanded(
                    child: _buildKpiCard(
                      title: '⚡ Électricité CIE',
                      count: '$_elecOutages actives',
                      subtitle: 'Temps moyen: 5j',
                      color: AppTheme.amberAccent,
                      icon: LucideIcons.zap,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildKpiCard(
                      title: '💧 Eau SODECI',
                      count: '$_waterOutages coupures',
                      subtitle: 'Temps moyen: 4j',
                      color: Colors.blue,
                      icon: LucideIcons.droplet,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // ── EN-TÊTE FIL INFRASTRUCTURE ──
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Fil des Signalements ($_infraCount infra)',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton.icon(
                    onPressed: _loadDashboardData,
                    icon: const Icon(LucideIcons.rotateCw, size: 14),
                    label: const Text('Actualiser'),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // ── RENDER FEED DE SIGNALEMENTS ──
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32.0),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (_reports.isEmpty)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Center(
                    child: Text(
                      'Aucun signalement récent.',
                      style: TextStyle(color: Colors.grey),
                    ),
                  ),
                )
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _reports.length,
                  separatorBuilder: (ctx, i) => const SizedBox(height: 12),
                  itemBuilder: (ctx, i) {
                    final item = _reports[i];
                    return _buildReportItemTile(context, item);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String count,
    required String subtitle,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            count,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 11, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildReportItemTile(BuildContext context, ReportModel item) {
    Color statusColor = Colors.orange;
    String statusText = 'En cours';
    if (item.status == 'resolved') {
      statusColor = AppTheme.secondaryEmerald;
      statusText = 'Résolu';
    } else if (item.verifications >= 3) {
      statusColor = Colors.blue;
      statusText = 'Confirmé par voisins';
    }

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 1,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (ctx) => ReportDetailScreen(report: item),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryTeal.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      item.reportCategory == 'outage'
                          ? LucideIcons.zap
                          : LucideIcons.construction,
                      color: AppTheme.primaryTeal,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.serviceType.toUpperCase(),
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          '${item.commune}, ${item.quartier}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              if (item.description.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  item.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13),
                ),
              ],
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(LucideIcons.users, size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        '${item.verifications} confirmation(s)',
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                  const Row(
                    children: [
                      Text(
                        'Détails',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryTeal,
                        ),
                      ),
                      SizedBox(width: 2),
                      Icon(
                        LucideIcons.chevronRight,
                        size: 14,
                        color: AppTheme.primaryTeal,
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
