import 'package:flutter/material.dart';

class CommuneData {
  final String nom;
  final double centerLat;
  final double centerLon;
  final double rayonM;
  final int population;
  final Color couleur;
  final String logoAsset;

  const CommuneData({
    required this.nom,
    required this.centerLat,
    required this.centerLon,
    required this.rayonM,
    required this.population,
    required this.couleur,
    required this.logoAsset,
  });
}

/// The 14 official communes of Grand Abidjan in alphabetical order
const List<CommuneData> PILOT_COMMUNES = [
  CommuneData(
    nom: 'Abobo',
    centerLat: 5.4161,
    centerLon: -4.0159,
    rayonM: 6000,
    population: 1340083,
    couleur: Color(0xFF3B82F6),
    logoAsset: 'assets/logos/abobo.png',
  ),
  CommuneData(
    nom: 'Adjamé',
    centerLat: 5.3360,
    centerLon: -4.0170,
    rayonM: 3500,
    population: 340892,
    couleur: Color(0xFFF59E0B),
    logoAsset: 'assets/logos/adjame.png',
  ),
  CommuneData(
    nom: 'Anyama',
    centerLat: 5.4950,
    centerLon: -4.0500,
    rayonM: 7000,
    population: 366094,
    couleur: Color(0xFF14B8A6),
    logoAsset: 'assets/logos/anyama.png',
  ),
  CommuneData(
    nom: 'Attécoubé',
    centerLat: 5.3350,
    centerLon: -4.0400,
    rayonM: 4000,
    population: 313135,
    couleur: Color(0xFFE11D48),
    logoAsset: 'assets/logos/attecoube.png',
  ),
  CommuneData(
    nom: 'Bingerville',
    centerLat: 5.3500,
    centerLon: -3.8830,
    rayonM: 6300,
    population: 204656,
    couleur: Color(0xFF8B5CF6),
    logoAsset: 'assets/logos/bingerville.png',
  ),
  CommuneData(
    nom: 'Cocody',
    centerLat: 5.3600,
    centerLon: -3.9670,
    rayonM: 7000,
    population: 692583,
    couleur: Color(0xFF10B981),
    logoAsset: 'assets/logos/cocody.png',
  ),
  CommuneData(
    nom: 'Grand-Bassam',
    centerLat: 5.2000,
    centerLon: -3.7330,
    rayonM: 6500,
    population: 114674,
    couleur: Color(0xFF0EA5E9),
    logoAsset: 'assets/logos/grand-bassam.png',
  ),
  CommuneData(
    nom: 'Koumassi',
    centerLat: 5.3000,
    centerLon: -3.9500,
    rayonM: 4500,
    population: 412282,
    couleur: Color(0xFFEC4899),
    logoAsset: 'assets/logos/koumassi.png',
  ),
  CommuneData(
    nom: 'Marcory',
    centerLat: 5.3050,
    centerLon: -3.9850,
    rayonM: 4000,
    population: 285496,
    couleur: Color(0xFF06B6D4),
    logoAsset: 'assets/logos/marcory.png',
  ),
  CommuneData(
    nom: 'Plateau',
    centerLat: 5.3250,
    centerLon: -4.0200,
    rayonM: 2500,
    population: 7488,
    couleur: Color(0xFF6366F1),
    logoAsset: 'assets/logos/plateau.png',
  ),
  CommuneData(
    nom: 'Port-Bouët',
    centerLat: 5.2350,
    centerLon: -3.9667,
    rayonM: 6500,
    population: 618795,
    couleur: Color(0xFFF97316),
    logoAsset: 'assets/logos/port-bouet.png',
  ),
  CommuneData(
    nom: 'Songon',
    centerLat: 5.3180,
    centerLon: -4.2600,
    rayonM: 9000,
    population: 104523,
    couleur: Color(0xFFA855F7),
    logoAsset: 'assets/logos/songon.png',
  ),
  CommuneData(
    nom: 'Treichville',
    centerLat: 5.3000,
    centerLon: -4.0100,
    rayonM: 3000,
    population: 118432,
    couleur: Color(0xFF84CC16),
    logoAsset: 'assets/logos/treichville.png',
  ),
  CommuneData(
    nom: 'Yopougon',
    centerLat: 5.3177,
    centerLon: -4.0900,
    rayonM: 12000,
    population: 1571065,
    couleur: Color(0xFFDC2626),
    logoAsset: 'assets/logos/yopougon.png',
  ),
];

CommuneData? findCommuneByName(String name) {
  try {
    return PILOT_COMMUNES.firstWhere(
      (c) => c.nom.toLowerCase() == name.trim().toLowerCase(),
    );
  } catch (_) {
    return null;
  }
}
