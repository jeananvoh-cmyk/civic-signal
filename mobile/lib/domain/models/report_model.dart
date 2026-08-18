import 'package:flutter/material.dart';
import '../../core/constants/pada.dart';

class ReportModel {
  final String id;
  final String userId;
  final String? ticketCode;
  final String? padaCommuneCode;
  final String? padaStreetName;
  final String? padaFormattedAddress;
  final String reportCategory; // 'outage' or 'infrastructure'
  final String serviceType;    // 'eau', 'electricite', 'voirie', etc.
  final String description;
  final String commune;
  final String quartier;
  final String location;
  final double? latitude;
  final double? longitude;
  final String? photoUrl;
  final List<String>? photoUrls;
  final String status;
  final int supportCount;
  final int repairVerifications;
  final int impactedPeople;
  final int babies;
  final int elderly;
  final int pregnant;
  final String urgency;
  final DateTime? startTime;
  final DateTime createdAt;

  ReportModel({
    required this.id,
    required this.userId,
    this.ticketCode,
    this.padaCommuneCode,
    this.padaStreetName,
    this.padaFormattedAddress,
    required this.reportCategory,
    required this.serviceType,
    required this.description,
    required this.commune,
    required this.quartier,
    required this.location,
    this.latitude,
    this.longitude,
    this.photoUrl,
    this.photoUrls,
    required this.status,
    required this.supportCount,
    this.repairVerifications = 0,
    this.impactedPeople = 1,
    this.babies = 0,
    this.elderly = 0,
    this.pregnant = 0,
    this.urgency = 'medium',
    this.startTime,
    required this.createdAt,
  });

  factory ReportModel.fromJson(Map<String, dynamic> json) {
    return ReportModel(
      id: json['id'] as String,
      userId: json['user_id'] as String? ?? '',
      ticketCode: json['ticket_code'] as String?,
      padaCommuneCode: json['pada_commune_code'] as String?,
      padaStreetName: json['pada_street_name'] as String?,
      padaFormattedAddress: json['pada_formatted_address'] as String?,
      reportCategory: json['report_category'] as String? ?? 'outage',
      serviceType: json['service_type'] as String? ?? 'general',
      description: json['description'] as String? ?? '',
      commune: json['commune'] as String? ?? '',
      quartier: json['quartier'] as String? ?? '',
      location: json['location'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? (json['latitude_approx'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble() ?? (json['longitude_approx'] as num?)?.toDouble(),
      photoUrl: json['photo_url'] as String?,
      photoUrls: (json['photo_urls'] as List<dynamic>?)?.map((e) => e as String).toList(),
      status: json['status'] as String? ?? 'open',
      supportCount: (json['support_count'] as num?)?.toInt() ?? (json['verifications'] as num?)?.toInt() ?? 0,
      repairVerifications: (json['repair_verifications'] as num?)?.toInt() ?? 0,
      impactedPeople: json['impacted_people'] as int? ?? 1,
      babies: json['babies'] as int? ?? 0,
      elderly: json['elderly'] as int? ?? 0,
      pregnant: json['pregnant'] as int? ?? 0,
      urgency: json['urgency'] as String? ?? 'medium',
      startTime: json['start_time'] != null ? DateTime.parse(json['start_time'] as String) : null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'ticket_code': ticketCode,
      'pada_commune_code': padaCommuneCode,
      'pada_street_name': padaStreetName,
      'pada_formatted_address': padaFormattedAddress,
      'report_category': reportCategory,
      'service_type': serviceType,
      'description': description,
      'commune': commune,
      'quartier': quartier,
      'location': location,
      'latitude': latitude,
      'longitude': longitude,
      'photo_url': photoUrl,
      'photo_urls': photoUrls,
      'status': status,
      'support_count': supportCount,
      'repair_verifications': repairVerifications,
      'impacted_people': impactedPeople,
      'babies': babies,
      'elderly': elderly,
      'pregnant': pregnant,
      'urgency': urgency,
      'start_time': startTime?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
    };
  }

  bool get isOutage => reportCategory == 'outage';
  bool get isInfrastructure => reportCategory == 'infrastructure';
  int get verifications => supportCount + repairVerifications;

  String get displayTicketCode => PadaConstants.formatTicketCode(
    ticketCode: ticketCode,
    commune: commune,
    createdAt: createdAt,
    id: id,
  );

  String get displayPadaAddress => PadaConstants.formatAddress(
    commune: commune,
    quartier: quartier,
    streetName: padaStreetName,
    formattedAddress: padaFormattedAddress,
  );

  // ⏱️ Elapsed duration string (e.g. "< 2 min", "45 min", "3h 10min", "2j 5h")
  String get elapsedFormatted {
    final ref = startTime ?? createdAt;
    final diff = DateTime.now().difference(ref);
    if (diff.isNegative) return '< 1 min';
    if (diff.inMinutes < 2) return '< 2 min';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min';
    final hours = diff.inHours;
    final mins = diff.inMinutes % 60;
    if (hours < 24) return '${hours}h${mins > 0 ? " ${mins}m" : ""}';
    final days = diff.inDays;
    final remHours = hours % 24;
    return '${days}j${remHours > 0 ? " ${remHours}h" : ""}';
  }

  // 🚨 Alert severity based on duration
  String get alertLevel {
    final ref = startTime ?? createdAt;
    final hours = DateTime.now().difference(ref).inHours;
    if (hours >= 24) return 'critical';
    if (hours >= 6) return 'warning';
    return 'normal';
  }

  Color get alertColor {
    final level = alertLevel;
    if (level == 'critical') return const Color(0xFFDC2626); // Red
    if (level == 'warning') return const Color(0xFFEA580C);  // Orange
    return const Color(0xFF0D9488);                         // Teal
  }

  // 🎯 Priority Score & Level (1:1 with Web priority.ts)
  int get priorityScore {
    int score = 0;
    // Service base
    if (serviceType.toLowerCase().contains('eau') || serviceType == 'water') {
      score += 30;
    } else if (serviceType.toLowerCase().contains('elec') || serviceType == 'electricity') {
      score += 25;
    } else {
      score += 15;
    }

    // Elapsed duration (hours * 2)
    final ref = startTime ?? createdAt;
    final hours = DateTime.now().difference(ref).inHours.clamp(0, 48);
    score += hours * 2;

    // Verifications (5 pts each)
    score += verifications * 5;

    // Impacted people & vulnerability
    score += impactedPeople * 2;
    score += babies * 10;
    score += elderly * 8;
    score += pregnant * 8;

    // Urgency level
    if (urgency == 'critical') {
      score += 40;
    } else if (urgency == 'high') score += 25;
    else if (urgency == 'medium') score += 10;

    return score;
  }

  String get priorityLevel {
    final s = priorityScore;
    if (s >= 70) return 'P1';
    if (s >= 40) return 'P2';
    if (s >= 20) return 'P3';
    return 'P4';
  }
}

