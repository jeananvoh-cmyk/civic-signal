import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
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
  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();

  static Future<List<PendingReportItem>> getPendingReports() async {
    try {
      final raw = await _secureStorage.read(key: _storageKey);
      if (raw == null || raw.isEmpty) return [];
      final decodedList = jsonDecode(raw) as List<dynamic>;
      return decodedList
          .map((item) => PendingReportItem.fromJson(Map<String, dynamic>.from(item as Map)))
          .toList();
    } catch (e) {
      debugPrint('Error getting offline queue: $e');
      return [];
    }
  }

  static Future<void> enqueueReport(Map<String, dynamic> data, {String? localPhotoPath}) async {
    try {
      final list = await getPendingReports();
      final item = PendingReportItem(
        localId: 'offline_${DateTime.now().millisecondsSinceEpoch}_${data['commune'] ?? 'abj'}',
        data: data,
        localPhotoPath: localPhotoPath,
        createdAt: DateTime.now(),
      );
      list.add(item);
      await _secureStorage.write(
        key: _storageKey,
        value: jsonEncode(list.map((i) => i.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('Error enqueuing offline report: $e');
    }
  }

  static Future<void> removePendingReport(String localId) async {
    try {
      final list = await getPendingReports();
      list.removeWhere((i) => i.localId == localId);
      await _secureStorage.write(
        key: _storageKey,
        value: jsonEncode(list.map((i) => i.toJson()).toList()),
      );
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

        if (item.localPhotoPath != null && item.localPhotoPath!.isNotEmpty) {
          final file = File(item.localPhotoPath!);
          if (await file.exists()) {
            final userId = Supabase.instance.client.auth.currentUser?.id;
            if (userId == null) {
              throw StateError('Utilisateur non authentifié pour l’upload hors ligne.');
            }
            final fileName = 'offline_${DateTime.now().millisecondsSinceEpoch}.jpg';
            final storagePath = '$userId/$fileName';
            final uploadRes = await Supabase.instance.client.storage
                .from('report-photos')
                .upload(storagePath, file);
            if (uploadRes.isNotEmpty) {
              payload['photo_url'] = storagePath;
              payload['photo_urls'] = [storagePath];
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
