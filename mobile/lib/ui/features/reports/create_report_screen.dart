import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/communes.dart';
import '../../../core/constants/quartiers.dart';
import '../../../core/constants/supabase_constants.dart';
import '../../../core/theme/app_theme.dart';

// ─── Modèle de type de signalement (Miroir exact de Web ReportPage.tsx) ─────────
class ReportTypeConfig {
  final String id;
  final String emoji;
  final String label;
  final String description;
  final Color color;
  final String serviceType; // 'electricity', 'water', 'mairie'
  final String reportCategory; // 'outage', 'infrastructure'
  final String? operator; // 'CIE', 'SODECI', 'MAIRIE'
  final String Function(String commune) defaultDesc;

  const ReportTypeConfig({
    required this.id,
    required this.emoji,
    required this.label,
    required this.description,
    required this.color,
    required this.serviceType,
    required this.reportCategory,
    this.operator,
    required this.defaultDesc,
  });
}

final List<ReportTypeConfig> REPORT_TYPES = [
  // ─── Coupures de service ───────────────────────────────────────────
  ReportTypeConfig(
    id: 'electricity_outage',
    emoji: '⚡',
    label: "Coupure d'électricité",
    description: "Interruption du courant chez vous ou dans la zone",
    color: const Color(0xFFF59E0B),
    serviceType: 'electricity',
    reportCategory: 'outage',
    defaultDesc: (c) => "Coupure d'électricité à $c",
  ),
  ReportTypeConfig(
    id: 'water_outage',
    emoji: '💧',
    label: "Coupure d'eau",
    description: "Interruption de distribution d'eau potable",
    color: const Color(0xFF3B82F6),
    serviceType: 'water',
    reportCategory: 'outage',
    defaultDesc: (c) => "Coupure d'eau à $c",
  ),

  // ─── CIE (Électricité & Éclairage Public) ──────────────────────────
  ReportTypeConfig(
    id: 'street_light',
    emoji: '💡',
    label: 'Éclairage public',
    description: 'Lampadaire cassé, éteint ou éclairage public hors service',
    color: const Color(0xFFEAB308),
    serviceType: 'electricity',
    reportCategory: 'infrastructure',
    operator: 'CIE',
    defaultDesc: (c) => 'Éclairage public / Lampadaire hors service à $c',
  ),
  ReportTypeConfig(
    id: 'cie_pole',
    emoji: '🗼',
    label: 'Poteaux / Pylônes',
    description: 'Poteau penché, câble électrique à terre, pylône à risque',
    color: const Color(0xFFF59E0B),
    serviceType: 'electricity',
    reportCategory: 'infrastructure',
    operator: 'CIE',
    defaultDesc: (c) => 'Poteau / Pylône électrique dangereux à $c',
  ),
  ReportTypeConfig(
    id: 'cie_hazard',
    emoji: '⚠️',
    label: 'Branchements dangereux',
    description: 'Fils nus, étincelles, installation à risque élevé',
    color: const Color(0xFFEF4444),
    serviceType: 'electricity',
    reportCategory: 'infrastructure',
    operator: 'CIE',
    defaultDesc: (c) => 'Branchement électrique dangereux à $c',
  ),
  ReportTypeConfig(
    id: 'cie_other',
    emoji: '🚧',
    label: 'Autres incidents CIE',
    description: 'Autre anomalie sur le réseau d\'électricité',
    color: const Color(0xFFF97316),
    serviceType: 'electricity',
    reportCategory: 'infrastructure',
    operator: 'CIE',
    defaultDesc: (c) => 'Incident réseau électrique CIE à $c',
  ),

  // ─── SODECI (Eau Potable & Assainissement) ────────────────────────
  ReportTypeConfig(
    id: 'canalisation_sodeci',
    emoji: '🚰',
    label: 'Canalisation publique',
    description: 'Égout bouché, débordement de vos regards',
    color: const Color(0xFF0284C7),
    serviceType: 'water',
    reportCategory: 'infrastructure',
    operator: 'SODECI',
    defaultDesc: (c) => 'Canalisation publique / Égout bouché à $c',
  ),
  ReportTypeConfig(
    id: 'water_leak',
    emoji: '🚿',
    label: "Fuite d'eau",
    description: "Fuite d'eau à l'extérieur de votre maison",
    color: const Color(0xFF06B6D4),
    serviceType: 'water',
    reportCategory: 'infrastructure',
    operator: 'SODECI',
    defaultDesc: (c) => "Fuite d'eau à l'extérieur de la maison à $c",
  ),
  ReportTypeConfig(
    id: 'sodeci_other',
    emoji: '💧',
    label: 'Autre incident SODECI',
    description: "Incident sur le réseau d'eau potable",
    color: const Color(0xFF3B82F6),
    serviceType: 'water',
    reportCategory: 'infrastructure',
    operator: 'SODECI',
    defaultDesc: (c) => "Incident réseau d'eau potable SODECI à $c",
  ),

  // ─── MAIRIE (Voirie & Salubrité) ──────────────────────────────────
  ReportTypeConfig(
    id: 'pothole',
    emoji: '🛣️',
    label: 'Nid de poule',
    description: 'Trou sur la chaussée, bitume dégradé',
    color: const Color(0xFF10B981),
    serviceType: 'mairie',
    reportCategory: 'infrastructure',
    operator: 'MAIRIE',
    defaultDesc: (c) => 'Nid de poule / route dégradée à $c',
  ),
  ReportTypeConfig(
    id: 'drain_blocked',
    emoji: '🚧',
    label: 'Caniveau bouché',
    description: 'Caniveau obstrué, eau stagnante sur la voie publique',
    color: const Color(0xFF10B981),
    serviceType: 'mairie',
    reportCategory: 'infrastructure',
    operator: 'MAIRIE',
    defaultDesc: (c) => 'Caniveau bouché à $c',
  ),
  ReportTypeConfig(
    id: 'road_damage',
    emoji: '🛤️',
    label: 'Voirie & Trottoirs',
    description: 'Trottoir cassé, pavés abîmés, glissière endommagée',
    color: const Color(0xFF8B5CF6),
    serviceType: 'mairie',
    reportCategory: 'infrastructure',
    operator: 'MAIRIE',
    defaultDesc: (c) => 'Voirie / trottoir dégradé à $c',
  ),
  ReportTypeConfig(
    id: 'illegal_dump',
    emoji: '🗑️',
    label: 'Dépôt sauvage & Ordures',
    description: 'Ordures ou déchets non ramassés sur le domaine public',
    color: const Color(0xFF10B981),
    serviceType: 'mairie',
    reportCategory: 'infrastructure',
    operator: 'MAIRIE',
    defaultDesc: (c) => 'Dépôt sauvage d\'ordures à $c',
  ),
  ReportTypeConfig(
    id: 'other',
    emoji: '🏗️',
    label: 'Autre (Mairie)',
    description: 'Autre anomalie relevant des services municipaux',
    color: const Color(0xFF6B7280),
    serviceType: 'mairie',
    reportCategory: 'infrastructure',
    operator: 'MAIRIE',
    defaultDesc: (c) => 'Signalement voirie / mairie à $c',
  ),
];

