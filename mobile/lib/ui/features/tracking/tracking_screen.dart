import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../reports/report_detail_screen.dart';

class TrackingScreen extends StatefulWidget {
  final String? initialSearchCode;
  const TrackingScreen({super.key, this.initialSearchCode});

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isLoading = true;
  String _selectedCommune = 'all';
  String _selectedCategory = 'all';
  String _selectedStatus = 'all';

  List<ReportModel> _allReports = [];
  List<ReportModel> _filteredReports = [];
  List<String> _liveTickerItems = [];

  @override
  void initState() {
    super.initState();
    if (widget.initialSearchCode != null) {
      _searchController.text = widget.initialSearchCode!;
    }
    _fetchReports();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchReports() async {
    setState(() => _isLoading = true);
    try {
      final res = await Supabase.instance.client
          .from('reports')
          .select()
          .order('created_at', ascending: false)
          .limit(100);

      if (res is List && mounted) {
        final list = (res as List).map((e) => ReportModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();

        final tickerList = <String>[];
        for (var r in list.take(10)) {
          final icon = r.serviceType == 'electricity' ? '⚡' : r.serviceType == 'water' ? '💧' : '🚧';
          tickerList.add('$icon ${r.commune} (${r.quartier}) : ${r.description.isEmpty ? "Panne signalée" : r.description}');
        }

        setState(() {
          _allReports = list;
          _liveTickerItems = tickerList;
          _applyFilters();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _applyFilters() {
    final query = _searchController.text.trim().toLowerCase();

    setState(() {
      _filteredReports = _allReports.where((r) {
        final matchesQuery = query.isEmpty ||
            r.id.toLowerCase().contains(query) ||
            r.description.toLowerCase().contains(query) ||
            r.commune.toLowerCase().contains(query) ||
            r.quartier.toLowerCase().contains(query);

        final matchesCommune = _selectedCommune == 'all' || r.commune == _selectedCommune;
        final matchesCategory = _selectedCategory == 'all' ||
            (_selectedCategory == 'electricity' && r.serviceType == 'electricity') ||
            (_selectedCategory == 'water' && r.serviceType == 'water') ||
            (_selectedCategory == 'infrastructure' && r.serviceType != 'electricity' && r.serviceType != 'water');

        final matchesStatus = _selectedStatus == 'all' ||
            (_selectedStatus == 'active' && (r.status == 'active' || r.status == 'pending')) ||
            (_selectedStatus == 'processing' && r.status == 'processing') ||
            (_selectedStatus == 'resolved' && r.status == 'resolved');

        return matchesQuery && matchesCommune && matchesCategory && matchesStatus;
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text('Suivi des Incidents & Pannes', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: Column(
        children: [
          // ══════════════════════════════════════════════════════════
          // 1. BANDEAU TICKER LIVE EN DIRECT (1:1 Web NewsTicker.tsx)
          // ══════════════════════════════════════════════════════════
          if (_liveTickerItems.isNotEmpty)
            Container(
              height: 38,
              color: isDark ? const Color(0xFF0B132B) : const Color(0xFF0284C7),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    color: const Color(0xFFEA580C),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(LucideIcons.radio, size: 12, color: Colors.white),
                        SizedBox(width: 4),
                        Text('EN DIRECT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 0.5)),
                      ],
                    ),
                  ),
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      child: Row(
                        children: _liveTickerItems.map((item) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              item,
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // ══════════════════════════════════════════════════════════
          // 2. BARRE DE RECHERCHE RAPIDE PAR ID (#SIG-XXXX)
          // ══════════════════════════════════════════════════════════
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: (_) => _applyFilters(),
              decoration: InputDecoration(
                hintText: 'Rechercher par n° de ticket (#SIG-XXXX), quartier...',
                hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                prefixIcon: const Icon(LucideIcons.search, size: 18),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 16),
                        onPressed: () {
                          _searchController.clear();
                          _applyFilters();
                        },
                      )
                    : null,
                filled: true,
                fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
              ),
            ),
          ),

          // ══════════════════════════════════════════════════════════
          // 3. BARRE DE FILTRES HORIZONTAUX (Communes & Services)
          // ══════════════════════════════════════════════════════════
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                _buildFilterChip('Toutes communes', _selectedCommune == 'all', () {
                  setState(() => _selectedCommune = 'all');
                  _applyFilters();
                }, isDark),
                const SizedBox(width: 6),
                ...PILOT_COMMUNES.map((c) => Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: _buildFilterChip(c.nom, _selectedCommune == c.nom, () {
                        setState(() => _selectedCommune = c.nom);
                        _applyFilters();
                      }, isDark),
                    )),
                const SizedBox(width: 10),
                _buildFilterChip('⚡ Électricité', _selectedCategory == 'electricity', () {
                  setState(() => _selectedCategory = _selectedCategory == 'electricity' ? 'all' : 'electricity');
                  _applyFilters();
                }, isDark),
                const SizedBox(width: 6),
                _buildFilterChip('💧 Eau', _selectedCategory == 'water', () {
                  setState(() => _selectedCategory = _selectedCategory == 'water' ? 'all' : 'water');
                  _applyFilters();
                }, isDark),
                const SizedBox(width: 6),
                _buildFilterChip('🚧 Voirie', _selectedCategory == 'infrastructure', () {
                  setState(() => _selectedCategory = _selectedCategory == 'infrastructure' ? 'all' : 'infrastructure');
                  _applyFilters();
                }, isDark),
              ],
            ),
          ),
          const SizedBox(height: 8),

          // ══════════════════════════════════════════════════════════
          // 4. LISTE DES RÉSULTATS AVEC STATUT CIVIQUE
          // ══════════════════════════════════════════════════════════
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredReports.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.searchX, size: 48, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            Text('Aucun signalement trouvé', style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
                            const SizedBox(height: 4),
                            Text('Vérifiez le numéro de ticket ou modifiez vos filtres', style: TextStyle(color: Colors.grey.shade400, fontSize: 11)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _fetchReports,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredReports.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (ctx, i) {
                            final r = _filteredReports[i];
                            return _buildReportTrackingCard(r, isDark);
                          },
                        ),
                      ),
          ),
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
          color: isSelected
              ? AppTheme.primaryTeal
              : (isDark ? const Color(0xFF1E293B) : Colors.white),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? AppTheme.primaryTeal
                : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          ),
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

  Widget _buildReportTrackingCard(ReportModel r, bool isDark) {
    final isElec = r.serviceType == 'electricity';
    final isEau = r.serviceType == 'water';
    final iconColor = isElec ? const Color(0xFFF59E0B) : isEau ? const Color(0xFF0284C7) : const Color(0xFF9333EA);

    final statusText = r.status == 'resolved' ? 'Résolu' : r.status == 'processing' ? 'En cours' : 'Déclaré';
    final statusColor = r.status == 'resolved' ? const Color(0xFF16A34A) : r.status == 'processing' ? const Color(0xFFD97706) : const Color(0xFFEF4444);

    return InkWell(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ReportDetailScreen(report: r))),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(color: Colors.black.withAlpha(4), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: iconColor.withAlpha(25), shape: BoxShape.circle),
                  child: Icon(isElec ? LucideIcons.zap : isEau ? LucideIcons.droplets : LucideIcons.landmark, color: iconColor, size: 16),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '#SIG-${r.id.substring(0, 6).toUpperCase()}',
                        style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 13, color: AppTheme.primaryTeal),
                      ),
                      Text('${r.commune} · ${r.quartier}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha(25),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor.withAlpha(80)),
                  ),
                  child: Text(
                    statusText,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              r.description.isEmpty ? 'Signalement de panne ou dégradation' : r.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, height: 1.3),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(LucideIcons.users, size: 12, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text('${r.supportCount} soutien(s)', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    const SizedBox(width: 12),
                    Icon(LucideIcons.clock, size: 12, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Text(r.elapsedFormatted, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ],
                ),
                Row(
                  children: const [
                    Text('Suivre', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal)),
                    SizedBox(width: 2),
                    Icon(LucideIcons.chevronRight, size: 14, color: AppTheme.primaryTeal),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
