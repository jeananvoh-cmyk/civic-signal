import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';

class VerificationScreen extends ConsumerStatefulWidget {
  const VerificationScreen({super.key});

  @override
  ConsumerState<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends ConsumerState<VerificationScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;

  // 1. My Active Reports
  List<ReportModel> _myReports = [];

  // 2. Neighbor Reports to verify
  List<ReportModel> _neighborReports = [];
  String _selectedCommune = 'all';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchVerificationData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchVerificationData() async {
    setState(() => _isLoading = true);
    final user = Supabase.instance.client.auth.currentUser;

    try {
      final supabase = Supabase.instance.client;

      // 1. My active reports
      if (user != null) {
        final myRes = await supabase
            .from('reports')
            .select()
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', ascending: false);

        if (myRes is List) {
          _myReports = (myRes as List).map((e) => ReportModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
        }
      }

      // 2. Neighbor reports needing corroboration
      final neighborRes = await supabase
          .from('reports')
          .select()
          .eq('status', 'active')
          .order('created_at', ascending: false)
          .limit(30);

      if (neighborRes is List) {
        final all = (neighborRes as List).map((e) => ReportModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
        _neighborReports = user != null ? all.where((r) => r.userId != user.id).toList() : all;
      }

      if (mounted) setState(() => _isLoading = false);
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _corroborate(String reportId) async {
    try {
      await Supabase.instance.client.rpc('corroborate_report', params: {'p_report_id': reportId});
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ Merci pour votre confirmation citoyenne !'), backgroundColor: AppTheme.secondaryEmerald),
      );
      _fetchVerificationData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  Future<void> _markResolved(ReportModel report) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Confirmer le rétablissement'),
        content: Text('Confirmez-vous que le service (${report.serviceType}) est désormais rétabli à ${report.commune} ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Oui, c\'est rétabli', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await Supabase.instance.client
            .from('reports')
            .update({'status': 'resolved', 'resolved_at': DateTime.now().toIso8601String()})
            .eq('id', report.id);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✓ Signalement marqué comme résolu !'), backgroundColor: AppTheme.secondaryEmerald),
        );
        _fetchVerificationData();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    }
  }

  Future<void> _relaunchReport(ReportModel report) async {
    try {
      await Supabase.instance.client
          .from('reports')
          .update({'last_reminder_at': DateTime.now().toIso8601String()})
          .eq('id', report.id);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('✓ Signalement relancé avec succès.'), backgroundColor: AppTheme.primaryTeal),
      );
      _fetchVerificationData();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text('Vérification Citoyenne', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryTeal,
          indicatorColor: AppTheme.primaryTeal,
          unselectedLabelColor: Colors.grey,
          tabs: [
            Tab(text: 'Voisins (${_neighborReports.length})'),
            Tab(text: 'Mes signalements (${_myReports.length})'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildNeighborReportsTab(isDark),
                _buildMyReportsTab(isDark),
              ],
            ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ONGLET 1 : CORROBORATION DES VOISINS
  // ════════════════════════════════════════════════════════════════════════════
  Widget _buildNeighborReportsTab(bool isDark) {
    final filtered = _selectedCommune == 'all'
        ? _neighborReports
        : _neighborReports.where((r) => r.commune.toLowerCase() == _selectedCommune.toLowerCase()).toList();

    return RefreshIndicator(
      onRefresh: _fetchVerificationData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Filtre par commune
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildCommuneChip('Toutes', 'all', const Color(0xFF0F172A)),
                  ...PILOT_COMMUNES.map((c) => Padding(
                    padding: const EdgeInsets.only(left: 6),
                    child: _buildCommuneChip(c.nom, c.nom, c.couleur),
                  )),
                ],
              ),
            ),
            const SizedBox(height: 16),

            if (filtered.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(30),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: const [
                    Icon(LucideIcons.checkCircle2, color: Color(0xFF16A34A), size: 44),
                    SizedBox(height: 12),
                    Text('Aucun signalement en attente', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    SizedBox(height: 4),
                    Text('Tous les signalements dans cette zone ont été corroborés ou résolus.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filtered.length,
                itemBuilder: (ctx, i) {
                  final r = filtered[i];
                  final isElec = r.serviceType == 'electricity';
                  final isEau = r.serviceType == 'water';
                  final cardColor = isElec ? const Color(0xFFF59E0B) : isEau ? const Color(0xFF0284C7) : const Color(0xFF9333EA);

                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
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
                          children: [
                            Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(color: cardColor.withAlpha(25), borderRadius: BorderRadius.circular(8)),
                              child: Icon(isElec ? LucideIcons.zap : isEau ? LucideIcons.droplets : LucideIcons.landmark, color: cardColor, size: 16),
                            ),
                            const SizedBox(width: 8),
                            Text('${r.commune} · ${r.quartier}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                              child: const Text('En cours', style: TextStyle(color: Color(0xFFD97706), fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Text(r.description, style: const TextStyle(fontSize: 13, height: 1.4)),
                        const SizedBox(height: 14),

                        Row(
                          children: [
                            Text('✓ ${r.verifications} confirmation(s)', style: const TextStyle(fontSize: 11, color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                            const Spacer(),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFEA580C),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              icon: const Icon(LucideIcons.check, size: 14, color: Colors.white),
                              label: const Text('Je confirme', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold)),
                              onPressed: () => _corroborate(r.id),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ONGLET 2 : MES SIGNALEMENTS ACTIFS
  // ════════════════════════════════════════════════════════════════════════════
  Widget _buildMyReportsTab(bool isDark) {
    if (_myReports.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              Icon(LucideIcons.shieldCheck, size: 48, color: Color(0xFF16A34A)),
              SizedBox(height: 14),
              Text('Aucun signalement actif', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              SizedBox(height: 6),
              Text('Vous n\'avez aucun signalement en cours de traitement.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _myReports.length,
      itemBuilder: (ctx, i) {
        final r = _myReports[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 14),
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
                children: [
                  Text('${r.commune} · ${r.quartier}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                    child: const Text('En attente', style: TextStyle(color: Color(0xFFD97706), fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(r.description, style: const TextStyle(fontSize: 13, height: 1.4)),
              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                      icon: const Icon(LucideIcons.refreshCw, size: 14),
                      label: const Text('Toujours en cours', style: TextStyle(fontSize: 11)),
                      onPressed: () => _relaunchReport(r),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(LucideIcons.checkCircle2, size: 14, color: Colors.white),
                      label: const Text('C\'est rétabli', style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold)),
                      onPressed: () => _markResolved(r),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCommuneChip(String label, String value, Color color) {
    final isSelected = _selectedCommune == value;
    return InkWell(
      onTap: () => setState(() => _selectedCommune = value),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? color : const Color(0xFFE2E8F0)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : const Color(0xFF334155),
          ),
        ),
      ),
    );
  }
}
