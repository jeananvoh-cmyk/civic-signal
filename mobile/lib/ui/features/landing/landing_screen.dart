import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../map/map_screen.dart';
import '../reports/create_report_screen.dart';

class LandingScreen extends ConsumerStatefulWidget {
  const LandingScreen({super.key});

  @override
  ConsumerState<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends ConsumerState<LandingScreen> {
  int _wordIndex = 0;
  Timer? _timer;

  final List<Map<String, dynamic>> _rotatingWords = [
    {'text': 'lampadaires cassés', 'color': const Color(0xFFF59E0B)},
    {'text': 'coupures d\'eau', 'color': const Color(0xFF38BDF8)},
    {'text': 'coupures d\'électricité', 'color': const Color(0xFFFACC15)},
    {'text': 'caniveaux bouchés', 'color': const Color(0xFF2DD4BF)},
    {'text': 'nids de poules', 'color': const Color(0xFFCBD5E1)},
  ];

  final List<Map<String, dynamic>> _communes = [
    {'name': 'Abobo', 'color': const Color(0xFF3B82F6)},
    {'name': 'Adjamé', 'color': const Color(0xFFEAB308)},
    {'name': 'Bingerville', 'color': const Color(0xFFA855F7)},
    {'name': 'Cocody', 'color': const Color(0xFF22C55E)},
    {'name': 'Koumassi', 'color': const Color(0xFFEC4899)},
    {'name': 'Port-Bouët', 'color': const Color(0xFFF97316)},
    {'name': 'Yopougon', 'color': const Color(0xFFEF4444)},
  ];

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (mounted) {
        setState(() {
          _wordIndex = (_wordIndex + 1) % _rotatingWords.length;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentWord = _rotatingWords[_wordIndex];

    return Scaffold(
      backgroundColor: const Color(0xFF0B1329), // Dark Hero Navy
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B1329),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primaryTeal.withAlpha(50),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.radio, color: AppTheme.primaryTeal, size: 20),
            ),
            const SizedBox(width: 8),
            Text(
              'SIGNA·CI',
              style: GoogleFonts.outfit(
                fontWeight: FontWeight.bold,
                fontSize: 20,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              'CÔTE D\'IVOIRE',
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Colors.grey[400],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.search, color: Colors.white, size: 20),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(LucideIcons.bell, color: Colors.white, size: 20),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(LucideIcons.user, color: Colors.white, size: 20),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── HERO SECTION ──
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Signalez les',
                    style: GoogleFonts.outfit(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      height: 1.1,
                    ),
                  ),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 400),
                    transitionBuilder: (Widget child, Animation<double> animation) {
                      return FadeTransition(
                        opacity: animation,
                        child: SlideTransition(
                          position: Tween<Offset>(
                            begin: const Offset(0.0, 0.2),
                            end: Offset.zero,
                          ).animate(animation),
                          child: child,
                        ),
                      );
                    },
                    child: Text(
                      currentWord['text'],
                      key: ValueKey<int>(_wordIndex),
                      style: GoogleFonts.outfit(
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                        color: currentWord['color'],
                        height: 1.1,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'La première plateforme citoyenne ivoirienne où les habitants contribuent à l\'amélioration des services et infrastructures publiques.',
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      color: Colors.grey[300],
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Badges (Active outages & Communes)
                  Row(
                    children: [
                      _buildHeroBadge('1 coupure active', LucideIcons.radio, const Color(0xFFEF4444)),
                      const SizedBox(width: 8),
                      _buildHeroBadge('07 communes • Abidjan', LucideIcons.shieldCheck, Colors.grey),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Hero Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const CreateReportScreen()),
                            );
                          },
                          icon: const Icon(LucideIcons.zap, size: 18),
                          label: const Text('Signaler maintenant →'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFD97706), // Amber Gold
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const MapScreen()),
                          );
                        },
                        icon: const Icon(LucideIcons.barChart2, size: 18, color: Colors.white),
                        label: const Text('Dashboard', style: TextStyle(color: Colors.white)),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: Colors.white.withAlpha(80)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Communes Pills Bar
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _communes.map((c) {
                        return Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: (c['color'] as Color).withAlpha(40),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: (c['color'] as Color).withAlpha(100)),
                          ),
                          child: Text(
                            c['name'],
                            style: TextStyle(
                              color: c['color'],
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),

            // ── KEY METRICS COUNTERS ──
            Container(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              color: const Color(0xFF0F1B38),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildMetricStat('7', 'Communes', LucideIcons.mapPin),
                  _buildMetricStat('42', 'Soumis', LucideIcons.barChart2),
                  _buildMetricStat('35', 'Résolus', LucideIcons.trendingUp),
                  _buildMetricStat('1', 'Actifs', LucideIcons.radio),
                ],
              ),
            ),

            // ── DÉLAI MOYEN DE RÉSOLUTION & PREPAID ELECTRICITY BANNER ──
            Container(
              color: Colors.white,
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Délai Card
                  Text(
                    'Délai moyen de résolution',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildDelayCard('5j', 'CIE', LucideIcons.zap, Colors.amber[700]!),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildDelayCard('4j', 'SODECI', LucideIcons.droplet, Colors.lightBlue[600]!),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Prepaid Electricity Banner
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFCD34D)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withAlpha(40),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                '• Nouveau sur SIGNA-CI',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFFB45309),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Suivez votre électricité prépayée',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Collez votre SMS de recharge CIE • Suivez vos kWh restants • Recevez une estimation de votre autonomie.',
                          style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () {},
                            icon: const Icon(LucideIcons.zap, size: 16),
                            label: const Text('Essayer maintenant'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFD97706),
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // ── 5 CATEGORIES GRID ──
                  Center(
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            '5 CATÉGORIES',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Que voulez-vous signaler ?',
                          style: GoogleFonts.outfit(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Cliquez directement sur le problème pour lancer votre signalement',
                          style: TextStyle(color: Colors.grey[600], fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Category Cards Grid
                  _buildCategoryGridCard('Coupures d\'eau', 'Plus d\'eau au robinet ?', LucideIcons.droplet, Colors.lightBlue),
                  const SizedBox(height: 10),
                  _buildCategoryGridCard('Coupures d\'électricité', 'Coupure de courant ?', LucideIcons.zap, Colors.amber),
                  const SizedBox(height: 10),
                  _buildCategoryGridCard('Lampadaires cassés', 'Lampadaire hors service ?', LucideIcons.sun, Colors.orange),
                  const SizedBox(height: 10),
                  _buildCategoryGridCard('Caniveaux bouchés', 'Caniveau obstrué ?', LucideIcons.waves, Colors.teal),
                  const SizedBox(height: 10),
                  _buildCategoryGridCard('Nids de poules', 'Route dégradée ?', LucideIcons.truck, Colors.grey),

                  const SizedBox(height: 30),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroBadge(String text, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withAlpha(30),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(80)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildMetricStat(String number, String label, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: AppTheme.primaryTeal, size: 20),
        const SizedBox(height: 4),
        Text(
          number,
          style: GoogleFonts.outfit(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.grey, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildDelayCard(String time, String title, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withAlpha(15),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withAlpha(40)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          Text(time, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
          Text(title, style: TextStyle(fontSize: 12, color: Colors.grey[700])),
        ],
      ),
    );
  }

  Widget _buildCategoryGridCard(String title, String subtitle, IconData icon, Color color) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const CreateReportScreen()),
        );
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withAlpha(15),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withAlpha(50)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                  ),
                ],
              ),
            ),
            Icon(LucideIcons.chevronRight, color: color),
          ],
        ),
      ),
    );
  }
}
