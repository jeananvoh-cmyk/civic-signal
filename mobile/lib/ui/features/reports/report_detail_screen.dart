import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../../common/civic_photo_view.dart';

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

      if (res is List && mounted) {
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isResolved = _currentReport.status == 'resolved';
    final isElec = _currentReport.serviceType == 'electricity';
    final isEau = _currentReport.serviceType == 'water';
    final serviceColor = isElec ? const Color(0xFFF59E0B) : isEau ? const Color(0xFF0284C7) : const Color(0xFF9333EA);
    final serviceLabel = isElec ? 'Électricité (CIE)' : isEau ? 'Eau Potable (SODECI)' : 'Voirie & Salubrité (Mairie)';
    final shortId = _currentReport.id.length >= 8 ? _currentReport.id.substring(0, 8).toUpperCase() : _currentReport.id;

    final communeData = findCommuneByName(_currentReport.commune);

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text('#SIG-$shortId', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.share2, size: 20),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: 'Signalement #SIG-$shortId à ${_currentReport.commune} (${_currentReport.quartier}) sur SIGNA·CI: https://signa.ci/signalement/${_currentReport.id}'));
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
                    const SizedBox(height: 14),

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
                        separatorBuilder: (_, __) => const Divider(height: 20),
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
