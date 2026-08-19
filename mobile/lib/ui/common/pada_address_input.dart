import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/constants/pada_codes.dart';
import '../../core/constants/pada_database.dart';

class PadaAddressData {
  final String? padaWayId;
  final String? wayType;
  final String? officialName;
  final String? formerName;
  final String? doorNumber;
  final String? landmark;
  final bool isCustomWay;
  final String formattedAddress;

  const PadaAddressData({
    this.padaWayId,
    this.wayType,
    this.officialName,
    this.formerName,
    this.doorNumber,
    this.landmark,
    this.isCustomWay = false,
    required this.formattedAddress,
  });
}

class PadaAddressInput extends StatefulWidget {
  final String commune;
  final String? quartier;
  final PadaAddressData? initialValue;
  final ValueChanged<PadaAddressData> onChanged;

  const PadaAddressInput({
    super.key,
    required this.commune,
    this.quartier,
    this.initialValue,
    required this.onChanged,
  });

  @override
  State<PadaAddressInput> createState() => _PadaAddressInputState();
}

class _PadaAddressInputState extends State<PadaAddressInput> {
  final TextEditingController _searchController = TextEditingController();
  final TextEditingController _doorController = TextEditingController();
  final TextEditingController _landmarkController = TextEditingController();
  final TextEditingController _customWayController = TextEditingController();

  PadaWay? _selectedWay;
  String? _selectedDoorId;
  bool _isExactDoorSelected = false;
  bool _isCustomMode = false;
  bool _isDropdownOpen = false;
  List<ScoredPadaWay> _suggestionsScored = [];

  @override
  void initState() {
    super.initState();
    if (widget.initialValue != null) {
      _doorController.text = widget.initialValue?.doorNumber ?? '';
      _landmarkController.text = widget.initialValue?.landmark ?? '';
    }
  }

  void _onSearchChanged(String query) {
    final results = searchPadaWaysScored(
      query,
      commune: widget.commune,
      quartier: widget.quartier,
    );

    setState(() {
      _suggestionsScored = results.take(10).toList();
      _isDropdownOpen = true;
    });
  }

  void _selectWay(PadaWay way, [ScoredPadaWay? item]) {
    final queryText = _searchController.text.trim();
    // Si l'utilisateur a tapé un numéro (ex: "82" ou "123"), on remplit le numéro de porte
    if (RegExp(r'^\d+$').hasMatch(queryText) && _doorController.text.trim().isEmpty) {
      _doorController.text = queryText;
    }

    setState(() {
      _selectedWay = way;
      _selectedDoorId = item?.exactDoorId;
      _isExactDoorSelected = item?.isExactDoor ?? false;
      _searchController.text = way.nom;
      _isDropdownOpen = false;
      _isCustomMode = false;
    });
    _notifyParent();
  }

  void _notifyParent() {
    final padaCode = getPadaCode(widget.commune);
    final wayName = _isCustomMode ? _customWayController.text.trim() : (_selectedWay?.nom ?? '');
    
    final StringBuffer buffer = StringBuffer();
    if (_doorController.text.trim().isNotEmpty) {
      buffer.write('${_doorController.text.trim()}, ');
    }
    if (wayName.isNotEmpty) {
      buffer.write('$wayName ');
    }
    buffer.write('$padaCode, Abidjan - ${widget.commune}');
    if (widget.quartier != null && widget.quartier!.isNotEmpty) {
      buffer.write(' (${widget.quartier})');
    }
    if (_landmarkController.text.trim().isNotEmpty) {
      buffer.write(' [Repère : ${_landmarkController.text.trim()}]');
    }

    widget.onChanged(PadaAddressData(
      padaWayId: _selectedWay?.id,
      wayType: _selectedWay?.typeLabel,
      officialName: _isCustomMode ? _customWayController.text.trim() : _selectedWay?.nom,
      formerName: _selectedWay?.ancienNom,
      doorNumber: _doorController.text.trim().isNotEmpty ? _doorController.text.trim() : null,
      landmark: _landmarkController.text.trim().isNotEmpty ? _landmarkController.text.trim() : null,
      isCustomWay: _isCustomMode,
      formattedAddress: buffer.toString(),
    ));
  }

