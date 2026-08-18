import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/communes.dart';
import '../../../core/theme/app_theme.dart';
import '../../../domain/models/report_model.dart';
import '../reports/create_report_screen.dart';
import '../reports/report_detail_screen.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final MapController _mapController = MapController();
  String _selectedService = 'all'; // 'all', 'electricity', 'water', 'mairie'
  String _selectedMode = 'all';    // 'all', 'coupures', 'infrastructures'
  String _selectedCommune = 'all';

  List<ReportModel> _reports = [];
  bool _isLoading = true;
  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    _fetchMapReports();
    _subscribeToRealtime();
  }

  @override
  void dispose() {
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  void _subscribeToRealtime() {
    try {
      _realtimeChannel = Supabase.instance.client
          .channel('public:map_reports')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'reports',
            callback: (_) {
              _fetchMapReports();
            },
          )
          .subscribe();
    } catch (_) {}
  }

  Future<void> _fetchMapReports() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final List<ReportModel> loaded = [];

      // 1. Appel RPC public pour les signalements infrastructures
      try {
        final infraRes = await Supabase.instance.client.rpc(
          'get_public_infrastructure_reports',
          params: {'p_limit': 150},
        );
        if (infraRes is List) {
          for (final e in infraRes) {
            if (e is Map) {
              final map = Map<String, dynamic>.from(e);
              final double? lat = (map['latitude'] as num?)?.toDouble() ?? (map['latitude_approx'] as num?)?.toDouble();
              final double? lon = (map['longitude'] as num?)?.toDouble() ?? (map['longitude_approx'] as num?)?.toDouble();
              if (lat != null && lon != null) {
                map['latitude'] = lat;
                map['longitude'] = lon;
                map['report_category'] ??= 'infrastructure';
                loaded.add(ReportModel.fromJson(map));
              }
            }
          }
        }
      } catch (e) {
        debugPrint('Public infra reports RPC note: $e');
      }

      // 2. Appel RPC public pour les signalements généraux/coupures
      try {
        final pubRes = await Supabase.instance.client.rpc('get_public_reports');
        if (pubRes is List) {
          for (final e in pubRes) {
            if (e is Map) {
              final map = Map<String, dynamic>.from(e);
              final double? lat = (map['latitude'] as num?)?.toDouble() ?? (map['latitude_approx'] as num?)?.toDouble();
              final double? lon = (map['longitude'] as num?)?.toDouble() ?? (map['longitude_approx'] as num?)?.toDouble();
              if (lat != null && lon != null) {
                map['latitude'] = lat;
                map['longitude'] = lon;
                loaded.add(ReportModel.fromJson(map));
              }
            }
          }
        }
      } catch (e) {
        debugPrint('Public reports RPC note: $e');
      }

      // 3. Requête directe reports pour utilisateurs connectés / compléments
      try {
        final directRes = await Supabase.instance.client
            .from('reports')
            .select()
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .inFilter('status', ['active', 'chronic', 'in_progress', 'open', 'verified'])
            .order('created_at', ascending: false)
            .limit(200);

        for (final e in directRes) {
          final map = Map<String, dynamic>.from(e);
          loaded.add(ReportModel.fromJson(map));
        }
      } catch (e) {
        debugPrint('Direct reports fetch note: $e');
      }

      // Dédoublonnage par ID
      final Map<String, ReportModel> byId = {};
      for (final r in loaded) {
        byId[r.id] = r;
      }

      if (mounted) {
        setState(() {
          _reports = byId.values.toList();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _focusCommune(CommuneData commune) {
    _mapController.move(LatLng(commune.centerLat, commune.centerLon), 13.5);
    setState(() => _selectedCommune = commune.nom);
  }

  IconData _getIconForReport(ReportModel r) {
    if (r.serviceType == 'electricity') return LucideIcons.zap;
    if (r.serviceType == 'water') return LucideIcons.droplets;

    final desc = r.description.toLowerCase();
    if (desc.contains('lampadaire') || desc.contains('éclairage') || desc.contains('poteau') || desc.contains('obscurité')) {
      return LucideIcons.sun;
    }
    if (desc.contains('caniveau') || desc.contains('inondation') || desc.contains('eau usée') || desc.contains('égout') || desc.contains('bouché')) {
      return LucideIcons.waves;
    }
    if (desc.contains('nid de poule') || desc.contains('route') || desc.contains('chaussée') || desc.contains('bitume') || desc.contains('voirie')) {
      return LucideIcons.construction;
    }
    if (desc.contains('ordure') || desc.contains('poubelle') || desc.contains('décharge') || desc.contains('saleté')) {
      return LucideIcons.trash2;
    }
    return LucideIcons.wrench;
  }

  Color _getColorForReport(ReportModel r) {
    if (r.serviceType == 'electricity') return const Color(0xFFF59E0B);
    if (r.serviceType == 'water') return const Color(0xFF0284C7);

    final desc = r.description.toLowerCase();
    if (desc.contains('lampadaire') || desc.contains('éclairage') || desc.contains('poteau')) {
      return const Color(0xFFEAB308); // Ambre / Jaune
    }
    if (desc.contains('caniveau') || desc.contains('inondation') || desc.contains('eau usée')) {
      return const Color(0xFF0D9488); // Teal
    }
    if (desc.contains('nid de poule') || desc.contains('route') || desc.contains('voirie')) {
      return const Color(0xFFEA580C); // Orange
    }
    if (desc.contains('ordure') || desc.contains('poubelle') || desc.contains('décharge')) {
      return const Color(0xFF10B981); // Emeraude
    }
    return const Color(0xFF8B5CF6); // Violet
  }

  String _getCategoryLabel(ReportModel r) {
    if (r.serviceType == 'electricity') return 'Électricité (CIE)';
    if (r.serviceType == 'water') return 'Eau courante (SODECI)';

    final desc = r.description.toLowerCase();
    if (desc.contains('lampadaire') || desc.contains('éclairage') || desc.contains('poteau')) {
      return 'Éclairage public & Poteaux';
    }
    if (desc.contains('caniveau') || desc.contains('inondation') || desc.contains('eau usée')) {
      return 'Caniveau bouché & Assainissement';
    }
    if (desc.contains('nid de poule') || desc.contains('route') || desc.contains('voirie')) {
      return 'Voirie & Nids de poule';
    }
    if (desc.contains('ordure') || desc.contains('poubelle') || desc.contains('décharge')) {
      return 'Salubrité & Dépôts sauvages';
    }
    return 'Incident Infrastructure';
  }

  List<ReportModel> get _filteredReports {
    return _reports.where((r) {
      if (r.latitude == null || r.longitude == null) return false;

      // Mode filter
      if (_selectedMode == 'coupures') {
        final isCoupure = r.reportCategory == 'outage' || r.serviceType == 'electricity' || r.serviceType == 'water';
        if (!isCoupure) return false;
      } else if (_selectedMode == 'infrastructures') {
        final isInfra = r.reportCategory == 'infrastructure' || r.serviceType == 'mairie' || r.serviceType == 'voirie';
        if (!isInfra) return false;
      }

      // Service filter
      if (_selectedService != 'all') {
        if (_selectedService == 'electricity' && r.serviceType != 'electricity') return false;
        if (_selectedService == 'water' && r.serviceType != 'water') return false;
        if (_selectedService == 'mairie' && r.serviceType != 'mairie' && r.reportCategory != 'infrastructure') return false;
      }

      // Commune filter
      if (_selectedCommune != 'all' && r.commune.toLowerCase() != _selectedCommune.toLowerCase()) {
        return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filtered = _filteredReports;

    return Scaffold(
      body: Stack(
        children: [
          // ══════════════════════════════════════════════════════════
          // 1. CARTE OPENSTREETMAP INTERACTIVE
          // ══════════════════════════════════════════════════════════
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: LatLng(5.36, -4.01), // Abidjan Centre
              initialZoom: 12.2,
              minZoom: 10.0,
              maxZoom: 18.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'ci.signa.app',
              ),

              // Marqueurs des Communes Pilotes
              MarkerLayer(
                markers: PILOT_COMMUNES.map((c) {
                  final isCommuneFocused = _selectedCommune.toLowerCase() == c.nom.toLowerCase();
                  return Marker(
                    point: LatLng(c.centerLat, c.centerLon),
                    width: 76,
                    height: 76,
                    child: GestureDetector(
                      onTap: () => _focusCommune(c),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: isCommuneFocused ? c.couleur : Colors.black26,
                                  blurRadius: isCommuneFocused ? 12 : 6,
                                  spreadRadius: isCommuneFocused ? 2 : 0,
                                ),
                              ],
                              border: Border.all(
                                color: isCommuneFocused ? c.couleur : Colors.white,
                                width: isCommuneFocused ? 3 : 1.5,
                              ),
                            ),
                            child: Image.asset(
                              c.logoAsset,
                              width: 22,
                              height: 22,
                              fit: BoxFit.contain,
                              errorBuilder: (_, _, _) => Icon(LucideIcons.mapPin, color: c.couleur, size: 20),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isCommuneFocused ? c.couleur : Colors.black87,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              c.nom,
                              style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),

              // Marqueurs des Signalements Réels d'Infrastructure & Coupures
              MarkerLayer(
                markers: filtered.map((r) {
                  final pinColor = _getColorForReport(r);
                  final pinIcon = _getIconForReport(r);
                  final hasVerification = r.supportCount > 0 || r.repairVerifications > 0;
                  final hasPhoto = (r.photoUrls != null && r.photoUrls!.isNotEmpty) || (r.photoUrl != null && r.photoUrl!.isNotEmpty);

                  return Marker(
                    point: LatLng(r.latitude!, r.longitude!),
                    width: 48,
                    height: 48,
                    child: GestureDetector(
                      onTap: () => _showReportDetailsModal(r),
                      child: Stack(
                        clipBehavior: Clip.none,
                        alignment: Alignment.center,
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: pinColor,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: pinColor.withAlpha(120),
                                  blurRadius: 8,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                              border: Border.all(color: Colors.white, width: 2.5),
                            ),
                            child: Icon(pinIcon, color: Colors.white, size: 18),
                          ),
                          // Badge photo
                          if (hasPhoto)
                            Positioned(
                              top: -2,
                              left: -2,
                              child: Container(
                                padding: const EdgeInsets.all(2.5),
                                decoration: const BoxDecoration(
                                  color: Color(0xFF0F172A),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(LucideIcons.camera, color: Colors.white, size: 9),
                              ),
                            ),
                          // Badge confirmations
                          if (hasVerification)
                            Positioned(
                              top: -2,
                              right: -2,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF16A34A),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.white, width: 1.5),
                                ),
                                child: Text(
                                  '✓ ${r.supportCount + r.repairVerifications}',
                                  style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),

          // ══════════════════════════════════════════════════════════
          // 2. BARRE DE FILTRES SUPÉRIEURE (1:1 Web)
          // ══════════════════════════════════════════════════════════
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Sélecteur de mode (Tous vs Coupures vs Infrastructures)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withAlpha(20), blurRadius: 12, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Row(
                      children: [
                        _buildModeTab('Tous', 'all', const Color(0xFF0F172A)),
                        _buildModeTab('⚡ Coupures', 'coupures', const Color(0xFFEA580C)),
                        _buildModeTab('🏗️ Voirie & Infra', 'infrastructures', AppTheme.primaryTeal),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Sélecteur de services (Chips horizontaux)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterChip('Tous services', 'all', LucideIcons.layers, const Color(0xFF0F172A)),
                        const SizedBox(width: 6),
                        _buildFilterChip('CIE (Électricité)', 'electricity', LucideIcons.zap, const Color(0xFFF59E0B)),
                        const SizedBox(width: 6),
                        _buildFilterChip('SODECI (Eau)', 'water', LucideIcons.droplets, const Color(0xFF0284C7)),
                        const SizedBox(width: 6),
                        _buildFilterChip('Mairie (Voirie & Assainissement)', 'mairie', LucideIcons.landmark, const Color(0xFF10B981)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ══════════════════════════════════════════════════════════
          // 3. COMPTEUR FLOTTANT EN BAS À GAUCHE
          // ══════════════════════════════════════════════════════════
          Positioned(
            left: 14,
            bottom: 24,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A).withAlpha(230),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.black.withAlpha(40), blurRadius: 8, offset: const Offset(0, 2)),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Color(0xFF22C55E),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${filtered.length} signalement${filtered.length > 1 ? "s" : ""} en cours',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  if (_selectedCommune != 'all') ...[
                    const SizedBox(width: 6),
                    GestureDetector(
                      onTap: () => setState(() => _selectedCommune = 'all'),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: Colors.white24,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(_selectedCommune, style: const TextStyle(color: Colors.white, fontSize: 10)),
                            const SizedBox(width: 3),
                            const Icon(LucideIcons.x, color: Colors.white, size: 10),
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // ══════════════════════════════════════════════════════════
          // 4. BOUTONS D'ACTION FLOTTANTS EN BAS À DROITE
          // ══════════════════════════════════════════════════════════
          Positioned(
            right: 14,
            bottom: 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton.small(
                  heroTag: 'refresh_map_btn',
                  backgroundColor: Colors.white,
                  onPressed: _fetchMapReports,
                  child: _isLoading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(LucideIcons.refreshCw, color: Color(0xFF0F172A), size: 18),
                ),
                const SizedBox(height: 10),
                FloatingActionButton.extended(
                  heroTag: 'create_map_btn',
                  backgroundColor: const Color(0xFFEA580C),
                  icon: const Icon(LucideIcons.plus, color: Colors.white),
                  label: const Text('Signaler', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateReportScreen())),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModeTab(String label, String modeKey, Color activeColor) {
    final isSelected = _selectedMode == modeKey;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedMode = modeKey),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? activeColor : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : Colors.grey.shade600,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String serviceKey, IconData icon, Color activeColor) {
    final isSelected = _selectedService == serviceKey;
    return InkWell(
      onTap: () => setState(() => _selectedService = serviceKey),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? activeColor : const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(color: Colors.black.withAlpha(10), blurRadius: 4, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: isSelected ? Colors.white : activeColor),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : const Color(0xFF334155),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showReportDetailsModal(ReportModel r) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final pinColor = _getColorForReport(r);
    final pinIcon = _getIconForReport(r);
    final categoryLabel = _getCategoryLabel(r);

    final photoUrl = (r.photoUrls != null && r.photoUrls!.isNotEmpty)
        ? r.photoUrls!.first
        : r.photoUrl;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Poignée supérieure
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: pinColor.withAlpha(35),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(pinIcon, color: pinColor, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${r.commune}${r.quartier.isNotEmpty ? " · ${r.quartier}" : ""}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: pinColor.withAlpha(25),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            categoryLabel,
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: pinColor),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Description
              if (r.description.isNotEmpty)
                Text(
                  r.description,
                  style: TextStyle(
                    fontSize: 13.5,
                    height: 1.45,
                    color: isDark ? Colors.grey.shade200 : const Color(0xFF334155),
                  ),
                ),
              const SizedBox(height: 14),

              // Photo réelle si disponible
              if (photoUrl != null && photoUrl.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.network(
                    photoUrl,
                    height: 160,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // Badge confirmations
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: (r.supportCount > 0 || r.repairVerifications > 0)
                      ? const Color(0xFFF0FDF4)
                      : const Color(0xFFFFFBEB),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: (r.supportCount > 0 || r.repairVerifications > 0)
                        ? const Color(0xFFBBF7D0)
                        : const Color(0xFFFDE68A),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      (r.supportCount > 0 || r.repairVerifications > 0)
                          ? LucideIcons.checkCircle2
                          : LucideIcons.clock,
                      size: 16,
                      color: (r.supportCount > 0 || r.repairVerifications > 0)
                          ? const Color(0xFF16A34A)
                          : const Color(0xFFD97706),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        (r.supportCount > 0 || r.repairVerifications > 0)
                            ? 'Confirmé par ${r.supportCount + r.repairVerifications} citoyen${(r.supportCount + r.repairVerifications) > 1 ? "s" : ""}'
                            : 'En attente de corroboration par les riverains',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: (r.supportCount > 0 || r.repairVerifications > 0)
                              ? const Color(0xFF15803D)
                              : const Color(0xFF92400E),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Actions buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        side: const BorderSide(color: Color(0xFF16A34A)),
                      ),
                      icon: const Icon(LucideIcons.checkCircle, size: 16, color: Color(0xFF16A34A)),
                      label: const Text('Corroborer', style: TextStyle(color: Color(0xFF16A34A), fontWeight: FontWeight.bold)),
                      onPressed: () async {
                        Navigator.pop(ctx);
                        try {
                          await Supabase.instance.client.rpc('corroborate_report', params: {'p_report_id': r.id});
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('✓ Signalement corroboré avec succès !'),
                                backgroundColor: AppTheme.secondaryEmerald,
                              ),
                            );
                            _fetchMapReports();
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Note: $e')));
                          }
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryTeal,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(LucideIcons.externalLink, size: 16, color: Colors.white),
                      label: const Text('Détails complets', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => ReportDetailScreen(report: r)));
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
