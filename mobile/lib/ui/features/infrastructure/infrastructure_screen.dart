import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/report_display_utils.dart';
import '../../../domain/models/report_model.dart';
import '../../common/civic_photo_view.dart';
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
      List<Map<String, dynamic>> rawData = [];

      // 1. Try public RPC first (SECURITY DEFINER, bypasses RLS for visitors & logged-in users)
      try {
        final rpcRes = await Supabase.instance.client.rpc(
          'get_public_infrastructure_reports',
          params: {'p_limit': 50, 'p_offset': 0},
        );
        if (rpcRes is List && rpcRes.isNotEmpty) {
          rawData = List<Map<String, dynamic>>.from(rpcRes as List);
        }
      } catch (_) {}

      // 2. If RPC returned empty or failed, query table directly with broad criteria
      if (rawData.isEmpty) {
        try {
          final res = await Supabase.instance.client
              .from('reports')
              .select('id, user_id, service_type, description, location, commune, quartier, status, urgency, created_at, photo_url, photo_urls, verifications, repair_verifications, support_count, report_category')
              .order('created_at', ascending: false)
              .limit(50);
          if (res is List) {
            final allReports = List<Map<String, dynamic>>.from(res as List);
            rawData = allReports.where((r) {
              final cat = (r['report_category'] as String?)?.toLowerCase() ?? '';
              final st = (r['service_type'] as String?)?.toLowerCase() ?? '';
              final desc = (r['description'] as String?)?.toLowerCase() ?? '';
              return cat == 'infrastructure' || 
                     st == 'mairie' || 
                     st == 'voirie' ||
                     st == 'lighting' ||
                     st == 'pothole' ||
                     desc.contains('nid de poule') ||
                     desc.contains('caniveau') ||
                     desc.contains('lampadaire') ||
                     desc.contains('poteau') ||
                     desc.contains('fuite') ||
                     (r['photo_url'] != null && (r['photo_url'] as String).isNotEmpty) ||
                     (r['photo_urls'] != null && (r['photo_urls'] as List).isNotEmpty);
            }).toList();
          }
        } catch (_) {}
      }

      // 3. Apply active filters (Service, Commune, Sub-filter)
      List<Map<String, dynamic>> filtered = rawData;

      if (_selectedFilter != 'all') {
        final dbService = _selectedFilter == 'eau'
            ? 'water'
            : _selectedFilter == 'electricite'
                ? 'electricity'
                : _selectedFilter;
        filtered = filtered.where((r) {
          final st = (r['service_type'] as String?)?.toLowerCase() ?? '';
          final desc = (r['description'] as String?)?.toLowerCase() ?? '';
          if (_selectedFilter == 'eau') {
            return st == 'water' || desc.contains('eau') || desc.contains('fuite') || desc.contains('sodeci');
          } else if (_selectedFilter == 'electricite') {
            return st == 'electricity' || desc.contains('élec') || desc.contains('lampadaire') || desc.contains('poteau') || desc.contains('cie') || desc.contains('câble');
          } else if (_selectedFilter == 'mairie') {
            return st == 'mairie' || st == 'voirie' || desc.contains('nid de poule') || desc.contains('caniveau') || desc.contains('chaussée') || desc.contains('ordures');
          }
          return st == dbService;
        }).toList();
      }

      if (_selectedCommune != 'all') {
        filtered = filtered.where((r) => r['commune'] == _selectedCommune).toList();
      }

      if (_subFilter != null && _subFilter!.isNotEmpty) {
        filtered = filtered.where((r) {
          final desc = (r['description'] as String?)?.toLowerCase() ?? '';
          return desc.contains(_subFilter!.toLowerCase());
        }).toList();
      }

      // 4. Fetch user votes and repairs if logged in
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

  void _editReportDialog(String reportId, String currentDesc) {
    final controller = TextEditingController(text: currentDesc);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Modifier la description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: TextField(
          controller: controller,
          maxLines: 4,
          maxLength: 500,
          decoration: const InputDecoration(
            hintText: 'Décrivez précisément la dégradation...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0D9488)),
            onPressed: () async {
              final newText = controller.text.trim();
              if (newText.isEmpty) return;
              Navigator.pop(ctx);
              try {
                final oldFullDesc = _reports.firstWhere((r) => r['id'] == reportId)['description'] as String? ?? '';
                final label = ReportDisplayUtils.extractInfraLabel(oldFullDesc);
                final updatedDesc = label != null ? '[$label] $newText' : newText;

                await Supabase.instance.client
                    .from('reports')
                    .update({'description': updatedDesc})
                    .eq('id', reportId);

                setState(() {
                  final idx = _reports.indexWhere((r) => r['id'] == reportId);
                  if (idx != -1) {
                    _reports[idx]['description'] = updatedDesc;
                  }
                });

                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('✓ Signalement mis à jour avec succès.'), backgroundColor: Color(0xFF16A34A)),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                }
              }
            },
            child: const Text('Enregistrer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _shareReport(Map<String, dynamic> report) {
    final commune = report['commune'] ?? 'Abidjan';
    final quartier = report['quartier'] ?? '';
    final rawDesc = report['description'] ?? 'Dégradation infrastructure';
    final cleanDesc = ReportDisplayUtils.cleanDescription(rawDesc);
    final link = 'https://signaci.ci/signalement/${report['id']}';
    final shareText = '🚧 INFRASTRUCTURE — $quartier, $commune\n\n$cleanDesc\n\nSoutenez la résolution citoyenne ici : $link';

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 40, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD5E1), borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 16),
              Text('Partager ce signalement', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFF25D366).withAlpha(25), shape: BoxShape.circle),
                  child: const Icon(LucideIcons.messageCircle, color: Color(0xFF25D366), size: 20),
                ),
                title: const Text('WhatsApp', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Partager avec vos voisins et groupes de quartier', style: TextStyle(fontSize: 12)),
                onTap: () {
                  Navigator.pop(ctx);
                  launchUrl(Uri.parse('https://wa.me/?text=${Uri.encodeComponent(shareText)}'), mode: LaunchMode.externalApplication);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFF0284C7).withAlpha(25), shape: BoxShape.circle),
                  child: const Icon(LucideIcons.copy, color: Color(0xFF0284C7), size: 20),
                ),
                title: const Text('Copier le lien', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(link, style: const TextStyle(fontSize: 12, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis),
                onTap: () {
                  Navigator.pop(ctx);
                  Clipboard.setData(ClipboardData(text: link));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('✓ Lien copié dans le presse-papiers !'), backgroundColor: Color(0xFF16A34A)),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
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
    final user = Supabase.instance.client.auth.currentUser;
    final id = report['id'] as String;
    final commune = report['commune'] as String? ?? 'Abidjan';
    final quartier = report['quartier'] as String? ?? '';
    final rawDesc = report['description'] as String? ?? 'Dégradation signalée';
    final infraLabel = ReportDisplayUtils.extractInfraLabel(rawDesc);
    final infraEmoji = ReportDisplayUtils.getInfraEmoji(infraLabel);
    final cleanDesc = ReportDisplayUtils.cleanDescription(rawDesc);
    final createdAt = report['created_at'];
    final timeAgoStr = ReportDisplayUtils.timeAgo(createdAt);

    final photoUrl = report['photo_url'] as String?;
    final supportCount = (report['support_count'] as int?) ?? 0;
    final repairCount = (report['repair_verifications'] as int?) ?? 0;
    final isSupported = _supportedReports.contains(id);
    final isRepaired = _repairedReports.contains(id);
    final status = (report['status'] as String?) ?? 'active';
    final isOwner = user != null && report['user_id'] == user.id;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(color: Color(0x06000000), blurRadius: 10, offset: Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ─── 1. EN-TÊTE DU POST (AVATAR EMOJI + BADGES + LOCALISATION + STATUT) ───
          Padding(
            padding: const EdgeInsets.only(left: 14, right: 14, top: 14, bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar rond pastel avec Emoji de l'infra (1:1 Web)
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D9488).withAlpha(25),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      infraEmoji,
                      style: const TextStyle(fontSize: 20),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Colonne métadonnées
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badges : Label Infra + Modéré
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (infraLabel != null && infraLabel.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0D9488).withAlpha(20),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                infraLabel,
                                style: const TextStyle(
                                  color: Color(0xFF0F766E),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: const Text(
                              'Modéré',
                              style: TextStyle(
                                color: Color(0xFFD97706),
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Localisation & Date relative
                      Row(
                        children: [
                          const Icon(LucideIcons.mapPin, size: 12, color: Color(0xFF64748B)),
                          const SizedBox(width: 3),
                          Text(
                            quartier.isNotEmpty ? quartier : commune,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B)),
                          ),
                          if (quartier.isNotEmpty && commune.isNotEmpty) ...[
                            const SizedBox(width: 3),
                            const Text('·', style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
                            const SizedBox(width: 3),
                            Text(
                              commune,
                              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                            ),
                          ],
                          const SizedBox(width: 8),
                          const Icon(LucideIcons.clock, size: 12, color: Color(0xFF64748B)),
                          const SizedBox(width: 3),
                          Text(
                            timeAgoStr,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Statut En direct (Pastille animée)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: status == 'resolved' ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      status == 'resolved' ? 'Résolu' : 'En cours',
                      style: TextStyle(
                        color: status == 'resolved' ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ─── 2. DESCRIPTION PROPRE (Sans crochets disgracieux) ───
          Padding(
            padding: const EdgeInsets.only(left: 14, right: 14, bottom: 10),
            child: Text(
              cleanDesc.isEmpty ? 'Dégradation signalée' : cleanDesc,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w500,
                color: Color(0xFF1E293B),
                height: 1.45,
              ),
            ),
          ),

          // ─── 3. GALERIE PHOTOS HD AVEC LIGHTBOX & ZOOM ───
          if ((photoUrl != null && photoUrl.isNotEmpty) || (report['photo_urls'] != null && (report['photo_urls'] as List).isNotEmpty))
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              child: CivicPhotoView(
                photoPath: photoUrl,
                photoPaths: report['photo_urls'] as List<dynamic>?,
                reportDate: report['created_at'],
                aspectRatio: 16 / 10,
                borderRadius: BorderRadius.circular(12),
              ),
            ),

          // ─── 4. BARRE DE STATISTIQUES CITOYENNES (1:1 Web) ───
          Padding(
            padding: const EdgeInsets.only(left: 14, right: 14, top: 8, bottom: 8),
            child: Row(
              children: [
                if (supportCount > 0) ...[
                  const Text('🙋 ', style: TextStyle(fontSize: 13)),
                  Text(
                    '$supportCount citoyen${supportCount > 1 ? 's' : ''} veulent une réparation rapide',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0D9488)),
                  ),
                ] else ...[
                  const Icon(LucideIcons.thumbsUp, size: 12, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 5),
                  const Text(
                    'Soyez le premier à soutenir',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ],
                if (repairCount > 0 && status != 'resolved') ...[
                  const Spacer(),
                  const Icon(LucideIcons.checkCircle2, size: 12, color: Color(0xFF16A34A)),
                  const SizedBox(width: 4),
                  Text(
                    '$repairCount/3 réparé',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF16A34A)),
                  ),
                ],
              ],
            ),
          ),

          const Divider(height: 1, color: Color(0xFFF1F5F9)),

          // ─── 5. BARRE D'ACTIONS (Moi aussi, Modifier, Réparé, Partager) ───
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            child: Row(
              children: [
                // Bouton Soutien ou Mon signalement
                if (isOwner) ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(LucideIcons.thumbsUp, size: 14, color: Color(0xFF94A3B8)),
                        SizedBox(width: 4),
                        Text(
                          'Mon signalement',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                  if (status == 'active')
                    TextButton.icon(
                      onPressed: () => _editReportDialog(id, cleanDesc),
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        foregroundColor: const Color(0xFF475569),
                      ),
                      icon: const Icon(LucideIcons.edit3, size: 13),
                      label: const Text('Modifier', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                    ),
                ] else
                  TextButton.icon(
                    onPressed: () => _toggleSupport(id, report['user_id'] as String?),
                    style: TextButton.styleFrom(
                      backgroundColor: isSupported ? const Color(0xFF0D9488).withAlpha(20) : Colors.transparent,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      foregroundColor: isSupported ? const Color(0xFF0D9488) : const Color(0xFF475569),
                    ),
                    icon: Icon(
                      LucideIcons.thumbsUp,
                      size: 14,
                      color: isSupported ? const Color(0xFF0D9488) : const Color(0xFF64748B),
                    ),
                    label: Text(
                      isSupported ? 'Soutenu ✓' : 'Moi aussi ($supportCount)',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: isSupported ? FontWeight.bold : FontWeight.w600,
                      ),
                    ),
                  ),

                const Spacer(),

                // Bouton "C'est réparé ?"
                if (status == 'active')
                  TextButton.icon(
                    onPressed: () => _toggleRepairConfirmation(id),
                    style: TextButton.styleFrom(
                      backgroundColor: isRepaired ? const Color(0xFFDCFCE7) : Colors.transparent,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      foregroundColor: isRepaired ? const Color(0xFF16A34A) : const Color(0xFF059669),
                    ),
                    icon: Icon(
                      isRepaired ? LucideIcons.checkCircle : LucideIcons.checkCircle2,
                      size: 14,
                      color: const Color(0xFF16A34A),
                    ),
                    label: Text(
                      isRepaired ? 'Réparé ✓' : 'C\'est réparé ?',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: isRepaired ? FontWeight.bold : FontWeight.w600,
                      ),
                    ),
                  ),

                // Lien Détail externe
                IconButton(
                  onPressed: () {
                    final rep = ReportModel.fromJson(report);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => ReportDetailScreen(report: rep)));
                  },
                  icon: const Icon(LucideIcons.externalLink, size: 15, color: Color(0xFF64748B)),
                  tooltip: 'Voir le détail',
                ),

                // Bouton Partager
                TextButton.icon(
                  onPressed: () => _shareReport(report),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    foregroundColor: const Color(0xFF475569),
                  ),
                  icon: const Icon(LucideIcons.share2, size: 14, color: Color(0xFF64748B)),
                  label: const Text('Partager', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