  void _resetSelection() {
    setState(() {
      _selectedWay = null;
      _selectedDoorId = null;
      _isExactDoorSelected = false;
      _searchController.clear();
      _isCustomMode = false;
      _customWayController.clear();
    });
    _notifyParent();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final padaCode = getPadaCode(widget.commune);

    // Voies suggérées pour le quartier lorsque la recherche est vide
    final quickSuggestions = (_searchController.text.isEmpty)
        ? searchPadaWaysScored('', commune: widget.commune, quartier: widget.quartier).take(4).toList()
        : <ScoredPadaWay>[];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF059669).withOpacity(0.35), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête PADA
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF059669),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('🇨🇮 PADA', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Adressage Officiel PADA ($padaCode)',
                  style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Trouvez votre numéro de porte, rue ou avenue officielle PADA :',
            style: TextStyle(fontSize: 11, color: Colors.grey),
          ),
          const SizedBox(height: 10),

          // Recherche / Sélection
          if (_selectedWay == null && !_isCustomMode) ...[
            TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Tapez un N° de porte (ex: 246, 62) ou une voie...',
                hintStyle: const TextStyle(fontSize: 12),
                prefixIcon: const Icon(LucideIcons.search, size: 16),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 14),
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged('');
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),

            // Puces de suggestion rapide (si champ vide)
            if (_searchController.text.isEmpty && quickSuggestions.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: quickSuggestions.map((item) {
                  return InkWell(
                    onTap: () => _selectWay(item.way, item),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.withOpacity(0.2)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(LucideIcons.mapPin, size: 11, color: Color(0xFF059669)),
                          const SizedBox(width: 4),
                          Text(item.way.nom, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],

            if (_isDropdownOpen && _searchController.text.trim().isNotEmpty) ...[
              const SizedBox(height: 6),
              Container(
                constraints: const BoxConstraints(maxHeight: 220),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.withOpacity(0.3)),
                ),
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    ..._suggestionsScored.map((item) {
                      final way = item.way;
                      final isBoulevard = way.type == PadaWayType.boulevard;
                      final queryText = _searchController.text.trim();
                      final isNumeric = RegExp(r'^\d+$').hasMatch(queryText);
                      final doorPrefix = isNumeric ? '$queryText, ' : '';

                      return ListTile(
                        dense: true,
                        title: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                              decoration: BoxDecoration(
                                color: isBoulevard ? const Color(0xFFEA580C) : const Color(0xFF059669),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                way.typeLabel,
                                style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                '$doorPrefix${way.nom}',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (item.isExactDoor)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF059669),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  '🛡️ Certifiée',
                                  style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                                ),
                              ),
                          ],
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (item.matchReason != null)
                              Text('💡 ${item.matchReason}', style: const TextStyle(fontSize: 10, color: Color(0xFF0284C7), fontWeight: FontWeight.w600)),
                            if (way.ancienNom != null && !(item.matchReason?.contains('Alias') ?? false))
                              Text('🏛️ Ex : ${way.ancienNom}', style: const TextStyle(fontSize: 10, color: Color(0xFFD97706))),
                            if (way.quartier != null)
                              Text('Quartier : ${way.quartier}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                          ],
                        ),
                        onTap: () => _selectWay(way, item),
                      );
                    }),
                    ListTile(
                      dense: true,
                      leading: const Icon(LucideIcons.mapPin, size: 14, color: Color(0xFF059669)),
                      title: const Text('Je ne trouve pas ma voie (Saisir librement)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
                      onTap: () {
                        setState(() {
                          _isCustomMode = true;
                          _isDropdownOpen = false;
                        });
                      },
                    ),
                  ],
                ),
              ),
            ],
          ],

          // Plaque PADA Virtuelle
          if (_selectedWay != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDark
                      ? [const Color(0xFF064E3B), const Color(0xFF022C22)]
                      : [const Color(0xFFECFDF5), const Color(0xFFD1FAE5)],
                ),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF059669), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('RÉPUBLIQUE DE CÔTE D\'IVOIRE • PADA', style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.5, color: Color(0xFF065F46))),
                      InkWell(
                        onTap: _resetSelection,
                        child: const Row(
                          children: [
                            Icon(LucideIcons.edit2, size: 10, color: Color(0xFF059669)),
                            SizedBox(width: 4),
                            Text('Changer', style: TextStyle(fontSize: 10, color: Color(0xFF059669), fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 12, thickness: 0.5),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _selectedWay!.type == PadaWayType.boulevard ? const Color(0xFFEA580C) : const Color(0xFF059669),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(_selectedWay!.typeLabel, style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _selectedWay!.nom,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  if (_selectedWay!.ancienNom != null) ...[
                    const SizedBox(height: 4),
                    Text('🏛️ Ex : ${_selectedWay!.ancienNom}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFD97706))),
                  ],
                  if (_selectedDoorId != null) ...[
                    const SizedBox(height: 3),
                    Text('🎫 Réf. Cadastre : $_selectedDoorId', style: const TextStyle(fontSize: 10, fontFamily: 'monospace', fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                  ],
                  const SizedBox(height: 4),
                  Text('📍 $padaCode • ${widget.commune}${_selectedWay!.quartier != null ? ' (${_selectedWay!.quartier})' : ''}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                ],
              ),
            ),
          ],

          // Mode Libre
          if (_isCustomMode) ...[
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFDE68A)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Nom de votre voie ou rue :', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
                      InkWell(
                        onTap: () => setState(() => _isCustomMode = false),
                        child: const Text('Annuler', style: TextStyle(fontSize: 10, color: Color(0xFF059669), fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _customWayController,
                    onChanged: (_) => _notifyParent(),
                    decoration: InputDecoration(
                      hintText: 'Ex: Rue des Jardins, Rue Principale...',
                      hintStyle: const TextStyle(fontSize: 11),
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 10),

          // N° Porte & Repère
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('N° de porte / Plaque', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _doorController,
                      onChanged: (_) => _notifyParent(),
                      decoration: InputDecoration(
                        hintText: 'Ex: 495, 12, Lot 8',
                        hintStyle: const TextStyle(fontSize: 11),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Repère populaire', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _landmarkController,
                      onChanged: (_) => _notifyParent(),
                      decoration: InputDecoration(
                        hintText: 'Ex: Face Pharmacie',
                        hintStyle: const TextStyle(fontSize: 11),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
