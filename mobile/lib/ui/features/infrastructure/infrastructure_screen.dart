import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../reports/create_report_screen.dart';
import '../reports/report_detail_screen.dart';

class InfrastructureScreen extends StatefulWidget {
  const InfrastructureScreen({super.key});

  @override
  State<InfrastructureScreen> createState() => _InfrastructureScreenState();
}

class _InfrastructureScreenState extends State<InfrastructureScreen> {
  bool _isLoading = true;
  String _selectedFilter = 'all'; // all, electricite, eau, mairie
  String? _subFilter;
  String _selectedCommune = 'all';
  String? _openAccordion; // 'electricite', 'eau', 'mairie'

  List<Map<String, dynamic>> _reports = [];
  final Set<String> _supportedReports = {};
  final Set<String> _repairedReports = {};

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    setState(() => _isLoading = true);
    try {
      final user = Supabase.instance.client.auth.currentUser;
      var filterQuery = Supabase.instance.client
          .from('reports')
          .select('id, user_id, service_type, description, location, commune, quartier, status, urgency, created_at, photo_url, photo_urls, verifications, repair_verifications, support_count, report_category')
          .eq('report_category', 'infrastructure');

      if (_selectedFilter != 'all') {
        final dbService = _selectedFilter == 'eau'
            ? 'water'
            : _selectedFilter == 'electricite'
                ? 'electricity'
                : _selectedFilter;
        filterQuery = filterQuery.eq('service_type', dbService);
      }

      if (_selectedCommune != 'all') {
        filterQuery = filterQuery.eq('commune', _selectedCommune);
      }

      final res = await filterQuery.order('created_at', ascending: false).limit(30);
      final List<Map<String, dynamic>> data = List<Map<String, dynamic>>.from(res as List);

      // Client-side sub-filter if text keyword selected
      List<Map<String, dynamic>> filtered = data;
      if (_subFilter != null && _subFilter!.isNotEmpty) {
        filtered = data.where((r) {
          final desc = (r['description'] as String?)?.toLowerCase() ?? '';
          return desc.contains(_subFilter!.toLowerCase());
        }).toList();
      }

      if (user != null) {
        try {
          final myVotes = await Supabase.instance.client
              .from('corroborations')
              .select('report_id')
              .eq('user_id', user.id);
          for (final row in (myVotes as List)) {
            _supportedReports.add(row['report_id'] as String);
          }

          final myRepairs = await Supabase.instance.client
              .from('repair_confirmations')
              .select('report_id')
              .eq('user_id', user.id);
          for (final row in (myRepairs as List)) {
            _repairedReports.add(row['report_id'] as String);
          }
        } catch (_) {}
      }

      if (mounted) {
        setState(() {
          _reports = filtered;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _toggleSupport(String reportId, String? reportUserId) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez vous connecter pour soutenir ce signalement.')),
      );
      return;
    }

    if (reportUserId == user.id) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vous ne pouvez pas voter pour votre propre signalement.')),
      );
      return;
    }

