import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../../common/civic_photo_view.dart';
import '../../common/whatsapp_icon.dart';

class ReportDetailScreen extends StatefulWidget {
  final ReportModel report;

  const ReportDetailScreen({super.key, required this.report});

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  late ReportModel _currentReport;
  bool _isCorroborating = false;
  bool _isResolving = false;

  // Comments
  List<Map<String, dynamic>> _comments = [];
  bool _isLoadingComments = true;
  final TextEditingController _commentController = TextEditingController();
  bool _isPostingComment = false;

  @override
  void initState() {
    super.initState();
    _currentReport = widget.report;
    _fetchReportDetails();
    _fetchComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _fetchReportDetails() async {
    try {
      final res = await Supabase.instance.client
          .from('reports')
          .select()
          .eq('id', _currentReport.id)
          .maybeSingle();

      if (res != null && mounted) {
        setState(() {
          _currentReport = ReportModel.fromJson(Map<String, dynamic>.from(res));
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchComments() async {
    try {
      final res = await Supabase.instance.client
          .from('report_comments')
          .select()
          .eq('report_id', _currentReport.id)
          .order('created_at', ascending: true);

      if (mounted) {
        setState(() {
          _comments = List<Map<String, dynamic>>.from(res);
          _isLoadingComments = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingComments = false);
    }
  }

  Future<void> _postComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;

    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez vous connecter pour commenter.'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _isPostingComment = true);
    try {
      await Supabase.instance.client.from('report_comments').insert({
        'report_id': _currentReport.id,
        'user_id': user.id,
        'content': text,
      });

      _commentController.clear();
      _fetchComments();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur envoi: $e')));
    } finally {
      if (mounted) setState(() => _isPostingComment = false);
    }
  }

  Future<void> _corroborate() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez vous connecter pour confirmer.'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _isCorroborating = true);
    try {
      await Supabase.instance.client.rpc('corroborate_report', params: {'p_report_id': _currentReport.id});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✓ Merci ! Votre confirmation citoyenne a été enregistrée.'), backgroundColor: AppTheme.secondaryEmerald),
        );
        _fetchReportDetails();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
    } finally {
      if (mounted) setState(() => _isCorroborating = false);
    }
  }

  Future<void> _markResolved() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Confirmer le rétablissement'),
        content: const Text('Confirmez-vous que l\'incident est désormais résolu sur les lieux ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Oui, c\'est résolu', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() => _isResolving = true);
      try {
        await Supabase.instance.client
            .from('reports')
            .update({'status': 'resolved', 'resolved_at': DateTime.now().toIso8601String()})
            .eq('id', _currentReport.id);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('✓ Signalement marqué comme résolu !'), backgroundColor: AppTheme.secondaryEmerald),
          );
          _fetchReportDetails();
        }
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      } finally {
        if (mounted) setState(() => _isResolving = false);
      }
    }
  }

