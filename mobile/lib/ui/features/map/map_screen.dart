import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/repositories/report_repository.dart';
import '../../../domain/models/report_model.dart';
import '../reports/report_detail_screen.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  final MapController _mapController = MapController();
  static final LatLng _defaultCenter = LatLng(5.3599517, -4.0082563);
  String _selectedCategory = 'all'; // 'all', 'outage', 'infrastructure'
  bool _isPartnerMode = false;
  ReportModel? _selectedReport;

  Future<void> _recenterToUserLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return;
      }

      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );

      final userLatLng = LatLng(position.latitude, position.longitude);
      _mapController.move(userLatLng, 14.5);
    } catch (e) {
      debugPrint('Erreur carte GPS: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final String? filterCategory = _selectedCategory == 'all' ? null : _selectedCategory;
    final reportsAsync = ref.watch(reportsProvider(filterCategory));

    return Scaffold(
      body: Stack(
        children: [
          // FlutterMap OpenStreetMap Renders
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _defaultCenter,
              initialZoom: 12.0,
              minZoom: 6.0,
              maxZoom: 18.0,
              onTap: (_, _) {
                setState(() => _selectedReport = null);
              },
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'ci.signa.signa_mobile',
              ),
              reportsAsync.when(
                data: (reports) {
                  final markers = reports
                      .where((r) => r.latitude != null && r.longitude != null)
                      .map((report) {
                    final bool isOutage = report.isOutage;
                    final Color color = report.alertColor;

                    return Marker(
                      point: LatLng(report.latitude!, report.longitude!),
                      width: 80,
                      height: 54,
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _selectedReport = report);
                        },
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            // Micro Duration Pill (Mode Citoyen vs Partner)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: color, width: 1.5),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withAlpha(30),
                                    blurRadius: 3,
                                  ),
                                ],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    report.alertLevel == 'critical'
                                        ? LucideIcons.alertTriangle
                                        : LucideIcons.clock,
                                    size: 9,
                                    color: color,
                                  ),
                                  const SizedBox(width: 2),
                                  Text(
                                    _isPartnerMode
                                        ? 'P: ${(report.impactedPeople * 10) + (report.verifications * 5)}'
                                        : report.elapsedFormatted,
                                    style: TextStyle(
                                      color: color,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 9,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 1),

                            // Map Pin Icon 28px
                            Container(
                              padding: const EdgeInsets.all(5),
                              decoration: BoxDecoration(
                                color: color,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: color.withAlpha(90),
                                    blurRadius: 5,
                                    spreadRadius: 1,
                                  ),
                                ],
                                border: Border.all(color: Colors.white, width: 1.5),
                              ),
                              child: Icon(
                                isOutage ? LucideIcons.zapOff : LucideIcons.wrench,
                                color: Colors.white,
                                size: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList();

                  return MarkerLayer(markers: markers);
                },
                loading: () => const SizedBox.shrink(),
                error: (_, _) => const SizedBox.shrink(),
              ),
            ],
          ),

          // Top Header & Category Filters Overlay
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Column(
                children: [
                  Card(
                    elevation: 4,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.map, color: AppTheme.primaryTeal, size: 20),
                          const SizedBox(width: 6),
                          Text(
                            _isPartnerMode ? 'Mode Régulateur' : 'Carte Direct',
                            style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const Spacer(),
                          _buildMiniFilterChip('Tous', 'all'),
                          const SizedBox(width: 4),
                          _buildMiniFilterChip('Coupures', 'outage'),
                          const SizedBox(width: 4),
                          _buildMiniFilterChip('Infra', 'infrastructure'),
                        ],
                      ),
                    ),
                  ),

                  // Mode Toggle Bar (Citoyen vs Professionnel / Partenaire)
                  Padding(
                    padding: const EdgeInsets.only(top: 6.0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withAlpha(200),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _isPartnerMode ? '🛡️ Mode Partenaire Actif' : '👥 Mode Citoyen',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          Switch(
                            value: _isPartnerMode,
                            activeColor: AppTheme.amberAccent,
                            onChanged: (val) {
                              setState(() => _isPartnerMode = val);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    val
                                        ? 'Mode Régulateur & Partenaire activé'
                                        : 'Mode Citoyen épuré activé',
                                  ),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Recenter GPS Button
          Positioned(
            right: 16,
            bottom: _selectedReport != null ? 300 : 20,
            child: FloatingActionButton.small(
              heroTag: 'recenter_gps',
              onPressed: _recenterToUserLocation,
              backgroundColor: Theme.of(context).cardColor,
              child: const Icon(LucideIcons.locate, color: AppTheme.primaryTeal),
            ),
          ),

          // Selected Report Preview Card (Bottom Sheet Overlay)
          if (_selectedReport != null)
            Positioned(
              left: 16,
              right: 16,
              bottom: 16,
              child: _buildReportPreviewCard(context, _selectedReport!),
            ),
        ],
      ),
    );
  }

  Widget _buildMiniFilterChip(String label, String value) {
    final bool isSelected = _selectedCategory == value;
    return GestureDetector(
      onTap: () {
        setState(() => _selectedCategory = value);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryTeal : Colors.grey.withAlpha(40),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.black87,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildReportPreviewCard(BuildContext context, ReportModel report) {
    final bool isOutage = report.isOutage;
    final Color color = report.alertColor;

    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withAlpha(25),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: color.withAlpha(80)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isOutage ? LucideIcons.zapOff : LucideIcons.wrench,
                        size: 14,
                        color: color,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isOutage ? 'Coupure ${report.serviceType}' : 'Infrastructure ${report.serviceType}',
                        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),

                // Duration Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withAlpha(15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(LucideIcons.clock, size: 12, color: color),
                      const SizedBox(width: 4),
                      Text(
                        report.elapsedFormatted,
                        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 18),
                  onPressed: () => setState(() => _selectedReport = null),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              report.description.isNotEmpty ? report.description : 'Signalement d\'incident',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(LucideIcons.mapPin, size: 14, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  '${report.commune} • ${report.quartier}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
                const Spacer(),
                Icon(LucideIcons.thumbsUp, size: 13, color: Colors.grey[600]),
                const SizedBox(width: 4),
                Text(
                  '${report.supportCount} corroboration(s)',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),

            // Vulnerable Impact Badges (Bébés, Personnes âgées, Femmes enceintes)
            if (report.babies > 0 || report.elderly > 0 || report.pregnant > 0) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                children: [
                  if (report.babies > 0)
                    _buildVulnerableChip('👶 ${report.babies} bébé(s)', Colors.pink),
                  if (report.elderly > 0)
                    _buildVulnerableChip('👵 ${report.elderly} senior(s)', Colors.purple),
                  if (report.pregnant > 0)
                    _buildVulnerableChip('🤰 ${report.pregnant} femme(s) enceinte(s)', Colors.amber[800]!),
                ],
              ),
            ],

            const SizedBox(height: 14),

            // Action Buttons
            if (!_isPartnerMode)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        ref
                            .read(reportRepositoryProvider)
                            .corroborateReport(report.id, isOutage ? 'still_out' : 'still_broken');
                        ref.invalidate(reportsProvider);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Merci pour votre confirmation !')),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.outageColor,
                        side: const BorderSide(color: AppTheme.outageColor),
                      ),
                      child: Text(isOutage ? 'Toujours coupé' : 'Problème persiste'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        ref
                            .read(reportRepositoryProvider)
                            .corroborateReport(report.id, isOutage ? 'back_on' : 'fixed');
                        ref.invalidate(reportsProvider);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Signalement mis à jour !')),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.secondaryEmerald,
                      ),
                      child: Text(isOutage ? 'Tout va bien' : 'Problème résolu'),
                    ),
                  ),
                ],
              )
            else
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryTeal,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 44),
                ),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (ctx) => ReportDetailScreen(report: report),
                    ),
                  );
                },
                icon: const Icon(LucideIcons.shieldAlert, size: 18),
                label: const Text('Fiche Technique & Intervention Partenaire →'),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVulnerableChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(20),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withAlpha(60)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}
