import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';

class TrendsScreen extends StatelessWidget {
  const TrendsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tendances & Résultats', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Banner
            Text(
              'Statistiques d\'Impact Civique',
              style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Données consolidées sur les résolutions d\'incidents en Côte d\'Ivoire',
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
            const SizedBox(height: 20),

            // Delay Cards Grid
            Row(
              children: [
                Expanded(
                  child: _buildTrendCard('5 jours', 'Délai Moy. CIE', LucideIcons.zap, Colors.amber),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildTrendCard('4 jours', 'Délai Moy. SODECI', LucideIcons.droplet, Colors.lightBlue),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Resolution Stats Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(LucideIcons.checkCircle2, color: AppTheme.secondaryEmerald),
                        SizedBox(width: 8),
                        Text(
                          'Taux de Résolution Globale',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(
                      value: 0.83, // 83%
                      backgroundColor: Colors.grey[200],
                      color: AppTheme.secondaryEmerald,
                      minHeight: 10,
                      borderRadius: BorderRadius.circular(5),
                    ),
                    const SizedBox(height: 8),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('35 résolus sur 42 signalés', style: TextStyle(fontSize: 13)),
                        Text('83.3%', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.secondaryEmerald)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Top Communes Ranking
            const Text(
              'Activité par Commune',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
            ),
            const SizedBox(height: 12),
            _buildCommuneRankRow('1. Yopougon', '14 signalements', '12 résolus'),
            _buildCommuneRankRow('2. Abobo', '11 signalements', '9 résolus'),
            _buildCommuneRankRow('3. Cocody', '9 signalements', '8 résolus'),
            _buildCommuneRankRow('4. Koumassi', '5 signalements', '4 résolus'),
            _buildCommuneRankRow('5. Marcory', '3 signalements', '2 résolus'),
          ],
        ),
      ),
    );
  }

  Widget _buildTrendCard(String val, String title, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withAlpha(60)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 10),
          Text(
            val,
            style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.bold, color: color),
          ),
          Text(title, style: TextStyle(fontSize: 12, color: Colors.grey[700])),
        ],
      ),
    );
  }

  Widget _buildCommuneRankRow(String commune, String reports, String resolved) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(commune, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(reports),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: AppTheme.secondaryEmerald.withAlpha(25),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            resolved,
            style: const TextStyle(color: AppTheme.secondaryEmerald, fontWeight: FontWeight.bold, fontSize: 12),
          ),
        ),
      ),
    );
  }
}
