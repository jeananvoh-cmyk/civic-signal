import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../home/signa_logo.dart';
import '../trends/trends_screen.dart';
import '../partners/partners_screen.dart';
import 'cgu_screen.dart';
import 'privacy_screen.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text('À propos de SIGNA·CI', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ══════════════════════════════════════════════════════════
            // 1. EN-TÊTE LOGO & PRÉSENTATION (1:1 Web)
            // ══════════════════════════════════════════════════════════
            Center(
              child: Column(
                children: [
                  const SizedBox(height: 10),
                  const SignaLogoWidget(size: 48),
                  const SizedBox(height: 12),
                  Text(
                    'SIGNA·CI',
                    style: GoogleFonts.outfit(fontSize: 26, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'CivicTech Ivoirienne pour les Services Publics',
                    style: TextStyle(fontSize: 13, color: Colors.grey, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ══════════════════════════════════════════════════════════
            // 2. NOTRE MISSION (1:1 Web)
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
                    children: const [
                      Icon(LucideIcons.heart, color: Color(0xFFEF4444), size: 20),
                      SizedBox(width: 8),
                      Text('Notre mission', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'SIGNA-CI est la première plateforme citoyenne ivoirienne dédiée à l\'amélioration des services publics. Les habitants signalent en temps réel les coupures d\'eau et d\'électricité, les défaillances d\'infrastructures (éclairage public, voirie, assainissement) et tout dysfonctionnement affectant leur cadre de vie.\n\nEn structurant ces données citoyennes, nous fournissons aux opérateurs (CIE, SODECI), aux mairies et aux autorités des indicateurs fiables pour prioriser les interventions.',
                    style: TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF475569)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ══════════════════════════════════════════════════════════
            // 3. 7 COMMUNES PILOTES (1:1 Web)
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
                    children: const [
                      Icon(LucideIcons.mapPin, color: AppTheme.primaryTeal, size: 20),
                      SizedBox(width: 8),
                      Text('14 Communes du Grand Abidjan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 2.4,
                    ),
                    itemCount: PILOT_COMMUNES.length,
                    itemBuilder: (ctx, i) {
                      final c = PILOT_COMMUNES[i];
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              padding: const EdgeInsets.all(2),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Image.asset(c.logoAsset, fit: BoxFit.contain),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(c.nom, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  Text('${(c.population / 1000).toStringAsFixed(0)}k hab.', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ══════════════════════════════════════════════════════════
            // 4. COMMENT ÇA MARCHE EN 3 ÉTAPES
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
                    children: const [
                      Icon(LucideIcons.zap, color: Color(0xFF0284C7), size: 20),
                      SizedBox(width: 8),
                      Text('Comment ça marche ?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _buildStepRow('01', '1. Signalez en 30s', 'GPS automatique, sélection eau/électricité/voirie et photo facultative.', const Color(0xFF059669), isDark),
                  const SizedBox(height: 10),
                  _buildStepRow('02', '2. Corroborez ensemble', 'Les voisins à proximité confirment l\'alerte en 1 clic pour prouver l\'urgence.', const Color(0xFF0284C7), isDark),
                  const SizedBox(height: 10),
                  _buildStepRow('03', '3. Suivez la résolution', 'Dossier transmis aux techniciens avec suivi en direct jusqu\'au rétablissement.', const Color(0xFFD97706), isDark),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ══════════════════════════════════════════════════════════
            // 5. BANNIÈRE TRANSPARENCE & OPEN DATA
            // ══════════════════════════════════════════════════════════
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF064E3B), Color(0xFF047857)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('📊 DONNÉES PUBLIQUES', style: TextStyle(color: Color(0xFF6EE7B7), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1)),
                  const SizedBox(height: 4),
                  Text('Transparence des Données & Impact', style: GoogleFonts.outfit(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  const Text('Découvrez les délais moyens réels de résolution, les statistiques par commune et les données ouvertes.', style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.4)),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF064E3B),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(LucideIcons.trendingUp, size: 16),
                    label: const Text('Voir la Transparence Open Data', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrendsScreen())),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ══════════════════════════════════════════════════════════
            // 6. LIENS LÉGAUX (CGU & Confidentialité)
            // ══════════════════════════════════════════════════════════
            Material(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    ListTile(
                      leading: const Icon(LucideIcons.building2, color: Color(0xFF0284C7)),
                      title: const Text('Espace Partenaires & Collectivités', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      trailing: const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PartnersScreen())),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(LucideIcons.fileText, color: AppTheme.primaryTeal),
                      title: const Text('Conditions Générales d\'Utilisation (CGU)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      trailing: const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CguScreen())),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      leading: const Icon(LucideIcons.shieldCheck, color: Color(0xFF16A34A)),
                      title: const Text('Politique de Confidentialité & RGPD/CI', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      trailing: const Icon(LucideIcons.chevronRight, size: 16, color: Colors.grey),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PrivacyScreen())),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 30),

            Center(
              child: Text('© 2026 SIGNA·CI — Fiers d\'être ivoirien ❤️', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildStepRow(String stepNum, String title, String desc, Color color, bool isDark) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: color.withAlpha(isDark ? 50 : 30),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(stepNum, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 12)),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 2),
              Text(desc, style: TextStyle(fontSize: 11, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B), height: 1.3)),
            ],
          ),
        ),
      ],
    );
  }
}
