import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../reports/report_detail_screen.dart';

class PartnerDashboardScreen extends StatefulWidget {
  const PartnerDashboardScreen({super.key});

  @override
  State<PartnerDashboardScreen> createState() => _PartnerDashboardScreenState();
}

class _PartnerDashboardScreenState extends State<PartnerDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  bool _isCheckingRole = true;
  bool _hasAccess = false;
  String _orgName = 'Régie Partenaire CIE / SODECI';
  String _partnerType = 'Opérateur Technique';
  String? _communeFilter;

  List<ReportModel> _allReports = [];
  List<ReportModel> _activeReports = [];
  List<ReportModel> _processingReports = [];
  List<ReportModel> _resolvedReports = [];

  final TextEditingController _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchPartnerReports();
  }

  final TextEditingController _refController = TextEditingController();
  int? _selectedEtaHours;

  @override
  void dispose() {
    _tabController.dispose();
    _commentController.dispose();
    _refController.dispose();
    super.dispose();
  }

  Future<void> _fetchPartnerReports() async {
    setState(() => _isLoading = true);
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        if (mounted) {
          setState(() {
            _hasAccess = false;
            _isCheckingRole = false;
            _isLoading = false;
          });
        }
        return;
      }

      bool isPartner = false;
      bool isAdmin = false;
      try {
        final partnerRes = await Supabase.instance.client.rpc('has_role', params: {
          '_user_id': user.id,
          '_role': 'partner',
        });
        isPartner = partnerRes == true;

        final adminRes = await Supabase.instance.client.rpc('has_role', params: {
          '_user_id': user.id,
          '_role': 'admin',
        });
        isAdmin = adminRes == true;
      } catch (_) {}

      final profileRes = await Supabase.instance.client
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

      final role = (profileRes != null && profileRes['role'] != null)
          ? profileRes['role'].toString().toLowerCase()
          : '';

      final access = isPartner || isAdmin || role == 'partenaire' || role == 'moderateur' || role == 'agent' || role == 'admin';

      if (!access) {
        if (mounted) {
          setState(() {
            _hasAccess = false;
            _isCheckingRole = false;
            _isLoading = false;
          });
        }
        return;
      }

      if (mounted) {
        setState(() {
          _hasAccess = true;
          _isCheckingRole = false;
        });
      }

      final partnerProfileRes = await Supabase.instance.client
          .from('partner_profiles')
          .select('organization_name, partner_type, commune')
          .eq('user_id', user.id)
          .maybeSingle();

      if (partnerProfileRes != null && mounted) {
        _orgName = partnerProfileRes['organization_name'] as String? ?? _orgName;
        _partnerType = partnerProfileRes['partner_type'] as String? ?? _partnerType;
        _communeFilter = partnerProfileRes['commune'] as String?;
      }

      final reportsData = await Supabase.instance.client
          .from('reports')
          .select()
          .order('created_at', ascending: false)
          .limit(100);

      if (mounted) {
        final list = (reportsData as List).map((e) => ReportModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();

        setState(() {
          _allReports = list;
          _activeReports = list.where((r) => r.status == 'active' || r.status == 'pending').toList();
          _processingReports = list.where((r) => r.status == 'processing').toList();
          _resolvedReports = list.where((r) => r.status == 'resolved').toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _updateReportStatus(ReportModel report, String newStatus) async {
    int? localEta = _selectedEtaHours;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            newStatus == 'processing' ? 'Prendre en charge l\'incident' : 'Clôturer le signalement',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  newStatus == 'processing'
                      ? 'Une équipe d\'intervention sera assignée à cette panne.'
                      : 'Confirmez la remise en service effective sur les lieux.',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _refController,
                  decoration: InputDecoration(
                    labelText: 'N° Ordre de travail / Réf. (optionnel)',
                    hintText: 'Ex: CIE-OT-8942',
                    labelStyle: const TextStyle(fontSize: 12),
                    hintStyle: const TextStyle(fontSize: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                if (newStatus == 'processing') ...[
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    value: localEta,
                    decoration: InputDecoration(
                      labelText: 'Délai prévisionnel d\'intervention',
                      labelStyle: const TextStyle(fontSize: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: const [
                      DropdownMenuItem(value: 2, child: Text('~ 2 heures', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 4, child: Text('~ 4 heures', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 12, child: Text('~ 12 heures', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 24, child: Text('~ 24 heures', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 48, child: Text('~ 48 heures', style: TextStyle(fontSize: 13))),
                    ],
                    onChanged: (val) => setDialogState(() => localEta = val),
                  ),
                ],
                const SizedBox(height: 12),
                TextField(
                  controller: _commentController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Note technique ou commentaire public',
                    hintText: 'Note pour les usagers et modérateurs...',
                    labelStyle: const TextStyle(fontSize: 12),
                    hintStyle: const TextStyle(fontSize: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: newStatus == 'resolved' ? const Color(0xFF16A34A) : const Color(0xFFD97706),
              ),
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Confirmer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true) {
      try {
        final comment = _commentController.text.trim();
        final ref = _refController.text.trim();
        final etaDate = localEta != null
            ? DateTime.now().add(Duration(hours: localEta!)).toIso8601String()
            : null;

        try {
          await Supabase.instance.client.rpc('operator_update_ticket', params: {
            'p_report_id': report.id,
            'p_ticket_code': report.ticketCode,
            'p_status': newStatus,
            'p_operator_name': _orgName,
            'p_operator_reference': ref.isNotEmpty ? ref : null,
            'p_public_note': comment.isNotEmpty ? comment : null,
            'p_estimated_resolution': etaDate,
          });
        } catch (_) {
          await Supabase.instance.client.rpc('partner_update_report_status', params: {
            'p_report_id': report.id,
            'p_status': newStatus,
          });
        }

        final user = Supabase.instance.client.auth.currentUser;
        if (comment.isNotEmpty && user != null) {
          await Supabase.instance.client.from('report_comments').insert({
            'report_id': report.id,
            'user_id': user.id,
            'content': '🛠️ [Technicien $_orgName] : $comment',
          });
        }

        _commentController.clear();
        _refController.clear();
        _selectedEtaHours = null;
        _fetchPartnerReports();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(newStatus == 'resolved' ? '✓ Incident marqué résolu !' : '✓ Prise en charge enregistrée !'),
              backgroundColor: AppTheme.secondaryEmerald,
            ),
          );
        }
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isCheckingRole) {
      return Scaffold(
        appBar: AppBar(title: const Text('Espace Partenaires')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (!_hasAccess) {
      return Scaffold(
        appBar: AppBar(title: const Text('Accès Restreint')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(LucideIcons.shieldAlert, size: 56, color: Color(0xFFD97706)),
                const SizedBox(height: 16),
                Text('Accès Partenaire & Régie Requis', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18), textAlign: TextAlign.center),
                const SizedBox(height: 8),
                const Text(
                  'Cet espace est strictement réservé aux techniciens accrédités CIE, SODECI et Mairies.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal, foregroundColor: Colors.white),
                  icon: const Icon(LucideIcons.arrowLeft, size: 16),
                  label: const Text('Retour'),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_orgName, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
            Text('Espace Partenaires & Opérateurs', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryTeal,
          indicatorColor: AppTheme.primaryTeal,
          unselectedLabelColor: Colors.grey,
          tabs: [
            Tab(text: 'À traiter (${_activeReports.length})'),
            Tab(text: 'En cours (${_processingReports.length})'),
            Tab(text: 'Résolus (${_resolvedReports.length})'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchPartnerReports,
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildReportList(_activeReports, 'active', isDark),
                  _buildReportList(_processingReports, 'processing', isDark),
                  _buildReportList(_resolvedReports, 'resolved', isDark),
                ],
              ),
            ),
    );
  }

  Widget _buildReportList(List<ReportModel> reports, String listType, bool isDark) {
    if (reports.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.checkCircle2, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: 12),
              Text('Aucun signalement dans cette section', style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: reports.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) {
        final r = reports[i];
        final isElec = r.serviceType == 'electricity';
        final isEau = r.serviceType == 'water';
        final iconColor = isElec ? const Color(0xFFF59E0B) : isEau ? const Color(0xFF0284C7) : const Color(0xFF9333EA);

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(color: Colors.black.withAlpha(5), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: iconColor.withAlpha(30), shape: BoxShape.circle),
                    child: Icon(isElec ? LucideIcons.zap : isEau ? LucideIcons.droplets : LucideIcons.landmark, color: iconColor, size: 16),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${r.commune} · ${r.quartier}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Text(r.createdAt.toLocal().toString().substring(0, 16).replaceFirst('T', ' '), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: r.status == 'resolved' ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      r.status == 'resolved' ? 'Résolu' : r.status == 'processing' ? 'En cours' : 'À traiter',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: r.status == 'resolved' ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(r.description, style: const TextStyle(fontSize: 13, height: 1.3)),
              const SizedBox(height: 12),

              Row(
                children: [
                  Icon(LucideIcons.users, size: 12, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text('${r.supportCount} soutien(s)', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                  const SizedBox(width: 12),
                  Icon(LucideIcons.clock, size: 12, color: Colors.grey.shade600),
                  const SizedBox(width: 4),
                  Text('${r.impactedPeople} impacté(s)', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                ],
              ),
              const SizedBox(height: 10),

              // PADA Ticket & Réf. Opérateur
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0D9488).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF0D9488).withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      '🎫 ${r.displayTicketCode}',
                      style: GoogleFonts.firaCode(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF0D9488),
                      ),
                    ),
                  ),
                  if (r.operatorReference != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        'Réf: ${r.operatorReference}',
                        style: GoogleFonts.firaCode(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.black87,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 14),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ReportDetailScreen(report: r))),
                      child: const Text('Détail & Photos', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (r.status == 'active')
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD97706),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(LucideIcons.wrench, size: 14, color: Colors.white),
                        label: const Text('Prendre en charge', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                        onPressed: () => _updateReportStatus(r, 'processing'),
                      ),
                    )
                  else if (r.status == 'processing')
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF16A34A),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(LucideIcons.checkCircle2, size: 14, color: Colors.white),
                        label: const Text('Marquer résolu', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                        onPressed: () => _updateReportStatus(r, 'resolved'),
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
}
