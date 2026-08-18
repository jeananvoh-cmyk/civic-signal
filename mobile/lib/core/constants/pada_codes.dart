/// Répertoire officiel des codes d'adresses PADA
/// Ministère de la Construction, du Logement et de l'Urbanisme (MCLU)
/// 
/// Format officiel d'adresse : [N° métrique], [Nom de la Voie] [002-CodeCommune], [Abidjan - Commune]
library;

class PadaCommuneCode {
  final String commune;
  final String codeDept; // '002'
  final String codeSp;   // '14', '20', etc.
  final String codeComplet; // '002-14'

  const PadaCommuneCode({
    required this.commune,
    required this.codeDept,
    required this.codeSp,
    required this.codeComplet,
  });
}

const Map<String, PadaCommuneCode> PADA_COMMUNE_CODES = {
  'Anyama': PadaCommuneCode(commune: 'Anyama', codeDept: '002', codeSp: '02', codeComplet: '002-02'),
  'Bingerville': PadaCommuneCode(commune: 'Bingerville', codeDept: '002', codeSp: '03', codeComplet: '002-03'),
  'Brofodoumé': PadaCommuneCode(commune: 'Brofodoumé', codeDept: '002', codeSp: '04', codeComplet: '002-04'),
  'Songon': PadaCommuneCode(commune: 'Songon', codeDept: '002', codeSp: '05', codeComplet: '002-05'),
  'Abobo': PadaCommuneCode(commune: 'Abobo', codeDept: '002', codeSp: '11', codeComplet: '002-11'),
  'Adjamé': PadaCommuneCode(commune: 'Adjamé', codeDept: '002', codeSp: '12', codeComplet: '002-12'),
  'Attécoubé': PadaCommuneCode(commune: 'Attécoubé', codeDept: '002', codeSp: '13', codeComplet: '002-13'),
  'Cocody': PadaCommuneCode(commune: 'Cocody', codeDept: '002', codeSp: '14', codeComplet: '002-14'),
  'Koumassi': PadaCommuneCode(commune: 'Koumassi', codeDept: '002', codeSp: '15', codeComplet: '002-15'),
  'Marcory': PadaCommuneCode(commune: 'Marcory', codeDept: '002', codeSp: '16', codeComplet: '002-16'),
  'Plateau': PadaCommuneCode(commune: 'Plateau', codeDept: '002', codeSp: '17', codeComplet: '002-17'),
  'Port-Bouët': PadaCommuneCode(commune: 'Port-Bouët', codeDept: '002', codeSp: '18', codeComplet: '002-18'),
  'Treichville': PadaCommuneCode(commune: 'Treichville', codeDept: '002', codeSp: '19', codeComplet: '002-19'),
  'Yopougon': PadaCommuneCode(commune: 'Yopougon', codeDept: '002', codeSp: '20', codeComplet: '002-20'),
  'Grand-Bassam': PadaCommuneCode(commune: 'Grand-Bassam', codeDept: '003', codeSp: '01', codeComplet: '003-01'),
};

String getPadaCode(String commune) {
  return PADA_COMMUNE_CODES[commune]?.codeComplet ?? '002-00';
}
