import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';

class CguScreen extends StatelessWidget {
  const CguScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text('Conditions Générales (CGU)', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.primaryTeal.withAlpha(20),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primaryTeal.withAlpha(50)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(LucideIcons.scale, color: AppTheme.primaryTeal, size: 14),
                  SizedBox(width: 6),
                  Text('Cadre Juridique Droit Ivoirien & ARTCI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Conditions Générales d\'Utilisation & Mentions Légales',
              style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            const Text('Dernière mise à jour : 30 juillet 2026 · Version 1.1 officielle', style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 16),

            _buildSection(
              isDark,
              LucideIcons.fileText,
              '1. Objet du Service & Statut de la Plateforme',
              'SIGNA.ci est une plateforme citoyenne participative d\'intérêt public dédiée à la détection, au signalement et à la cartographie des dégradations d\'infrastructures urbaines (eau potable, électricité, voirie, canaux, salubrité) en Côte d\'Ivoire.\n\nSIGNA.ci agit en tant qu\'intermédiaire technique et canal civique d\'alerte. Les signalements validés et anonymisés sont transmis aux services des Mairies et des opérateurs concessionnaires (CIE, SODECI). SIGNA.ci ne se substitue pas aux services d\'urgence de l\'État.',
            ),

            _buildSection(
              isDark,
              LucideIcons.scale,
              '2. Cadre Légal & Réglementation Applicable',
              'Les présentes CGU sont régies par le droit de la République de Côte d\'Ivoire et se conforment à :\n• Loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel (contrôlée par l\'APDP / ARTCI).\n• Loi n° 2013-451 du 19 juin 2013 relative à la lutte contre la cybercriminalité.\n• Loi n° 2013-546 du 30 juillet 2013 relative aux transactions électroniques.',
            ),

            _buildSection(
              isDark,
              LucideIcons.users,
              '3. Engagements & Responsabilités des Citoyens',
              'Tout utilisateur s\'engage à utiliser la plateforme de bonne foi et de manière civique :\n• Fournir des informations exactes, sincères et vérifiables lors de la déclaration d\'un incident.\n• Ne pas publier de fausses alertes, de contenus diffamatoires ou d\'injures.\n• Ne pas inclure de visages ou de plaques d\'immatriculation sans consentement sur les photos jointes.\n\n⚠️ Rappel Légal : La soumission intentionnelle de faux signalements ou l\'usurpation d\'identité constituent des infractions pénales passibles des peines prévues par la législation ivoirienne.',
            ),

            _buildSection(
              isDark,
              LucideIcons.shieldCheck,
              '4. Modération & Suppression des Contenus',
              'SIGNA.ci applique une modération conforme aux standards civiques et aux directives de l\'ARTCI.\nL\'équipe de modération se réserve le droit de refuser, modifier ou supprimer immédiatement tout signalement manifestement infondé, à caractère haineux ou attentatoire à l\'ordre public.',
            ),

            _buildSection(
              isDark,
              LucideIcons.gavel,
              '5. Droit Applicable & Juridiction Compétente',
              'Les présentes Conditions Générales d\'Utilisation sont exclusivement soumises au Droit Ivoirien. En cas de litige, compétence exclusive est attribuée aux Tribunaux compétents d\'Abidjan, République de Côte d\'Ivoire.',
            ),

            const SizedBox(height: 20),
            Center(
              child: Text('© 2026 SIGNA·CI · Abidjan, Côte d\'Ivoire', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(bool isDark, IconData icon, String title, String content) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: AppTheme.primaryTeal.withAlpha(20), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: AppTheme.primaryTeal, size: 18),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(content, style: const TextStyle(fontSize: 12, height: 1.5, color: Color(0xFF64748B))),
        ],
      ),
    );
  }
}
