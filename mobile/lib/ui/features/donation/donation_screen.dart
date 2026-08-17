import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';

class DonationScreen extends StatefulWidget {
  const DonationScreen({super.key});

  @override
  State<DonationScreen> createState() => _DonationScreenState();
}

class _DonationScreenState extends State<DonationScreen> {
  int _selectedTierIndex = 2; // 2500 FCFA par défaut
  bool _copied = false;
  static const String _officialNumber = '+225 07 00 00 00 00';

  final List<Map<String, dynamic>> _tiers = [
    {
      'amount': 500,
      'label': 'Soutien',
      'impact': '1 signalement supplémentaire pour la communauté',
      'popular': false,
    },
    {
      'amount': 1000,
      'label': 'Citoyen',
      'impact': '5 signalements + couverture d\'un quartier',
      'popular': false,
    },
    {
      'amount': 2500,
      'label': 'Engagé',
      'impact': '15 signalements + alerte pour 3 quartiers',
      'popular': true,
    },
    {
      'amount': 5000,
      'label': 'Champion',
      'impact': '50 signalements + couverture d\'une commune entière',
      'popular': false,
    },
    {
      'amount': 10000,
      'label': 'Ambassadeur',
      'impact': 'Couverture illimitée d\'une commune pendant 1 mois',
      'popular': false,
    },
  ];

  final List<Map<String, dynamic>> _mobileMoneyOptions = [
    {
      'name': 'Wave',
      'code': 'App Wave',
      'ussd': null,
      'color': Color(0xFF1DA1F2),
      'desc': 'Transfert direct sans frais via l\'application Wave',
    },
    {
      'name': 'Orange Money',
      'code': '#144*62#',
      'ussd': 'tel:*144%23',
      'color': Color(0xFFFF7900),
      'desc': 'Composez le *144# puis suivez les instructions',
    },
    {
      'name': 'MTN MoMo',
      'code': '*133#',
      'ussd': 'tel:*133%23',
      'color': Color(0xFFFFCC00),
      'desc': 'Composez le *133# pour effectuer le paiement',
    },
    {
      'name': 'Moov Money',
      'code': '*155#',
      'ussd': 'tel:*155%23',
      'color': Color(0xFF007A3D),
      'desc': 'Composez le *155# pour soutenir le projet',
    },
  ];

  void _copyNumber() {
    Clipboard.setData(const ClipboardData(text: _officialNumber));
    setState(() => _copied = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('✓ Numéro officiel copié dans le presse-papiers !'),
        backgroundColor: AppTheme.secondaryEmerald,
      ),
    );
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  Future<void> _launchUssd(String? ussd) async {
    if (ussd != null) {
      final uri = Uri.parse(ussd);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      }
    } else {
      _copyNumber();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text('Soutenir le Projet', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ══════════════════════════════════════════════════════════
            // 1. BANNIÈRE HERO D'IMPACT (1:1 Web DonationPage.tsx)
            // ══════════════════════════════════════════════════════════
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0284C7), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(30),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.heart, color: Color(0xFFEF4444), size: 32),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Soutenez SIGNA·CI',
                    style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Chaque don citoyen permet d\'augmenter la capacité de traitement des signalements et d\'étendre la surveillance civique à plus de quartiers d\'Abidjan.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ══════════════════════════════════════════════════════════
            // 2. CHOIX DU PALIER DE DON (FCFA)
            // ══════════════════════════════════════════════════════════
            Text('Choisissez votre palier de don :', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 12),
            ...List.generate(_tiers.length, (index) {
              final tier = _tiers[index];
              final isSelected = _selectedTierIndex == index;
              final isPopular = tier['popular'] as bool;

              return GestureDetector(
                onTap: () => setState(() => _selectedTierIndex = index),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isSelected
                          ? AppTheme.primaryTeal
                          : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isSelected ? LucideIcons.checkCircle2 : LucideIcons.circle,
                        color: isSelected ? AppTheme.primaryTeal : Colors.grey,
                        size: 20,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  '${tier['amount']} FCFA',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                                ),
                                const SizedBox(width: 8),
                                Text('· ${tier['label']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                                if (isPopular) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF3C7),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text('Populaire', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(tier['impact'] as String, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 20),

            // ══════════════════════════════════════════════════════════
            // 3. MOYENS DE PAIEMENT MOBILE MONEY CÔTE D'IVOIRE
            // ══════════════════════════════════════════════════════════
            Text('Moyens de contribution Mobile Money :', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 12),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text('Numéro officiel SIGNA·CI', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          Text(_officialNumber, style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
                        ],
                      ),
                      OutlinedButton.icon(
                        icon: Icon(_copied ? LucideIcons.check : LucideIcons.copy, size: 14),
                        label: Text(_copied ? 'Copié' : 'Copier', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        onPressed: _copyNumber,
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  ..._mobileMoneyOptions.map((opt) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: (opt['color'] as Color).withAlpha(60)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(color: opt['color'] as Color, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(opt['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                Text(opt['desc'] as String, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                              ],
                            ),
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: opt['color'] as Color,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: () => _launchUssd(opt['ussd'] as String?),
                            child: Text(opt['code'] as String, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Center(
              child: Text('Merci infiniment pour votre engagement citoyen ❤️', style: TextStyle(fontSize: 12, color: Colors.grey.shade500, fontStyle: FontStyle.italic)),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
