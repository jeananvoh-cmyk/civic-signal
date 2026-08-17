import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/models/report_model.dart';
import '../services/supabase_service.dart';

final reportRepositoryProvider = Provider((ref) => ReportRepository());

final reportsProvider = FutureProvider.family<List<ReportModel>, String?>((ref, category) async {
  final repo = ref.watch(reportRepositoryProvider);
  return repo.fetchReports(category: category);
});

class ReportRepository {
  final SupabaseService _supabaseService;

  ReportRepository({SupabaseService? supabaseService})
      : _supabaseService = supabaseService ?? SupabaseService();

  Future<List<ReportModel>> fetchReports({
    String? category,
    String? commune,
    int limit = 50,
  }) async {
    if (category == 'infrastructure') {
      final res = await _supabaseService.client.rpc(
        'get_public_infrastructure_reports',
        params: {
          if (commune != null && commune.isNotEmpty) 'p_commune': commune,
          'p_limit': limit,
        },
      );
      if (res is List) {
        return res
            .map((json) => ReportModel.fromJson(json as Map<String, dynamic>))
            .toList();
      }
    }

    try {
      final res = await _supabaseService.client.rpc('get_public_reports');
      if (res is List && res.isNotEmpty) {
        var list = res.map((json) => ReportModel.fromJson(json as Map<String, dynamic>)).toList();
        if (category != null && category.isNotEmpty) {
          list = list.where((r) => r.reportCategory == category).toList();
        }
        if (commune != null && commune.isNotEmpty) {
          list = list.where((r) => r.commune == commune).toList();
        }
        return list.take(limit).toList();
      }
    } catch (_) {}

    dynamic filterQuery = _supabaseService.client.from('reports').select('*');

    if (category != null && category.isNotEmpty) {
      filterQuery = filterQuery.eq('report_category', category);
    }
    if (commune != null && commune.isNotEmpty) {
      filterQuery = filterQuery.eq('commune', commune);
    }

    final response = await filterQuery
        .order('created_at', ascending: false)
        .limit(limit);

    return (response as List<dynamic>)
        .map((json) => ReportModel.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<void> corroborateReport(String reportId, String statusType) async {
    await _supabaseService.client.rpc('corroborate_report', params: {
      'p_report_id': reportId,
      'p_status_type': statusType,
    });
  }

  Future<ReportModel> createReport(Map<String, dynamic> reportData) async {
    final response = await _supabaseService.client
        .from('reports')
        .insert(reportData)
        .select()
        .single();

    return ReportModel.fromJson(response);
  }
}
