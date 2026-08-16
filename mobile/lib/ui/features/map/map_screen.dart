import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons/lucide_icons.dart';
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
  String _selectedMode = 'coupures'; // 'coupures', 'infrastructures'
  String _selectedCommune = 'all';

  List<ReportModel> _reports = [];
  bool _isLoading = true;
  ReportModel? _selectedReport;

  @override
  void initState() {
    super.initState();
    _fetchMapReports();
  }

  Future<void> _fetchMapReports() async {
    setState(() => _isLoading = true);
    try {
      final res = await Supabase.instance.client
          .from('reports')
          .select()
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', ascending: false)
          .limit(100);

      if (res is List && mounted) {
        setState(() {
          _reports = (res as List).map((e) => ReportModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
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

  List<ReportModel> get _filteredReports {
    return _reports.where((r) {
      if (r.latitude == null || r.longitude == null) return false;
      if (_selectedService != 'all' && r.serviceType != _selectedService) return false;
      if (_selectedMode == 'coupures' && r.reportCategory != 'outage') return false;
      if (_selectedMode == 'infrastructures' && r.reportCategory != 'infrastructure') return false;
      if (_selectedCommune != 'all' && r.commune.toLowerCase() != _selectedCommune.toLowerCase()) return false;
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
          // 1. CARTE OPENSTREETMAP (Exact Leaflet Web)
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

              // Marqueurs des 7 Communes Pilotes
              MarkerLayer(
                markers: PILOT_COMMUNES.map((c) {
                  return Marker(
                    point: LatLng(c.centerLat, c.centerLon),
                    width: 70,
                    height: 70,
                    child: GestureDetector(
                      onTap: () => _focusCommune(c),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(color: c.couleur.withAlpha(120), blurRadius: 8, spreadRadius: 1),
                              ],
                              border: Border.all(color: c.couleur, width: 2),
                            ),
                            child: Image.asset(c.logoAsset, width: 24, height: 24, fit: BoxFit.contain, errorBuilder: (_, __, ___) => Icon(LucideIcons.mapPin, color: c.couleur, size: 20)),
                          ),
                          const SizedBox(height: 2),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: Colors.black87,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(c.nom, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),

              // Marqueurs des Signalements Réels
              MarkerLayer(
                markers: filtered.map((r) {
                  final isElec = r.serviceType == 'electricity';
                  final isEau = r.serviceType == 'water';
                  final pinColor = isElec ? const Color(0xFFF59E0B) : isEau ? const Color(0xFF0284C7) : const Color(0xFF9333EA);
                  final pinIcon = isElec ? LucideIcons.zap : isEau ? LucideIcons.droplets : LucideIcons.landmark;

                  return Marker(
                    point: LatLng(r.latitude!, r.longitude!),
                    width: 44,
                    height: 44,
                    child: GestureDetector(
                      onTap: () => _showReportDetailsModal(r),
                      child: Container(
                        decoration: BoxDecoration(
                          color: pinColor,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(color: pinColor.withAlpha(100), blurRadius: 6, offset: const Offset(0, 2)),
                          ],
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                        child: Icon(pinIcon, color: Colors.white, size: 20),
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
              padding: const EdgeInsets.all(12.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Sélecteur de mode (Coupures vs Infrastructures)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF1E293B) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withAlpha(15), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _selectedMode = 'coupures'),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: _selectedMode == 'coupures' ? const Color(0xFFEA580C) : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '⚡ Coupures actives',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: _selectedMode == 'coupures' ? Colors.white : Colors.grey,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _selectedMode = 'infrastructures'),
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: _selectedMode == 'infrastructures' ? AppTheme.primaryTeal : Colors.transparent,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '🏗️ Infrastructures',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: _selectedMode == 'infrastructures' ? Colors.white : Colors.grey,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Sélecteur de services (Chips horizontaux)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterChip('Tous', 'all', LucideIcons.layers, const Color(0xFF0F172A)),
                        const SizedBox(width: 6),
                        _buildFilterChip('CIE (Électricité)', 'electricity', LucideIcons.zap, const Color(0xFFF59E0B)),
                        const SizedBox(width: 6),
                        _buildFilterChip('SODECI (Eau)', 'water', LucideIcons.droplets, const Color(0xFF0284C7)),
                        const SizedBox(width: 6),
                        _buildFilterChip('Mairie (Voirie)', 'mairie', LucideIcons.landmark, const Color(0xFF9333EA)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ══════════════════════════════════════════════════════════
          // 3. BOUTONS D'ACTION FLOTTANTS
          // ══════════════════════════════════════════════════════════
          Positioned(
            right: 16,
            bottom: 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton.small(
                  heroTag: 'refresh_map_btn',
                  backgroundColor: Colors.white,
                  child: _isLoading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(LucideIcons.refreshCw, color: Color(0xFF0F172A), size: 18),
                  onPressed: _fetchMapReports,
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
            BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 4, offset: const Offset(0, 2)),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isSelected ? Colors.white : activeColor),
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
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        final isElec = r.serviceType == 'electricity';
        final isEau = r.serviceType == 'water';
        final iconColor = isElec ? const Color(0xFFF59E0B) : isEau ? const Color(0xFF0284C7) : const Color(0xFF9333EA);

        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: iconColor.withAlpha(30), borderRadius: BorderRadius.circular(10)),
                    child: Icon(isElec ? LucideIcons.zap : isEau ? LucideIcons.droplets : LucideIcons.landmark, color: iconColor, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${r.commune} · ${r.quartier}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text(r.reportCategory == 'outage' ? 'Coupure déclarée' : 'Incident infrastructure', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                  ),
                  IconButton(icon: const Icon(LucideIcons.x), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 14),
              Text(r.description, style: const TextStyle(fontSize: 13, height: 1.4)),
              const SizedBox(height: 14),

              if (r.photoUrls != null && r.photoUrls!.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(r.photoUrls!.first, height: 140, width: double.infinity, fit: BoxFit.cover),
                ),
                const SizedBox(height: 14),
              ],

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      icon: const Icon(LucideIcons.checkCircle, size: 16, color: Color(0xFF16A34A)),
                      label: const Text('Corroborer', style: TextStyle(color: Color(0xFF16A34A))),
                      onPressed: () async {
                        Navigator.pop(ctx);
                        try {
                          await Supabase.instance.client.rpc('corroborate_report', params: {'p_report_id': r.id});
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('✓ Corroboration enregistrée !'), backgroundColor: AppTheme.secondaryEmerald),
                          );
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
                        }
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => ReportDetailScreen(report: r)));
                      },
                      child: const Text('Détails complets', style: TextStyle(color: Colors.white)),
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
