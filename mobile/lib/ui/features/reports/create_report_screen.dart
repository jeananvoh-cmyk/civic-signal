import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/constants/supabase_constants.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/repositories/report_repository.dart';

class CreateReportScreen extends ConsumerStatefulWidget {
  const CreateReportScreen({super.key});

  @override
  ConsumerState<CreateReportScreen> createState() => _CreateReportScreenState();
}

class _CreateReportScreenState extends ConsumerState<CreateReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _picker = ImagePicker();

  String _reportCategory = 'outage'; // 'outage' or 'infrastructure'
  String _serviceType = 'electricite'; // 'electricite', 'eau', 'voirie', 'eclairage'
  String _commune = 'Cocody';
  final TextEditingController _quartierController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();

  File? _selectedImage;
  bool _isUploading = false;
  bool _isGettingLocation = false;
  double? _latitude;
  double? _longitude;

  // Impact counters for outages
  int _impactedPeople = 1;
  int _babies = 0;
  int _elderly = 0;
  int _pregnant = 0;

  final List<String> _communesList = [
    'Abobo',
    'Adjamé',
    'Anyama',
    'Attécoubé',
    'Bingerville',
    'Cocody',
    'Koumassi',
    'Marcory',
    'Plateau',
    'Port-Bouët',
    'Songon',
    'Treichville',
    'Yopougon',
  ];

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 80,
      );
      if (photo != null) {
        setState(() {
          _selectedImage = File(photo.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur sélection image: $e')),
        );
      }
    }
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isGettingLocation = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw 'Veuillez activer la géolocalisation GPS sur votre appareil.';
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw 'Permission GPS refusée.';
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw 'Les permissions GPS sont définitivement bloquées dans les paramètres de votre téléphone.';
      }

      final Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Position GPS récupérée avec succès !'),
            backgroundColor: AppTheme.secondaryEmerald,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur GPS: $e'), backgroundColor: AppTheme.dangerRose),
        );
      }
    } finally {
      if (mounted) setState(() => _isGettingLocation = false);
    }
  }

  Future<String?> _uploadPhotoToSupabase() async {
    if (_selectedImage == null) return null;
    try {
      final String timestamp = DateTime.now().millisecondsSinceEpoch.toString();
      final String fileName = 'report_$timestamp.jpg';
      final String path = 'mobile/$fileName';

      final supabase = Supabase.instance.client;
      await supabase.storage.from(SupabaseConstants.photoBucket).upload(
            path,
            _selectedImage!,
            fileOptions: const FileOptions(cacheControl: '3600', upsert: true),
          );

      final String publicUrl =
          supabase.storage.from(SupabaseConstants.photoBucket).getPublicUrl(path);
      return publicUrl;
    } catch (e) {
      debugPrint('Erreur upload photo: $e');
      return null;
    }
  }

  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isUploading = true);

    try {
      final String? photoUrl = await _uploadPhotoToSupabase();
      final user = Supabase.instance.client.auth.currentUser;

      final reportData = {
        'user_id': user?.id ?? '00000000-0000-0000-0000-000000000000',
        'report_category': _reportCategory,
        'service_type': _serviceType,
        'description': _descriptionController.text.trim(),
        'commune': _commune,
        'quartier': _quartierController.text.trim(),
        'location': '$_commune, ${_quartierController.text.trim()}',
        'latitude': _latitude,
        'longitude': _longitude,
        'photo_url': photoUrl,
        'photo_urls': photoUrl != null ? [photoUrl] : [],
        'status': 'open',
        'support_count': 1,
        'impacted_people': _impactedPeople,
        'babies': _babies,
        'elderly': _elderly,
        'pregnant': _pregnant,
        'start_time': DateTime.now().toIso8601String(),
        'urgency': _reportCategory == 'outage' ? 'high' : 'medium',
      };

      await ref.read(reportRepositoryProvider).createReport(reportData);
      ref.invalidate(reportsProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Signalement publié avec succès ! Merci pour votre civisme.'),
            backgroundColor: AppTheme.secondaryEmerald,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors de la publication : $e'),
            backgroundColor: AppTheme.dangerRose,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouveau Signalement', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Category Selector (Outage vs Infrastructure)
              const Text('Type d\'incident', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildCategoryCard(
                      label: 'Coupure',
                      subtitle: 'Eau / Électricité',
                      value: 'outage',
                      icon: LucideIcons.zapOff,
                      color: AppTheme.outageColor,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildCategoryCard(
                      label: 'Infrastructure',
                      subtitle: 'Voirie, Caniveau...',
                      value: 'infrastructure',
                      icon: LucideIcons.wrench,
                      color: AppTheme.infraColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Service Subtype Selector
              const Text('Service concerné', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _reportCategory == 'outage'
                    ? [
                        _buildServiceChip('Électricité (CIE)', 'electricite', LucideIcons.zap),
                        _buildServiceChip('Eau (SODECI)', 'eau', LucideIcons.droplet),
                      ]
                    : [
                        _buildServiceChip('Caniveau / Égout', 'caniveau', LucideIcons.waves),
                        _buildServiceChip('Lampadaire', 'eclairage', LucideIcons.sun),
                        _buildServiceChip('Route / Nids de poule', 'voirie', LucideIcons.truck),
                      ],
              ),
              const SizedBox(height: 20),

              // Commune & Quartier
              const Text('Localisation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _commune,
                decoration: const InputDecoration(
                  labelText: 'Commune',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(LucideIcons.mapPin),
                ),
                items: _communesList
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _commune = val);
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _quartierController,
                decoration: const InputDecoration(
                  labelText: 'Quartier / Repère (ex: Riviera 3, Carrefour Faya)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(LucideIcons.navigation),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Veuillez préciser le quartier ou un repère proche.';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // GPS Button & Indicator
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.withAlpha(50)),
                ),
                child: Row(
                  children: [
                    Icon(
                      _latitude != null ? LucideIcons.checkCircle2 : LucideIcons.crosshair,
                      color: _latitude != null ? AppTheme.secondaryEmerald : Colors.grey,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _latitude != null
                            ? 'GPS: ${_latitude!.toStringAsFixed(4)}, ${_longitude!.toStringAsFixed(4)}'
                            : 'Coordonnées GPS non récupérées',
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: _isGettingLocation ? null : _getCurrentLocation,
                      icon: _isGettingLocation
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(LucideIcons.locate, size: 16),
                      label: Text(_latitude != null ? 'Recharger' : 'Activer GPS'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Photo Picker Section
              const Text('Photo de l\'incident (Optionnel)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              _selectedImage != null
                  ? Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(_selectedImage!,
                              height: 180, width: double.infinity, fit: BoxFit.cover),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: CircleAvatar(
                            backgroundColor: Colors.black.withAlpha(150),
                            child: IconButton(
                              icon: const Icon(LucideIcons.x, color: Colors.white),
                              onPressed: () => setState(() => _selectedImage = null),
                            ),
                          ),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _pickImage(ImageSource.camera),
                            icon: const Icon(LucideIcons.camera),
                            label: const Text('Prendre une Photo'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _pickImage(ImageSource.gallery),
                            icon: const Icon(LucideIcons.image),
                            label: const Text('Depuis Galerie'),
                          ),
                        ),
                      ],
                    ),
              const SizedBox(height: 20),

              // Description Textarea
              const Text('Description de la situation',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(
                  hintText: 'Décrivez précisément ce qui se passe...',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isUploading ? null : _submitReport,
                  icon: _isUploading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Icon(LucideIcons.send),
                  label: Text(
                    _isUploading ? 'Publication en cours...' : 'Envoyer le Signalement',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryCard({
    required String label,
    required String subtitle,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    final bool isSelected = _reportCategory == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _reportCategory = value;
          _serviceType = value == 'outage' ? 'electricite' : 'voirie';
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? color.withAlpha(25) : Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? color : Colors.grey.withAlpha(60),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? color : Colors.grey, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
                color: isSelected ? color : null,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceChip(String label, String value, IconData icon) {
    final bool isSelected = _serviceType == value;
    return ChoiceChip(
      avatar: Icon(icon, size: 16, color: isSelected ? Colors.white : AppTheme.primaryTeal),
      label: Text(label),
      selected: isSelected,
      selectedColor: AppTheme.primaryTeal,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : Colors.black87,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      onSelected: (selected) {
        if (selected) setState(() => _serviceType = value);
      },
    );
  }
}
