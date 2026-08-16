import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
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
  bool _showAlertBanner = true;

  final List<Map<String, dynamic>> _rotatingWords = [
    {'text': 'nids de poules', 'color': const Color(0xFFE2E8F0)},
    {'text': 'coupures d\'eau', 'color': const Color(0xFF38BDF8)},
    {'text': 'coupures d\'électricité', 'color': const Color(0xFFFACC15)},
    {'text': 'lampadaires cassés', 'color': const Color(0xFFFB923C)},
    {'text': 'caniveaux bouchés', 'color': const Color(0xFF2DD4BF)},
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

  final List<Map<String, dynamic>> _categories = [
    {
      'title': 'Coupures d\'eau',
      'subtitle': 'Plus d\'eau au robinet ?',
      'icon': LucideIcons.droplet,
      'bg': const Color(0xFFE0F2FE),
      'color': const Color(0xFF0284C7),
    },
    {
      'title': 'Coupures d\'électricité',
      'subtitle': 'Coupure de courant ?',
      'icon': LucideIcons.zap,
      'bg': const Color(0xFFFEF9C3),
      'color': const Color(0xFFCA8A04),
    },
    {
      'title': 'Lampadaires cassés',
      'subtitle': 'Lampadaire hors service ?',
      'icon': LucideIcons.sun,
      'bg': const Color(0xFFFFEDD5),
      'color': const Color(0xFFEA580C),
    },
    {
      'title': 'Caniveaux bouchés',
      'subtitle': 'Caniveau obstrué ?',
      'icon': LucideIcons.waves,
      'bg': const Color(0xFFCCFBF1),
      'color': const Color(0xFF0D9488),
    },
    {
      'title': 'Nids de poules',
      'subtitle': 'Route dégradée ?',
      'icon': LucideIcons.truck,
      'bg': const Color(0xFFF1F5F9),
      'color': const Color(0xFF64748B),
    },
  ];

  final List<Map<String, String>> _steps = [
    {
      'number': '01',
      'emoji': '📍',
      'title': 'Localisez',
      'subtitle': 'GPS AUTOMATIQUE',
      'desc': 'Votre commune est détectée automatiquement. Signalement en ligne en moins de 2 minutes.',
      'color': '0xFFF59E0B',
    },
    {
      'number': '02',
      'emoji': '⚡',
      'title': 'Signalez',
      'subtitle': '3 CLICS SUFFISENT',
      'desc': 'Choisissez le type de problème, confirmez votre quartier et envoyez.',
      'color': '0xFF38BDF8',
    },
    {
      'number': '03',
      'emoji': '🤝',
      'title': 'Vérifiez',
      'subtitle': 'VOISINS SOLIDAIRES',
      'desc': 'Les voisins à moins de 200 m confirment le signalement pour éliminer les faux positifs.',
      'color': '0xFF22C55E',
    },
    {
      'number': '04',
      'emoji': '📊',
      'title': 'Impact',
      'subtitle': 'DÉCIDEURS INFORMÉS',
      'desc': 'CIE, SODECI et autorités suivent les coupures en temps réel par commune.',
      'color': '0xFFA855F7',
    },
  ];

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 2800), (timer) {
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
      backgroundColor: const Color(0xFF071929),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFBF9F5),
        elevation: 1,
        titleSpacing: 12,
        title: Row(
          children: [
            // Emblem Pin Icon
            Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFF064E3B),
              ),
              child: const Center(
                child: Text('📍', style: TextStyle(fontSize: 16)),
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                RichText(
                  text: TextSpan(
                    style: GoogleFonts.outfit(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                    ),
                    children: const [
                      TextSpan(text: 'SIGNA'),
                      TextSpan(
                        text: '·CI',
                        style: TextStyle(color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ),
                Text(
                  'CÔTE D\'IVOIRE',
                  style: GoogleFonts.inter(
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.search, color: Color(0xFF0F172A), size: 20),
            onPressed: () {},
          ),
          Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon: const Icon(LucideIcons.bell, color: Color(0xFF0F172A), size: 20),
                onPressed: () {},
              ),
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B82F6),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    '9+',
                    style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF59E0B)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(LucideIcons.shield, size: 12, color: Color(0xFFB45309)),
                SizedBox(width: 4),
                Text(
                  'Admin',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── TOP ALERT NOTIFICATION BANNER ──
            if (_showAlertBanner)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: const Color(0xFFFFFBEB),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Color(0xFFFEF3C7),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(LucideIcons.bell, size: 14, color: Color(0xFFD97706)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF78350F)),
                          children: const [
                            TextSpan(text: 'Restez informé en temps réel. ', style: TextStyle(fontWeight: FontWeight.bold)),
                            TextSpan(text: 'Recevez une alerte dès qu\'une coupure est signalée près de chez vous.'),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD97706),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Activer', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 16, color: Color(0xFF78350F)),
                      onPressed: () => setState(() => _showAlertBanner = false),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),

            // ── SECTION 1: HERO (Dark Blue #071929) ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20.0),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0xFF030D1A), Color(0xFF071929), Color(0xFF0A2236)],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 12),
                  Text(
                    'Signalez les',
                    style: GoogleFonts.outfit(
                      fontSize: 38,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      height: 1.05,
                    ),
                  ),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 450),
                    transitionBuilder: (Widget child, Animation<double> animation) {
                      return FadeTransition(
                        opacity: animation,
                        child: SlideTransition(
                          position: Tween<Offset>(
                            begin: const Offset(0.0, 0.25),
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
                        fontSize: 38,
                        fontWeight: FontWeight.w900,
                        color: currentWord['color'],
                        height: 1.1,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'La première plateforme citoyenne ivoirienne où les habitants contribuent à l\'amélioration des services et infrastructures publiques.',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.7),
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Status Badges
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.4)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.radio, size: 13, color: Color(0xFFFCA5A5)),
                            SizedBox(width: 6),
                            Text(
                              '1 coupure active',
                              style: TextStyle(color: Color(0xFFFCA5A5), fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white.withOpacity(0.2)),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(LucideIcons.shieldCheck, size: 13, color: Colors.white70),
                            SizedBox(width: 6),
                            Text(
                              '07 communes · Abidjan',
                              style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Hero CTA Buttons
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF0284C7), Color(0xFFD97706)],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF0284C7).withOpacity(0.3),
                                blurRadius: 16,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
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
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              textStyle: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const MapScreen()),
                          );
                        },
                        icon: const Icon(LucideIcons.barChart2, size: 16, color: Colors.white),
                        label: const Text('Voir le dashboard', style: TextStyle(color: Colors.white)),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(color: Colors.white.withOpacity(0.25)),
                          backgroundColor: Colors.white.withOpacity(0.08),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          textStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
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
                          margin: const EdgeInsets.only(right: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: c['color'] as Color,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            c['name'],
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  const SizedBox(height: 24),
                  Center(
                    child: Column(
                      children: [
                        Text(
                          'DÉCOUVRIR',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            letterSpacing: 2,
                            fontWeight: FontWeight.bold,
                            color: Colors.white38,
                          ),
                        ),
                        const SizedBox(height: 2),
                        const Icon(LucideIcons.chevronDown, size: 16, color: Colors.white38),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── SECTION 2: BRONZE STATS STRIP (#5C3215 Gradient) ──
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF4A250E), Color(0xFF6E3917), Color(0xFF5C3215)],
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildMetricStat('7', 'Communes pilotes', LucideIcons.mapPin),
                  _buildMetricStat('42', 'Signalements soumis', LucideIcons.barChart2),
                  _buildMetricStat('35', 'Problèmes résolus', LucideIcons.trendingUp),
                  _buildMetricStat('1', 'Coupures actives', LucideIcons.radio),
                ],
              ),
            ),

            // ── SECTION 3: DÉLAI MOYEN DE RÉSOLUTION CARD ──
            Container(
              color: const Color(0xFFFBF9F5),
              padding: const EdgeInsets.all(20.0),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.03),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(LucideIcons.trendingUp, color: Color(0xFF10B981), size: 18),
                                const SizedBox(width: 8),
                                Text(
                                  'Délai moyen de résolution',
                                  style: GoogleFonts.outfit(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              'Voir les résultats →',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFFD97706),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Column(
                                  children: [
                                    const Icon(LucideIcons.zap, color: Color(0xFFF59E0B), size: 22),
                                    const SizedBox(height: 6),
                                    Text(
                                      '5j',
                                      style: GoogleFonts.outfit(
                                        fontSize: 24,
                                        fontWeight: FontWeight.w900,
                                        color: const Color(0xFFD97706),
                                      ),
                                    ),
                                    const Text(
                                      'CIE',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: Column(
                                  children: [
                                    const Icon(LucideIcons.droplet, color: Color(0xFF0284C7), size: 22),
                                    const SizedBox(height: 6),
                                    Text(
                                      '4j',
                                      style: GoogleFonts.outfit(
                                        fontSize: 24,
                                        fontWeight: FontWeight.w900,
                                        color: const Color(0xFF0284C7),
                                      ),
                                    ),
                                    const Text(
                                      'SODECI',
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Center(
                          child: Text(
                            'Basé sur les signalements résolus · mis à jour en temps réel',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontStyle: FontStyle.italic,
                              color: const Color(0xFF94A3B8),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),

                  // ── SECTION 4: 5 CATÉGORIES GRID ──
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Text(
                      '5 CATÉGORIES',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Que voulez-vous signaler ?',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Cliquez directement sur le problème pour lancer votre signalement',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(color: const Color(0xFF64748B), fontSize: 13),
                  ),
                  const SizedBox(height: 20),

                  // 5 Category Cards
                  Column(
                    children: _categories.map((cat) {
                      return GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const CreateReportScreen()),
                          );
                        },
                        child: Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: cat['bg'] as Color,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: (cat['color'] as Color).withOpacity(0.3)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.04),
                                      blurRadius: 6,
                                    ),
                                  ],
                                ),
                                child: Icon(cat['icon'] as IconData, color: cat['color'] as Color, size: 24),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      cat['title'] as String,
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                        color: cat['color'] as Color,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      cat['subtitle'] as String,
                                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(LucideIcons.chevronRight, color: cat['color'] as Color, size: 20),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
                        ),
                        child: const Row(
                          children: [
                            Icon(LucideIcons.zap, size: 12, color: Color(0xFFB45309)),
                            SizedBox(width: 4),
                            Text(
                              'Électricité · 4 coupures actives',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0F2FE),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFF0284C7).withOpacity(0.4)),
                        ),
                        child: const Row(
                          children: [
                            Icon(LucideIcons.droplet, size: 12, color: Color(0xFF0369A1)),
                            SizedBox(width: 4),
                            Text(
                              'Eau · RAS',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0369A1)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 40),

                  // ── SECTION 5: HOW IT WORKS (COMMENT ÇA MARCHE) ──
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'COMMENT ÇA MARCHE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Simple. Rapide. Efficace.',
                    style: GoogleFonts.outfit(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'De la détection du problème à la décision en 4 étapes',
                    style: GoogleFonts.inter(color: const Color(0xFF64748B), fontSize: 13),
                  ),
                  const SizedBox(height: 24),

                  Column(
                    children: _steps.map((step) {
                      final color = Color(int.parse(step['color']!));
                      return Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: color.withOpacity(0.3)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.02),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.12),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: Center(
                                child: Text(step['emoji']!, style: const TextStyle(fontSize: 22)),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        step['title']!,
                                        style: GoogleFonts.outfit(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: const Color(0xFF0F172A),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        step['subtitle']!,
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w900,
                                          color: color,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    step['desc']!,
                                    style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B), height: 1.4),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 36),

                  // ── SECTION 6: COMMUNITY & FOOTER ──
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'COMMUNAUTÉ',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Rejoignez la communauté SIGNA-CI',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.outfit(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Suivez l\'actualité des coupures, partagez vos expériences et restez informé en temps réel avec vos voisins.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(color: const Color(0xFF64748B), fontSize: 13),
                  ),
                  const SizedBox(height: 20),

                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1877F2).withOpacity(0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFF1877F2).withOpacity(0.3)),
                          ),
                          child: const Row(
                            children: [
                              Icon(LucideIcons.facebook, color: Color(0xFF1877F2), size: 24),
                              SizedBox(width: 10),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Page Facebook', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1877F2))),
                                  Text('Actualités & alertes', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFF25D366).withOpacity(0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFF25D366).withOpacity(0.3)),
                          ),
                          child: const Row(
                            children: [
                              Icon(LucideIcons.messageSquare, color: Color(0xFF25D366), size: 24),
                              SizedBox(width: 10),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Canal WhatsApp', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF166534))),
                                  Text('Alertes instantanées', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 40),

                  // FOOTER
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 16),
                  Text(
                    '© 2026 SIGNA-CI — CivicTech Abidjan',
                    style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF94A3B8)),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Fiers d\'être ivoirien ❤️',
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricStat(String number, String label, IconData icon) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: const Color(0xFFF59E0B), size: 18),
        ),
        const SizedBox(height: 6),
        Text(
          number,
          style: GoogleFonts.outfit(
            fontSize: 22,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
      ],
    );
  }
}
