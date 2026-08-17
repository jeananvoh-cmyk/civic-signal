import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../reports/create_report_screen.dart';

class CommuneDetailScreen extends StatefulWidget {
  final String communeName;

  const CommuneDetailScreen({super.key, required this.communeName});

  @override
  State<CommuneDetailScreen> createState() => _CommuneDetailScreenState();
}

class _CommuneDetailScreenState extends State<CommuneDetailScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _quartierStats = [];
  Map<String, dynamic>? _durationStats;
  int _totalElecActifs = 0;
  int _totalEauActifs = 0;
  int _totalElecResolus = 0;
  int _totalEauResolus = 0;

  @override
  void initState() {
    super.initState();
    _fetchCommuneData();
  }

  Future<void> _fetchCommuneData() async {
    setState(() => _isLoading = true);
    try {
      final responses = await Future.wait([
        Supabase.instance.client.rpc('get_commune_quartier_stats', params: {'p_commune': widget.communeName}),
        Supabase.instance.client.rpc('get_commune_duration_stats'),
      ]);

      final qData = responses[0];
      final dData = responses[1];

      int elecActifs = 0;
      int eauActifs = 0;
      int elecResolus = 0;
      int eauResolus = 0;
      List<Map<String, dynamic>> qList = [];

      if (qData is List) {
        qList = List<Map<String, dynamic>>.from(qData);
        for (var q in qList) {
          elecActifs += (q['electricite_actifs'] as num? ?? 0).toInt();
          eauActifs += (q['eau_actifs'] as num? ?? 0).toInt();
          elecResolus += (q['electricite_resolus'] as num? ?? 0).toInt();
          eauResolus += (q['eau_resolus'] as num? ?? 0).toInt();
        }
      }

      Map<String, dynamic>? myDuration;
      if (dData is List) {
        final match = dData.cast<Map<String, dynamic>>().firstWhere(
          (d) => (d['commune'] as String? ?? '').toLowerCase() == widget.communeName.toLowerCase(),
          orElse: () => <String, dynamic>{},
        );
        if (match.isNotEmpty) myDuration = match;
      }

      if (mounted) {
        setState(() {
          _quartierStats = qList;
          _durationStats = myDuration;
          _totalElecActifs = elecActifs;
          _totalEauActifs = eauActifs;
          _totalElecResolus = elecResolus;
          _totalEauResolus = eauResolus;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final communeData = findCommuneByName(widget.communeName);
    final communeColor = communeData?.couleur ?? AppTheme.primaryTeal;
    final totalActifs = _totalElecActifs + _totalEauActifs;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text(widget.communeName, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plusCircle, color: Color(0xFFEA580C)),
            tooltip: 'Signaler dans cette commune',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => CreateReportScreen(initialCommune: widget.communeName)),
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchCommuneData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ══════════════════════════════════════════════════════════
                    // 1. CARTE COMMUNE PILOTE (1:1 Web)
                    // ══════════════════════════════════════════════════════════
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: communeColor.withAlpha(60), width: 1.5),
                        boxShadow: [
                          BoxShadow(color: communeColor.withAlpha(20), blurRadius: 16, offset: const Offset(0, 4)),
                        ],
                      ),
                      child: Row(
                        children: [
                          if (communeData != null)
                            Container(
                              width: 64,
                              height: 64,
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Image.asset(communeData.logoAsset, fit: BoxFit.contain),
                            ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      widget.communeName,
                                      style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w900),
                                    ),
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: communeColor.withAlpha(30),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: const Text('Pilote', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  communeData != null ? '${(communeData.population / 1000).toStringAsFixed(0)} 000 habitants' : 'District d\'Abidjan',
                                  style: const TextStyle(fontSize: 13, color: Colors.grey),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  totalActifs == 0 ? '🟢 Aucune coupure majeure' : '🔴 $totalActifs coupure(s) signalée(s)',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    color: totalActifs == 0 ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // ══════════════════════════════════════════════════════════
                    // 2. RÉPARTITION CIE & SODECI (1:1 Web)
                    // ══════════════════════════════════════════════════════════
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(LucideIcons.zap, color: Color(0xFFD97706), size: 18),
                                    SizedBox(width: 6),
                                    Text('Électricité CIE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF92400E))),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text('$_totalElecActifs actives', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFFB45309))),
                                Text('$_totalElecResolus résolues', style: const TextStyle(fontSize: 11, color: Color(0xFF92400E))),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0F9FF),
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: const Color(0xFFBAE6FD)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Row(
                                  children: [
                                    Icon(LucideIcons.droplet, color: Color(0xFF0284C7), size: 18),
                                    SizedBox(width: 6),
                                    Text('Eau SODECI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF075985))),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text('$_totalEauActifs actives', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0369A1))),
                                Text('$_totalEauResolus résolues', style: const TextStyle(fontSize: 11, color: Color(0xFF075985))),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // ══════════════════════════════════════════════════════════
                    // 3. STATISTIQUES PAR QUARTIER (QuartierOutageGrid 1:1)
                    // ══════════════════════════════════════════════════════════
                    Text('Situation par Quartier', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 10),

                    if (_quartierStats.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.withAlpha(40)),
                        ),
                        child: const Center(
                          child: Text('Aucun incident signalé dans les quartiers pour l\'instant.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _quartierStats.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 10),
                        itemBuilder: (ctx, i) {
                          final q = _quartierStats[i];
                          final qName = q['quartier'] as String? ?? 'Quartier';
                          final elecAct = (q['electricite_actifs'] as num? ?? 0).toInt();
                          final eauAct = (q['eau_actifs'] as num? ?? 0).toInt();
                          final actTotal = elecAct + eauAct;

                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E293B) : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: actTotal > 0 ? const Color(0xFFFED7AA) : const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: actTotal > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    actTotal > 0 ? LucideIcons.alertTriangle : LucideIcons.checkCircle,
                                    size: 16,
                                    color: actTotal > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(qName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                      Text(
                                        actTotal == 0 ? 'Normal · Aucun problème' : '$actTotal coupure(s) en cours',
                                        style: TextStyle(fontSize: 11, color: actTotal > 0 ? const Color(0xFFDC2626) : Colors.grey),
                                      ),
                                    ],
                                  ),
                                ),
                                if (elecAct > 0)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    margin: const EdgeInsets.only(right: 6),
                                    decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(8)),
                                    child: Row(
                                      children: [
                                        const Icon(LucideIcons.zap, size: 10, color: Color(0xFFD97706)),
                                        const SizedBox(width: 4),
                                        Text('$elecAct', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                                      ],
                                    ),
                                  ),
                                if (eauAct > 0)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(color: const Color(0xFFE0F2FE), borderRadius: BorderRadius.circular(8)),
                                    child: Row(
                                      children: [
                                        const Icon(LucideIcons.droplet, size: 10, color: Color(0xFF0284C7)),
                                        const SizedBox(width: 4),
                                        Text('$eauAct', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0369A1))),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    const SizedBox(height: 24),

                    // ══════════════════════════════════════════════════════════
                    // 4. BOUTON ACTION SIGNALER
                    // ══════════════════════════════════════════════════════════
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFEA580C),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        icon: const Icon(LucideIcons.plusCircle, color: Colors.white, size: 18),
                        label: Text('Signaler une coupure à ${widget.communeName}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        onPressed: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => CreateReportScreen(initialCommune: widget.communeName)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
    );
  }
}