    try {
      final res = await Supabase.instance.client.rpc('support_infra_report', params: {
        'p_report_id': reportId,
      });

      final bool voted = res['voted'] ?? false;
      final int newCount = res['support_count'] ?? 0;

      setState(() {
        if (voted) {
          _supportedReports.add(reportId);
        } else {
          _supportedReports.remove(reportId);
        }
        final idx = _reports.indexWhere((r) => r['id'] == reportId);
        if (idx != -1) {
          _reports[idx]['support_count'] = newCount;
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(voted ? '👍 Soutien enregistré ! Plus on est nombreux, plus vite ça bouge.' : 'Soutien retiré.'),
          backgroundColor: voted ? const Color(0xFF16A34A) : Colors.black87,
        ),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible d\'enregistrer votre soutien.')),
      );
    }
  }

  Future<void> _toggleRepairConfirmation(String reportId) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez vous connecter pour confirmer la réparation.')),
      );
      return;
    }

    final isRepaired = _repairedReports.contains(reportId);
    try {
      if (isRepaired) {
        await Supabase.instance.client.rpc('cancel_repair', params: {'p_report_id': reportId});
        setState(() {
          _repairedReports.remove(reportId);
          final idx = _reports.indexWhere((r) => r['id'] == reportId);
          if (idx != -1) {
            final current = (_reports[idx]['repair_verifications'] as int?) ?? 1;
            _reports[idx]['repair_verifications'] = (current - 1).clamp(0, 999);
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Confirmation de réparation annulée.')),
        );
      } else {
        await Supabase.instance.client.rpc('confirm_repair', params: {'p_report_id': reportId});
        setState(() {
          _repairedReports.add(reportId);
          final idx = _reports.indexWhere((r) => r['id'] == reportId);
          if (idx != -1) {
            final current = (_reports[idx]['repair_verifications'] as int?) ?? 0;
            _reports[idx]['repair_verifications'] = current + 1;
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🎉 Réparation confirmée ! Si 3 citoyens le confirment, le ticket sera clôturé.'),
            backgroundColor: Color(0xFF16A34A),
          ),
        );
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Action impossible. Vérifiez votre connexion.')),
      );
    }
  }

  void _shareReport(Map<String, dynamic> report) {
    final commune = report['commune'] ?? 'Abidjan';
    final desc = report['description'] ?? 'Dégradation infrastructure';
    final text = '🚨 Dégradation signalée sur SIGNA·CI ($commune) : "$desc". Soutenez la résolution ici : https://signaci.ci/signalement/${report['id']}';
    launchUrl(Uri.parse('https://wa.me/?text=${Uri.encodeComponent(text)}'), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Row(
          children: [
            const Icon(LucideIcons.alertCircle, color: Color(0xFFEA580C), size: 22),
            const SizedBox(width: 8),
            Text(
              'Infrastructures Publiques',
              style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, fontSize: 18),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 18),
            tooltip: 'Actualiser',
            onPressed: _fetchReports,
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const CreateReportScreen(),
            ),
          ).then((_) => _fetchReports());
        },
        backgroundColor: const Color(0xFFEA580C),
        icon: const Icon(LucideIcons.plus, color: Colors.white),
        label: const Text('Signaler une voirie', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchReports,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // Header Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFF7ED), Color(0xFFFFEDD5)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFED7AA)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEA580C),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(LucideIcons.construction, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Fil des Dégradations de la Voirie',
                          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 14, color: const Color(0xFF9A3412)),
                        ),
                        const SizedBox(height: 2),
                        const Text(
                          'Nids de poules, lampadaires éteints, caniveaux bouchés, fuites d\'eau sur la voie publique.',
                          style: TextStyle(fontSize: 12, color: Color(0xFFC2410C)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Service Filters (Tabs)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildServiceFilterChip('all', 'Tous', LucideIcons.layers, null),
                  const SizedBox(width: 8),
                  _buildServiceFilterChip('mairie', 'Voirie & Mairie', LucideIcons.building2, const Color(0xFF059669)),
                  const SizedBox(width: 8),
                  _buildServiceFilterChip('electricite', 'Éclairage & CIE', LucideIcons.zap, const Color(0xFFEA580C)),
                  const SizedBox(width: 8),
                  _buildServiceFilterChip('eau', 'Fuites & SODECI', LucideIcons.droplets, const Color(0xFF0284C7)),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // Accordion sub-categories based on selected filter
            _buildSubCategoriesAccordion(),

            const SizedBox(height: 12),

            // Commune Selector
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedCommune,
                  isExpanded: true,
                  icon: const Icon(LucideIcons.mapPin, size: 18, color: Color(0xFF64748B)),
                  items: [
                    const DropdownMenuItem(value: 'all', child: Text('Toutes les communes d\'Abidjan', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
                    ...PILOT_COMMUNES.map((c) => DropdownMenuItem(
                          value: c.nom,
                          child: Text(c.nom, style: const TextStyle(fontSize: 13)),
                        )),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() => _selectedCommune = val);
                      _fetchReports();
                    }
                  },
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Active Sub-filter Indicator
            if (_subFilter != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.filter, size: 14, color: Color(0xFF2563EB)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Mot-clé : "$_subFilter"',
                        style: const TextStyle(color: Color(0xFF1D4ED8), fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                    InkWell(
                      onTap: () {
                        setState(() => _subFilter = null);
                        _fetchReports();
                      },
                      child: const Icon(LucideIcons.x, size: 16, color: Color(0xFF1D4ED8)),
                    ),
                  ],
                ),
              ),

            // Feed Content
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 40),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_reports.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    const Icon(LucideIcons.checkCircle2, size: 48, color: Color(0xFF10B981)),
                    const SizedBox(height: 12),
                    Text(
                      'Aucune dégradation signalée',
                      style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Aucun signalement d\'infrastructure ne correspond à vos critères de recherche.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                    ),
                  ],
                ),
              )
            else
              ..._reports.map((report) => _buildInfraReportCard(report)),

            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceFilterChip(String filterKey, String label, IconData icon, Color? color) {
    final isSelected = _selectedFilter == filterKey;
    final activeColor = color ?? const Color(0xFF0F172A);
    return InkWell(
      onTap: () {
        setState(() {
          _selectedFilter = filterKey;
          _subFilter = null;
        });
        _fetchReports();
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? activeColor : const Color(0xFFE2E8F0),
          ),
          boxShadow: isSelected
              ? [BoxShadow(color: activeColor.withAlpha(50), blurRadius: 6, offset: const Offset(0, 2))]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? Colors.white : activeColor),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF334155),
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubCategoriesAccordion() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          // 1. Voirie Mairie
          if (_selectedFilter == 'all' || _selectedFilter == 'mairie')
            _buildAccordionTile(
              'mairie',
              'Voirie & Collectivités',
              LucideIcons.building2,
              const Color(0xFF059669),
              [
                {'label': '🚧 Nids de poule', 'sub': 'nid de poule'},
                {'label': '🌊 Caniveau bouché', 'sub': 'caniveau'},
                {'label': '🚦 Feu tricolore', 'sub': 'feu'},
                {'label': '🗑️ Dépôt d\'ordures', 'sub': 'ordures'},
              ],
            ),

          if (_selectedFilter == 'all') const Divider(height: 1),

          // 2. Électricité CIE
          if (_selectedFilter == 'all' || _selectedFilter == 'electricite')
            _buildAccordionTile(
              'electricite',
              'Électricité & Éclairage Public (CIE)',
              LucideIcons.zap,
              const Color(0xFFEA580C),
              [
                {'label': '💡 Éclairage éteint', 'sub': 'éclairage'},
                {'label': '⚡ Poteau penché', 'sub': 'poteau'},
                {'label': '⚠️ Câble au sol', 'sub': 'câble'},
                {'label': '🔌 Branchement dangereux', 'sub': 'branchement'},
              ],
            ),

          if (_selectedFilter == 'all') const Divider(height: 1),

          // 3. Eau SODECI
          if (_selectedFilter == 'all' || _selectedFilter == 'eau')
            _buildAccordionTile(
              'eau',
              'Eau & Canalisations (SODECI)',
              LucideIcons.droplets,
              const Color(0xFF0284C7),
              [
                {'label': '💧 Tuyau percé / Fuite', 'sub': 'fuite'},
                {'label': '🚒 Bouche d\'incendie', 'sub': 'bouche'},
                {'label': '🚰 Pression nulle', 'sub': 'pression'},
                {'label': '🌊 Inondation de voie', 'sub': 'inondation'},
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildAccordionTile(String key, String title, IconData icon, Color color, List<Map<String, String>> items) {
    final isOpen = _openAccordion == key;
    return Column(
      children: [
        ListTile(
          dense: true,
          onTap: () {
            setState(() => _openAccordion = isOpen ? null : key);
          },
          leading: Icon(icon, color: color, size: 18),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          trailing: Icon(isOpen ? LucideIcons.chevronUp : LucideIcons.chevronDown, size: 18, color: const Color(0xFF64748B)),
        ),
        if (isOpen)
          Padding(
            padding: const EdgeInsets.only(left: 12, right: 12, bottom: 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: items.map((it) {
                final isSelected = _subFilter == it['sub'];
                return InkWell(
                  onTap: () {
                    setState(() {
                      _subFilter = isSelected ? null : it['sub'];
                      _openAccordion = null;
                    });
                    _fetchReports();
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? color.withAlpha(30) : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: isSelected ? color : const Color(0xFFCBD5E1)),
                    ),
                    child: Text(
                      it['label']!,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        color: isSelected ? color : const Color(0xFF334155),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildInfraReportCard(Map<String, dynamic> report) {
    final id = report['id'] as String;
    final service = (report['service_type'] as String?)?.toLowerCase() ?? 'voirie';
    final commune = report['commune'] as String? ?? 'Abidjan';
    final quartier = report['quartier'] as String? ?? '';
    final desc = report['description'] as String? ?? 'Dégradation signalée';
    final photoUrl = report['photo_url'] as String?;
    final supportCount = (report['support_count'] as int?) ?? 0;
    final repairCount = (report['repair_verifications'] as int?) ?? 0;
    final isSupported = _supportedReports.contains(id);
    final isRepaired = _repairedReports.contains(id);
    final status = (report['status'] as String?) ?? 'active';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 10, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Card
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                _buildServiceBadge(service),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(LucideIcons.mapPin, size: 12, color: Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              '$commune${quartier.isNotEmpty ? ' · $quartier' : ''}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: status == 'resolved' ? const Color(0xFFDCFCE7) : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status == 'resolved' ? 'Résolu' : 'En cours',
                    style: TextStyle(
                      color: status == 'resolved' ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // High-Res Photo if available
          if (photoUrl != null && photoUrl.isNotEmpty)
            ClipRRect(
              child: Image.network(
                photoUrl,
                height: 180,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),

          // Description Text
          Padding(
            padding: const EdgeInsets.all(14),
            child: Text(
              desc,
              style: const TextStyle(fontSize: 13, color: Color(0xFF334155), height: 1.4),
            ),
          ),

          const Divider(height: 1),

          // Action Buttons: Support (Moi aussi), Repair Confirmation, Share
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              children: [
                // Support Button
                OutlinedButton.icon(
                  onPressed: () => _toggleSupport(id, report['user_id'] as String?),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: isSupported ? const Color(0xFFFEF3C7) : Colors.transparent,
                    side: BorderSide(color: isSupported ? const Color(0xFFF59E0B) : const Color(0xFFE2E8F0)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                  icon: Icon(
                    LucideIcons.thumbsUp,
                    size: 14,
                    color: isSupported ? const Color(0xFFD97706) : const Color(0xFF64748B),
                  ),
                  label: Text(
                    'Moi aussi ($supportCount)',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isSupported ? const Color(0xFFD97706) : const Color(0xFF475569),
                    ),
                  ),
                ),

                const SizedBox(width: 8),

                // Repair Confirm Button
                OutlinedButton.icon(
                  onPressed: () => _toggleRepairConfirmation(id),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: isRepaired ? const Color(0xFFDCFCE7) : Colors.transparent,
                    side: BorderSide(color: isRepaired ? const Color(0xFF16A34A) : const Color(0xFFE2E8F0)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                  icon: Icon(
                    LucideIcons.checkCircle2,
                    size: 14,
                    color: isRepaired ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                  ),
                  label: Text(
                    'Réparé ? ($repairCount)',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isRepaired ? const Color(0xFF16A34A) : const Color(0xFF475569),
                    ),
                  ),
                ),

                const Spacer(),

                // Share Button
                IconButton(
                  onPressed: () => _shareReport(report),
                  icon: const Icon(LucideIcons.share2, size: 16, color: Color(0xFF64748B)),
                  tooltip: 'Partager sur WhatsApp',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceBadge(String service) {
    if (service == 'water' || service == 'eau') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFFE0F2FE), borderRadius: BorderRadius.circular(6)),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.droplets, color: Color(0xFF0284C7), size: 12),
            SizedBox(width: 4),
            Text('SODECI', style: TextStyle(color: Color(0xFF0284C7), fontSize: 10, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }
    if (service == 'electricity' || service == 'electricite') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(6)),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(LucideIcons.zap, color: Color(0xFFEA580C), size: 12),
            SizedBox(width: 4),
            Text('CIE', style: TextStyle(color: Color(0xFFEA580C), fontSize: 10, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(6)),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.building2, color: Color(0xFF059669), size: 12),
          SizedBox(width: 4),
          Text('MAIRIE', style: TextStyle(color: Color(0xFF059669), fontSize: 10, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