class CreateReportScreen extends ConsumerStatefulWidget {
  final ReportTypeConfig? initialType;
  final String? initialCommune;
  const CreateReportScreen({super.key, this.initialType, this.initialCommune});

  @override
  ConsumerState<CreateReportScreen> createState() => _CreateReportScreenState();
}

class _CreateReportScreenState extends ConsumerState<CreateReportScreen> {
  int _step = 1; // 1: Choix Type, 2: Détails
  ReportTypeConfig? _selectedType;

  // Form Fields
  late String _selectedCommune;
  String _selectedQuartier = 'Angré';
  bool _isCustomQuartier = false;
  final TextEditingController _customQuartierController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _meterNumberController = TextEditingController();

  String _contractType = 'postpaid'; // 'prepaid' | 'postpaid'
  TimeOfDay _startTime = TimeOfDay.now();

  // GPS
  double? _latitude;
  double? _longitude;
  double? _gpsAccuracy;
  bool _isGettingGps = false;
  bool _gpsConsent = true;

  // Vulnérabilité
  int _impactedPeople = 1;
  int _babies = 0;
  int _elderly = 0;
  int _pregnant = 0;

  // Photos
  final ImagePicker _picker = ImagePicker();
  final List<XFile> _selectedPhotos = [];
  bool _isSubmitting = false;

  // Similar Reports (Doublons)
  List<Map<String, dynamic>> _similarReports = [];
  bool _checkingSimilar = false;