  void _shareVictoryToWhatsApp() {
    final ticketCode = _currentReport.displayTicketCode;
    final commune = _currentReport.commune;
    final quartier = _currentReport.quartier;
    final link = 'https://signa.ci/signalement/${_currentReport.id}';
    final shareText = '''✅ INCIDENT RÉSOLU ! 🎉

📍 $quartier ($commune)
🎫 Ticket : $ticketCode
🛠️ Le problème a été rétabli et vérifié sur le terrain grâce à la mobilisation citoyenne SIGNA.ci.

🔗 Détails : $link
''';

    launchUrl(
      Uri.parse('https://wa.me/?text=${Uri.encodeComponent(shareText)}'),
      mode: LaunchMode.externalApplication,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isResolved = _currentReport.status == 'resolved';
    final isElec = _currentReport.serviceType == 'electricity';
    final isEau = _currentReport.serviceType == 'water';
    final serviceColor = isElec ? const Color(0xFFF59E0B) : isEau ? const Color(0xFF0284C7) : const Color(0xFF9333EA);
    final serviceLabel = isElec ? 'Électricité (CIE)' : isEau ? 'Eau Potable (SODECI)' : 'Voirie & Salubrité (Mairie)';
    final ticketCode = _currentReport.displayTicketCode;

    final communeData = findCommuneByName(_currentReport.commune);

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text(ticketCode, style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.share2, size: 20),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: 'Signalement $ticketCode à ${_currentReport.commune} (${_currentReport.quartier}) sur SIGNA·CI: https://signa.ci/signalement/${_currentReport.id}'));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Lien du signalement copié !'), backgroundColor: AppTheme.secondaryEmerald),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _fetchReportDetails();
          await _fetchComments();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ══════════════════════════════════════════════════════════
              // 1. CARTE RÉSUMÉ EN-TÊTE (1:1 Web)
              // ══════════════════════════════════════════════════════════
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isResolved ? const Color(0xFFBBF7D0) : const Color(0xFFFED7AA)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withAlpha(6), blurRadius: 10, offset: const Offset(0, 3)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (communeData != null)
                          Container(
                            width: 36,
                            height: 36,
                            padding: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Image.asset(communeData.logoAsset, fit: BoxFit.contain),
                          ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${_currentReport.commune} · ${_currentReport.quartier}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              Text(serviceLabel, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: serviceColor)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isResolved ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isResolved ? '✓ Résolu' : '🔴 En cours',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isResolved ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // 🎫 Encadré Ticket & Adressage PADA (1:1 Web)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(LucideIcons.ticket, size: 14, color: Color(0xFF059669)),
                                  const SizedBox(width: 6),
                                  Text(
                                    'TICKET : ',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade600),
                                  ),
                                  Text(
                                    ticketCode,
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, fontFamily: 'monospace', color: Color(0xFF059669)),
                                  ),
                                ],
                              ),
                              InkWell(
                                onTap: () {
                                  Clipboard.setData(ClipboardData(text: ticketCode));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Ticket $ticketCode copié !'), backgroundColor: AppTheme.secondaryEmerald),
                                  );
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF059669).withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(LucideIcons.copy, size: 12, color: Color(0xFF059669)),
                                      SizedBox(width: 4),
                                      Text('Copier', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 14, thickness: 0.5),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(LucideIcons.building2, size: 13, color: Color(0xFF059669)),
                              const SizedBox(width: 6),
                              Expanded(
                                child: RichText(
                                  text: TextSpan(
                                    style: TextStyle(fontSize: 11, color: isDark ? Colors.white70 : Colors.black87),
                                    children: [
                                      TextSpan(text: 'PADA (MCLU) : ', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey.shade600)),
                                      TextSpan(text: _currentReport.displayPadaAddress, style: const TextStyle(fontWeight: FontWeight.w600)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),

                    Text(_currentReport.description, style: const TextStyle(fontSize: 14, height: 1.4)),
                    const SizedBox(height: 14),

                    // Badges métadonnées
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildPill(LucideIcons.users, '${_currentReport.impactedPeople} impacté(s)', const Color(0xFF0284C7), const Color(0xFFE0F2FE)),
                        if (_currentReport.babies > 0)
                          _buildPill(LucideIcons.baby, '${_currentReport.babies} bébé(s)', const Color(0xFFDC2626), const Color(0xFFFEF2F2)),
                        if (_currentReport.pregnant > 0)
                          _buildPill(LucideIcons.heart, '${_currentReport.pregnant} enceinte(s)', const Color(0xFFEC4899), const Color(0xFFFDF2F8)),
                        if (_currentReport.elderly > 0)
                          _buildPill(LucideIcons.userCheck, '${_currentReport.elderly} aîné(s)', const Color(0xFF7C3AED), const Color(0xFFF5F3FF)),
                        _buildPill(LucideIcons.checkCircle, '✓ ${_currentReport.supportCount} corroboration(s)', const Color(0xFF16A34A), const Color(0xFFF0FDF4)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ══════════════════════════════════════════════════════════
              // BANNIÈRE VICTOIRE CITOYENNE & PARTAGE WHATSAPP
              // ══════════════════════════════════════════════════════════
              if (isResolved) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFDCFCE7), Color(0xFFF0FDF4)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF86EFAC), width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: Color(0xFF16A34A),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(LucideIcons.checkCheck, color: Colors.white, size: 18),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Incident Rétabli & Confirmé 🎉',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 14,
                                    color: const Color(0xFF14532D),
                                  ),
                                ),
                                const Text(
                                  'Partagez cette bonne nouvelle avec vos voisins !',
                                  style: TextStyle(fontSize: 11, color: Color(0xFF15803D)),
                                ),
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
                            backgroundColor: const Color(0xFF25D366),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            elevation: 0,
                          ),
                          icon: const WhatsAppIcon(size: 18),
                          label: const Text(
                            'Annoncer la résolution sur WhatsApp',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          onPressed: _shareVictoryToWhatsApp,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // ══════════════════════════════════════════════════════════
              // ENCADRÉ RETOUR OPÉRATEUR (CIE, SODECI, Mairie)
              // ══════════════════════════════════════════════════════════
              if (_currentReport.operatorName != null || _currentReport.operatorReference != null || _currentReport.operatorLastNote != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D9488).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF0D9488).withValues(alpha: 0.3), width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(LucideIcons.building2, size: 18, color: Color(0xFF0D9488)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _currentReport.operatorName?.toUpperCase() ?? 'INTERVENTION OPÉRATEUR',
                              style: GoogleFonts.outfit(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: const Color(0xFF0D9488),
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                          if (_currentReport.operatorReference != null)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF0F172A) : Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFF0D9488).withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                'Réf: ${_currentReport.operatorReference}',
                                style: GoogleFonts.firaCode(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF0D9488),
                                ),
                              ),
                            ),
                        ],
                      ),
                      if (_currentReport.operatorLastNote != null) ...[
                        const SizedBox(height: 10),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1E293B) : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                          ),
                          child: Text(
                            '"${_currentReport.operatorLastNote}"',
                            style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic, height: 1.3),
                          ),
                        ),
                      ],
                      if (_currentReport.estimatedResolutionTime != null && !isResolved) ...[
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(LucideIcons.clock, size: 14, color: Color(0xFFEA580C)),
                            const SizedBox(width: 6),
                            Text(
                              'Intervention estimée : ${_currentReport.estimatedResolutionTime!.toLocal().toString().substring(0, 16)}',
                              style: const TextStyle(fontSize: 12, color: Color(0xFFEA580C), fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // ══════════════════════════════════════════════════════════
              // 2. CHRONOLOGIE DU SUIVI (Timeline 1:1 Web)
              // ══════════════════════════════════════════════════════════
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Chronologie de Résolution', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 14),

                    _buildTimelineStep(
                      done: true,
                      title: '01. Signalement déclaré',
                      subtitle: 'Enregistré sur la plateforme citoyenne',
                      date: _currentReport.createdAt.toLocal().toString().substring(0, 16),
                      icon: LucideIcons.fileText,
                    ),
                    _buildTimelineStep(
                      done: _currentReport.supportCount > 0,
                      title: '02. Corroboration citoyenne',
                      subtitle: '${_currentReport.supportCount} voisin(s) ont confirmé sur place',
                      icon: LucideIcons.users,
                    ),
                    _buildTimelineStep(
                      done: _currentReport.supportCount >= 3,
                      title: '03. Relais aux opérateurs',
                      subtitle: 'Transmission automatique aux services techniques',
                      icon: LucideIcons.send,
                    ),
                    _buildTimelineStep(
                      done: isResolved,
                      title: '04. Rétablissement / Réparation',
                      subtitle: isResolved ? 'Service rétabli et validé' : 'En attente de résolution',
                      icon: LucideIcons.checkCircle2,
                      isLast: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ══════════════════════════════════════════════════════════
              // 3. GALERIE PHOTOS
              // ══════════════════════════════════════════════════════════
              if ((_currentReport.photoUrls != null && _currentReport.photoUrls!.isNotEmpty) ||
                  (_currentReport.photoUrl != null && _currentReport.photoUrl!.isNotEmpty)) ...[
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Photos du signalement', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      CivicPhotoView(
                        photoPath: _currentReport.photoUrl,
                        photoPaths: _currentReport.photoUrls,
                        reportDate: _currentReport.createdAt,
                        aspectRatio: 16 / 10,
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // ══════════════════════════════════════════════════════════
              // 4. BOUTONS D'ACTIONS (Corroborer / Rétablir)
              // ══════════════════════════════════════════════════════════
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEA580C),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: _isCorroborating
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(LucideIcons.checkCircle, color: Colors.white, size: 18),
                      label: const Text('Corroborer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      onPressed: _isCorroborating || isResolved ? null : _corroborate,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        side: const BorderSide(color: Color(0xFF16A34A), width: 1.5),
                      ),
                      icon: _isResolving
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(LucideIcons.checkCircle2, color: Color(0xFF16A34A), size: 18),
                      label: const Text('C\'est réparé', style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold, fontSize: 14)),
                      onPressed: _isResolving || isResolved ? null : _markResolved,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ══════════════════════════════════════════════════════════
              // 5. COMMENTAIRES CITOYENS & OPÉRATEURS (1:1 Web)
              // ══════════════════════════════════════════════════════════
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.messageSquare, size: 18, color: AppTheme.primaryTeal),
                        const SizedBox(width: 8),
                        Text('Commentaires (${_comments.length})', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                    const SizedBox(height: 14),

                    if (_isLoadingComments)
                      const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
                    else if (_comments.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16.0),
                        child: Center(child: Text('Aucun commentaire pour l\'instant.', style: TextStyle(fontSize: 12, color: Colors.grey))),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _comments.length,
                        separatorBuilder: (_, _) => const Divider(height: 20),
                        itemBuilder: (ctx, i) {
                          final c = _comments[i];
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              CircleAvatar(
                                radius: 14,
                                backgroundColor: AppTheme.primaryTeal.withAlpha(30),
                                child: const Icon(LucideIcons.user, size: 14, color: AppTheme.primaryTeal),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      (c['created_at'] as String? ?? '').length >= 16 ? (c['created_at'] as String).substring(0, 16).replaceFirst('T', ' ') : '',
                                      style: const TextStyle(fontSize: 10, color: Colors.grey),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(c['content'] as String? ?? '', style: const TextStyle(fontSize: 13, height: 1.3)),
                                  ],
                                ),
                              ),
                            ],
                          );
                        },
                      ),

                    const SizedBox(height: 16),
                    // Formulaire commentaire
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _commentController,
                            maxLength: 200,
                            decoration: InputDecoration(
                              hintText: 'Ajouter un commentaire...',
                              hintStyle: const TextStyle(fontSize: 12),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          style: IconButton.styleFrom(backgroundColor: AppTheme.primaryTeal, padding: const EdgeInsets.all(12)),
                          icon: _isPostingComment
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Icon(LucideIcons.send, color: Colors.white, size: 18),
                          onPressed: _isPostingComment ? null : _postComment,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPill(IconData icon, String text, Color color, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withAlpha(50))),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 6),
          Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildTimelineStep({
    required bool done,
    required String title,
    required String subtitle,
    String? date,
    required IconData icon,
    bool isLast = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: done ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
                border: Border.all(color: done ? const Color(0xFF16A34A) : Colors.grey.shade300),
              ),
              child: Icon(icon, size: 14, color: done ? const Color(0xFF16A34A) : Colors.grey),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 30,
                color: done ? const Color(0xFF16A34A) : Colors.grey.shade300,
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: done ? const Color(0xFF0F172A) : Colors.grey)),
                    if (date != null) Text(date, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                  ],
                ),
                Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
