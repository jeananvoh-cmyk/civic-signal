import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PendingReportItem {
  final String localId;
  final Map<String, dynamic> data;
  final String? localPhotoPath;
  final DateTime createdAt;

  PendingReportItem({
    required this.localId,
    required this.data,
    this.localPhotoPath,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'localId': localId,
        'data': data,
        'localPhotoPath': localPhotoPath,
        'createdAt': createdAt.toIso8601String(),
      };

  factory PendingReportItem.fromJson(Map<String, dynamic> map) => PendingReportItem(
        localId: map['localId'] as String,
        data: Map<String, dynamic>.from(map['data'] as Map),
        localPhotoPath: map['localPhotoPath'] as String?,
        createdAt: DateTime.tryParse(map['createdAt'] as String? ?? '') ?? DateTime.now(),
      );
}

class OfflineQueueService {
  static const String _storageKey = 'signa_offline_pending_reports';

  static Future<List<PendingReportItem>> getPendingReports() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getStringList(_storageKey) ?? [];
      return raw.map((str) {
        final decoded = jsonDecode(str) as Map<String, dynamic>;
        return PendingReportItem.fromJson(decoded);
      }).toList();
    } catch (e) {
      debugPrint('Error getting offline queue: $e');
      return [];
    }
  }

  static Future<void> enqueueReport(Map<String, dynamic> data, {String? localPhotoPath}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = await getPendingReports();
      final item = PendingReportItem(
        localId: 'offline_${DateTime.now().millisecondsSinceEpoch}_${data['commune'] ?? 'abj'}',
        data: data,
        localPhotoPath: localPhotoPath,
        createdAt: DateTime.now(),
      );
      list.add(item);
      final rawList = list.map((i) => jsonEncode(i.toJson())).toList();
      await prefs.setStringList(_storageKey, rawList);
    } catch (e) {
      debugPrint('Error enqueuing offline report: $e');
    }
  }

  static Future<void> removePendingReport(String localId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = await getPendingReports();
      list.removeWhere((i) => i.localId == localId);
      final rawList = list.map((i) => jsonEncode(i.toJson())).toList();
      await prefs.setStringList(_storageKey, rawList);
    } catch (e) {
      debugPrint('Error removing offline report: $e');
    }
  }

  static Future<int> syncAllPendingReports() async {
    final list = await getPendingReports();
    if (list.isEmpty) return 0;

    int syncedCount = 0;
    for (final item in list) {
      try {
        final payload = Map<String, dynamic>.from(item.data);

        // Si une photo locale existe, tenter de l'uploader
        if (item.localPhotoPath != null && item.localPhotoPath!.isNotEmpty) {
          final file = File(item.localPhotoPath!);
          if (await file.exists()) {
            final fileName = 'report_${DateTime.now().millisecondsSinceEpoch}.jpg';
            final uploadRes = await Supabase.instance.client.storage
                .from('report-photos')
                .upload(fileName, file);
            if (uploadRes.isNotEmpty) {
              final publicUrl = Supabase.instance.client.storage
                  .from('report-photos')
                  .getPublicUrl(fileName);
              payload['photo_url'] = publicUrl;
              payload['photo_urls'] = [publicUrl];
            }
          }
        }

        await Supabase.instance.client.from('reports').insert(payload);
        await removePendingReport(item.localId);
        syncedCount++;
      } catch (e) {
        debugPrint('Failed to sync offline item ${item.localId}: $e');
      }
    }
    return syncedCount;
  }
}