  @override
  void initState() {
    super.initState();
    _selectedCommune = widget.initialCommune ?? 'Cocody';
    if (widget.initialType != null) {
      _selectedType = widget.initialType;
      _step = 2;
    }
    _autoCaptureGps();
  }

  @override
  void dispose() {
    _customQuartierController.dispose();
    _descriptionController.dispose();
    _meterNumberController.dispose();
    super.dispose();
  }

  Future<void> _autoCaptureGps() async {
    setState(() => _isGettingGps = true);
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 10)),
      );
      if (mounted) {
        setState(() {
          _latitude = pos.latitude;
          _longitude = pos.longitude;
          _gpsAccuracy = pos.accuracy;
          _isGettingGps = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isGettingGps = false);
    }
  }

  Future<void> _checkSimilarReports() async {
    if (_selectedType == null || _selectedType!.reportCategory != 'outage') return;
    setState(() => _checkingSimilar = true);
    try {
      final res = await Supabase.instance.client.rpc('find_similar_reports', params: {
        'p_commune': _selectedCommune,
        'p_quartier': _selectedQuartier,
        'p_service_type': _selectedType!.serviceType,
        'p_report_category': 'outage',
      });
      if (res != null && mounted) {
        final list = List<Map<String, dynamic>>.from(res as List);
        setState(() => _similarReports = list);
      }
    } catch (_) {}
    if (mounted) setState(() => _checkingSimilar = false);
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final photo = await _picker.pickImage(source: source, maxWidth: 1200, maxHeight: 1200, imageQuality: 80);
      if (photo != null && mounted) {
        setState(() => _selectedPhotos.add(photo));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur photo: $e')));
    }
  }

  Future<void> _corroborateExisting(String reportId) async {
    try {
      await Supabase.instance.client.rpc('corroborate_report', params: {'p_report_id': reportId});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✓ Corroboration ajoutée. Le signalement existant est renforcé !'), backgroundColor: AppTheme.secondaryEmerald),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    }
  }

  Future<void> _submitReport() async {
    if (_selectedType == null) return;
    if (_latitude == null || _longitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Position GPS requise. Cliquez sur "Relocaliser"'), backgroundColor: Colors.red));
      return;
    }
    if (_selectedType!.reportCategory == 'infrastructure' && _selectedPhotos.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Une photo est obligatoire pour les signalements d\'infrastructures'), backgroundColor: Colors.red));
      return;
    }

    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Veuillez vous connecter pour envoyer votre signalement'), backgroundColor: Colors.orange));
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final List<String> uploadedPhotoUrls = [];
      for (var photo in _selectedPhotos) {
        final bytes = await photo.readAsBytes();
        final fileName = '${DateTime.now().millisecondsSinceEpoch}_${photo.name}';
        final path = '${user.id}/$fileName';
        await Supabase.instance.client.storage.from(SupabaseConstants.photoBucket).uploadBinary(path, bytes);
        uploadedPhotoUrls.add(path);
      }

      final now = DateTime.now();
      final reportStartTime = DateTime(now.year, now.month, now.day, _startTime.hour, _startTime.minute).toIso8601String();

      final effectiveQuartier = _isCustomQuartier && _customQuartierController.text.trim().isNotEmpty
          ? _customQuartierController.text.trim()
          : normalizeQuartier(_selectedQuartier, _selectedCommune);

      final hasVulnerable = _babies > 0 || _pregnant > 0 || _elderly > 0;
      final defaultDesc = _selectedType!.defaultDesc(_selectedCommune);
      final desc = _descriptionController.text.trim().isNotEmpty ? _descriptionController.text.trim() : defaultDesc;

      final fullDesc = '[${_selectedType!.label}] $desc [$_impactedPeople personne(s)${_babies > 0 ? ", $_babies bébé(s)" : ""}${_pregnant > 0 ? ", $_pregnant femme(s) enceinte(s)" : ""}${_elderly > 0 ? ", $_elderly aîné(s)" : ""}]';

      final payload = {
        'user_id': user.id,
        'service_type': _selectedType!.serviceType,
        'report_category': _selectedType!.reportCategory,
        'description': fullDesc,
        'location': _selectedCommune,
        'commune': _selectedCommune,
        'quartier': effectiveQuartier,
        'custom_quartier': _isCustomQuartier ? _customQuartierController.text.trim() : null,
        'latitude': _latitude,
        'longitude': _longitude,
        'urgency': hasVulnerable ? 'high' : 'medium',
        'start_time': reportStartTime,
        'photo_url': uploadedPhotoUrls.isNotEmpty ? uploadedPhotoUrls.first : null,
        'photo_urls': uploadedPhotoUrls.isNotEmpty ? uploadedPhotoUrls : null,
        'impacted_people': _impactedPeople,
        'babies': _babies,
        'pregnant': _pregnant,
        'elderly': _elderly,
        'meter_number': _meterNumberController.text.trim().isNotEmpty ? _meterNumberController.text.trim() : null,
        if (_selectedType!.id.contains('outage')) 'contract_type': _contractType,
      };

      final res = await Supabase.instance.client.from('reports').insert(payload).select('id').single();

      HapticFeedback.mediumImpact();
      if (mounted) {
        _showSuccessDialog(res['id'] as String, effectiveQuartier);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showSuccessDialog(String reportId, String quartier) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: const [
            Icon(LucideIcons.checkCircle2, color: Color(0xFF16A34A), size: 28),
            SizedBox(width: 10),
            Text('Signalement Transmis', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Votre signalement à $_selectedCommune ($quartier) a été enregistré et transmis aux équipes de veille.', style: const TextStyle(fontSize: 13, height: 1.4)),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Row(
                children: const [
                  Icon(LucideIcons.shieldAlert, size: 20, color: Color(0xFFD97706)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text('En cas d\'urgence vitale, contactez directement les secours (180 / 185).', style: TextStyle(fontSize: 11, color: Color(0xFF92400E), fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('Retour à l\'accueil', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFFBF9F5),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 1,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () {
            if (_step == 2 && widget.initialType == null) {
              setState(() => _step = 1);
            } else {
              Navigator.pop(context);
            }
          },
        ),
        title: Text(
          _step == 1 ? 'Nouveau signalement' : '${_selectedType?.emoji ?? ""} ${_selectedType?.label ?? "Détails"}',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 17),
        ),
      ),
      body: _step == 1 ? _buildStep1TypeSelection(isDark) : _buildStep2Form(isDark),
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ÉTAPE 1 : CHOIX DU TYPE DE SIGNALEMENT (1:1 Web)
  // ════════════════════════════════════════════════════════════════════════════
  Widget _buildStep1TypeSelection(bool isDark) {
    final outages = REPORT_TYPES.where((t) => t.reportCategory == 'outage').toList();
    final cieInfra = REPORT_TYPES.where((t) => t.operator == 'CIE').toList();
    final sodeciInfra = REPORT_TYPES.where((t) => t.operator == 'SODECI').toList();
    final mairieInfra = REPORT_TYPES.where((t) => t.operator == 'MAIRIE').toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Que souhaitez-vous signaler ?', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          const Text('Sélectionnez la catégorie qui correspond à votre situation.', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          const SizedBox(height: 18),

          // 1. COUPURES DE SERVICE (PRIORITÉ)
          _buildSectionHeader('⚡ Coupures de service en cours', const Color(0xFFEA580C)),
          const SizedBox(height: 10),
          ...outages.map((t) => _buildTypeCard(t, isDark)),
          const SizedBox(height: 20),

          // 2. CIE INFRASTRUCTURE
          _buildSectionHeader('🗼 Électricité & Éclairage Public (CIE)', const Color(0xFFD97706)),
          const SizedBox(height: 10),
          ...cieInfra.map((t) => _buildTypeCard(t, isDark)),
          const SizedBox(height: 20),

          // 3. SODECI INFRASTRUCTURE
          _buildSectionHeader('🚰 Eau & Canalisations (SODECI)', const Color(0xFF0284C7)),
          const SizedBox(height: 10),
          ...sodeciInfra.map((t) => _buildTypeCard(t, isDark)),
          const SizedBox(height: 20),

          // 4. MAIRIE VOIRIE
          _buildSectionHeader('🏛️ Voirie & Salubrité (Mairies)', const Color(0xFF9333EA)),
          const SizedBox(height: 10),
          ...mairieInfra.map((t) => _buildTypeCard(t, isDark)),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color color) {
    return Row(
      children: [
        Container(width: 4, height: 16, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 8),
        Text(title, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  Widget _buildTypeCard(ReportTypeConfig type, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            setState(() {
              _selectedType = type;
              _step = 2;
            });
            _checkSimilarReports();
          },
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: type.color.withAlpha(25),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  alignment: Alignment.center,
                  child: Text(type.emoji, style: const TextStyle(fontSize: 22)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(type.label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 2),
                      Text(type.description, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                    ],
                  ),
                ),
                const Icon(LucideIcons.chevronRight, size: 18, color: Colors.grey),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ÉTAPE 2 : FORMULAIRE COMPLET DU SIGNALEMENT (1:1 Web)
  // ════════════════════════════════════════════════════════════════════════════
  Widget _buildStep2Form(bool isDark) {
    final quartiersList = getQuartiers(_selectedCommune);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Alerte doublons
          if (_similarReports.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFFBEB),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(LucideIcons.alertTriangle, color: Color(0xFFD97706), size: 18),
                      SizedBox(width: 8),
                      Text('Coupure déjà signalée dans ce quartier !', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF92400E))),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('${_similarReports.length} voisin(s) ont déjà signalé cette coupure à $_selectedCommune ($_selectedQuartier). Vous pouvez directement corroborer pour renforcer l\'alerte :', style: const TextStyle(fontSize: 11, color: Color(0xFF78350F))),
                  const SizedBox(height: 10),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEA580C), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    icon: const Icon(LucideIcons.checkCircle, size: 14, color: Colors.white),
                    label: const Text('Je confirme cette coupure chez moi', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold)),
                    onPressed: () => _corroborateExisting(_similarReports.first['id'] as String),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // 1. COMMUNE & QUARTIER
          Text('Localisation', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Commune pilote', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _selectedCommune,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: PILOT_COMMUNES.map((c) => DropdownMenuItem(
                    value: c.nom,
                    child: Row(
                      children: [
                        Container(width: 8, height: 8, decoration: BoxDecoration(color: c.couleur, shape: BoxShape.circle)),
                        const SizedBox(width: 8),
                        Text(c.nom, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                  )).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedCommune = val;
                        final qList = getQuartiers(val);
                        _selectedQuartier = qList.isNotEmpty ? qList.first : '';
                        _isCustomQuartier = false;
                      });
                      _checkSimilarReports();
                    }
                  },
                ),
                const SizedBox(height: 14),

                const Text('Quartier', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: _isCustomQuartier ? '__other' : (quartiersList.contains(_selectedQuartier) ? _selectedQuartier : (quartiersList.isNotEmpty ? quartiersList.first : '__other')),
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  items: [
                    ...quartiersList.map((q) => DropdownMenuItem(value: q, child: Text(q, style: const TextStyle(fontSize: 13)))),
                    const DropdownMenuItem(value: '__other', child: Text('Autre quartier (préciser)...', style: TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: AppTheme.primaryTeal))),
                  ],
                  onChanged: (val) {
                    if (val == '__other') {
                      setState(() => _isCustomQuartier = true);
                    } else if (val != null) {
                      setState(() {
                        _selectedQuartier = val;
                        _isCustomQuartier = false;
                      });
                      _checkSimilarReports();
                    }
                  },
                ),

                if (_isCustomQuartier) ...[
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: _customQuartierController,
                    decoration: InputDecoration(
                      hintText: 'Précisez le nom exact de votre quartier',
                      hintStyle: const TextStyle(fontSize: 12),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. GÉOLOCALISATION GPS
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: _latitude != null ? const Color(0xFFBBF7D0) : const Color(0xFFFECACA)),
            ),
            child: Row(
              children: [
                Icon(_latitude != null ? LucideIcons.mapPin : LucideIcons.mapPinOff, color: _latitude != null ? const Color(0xFF16A34A) : Colors.red, size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _latitude != null ? 'Position GPS verrouillée' : 'GPS requis pour la carte',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: _latitude != null ? const Color(0xFF16A34A) : Colors.red),
                      ),
                      Text(
                        _latitude != null ? 'Lat: ${_latitude!.toStringAsFixed(4)}, Lng: ${_longitude!.toStringAsFixed(4)} (± ${_gpsAccuracy?.round() ?? "?"} m)' : 'Cliquez sur relocaliser pour capturer vos coordonnées',
                        style: const TextStyle(fontSize: 10, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                TextButton.icon(
                  onPressed: _isGettingGps ? null : _autoCaptureGps,
                  icon: _isGettingGps ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(LucideIcons.refreshCw, size: 14),
                  label: const Text('Relocaliser', style: TextStyle(fontSize: 11)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. HEURE DE DÉBUT DE LA PANNE
          if (_selectedType?.reportCategory == 'outage') ...[
            Text('Heure de début de la coupure', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            InkWell(
              onTap: () async {
                final t = await showTimePicker(context: context, initialTime: _startTime);
                if (t != null) setState(() => _startTime = t);
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.clock, size: 18, color: Color(0xFFEA580C)),
                    const SizedBox(width: 10),
                    Text('${_startTime.hour.toString().padLeft(2, "0")}h${_startTime.minute.toString().padLeft(2, "0")}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const Spacer(),
                    const Text('Modifier', style: TextStyle(color: AppTheme.primaryTeal, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // 4. PERSONNES IMPACTÉES & VULNÉRABILITÉS (Exact Web)
          Text('Personnes impactées & Urgences', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                _buildCounterRow('Nombre total de personnes', _impactedPeople, (v) => setState(() => _impactedPeople = v.clamp(1, 100)), icon: LucideIcons.users),
                const Divider(height: 20),
                _buildCounterRow('Bébés / Nourrissons (< 2 ans)', _babies, (v) => setState(() => _babies = v.clamp(0, 20)), icon: LucideIcons.baby),
                const Divider(height: 20),
                _buildCounterRow('Femmes enceintes', _pregnant, (v) => setState(() => _pregnant = v.clamp(0, 10)), icon: LucideIcons.heart),
                const Divider(height: 20),
                _buildCounterRow('Personnes âgées / Vulnérables', _elderly, (v) => setState(() => _elderly = v.clamp(0, 20)), icon: LucideIcons.userCheck),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 5. PHOTOS (Obligatoire pour voirie/infrastructure)
          Text('Photos justificatives ${_selectedType?.reportCategory == "infrastructure" ? "(Obligatoire)" : "(Optionnel)"}', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                if (_selectedPhotos.isNotEmpty) ...[
                  SizedBox(
                    height: 90,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _selectedPhotos.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (ctx, idx) => Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: Image.file(File(_selectedPhotos[idx].path), width: 90, height: 90, fit: BoxFit.cover),
                          ),
                          Positioned(
                            top: 2,
                            right: 2,
                            child: InkWell(
                              onTap: () => setState(() => _selectedPhotos.removeAt(idx)),
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                child: const Icon(LucideIcons.x, size: 14, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(LucideIcons.camera, size: 16),
                        label: const Text('Prendre photo', style: TextStyle(fontSize: 12)),
                        onPressed: () => _pickImage(ImageSource.camera),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(LucideIcons.image, size: 16),
                        label: const Text('Galerie', style: TextStyle(fontSize: 12)),
                        onPressed: () => _pickImage(ImageSource.gallery),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 6. DESCRIPTION LIBRE
          Text('Précisions & Détails', style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          TextFormField(
            controller: _descriptionController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: _selectedType?.defaultDesc(_selectedCommune) ?? 'Décrivez la panne ou l\'incident...',
              hintStyle: const TextStyle(fontSize: 12, color: Colors.grey),
              filled: true,
              fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0))),
            ),
          ),
          const SizedBox(height: 24),

          // BOUTON DE SOUMISSION
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEA580C),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 3,
              ),
              icon: _isSubmitting
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(LucideIcons.send, color: Colors.white),
              label: Text(
                _isSubmitting ? 'Envoi en cours...' : 'Envoyer le signalement',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
              ),
              onPressed: _isSubmitting ? null : _submitReport,
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildCounterRow(String label, int value, ValueChanged<int> onChanged, {required IconData icon}) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF64748B)),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
        InkWell(
          onTap: () => onChanged(value - 1),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
            child: const Icon(LucideIcons.minus, size: 14, color: Colors.black87),
          ),
        ),
        SizedBox(width: 36, child: Text('$value', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
        InkWell(
          onTap: () => onChanged(value + 1),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: AppTheme.primaryTeal, borderRadius: BorderRadius.circular(8)),
            child: const Icon(LucideIcons.plus, size: 14, color: Colors.white),
          ),
        ),
      ],
    );
  }
}
