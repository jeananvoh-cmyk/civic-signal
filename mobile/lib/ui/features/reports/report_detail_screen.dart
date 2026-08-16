import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';

class ReportDetailScreen extends StatefulWidget {
  final ReportModel report;

  const ReportDetailScreen({super.key, required this.report});

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  late ReportModel _currentReport;
  bool _isCorroborating = false;

  @override
  void initState() {
    super.initState();
    _currentReport = widget.report;
  }

  Future<void> _corroborate(bool isStillOut) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez vous connecter pour confirmer ce signalement.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isCorroborating = true);

    try {
      await Supabase.instance.client.rpc('corroborate_report', params: {
        'p_report_id': _currentReport.id,
        'p_is_confirming': isStillOut,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Merci ! Votre confirmation citoyenne a été enregistrée.'),
            backgroundColor: AppTheme.secondaryEmerald,
          ),
        );
        setState(() {
          _isCorroborating = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Confirmation enregistrée: $e'),
            backgroundColor: AppTheme.secondaryEmerald,
          ),
        );
        setState(() => _isCorroborating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isResolved = _currentReport.status == 'resolved';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Signalement #${_currentReport.id.substring(0, 8).toUpperCase()}',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── CARD HEADER ──
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isResolved
                      ? AppTheme.secondaryEmerald.withValues(alpha: 0.3)
                      : AppTheme.amberAccent.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primaryTeal.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _currentReport.serviceType.toUpperCase(),
                          style: GoogleFonts.outfit(
                            color: AppTheme.primaryTeal,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: (isResolved ? AppTheme.secondaryEmerald : Colors.orange)
                              .withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          isResolved ? '🟢 Résolu' : '🟡 En cours',
                          style: TextStyle(
                            color: isResolved ? AppTheme.secondaryEmerald : Colors.orange,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(LucideIcons.mapPin, size: 18, color: AppTheme.primaryTeal),
                      const SizedBox(width: 6),
                      Text(
                        '${_currentReport.commune}, ${_currentReport.quartier}',
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  if (_currentReport.description.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      _currentReport.description,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── TIMELINE DE RÉSOLUTION 4 ÉTAPES ──
            Text(
              'Timeline de Résolution',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _buildTimelineStep(
                    stepNumber: '1',
                    title: 'Signalement émis',
                    subtitle: 'Inscrit au registre citoyen',
                    isDone: true,
                  ),
                  _buildTimelineLine(isDone: true),
                  _buildTimelineStep(
                    stepNumber: '2',
                    title: 'Corroboration des voisins',
                    subtitle: '${_currentReport.verifications}/3 confirmations de proximité',
                    isDone: _currentReport.verifications >= 1,
                  ),
                  _buildTimelineLine(isDone: _currentReport.verifications >= 3),
                  _buildTimelineStep(
                    stepNumber: '3',
                    title: 'Transmis à l’opérateur',
                    subtitle: 'Prise en charge par l’équipe technique',
                    isDone: _currentReport.verifications >= 3 || isResolved,
                  ),
                  _buildTimelineLine(isDone: isResolved),
                  _buildTimelineStep(
                    stepNumber: '4',
                    title: 'Incident résolu',
                    subtitle: 'Service ou voie rétabli',
                    isDone: isResolved,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── SECTION VOTE CORROBORATION VOISINS ──
            Text(
              'Êtes-vous sur place ?',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Aidez vos voisins en confirmant la situation actuelle dans ce quartier.',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.dangerRose,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: _isCorroborating ? null : () => _corroborate(true),
                    icon: const Icon(LucideIcons.alertTriangle, size: 18),
                    label: const Text('Toujours coupé'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.secondaryEmerald,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: _isCorroborating ? null : () => _corroborate(false),
                    icon: const Icon(LucideIcons.checkCircle2, size: 18),
                    label: const Text('Service rétabli'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineStep({
    required String stepNumber,
    required String title,
    required String subtitle,
    required bool isDone,
  }) {
    return Row(
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: isDone ? AppTheme.secondaryEmerald : Colors.grey[300],
          child: Text(
            stepNumber,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isDone ? Colors.white : Colors.grey[700],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: isDone ? null : Colors.grey,
                ),
              ),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineLine({required bool isDone}) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(left: 13, top: 4, bottom: 4),
        width: 2,
        height: 18,
        color: isDone ? AppTheme.secondaryEmerald : Colors.grey[300],
      ),
    );
  }
}
