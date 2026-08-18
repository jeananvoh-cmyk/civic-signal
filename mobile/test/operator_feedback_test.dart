import 'package:flutter_test/flutter_test.dart';
import 'package:signa_mobile/domain/models/report_model.dart';
import 'package:signa_mobile/core/constants/pada.dart';

void main() {
  group('ReportModel - PADA Ticket & Operator Feedback Fields', () {
    test('Correctly deserializes operator feedback fields from JSON', () {
      final json = {
        'id': 'rep-1234-abcd',
        'user_id': 'usr-9876',
        'ticket_code': 'SIG-COC-20260818-0001',
        'pada_commune_code': '002-14',
        'pada_street_name': 'Boulevard Hassan II',
        'pada_formatted_address': 'Boulevard Hassan II 002-14, Abidjan - Cocody (Ambassades)',
        'report_category': 'outage',
        'service_type': 'electricity',
        'description': 'Coupure générale quartier des Ambassades',
        'commune': 'Cocody',
        'quartier': 'Ambassades',
        'location': 'Cocody Ambassades',
        'status': 'processing',
        'support_count': 5,
        'repair_verifications': 1,
        'impacted_people': 30,
        'babies': 2,
        'elderly': 1,
        'pregnant': 0,
        'urgency': 'high',
        'created_at': '2026-08-18T08:00:00.000Z',
        'start_time': '2026-08-18T07:30:00.000Z',
        'operator_name': 'CIE',
        'operator_reference': 'CIE-OT-8942',
        'estimated_resolution_time': '2026-08-18T14:00:00.000Z',
        'operator_last_note': 'Équipe technique dépêchée pour remplacement disjoncteur HTA.',
      };

      final report = ReportModel.fromJson(json);

      expect(report.id, 'rep-1234-abcd');
      expect(report.ticketCode, 'SIG-COC-20260818-0001');
      expect(report.displayTicketCode, 'SIG-COC-20260818-0001');
      expect(report.operatorName, 'CIE');
      expect(report.operatorReference, 'CIE-OT-8942');
      expect(report.operatorLastNote, contains('disjoncteur HTA'));
      expect(report.estimatedResolutionTime, DateTime.parse('2026-08-18T14:00:00.000Z'));
      expect(report.status, 'processing');
      expect(report.verifications, 6); // 5 supports + 1 repair verification
    });

    test('Correctly serializes operator feedback to JSON', () {
      final report = ReportModel(
        id: 'rep-5678',
        userId: 'usr-1111',
        ticketCode: 'SIG-YOP-20260818-0042',
        reportCategory: 'outage',
        serviceType: 'water',
        description: 'Baisse de pression SODECI',
        commune: 'Yopougon',
        quartier: 'Siporex',
        location: 'Yopougon Siporex',
        status: 'resolved',
        supportCount: 12,
        operatorName: 'SODECI',
        operatorReference: 'SOD-OT-3321',
        operatorLastNote: 'Vanne principale ouverte et purgée.',
        createdAt: DateTime.parse('2026-08-18T06:00:00.000Z'),
      );

      final json = report.toJson();

      expect(json['id'], 'rep-5678');
      expect(json['ticket_code'], 'SIG-YOP-20260818-0042');
      expect(json['operator_name'], 'SODECI');
      expect(json['operator_reference'], 'SOD-OT-3321');
      expect(json['operator_last_note'], 'Vanne principale ouverte et purgée.');
      expect(json['status'], 'resolved');
    });

    test('PADA Addressing resolution for 14 Grand Abidjan communes', () {
      expect(PadaConstants.getCommuneTrigramme('Cocody'), 'COC');
      expect(PadaConstants.getCommuneTrigramme('Plateau'), 'PLA');
      expect(PadaConstants.getCommuneTrigramme('Yopougon'), 'YOP');
      expect(PadaConstants.getCommuneTrigramme('Grand-Bassam'), 'BAS');
      expect(PADA_COMMUNES.length, 14);

      final address = PadaConstants.formatAddress(
        commune: 'Plateau',
        quartier: 'Commerce',
        streetName: 'Boulevard de la République',
      );
      expect(address, contains('002-17'));
      expect(address, contains('Abidjan - Plateau (Commerce)'));
    });

    test('Priority Score Calculation respects service, duration, and vulnerabilities', () {
      final waterReport = ReportModel(
        id: 'p1-rep',
        userId: 'u1',
        reportCategory: 'outage',
        serviceType: 'eau',
        description: 'Coupure d eau',
        commune: 'Abobo',
        quartier: 'PK18',
        location: 'Abobo PK18',
        status: 'active',
        supportCount: 10,
        impactedPeople: 50,
        babies: 3,
        elderly: 2,
        pregnant: 1,
        urgency: 'critical',
        createdAt: DateTime.now().subtract(const Duration(hours: 10)),
      );

      // Water base: 30
      // Duration: 10h * 2 = 20
      // Verifications: 10 * 5 = 50
      // Impacted: 50 * 2 = 100
      // Babies: 3 * 10 = 30
      // Elderly: 2 * 8 = 16
      // Pregnant: 1 * 8 = 8
      // Urgency critical: 40
      // Total >= 294 -> P1
      expect(waterReport.priorityScore >= 70, true);
      expect(waterReport.priorityLevel, 'P1');
    });
  });
}
