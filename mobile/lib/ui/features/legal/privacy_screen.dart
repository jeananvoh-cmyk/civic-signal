import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text('Politique de Confidentialité', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF16A34A).withAlpha(20),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF16A34A).withAlpha(50)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(LucideIcons.shieldCheck, color: Color(0xFF16A34A), size: 14),
                  SizedBox(width: 6),
                  Text('Loi n° 2013-450 relative aux données personnelles (ARTCI / APDP)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'Protection de vos Données Personnelles',
              style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            const Text('Dernière mise à jour : 30 juillet 2026 · Applicable sur mobile & web', style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 16),

            _buildSection(
              isDark,
              LucideIcons.scale,
              '1. Identité du Responsable de Traitement',
              'Le responsable des traitements de données à caractère personnel effectués sur la plateforme citoyenne SIGNA·CI est basé à Abidjan, République de Côte d\'Ivoire.\nToutes les données personnelles sont traitées dans le respect strict de la législation ivoirienne en vigueur sous le contrôle de l\'ARTCI.',
            ),

            _buildSection(
              isDark,
              LucideIcons.database,
              '2. Données Collectées & Finalités',
              'SIGNA·CI collecte uniquement les données adéquates et nécessaires :\n• Données de profil : adresse email, nom (optionnel), numéro de téléphone (optionnel).\n• Données de signalement : commune, quartier, coordonnées GPS de l\'incident, photos.\n\nFinalités exclusives :\n• Transmission des alertes techniques aux opérateurs concessionnaires (CIE, SODECI, Mairies).\n• Envoi de notifications push sur l\'évolution de vos signalements.\n• Élaboration de statistiques d\'intérêt public 100% anonymisées.',
            ),

            _buildSection(
              isDark,
              LucideIcons.lock,
              '3. Durée de Conservation & Sécurité',
              '• Chiffrement TLS / HTTPS de l\'ensemble des flux.\n• Authentification sécurisée via Supabase.\n• En cas de suppression de compte, vos données identifiables sont définitivement effacées sous 30 jours. Seuls les signalements restent archivés sous forme rigoureusement anonyme.',
            ),

            _buildSection(
              isDark,
              LucideIcons.trash2,
              '4. Vos Droits (Accès, Rectification, Suppression)',
              'Conformément aux articles 28 à 34 de la Loi n° 2013-450, vous disposez d\'un droit d\'accès, de rectification et de suppression de toutes vos données personnelles directement depuis l\'écran Profil ou sur simple demande.',
            ),

            const SizedBox(height: 20),
            Center(
              child: Text('© 2026 SIGNA·CI · Protégé par le droit ivoirien', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
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
                decoration: BoxDecoration(color: const Color(0xFF16A34A).withAlpha(20), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: const Color(0xFF16A34A), size: 18),
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
