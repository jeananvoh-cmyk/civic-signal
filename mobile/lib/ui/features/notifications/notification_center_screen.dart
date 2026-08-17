import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../reports/report_detail_screen.dart';
import '../auth/auth_screen.dart';

class NotificationCenterScreen extends StatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  State<NotificationCenterScreen> createState() => _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _notifications = [];
  bool _notificationsEnabled = true;
  RealtimeChannel? _subscription;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _loadNotificationPreference();
    _listenToRealtimeNotifications();
  }

  @override
  void dispose() {
    _subscription?.unsubscribe();
    super.dispose();
  }

  Future<void> _loadNotificationPreference() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    try {
      final res = await Supabase.instance.client
          .from('profiles')
          .select('notifications_enabled')
          .eq('id', user.id)
          .maybeSingle();
      if (res != null && mounted) {
        setState(() {
          _notificationsEnabled = res['notifications_enabled'] ?? true;
        });
      }
    } catch (_) {}
  }

  Future<void> _togglePreference(bool value) async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    setState(() => _notificationsEnabled = value);
    try {
      await Supabase.instance.client
          .from('profiles')
          .update({'notifications_enabled': value})
          .eq('id', user.id);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(value
                ? 'Alertes et notifications activées pour votre compte !'
                : 'Notifications désactivées.'),
            backgroundColor: value ? AppTheme.secondaryEmerald : AppTheme.textSecondaryLight,
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _loadNotifications() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    try {
      final res = await Supabase.instance.client
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', ascending: false)
          .limit(50);

      if (mounted) {
        setState(() {
          _notifications = List<Map<String, dynamic>>.from(res);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _listenToRealtimeNotifications() {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    _subscription = Supabase.instance.client
        .channel('public:notifications:user_${user.id}')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'notifications',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: user.id,
          ),
          callback: (payload) {
            _loadNotifications();
          },
        )
        .subscribe();
  }

  Future<void> _markAllAsRead() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    try {
      await Supabase.instance.client
          .from('notifications')
          .update({'read': true})
          .eq('user_id', user.id)
          .eq('read', false);

      setState(() {
        for (var n in _notifications) {
          n['read'] = true;
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Toutes les alertes sont marquées comme lues.')),
        );
      }
    } catch (_) {}
  }

  Future<void> _deleteNotification(String id) async {
    try {
      await Supabase.instance.client.from('notifications').delete().eq('id', id);
      setState(() {
        _notifications.removeWhere((n) => n['id'] == id);
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = Supabase.instance.client.auth.currentUser;
    final unreadCount = _notifications.where((n) => n['read'] == false).length;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        title: Text(
          'Alertes & Notifications',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          if (unreadCount > 0 && user != null)
            TextButton.icon(
              icon: const Icon(LucideIcons.checkCheck, size: 16),
              label: const Text('Tout lire'),
              onPressed: _markAllAsRead,
            ),
        ],
      ),
      body: user == null
          ? _buildVisitorState(context, isDark)
          : RefreshIndicator(
              onRefresh: _loadNotifications,
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      children: [
                        // Bannière de statut des alertes
                        Container(
                          padding: const EdgeInsets.all(16),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF1E293B) : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: _notificationsEnabled
                                  ? AppTheme.secondaryEmerald.withAlpha(80)
                                  : Colors.grey.withAlpha(80),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: (_notificationsEnabled
                                          ? AppTheme.secondaryEmerald
                                          : Colors.grey)
                                      .withAlpha(30),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _notificationsEnabled ? LucideIcons.bell : LucideIcons.bellOff,
                                  color: _notificationsEnabled
                                      ? AppTheme.secondaryEmerald
                                      : Colors.grey,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _notificationsEnabled
                                          ? 'Notifications en direct actives'
                                          : 'Notifications en pause',
                                      style: GoogleFonts.outfit(
                                          fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _notificationsEnabled
                                          ? 'Vous recevez les alertes de coupure et résolutions'
                                          : 'Activez pour être prévenu des incidents près de chez vous',
                                      style: GoogleFonts.inter(
                                          fontSize: 11,
                                          color: isDark ? Colors.white60 : Colors.grey[600]),
                                    ),
                                  ],
                                ),
                              ),
                              Switch(
                                value: _notificationsEnabled,
                                activeThumbColor: AppTheme.secondaryEmerald,
                                onChanged: _togglePreference,
                              ),
                            ],
                          ),
                        ),

                        if (_notifications.isEmpty)
                          _buildEmptyState(isDark)
                        else ...[
                          Text(
                            'VOS DERNIÈRES ALERTES (${_notifications.length})',
                            style: GoogleFonts.outfit(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.1,
                              color: isDark ? Colors.white60 : Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 12),
                          ..._notifications.map((n) => _buildNotificationCard(n, isDark)),
                        ],
                      ],
                    ),
            ),
    );
  }

  Widget _buildVisitorState(BuildContext context, bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.primaryTeal.withAlpha(20),
                shape: BoxShape.circle,
              ),
              child: const Icon(LucideIcons.bellOff, size: 48, color: AppTheme.primaryTeal),
            ),
            const SizedBox(height: 20),
            Text(
              'Connectez-vous pour vos alertes',
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Recevez les notifications d\'incidents d\'eau, d\'électricité et de voirie déclarés dans votre commune en direct.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryTeal,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(LucideIcons.logIn, size: 16),
              label: const Text('Se connecter / S\'inscrire'),
              onPressed: () async {
                final ok = await Navigator.push(
                    context, MaterialPageRoute(builder: (_) => const AuthScreen()));
                if (ok == true) {
                  _loadNotifications();
                  _loadNotificationPreference();
                  _listenToRealtimeNotifications();
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      alignment: Alignment.center,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.secondaryEmerald.withAlpha(20),
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.checkCircle2, color: AppTheme.secondaryEmerald, size: 40),
          ),
          const SizedBox(height: 16),
          Text(
            'Aucune alerte en attente',
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Tout est calme dans votre zone. Les nouvelles alertes de vos voisins et des régies apparaîtront ici.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 12, color: isDark ? Colors.white60 : Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> n, bool isDark) {
    final title = (n['title'] ?? 'Alerte SIGNA-CI').toString();
    final message = (n['message'] ?? '').toString();
    final isRead = n['read'] == true;
    final createdAt = n['created_at'] != null ? DateTime.tryParse(n['created_at']) : null;
    final timeStr = createdAt != null ? DateFormat('dd/MM à HH:mm').format(createdAt.toLocal()) : '';
    final reportId = n['report_id']?.toString();

    // Détermination de l'icône et de la couleur selon le contenu
    IconData icon = LucideIcons.bell;
    Color iconColor = AppTheme.primaryTeal;
    Color iconBg = AppTheme.primaryTeal.withAlpha(25);

    if (title.contains('Électricité') || message.contains('Électricité') || title.contains('CIE')) {
      icon = LucideIcons.zap;
      iconColor = const Color(0xFFD97706);
      iconBg = const Color(0xFFD97706).withAlpha(25);
    } else if (title.contains('Eau') || message.contains('Eau') || title.contains('SODECI')) {
      icon = LucideIcons.droplet;
      iconColor = const Color(0xFF0284C7);
      iconBg = const Color(0xFF0284C7).withAlpha(25);
    } else if (title.contains('rétabli') || title.contains('réparé') || title.contains('résolu')) {
      icon = LucideIcons.checkCircle2;
      iconColor = const Color(0xFF16A34A);
      iconBg = const Color(0xFF16A34A).withAlpha(25);
    } else if (title.contains('📢') || title.contains('Mairie')) {
      icon = LucideIcons.megaphone;
      iconColor = const Color(0xFF8B5CF6);
      iconBg = const Color(0xFF8B5CF6).withAlpha(25);
    } else if (title.contains('🚨') || title.contains('critique') || title.contains('Danger')) {
      icon = LucideIcons.alertTriangle;
      iconColor = const Color(0xFFDC2626);
      iconBg = const Color(0xFFDC2626).withAlpha(25);
    }

    return Dismissible(
      key: Key(n['id'].toString()),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => _deleteNotification(n['id'].toString()),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppTheme.dangerRose,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(LucideIcons.trash2, color: Colors.white),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: !isRead
                ? iconColor.withAlpha(120)
                : (isDark ? Colors.white10 : const Color(0xFFE2E8F0)),
            width: !isRead ? 1.5 : 1,
          ),
          boxShadow: [
            if (!isRead)
              BoxShadow(
                color: iconColor.withAlpha(20),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
          ],
        ),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: !isRead ? FontWeight.bold : FontWeight.w600,
                  ),
                ),
              ),
              if (!isRead)
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(color: iconColor, shape: BoxShape.circle),
                ),
            ],
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text(
                message,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: isDark ? Colors.white70 : Colors.grey[700],
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                timeStr,
                style: TextStyle(fontSize: 10, color: isDark ? Colors.white38 : Colors.grey[400]),
              ),
            ],
          ),
          onTap: () async {
            if (!isRead) {
              await Supabase.instance.client
                  .from('notifications')
                  .update({'read': true})
                  .eq('id', n['id']);
              setState(() => n['read'] = true);
            }

            if (reportId != null && mounted) {
              try {
                final reportData = await Supabase.instance.client
                    .from('reports')
                    .select('*')
                    .eq('id', reportId)
                    .maybeSingle();

                if (reportData != null && mounted) {
                  final report = ReportModel.fromJson(reportData);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => ReportDetailScreen(report: report)),
                  );
                }
              } catch (_) {}
            }
          },
        ),
      ),
    );
  }
}
