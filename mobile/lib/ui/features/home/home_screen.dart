import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../infrastructure/infrastructure_screen.dart';
import '../landing/landing_screen.dart';
import '../map/map_screen.dart';
import '../profile/profile_screen.dart';
import '../reports/create_report_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;
  StreamSubscription<AuthState>? _authSubscription;

  final List<Widget> _screens = const [
    LandingScreen(),         // 0: Accueil
    InfrastructureScreen(),  // 1: Voirie & Infra
    MapScreen(),             // 2: Carte interactive
    ProfileScreen(),         // 3: Profil & Paramètres
  ];

  @override
  void initState() {
    super.initState();
    try {
      _authSubscription = Supabase.instance.client.auth.onAuthStateChange.listen((data) {
        if (mounted) {
          setState(() {});
        }
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  void _openCreateReportModal() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const CreateReportScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final navBarBg = isDark ? const Color(0xFF0F172A) : Colors.white;

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      // ══════════════════════════════════════════════════════════════════
      // BOUTON CENTRAL SURÉLEVÉ D'ACTION : SIGNALER (Dock Ergonomique)
      // ══════════════════════════════════════════════════════════════════
      floatingActionButton: Container(
        height: 58,
        width: 58,
        margin: const EdgeInsets.only(top: 14),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(
            colors: [Color(0xFFEA580C), Color(0xFFF97316)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFEA580C).withAlpha(120),
              blurRadius: 10,
              spreadRadius: 1,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: FloatingActionButton(
          heroTag: 'fab_dock_create_report',
          onPressed: _openCreateReportModal,
          backgroundColor: Colors.transparent,
          elevation: 0,
          highlightElevation: 0,
          shape: const CircleBorder(),
          tooltip: 'Signaler un incident',
          child: const Icon(LucideIcons.plus, color: Colors.white, size: 28),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,

      // ══════════════════════════════════════════════════════════════════
      // BARRE INFÉRIEURE NOTCHÉE (4 Onglets Aérés + 1 Action Centrale)
      // ══════════════════════════════════════════════════════════════════
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 7.0,
        color: navBarBg,
        elevation: 16,
        height: 64,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            // 1. Accueil
            _buildDockNavItem(
              icon: LucideIcons.home,
              label: 'Accueil',
              index: 0,
              activeColor: AppTheme.primaryTeal,
            ),
            // 2. Voirie & Infra (Icône civique officielle 🏛️)
            _buildDockNavItem(
              icon: LucideIcons.landmark,
              label: 'Voirie & Infra',
              index: 1,
              activeColor: const Color(0xFFEA580C),
            ),

            // Espace central réservé au bouton notché
            const SizedBox(width: 48),

            // 3. Carte
            _buildDockNavItem(
              icon: LucideIcons.map,
              label: 'Carte',
              index: 2,
              activeColor: const Color(0xFF0284C7),
            ),
            // 4. Profil
            _buildDockNavItem(
              icon: LucideIcons.userCheck,
              label: 'Profil',
              index: 3,
              activeColor: const Color(0xFF9333EA),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDockNavItem({
    required IconData icon,
    required String label,
    required int index,
    required Color activeColor,
  }) {
    final isSelected = _currentIndex == index;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final unselectedColor = isDark ? Colors.grey.shade400 : const Color(0xFF64748B);

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        borderRadius: BorderRadius.circular(12),
        splashColor: activeColor.withAlpha(20),
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? activeColor.withAlpha(25) : Colors.transparent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: isSelected ? activeColor : unselectedColor,
                size: 21,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? activeColor : unselectedColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
