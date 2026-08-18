/// Système d'Adressage National (PADA / MCLU) & Tickets SIGNA·CI
/// Ministère de la Construction, du Logement et de l'Urbanisme - République de Côte d'Ivoire

class PadaCommuneInfo {
  final String codeDept;
  final String codeSp;
  final String codeComplet;
  final String commune;
  final String trigramme;

  const PadaCommuneInfo({
    required this.codeDept,
    required this.codeSp,
    required this.codeComplet,
    required this.commune,
    required this.trigramme,
  });
}

const Map<String, PadaCommuneInfo> PADA_COMMUNES = {
  'Abobo': PadaCommuneInfo(codeDept: '002', codeSp: '11', codeComplet: '002-11', commune: 'Abobo', trigramme: 'ABO'),
  'Adjamé': PadaCommuneInfo(codeDept: '002', codeSp: '12', codeComplet: '002-12', commune: 'Adjamé', trigramme: 'ADJ'),
  'Anyama': PadaCommuneInfo(codeDept: '002', codeSp: '02', codeComplet: '002-02', commune: 'Anyama', trigramme: 'ANY'),
  'Attécoubé': PadaCommuneInfo(codeDept: '002', codeSp: '13', codeComplet: '002-13', commune: 'Attécoubé', trigramme: 'ATT'),
  'Bingerville': PadaCommuneInfo(codeDept: '002', codeSp: '03', codeComplet: '002-03', commune: 'Bingerville', trigramme: 'BIN'),
  'Cocody': PadaCommuneInfo(codeDept: '002', codeSp: '14', codeComplet: '002-14', commune: 'Cocody', trigramme: 'COC'),
  'Grand-Bassam': PadaCommuneInfo(codeDept: '002', codeSp: '21', codeComplet: '002-21', commune: 'Grand-Bassam', trigramme: 'BAS'),
  'Koumassi': PadaCommuneInfo(codeDept: '002', codeSp: '15', codeComplet: '002-15', commune: 'Koumassi', trigramme: 'KOU'),
  'Marcory': PadaCommuneInfo(codeDept: '002', codeSp: '16', codeComplet: '002-16', commune: 'Marcory', trigramme: 'MAR'),
  'Plateau': PadaCommuneInfo(codeDept: '002', codeSp: '17', codeComplet: '002-17', commune: 'Plateau', trigramme: 'PLA'),
  'Port-Bouët': PadaCommuneInfo(codeDept: '002', codeSp: '18', codeComplet: '002-18', commune: 'Port-Bouët', trigramme: 'PTB'),
  'Songon': PadaCommuneInfo(codeDept: '002', codeSp: '05', codeComplet: '002-05', commune: 'Songon', trigramme: 'SON'),
  'Treichville': PadaCommuneInfo(codeDept: '002', codeSp: '19', codeComplet: '002-19', commune: 'Treichville', trigramme: 'TRE'),
  'Yopougon': PadaCommuneInfo(codeDept: '002', codeSp: '20', codeComplet: '002-20', commune: 'Yopougon', trigramme: 'YOP'),
};

class PadaConstants {
  static String getCommuneTrigramme(String commune) {
    final info = PADA_COMMUNES[commune];
    if (info != null) return info.trigramme;
    final clean = commune.replaceAll(RegExp(r'[^a-zA-Z]'), '').toUpperCase();
    return clean.length >= 3 ? clean.substring(0, 3) : 'CIV';
  }

  static String getCommunePadaCode(String commune) {
    final info = PADA_COMMUNES[commune];
    return info != null ? info.codeComplet : '002-XX';
  }

  static String formatAddress({
    String? streetName,
    String? streetNumber,
    required String commune,
    String? quartier,
    String? formattedAddress,
  }) {
    if (formattedAddress != null && formattedAddress.isNotEmpty) return formattedAddress;
    final padaCode = getCommunePadaCode(commune);
    final numPrefix = (streetNumber != null && streetNumber.isNotEmpty) ? '$streetNumber, ' : '';
    final street = (streetName != null && streetName.trim().isNotEmpty) ? streetName.trim() : 'Voie non dénommée';
    final qSuffix = (quartier != null && quartier.isNotEmpty) ? ' ($quartier)' : '';
    return '$numPrefix$street $padaCode, Abidjan - $commune$qSuffix';
  }

  static String formatTicketCode({
    String? ticketCode,
    String? commune,
    DateTime? createdAt,
    String? id,
    String? serviceType,
    String? reportCategory,
  }) {
    if (ticketCode != null && ticketCode.isNotEmpty) return ticketCode;
    final c = commune ?? 'Abidjan';
    final dt = createdAt ?? DateTime.now();
    final tri = getCommuneTrigramme(c);
    final y = dt.year.toString();
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    final short = (id ?? '0000').replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').padRight(4, '0').substring(0, 4).toUpperCase();
    return 'SIG-$tri-$y$m$d-$short';
  }
}
