import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../landing/landing_screen.dart';
import '../map/map_screen.dart';
import '../profile/profile_screen.dart';
import '../reports/create_report_screen.dart';
import '../trends/trends_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          LandingScreen(),
          MapScreen(),
          TrendsScreen(),
          ProfileScreen(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const CreateReportScreen()),
          );
        },
        backgroundColor: AppTheme.primaryTeal,
        icon: const Icon(LucideIcons.plus, color: Colors.white),
        label: const Text(
          'Signaler',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        selectedItemColor: AppTheme.primaryTeal,
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.home),
            label: 'Accueil',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.map),
            label: 'Carte',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.barChart2),
            label: 'Tendances',
          ),
          BottomNavigationBarItem(
            icon: Icon(LucideIcons.userCheck),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}
