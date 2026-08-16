import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/repositories/report_repository.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = Supabase.instance.client.auth.currentUser;
    final String userEmail = user?.email ?? 'citoyen.abidjan@signa.ci';
    final reportsAsync = ref.watch(reportsProvider(null));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil & CitizenScore', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.logOut, color: AppTheme.dangerRose),
            onPressed: () async {
              await Supabase.instance.client.auth.signOut();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Déconnexion effectuée.')),
                );
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // ── CITIZEN SCORE CARD ──
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryTeal, AppTheme.primaryDarkTeal],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryTeal.withAlpha(80),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  const Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: Colors.white24,
                        child: Icon(LucideIcons.shieldCheck, color: Colors.white, size: 28),
                      ),
                      SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Citoyen Engagé',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            ),
                            Text(
                              'Niveau 3 • Contributeur Verifié',
                              style: TextStyle(color: Colors.white70, fontSize: 13),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Colors.white24),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildScoreStat('420', 'Points Score'),
                      _buildScoreStat('12', 'Signalements'),
                      _buildScoreStat('98%', 'Fiabilité'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── USER DETAILS ──
            Card(
              child: ListTile(
                leading: const Icon(LucideIcons.mail, color: AppTheme.primaryTeal),
                title: const Text('Adresse Email'),
                subtitle: Text(userEmail),
              ),
            ),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading: const Icon(LucideIcons.mapPin, color: AppTheme.primaryTeal),
                title: const Text('Commune Principale'),
                subtitle: const Text('Cocody, Abidjan'),
                trailing: IconButton(
                  icon: const Icon(LucideIcons.edit2, size: 16),
                  onPressed: () {},
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ── MES SIGNALEMENTS HISTORIQUE ──
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Historique de mes Signalements',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
              ),
            ),
            const SizedBox(height: 12),
            reportsAsync.when(
              data: (reports) {
                if (reports.isEmpty) {
                  return const Card(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('Aucun signalement dans l\'historique.'),
                    ),
                  );
                }
                return ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: reports.take(5).length,
                  itemBuilder: (context, index) {
                    final report = reports[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: Icon(
                          report.isOutage ? LucideIcons.zapOff : LucideIcons.wrench,
                          color: report.isOutage ? AppTheme.outageColor : AppTheme.infraColor,
                        ),
                        title: Text(
                          report.description.isNotEmpty ? report.description : 'Signalement',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text('${report.commune} • ${report.status}'),
                        trailing: Text(
                          '${report.createdAt.day}/${report.createdAt.month}',
                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScoreStat(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w800,
            fontSize: 20,
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
