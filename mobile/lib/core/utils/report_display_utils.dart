/// Helpers for displaying report cards across the mobile app (1:1 with Web lib/report-display.ts)
class ReportDisplayUtils {
  static const Map<String, String> infraLabelEmoji = {
    // CIE (Électricité & Éclairage Public)
    "Éclairage public": "💡",
    "Lampadaire cassé": "💡",
    "Éclairage Public Hors Service": "💡",
    "Poteaux / Pylônes": "🗼",
    "Poteaux/Pilônes": "🗼",
    "Poteau électrique": "🗼",
    "Poteaux/Pylônes à risque": "🗼",
    "Branchements dangereux": "⚠️",
    "Branchement dangereux": "⚠️",
    "Autres incidents CIE": "🚧",

    // SODECI (Eau Potable & Assainissement)
    "Canalisation publique": "🚰",
    "Fuite d'eau": "🚿",
    "Fuite d'eau à l'extérieur": "🚿",
    "Autre incident SODECI": "💧",
    "Égout bouché": "🕳️",
    "Débordement de regards": "🕳️",

    // Mairie (Voirie & Propreté)
    "Nid de poule": "🛣️",
    "Caniveau bouché": "🚧",
    "Voirie & Trottoirs": "🛤️",
    "Voirie dégradée": "🛤️",
    "Égout à ciel ouvert": "🕳️",
    "Déchets de marché": "🏪",
    "Dépôt sauvage & Ordures": "🗑️",
    "Dépôt sauvage": "🗑️",
    "Autre (Mairie)": "🏗️",
    "Autre": "🏗️",
  };

  /// Extracts the infra type label stored as the first `[...]` token in description.
  static String? extractInfraLabel(String description) {
    final reg = RegExp(r'^\[([^\]]+)\]');
    final match = reg.firstMatch(description.trim());
    return match?.group(1);
  }

  /// Returns a clean description for display:
  /// - strips the leading `[TypeLabel]` bracket
  /// - strips the trailing `[X personne(s) dont ...]` bracket
  static String cleanDescription(String description) {
    return description
        .replaceFirst(RegExp(r'^\[[^\]]+\]\s*'), '')
        .replaceFirst(RegExp(r'\s*\[\d+[^\]]*\]\s*$'), '')
        .trim();
  }

  /// Returns the emoji for an infra type label, falling back to 🏗️.
  static String getInfraEmoji(String? label) {
    if (label == null || label.isEmpty) return "🏗️";
    return infraLabelEmoji[label] ?? "🏗️";
  }

  /// Returns French relative time string matching date-fns formatDistanceToNow(locale: fr) 1:1
  /// (ex: "il y a 27 jours", "il y a environ 2 heures", "il y a moins d'une minute")
  static String timeAgo(dynamic dateVal) {
    if (dateVal == null) return "récemment";
    DateTime date;
    if (dateVal is DateTime) {
      date = dateVal;
    } else if (dateVal is String) {
      date = DateTime.tryParse(dateVal) ?? DateTime.now();
    } else {
      return "récemment";
    }

    final diff = DateTime.now().difference(date);
    final seconds = diff.inSeconds;
    final minutes = diff.inMinutes;
    final hours = diff.inHours;
    final days = diff.inDays;

    if (seconds < 30) return "il y a moins d'une minute";
    if (seconds < 90) return "il y a 1 minute";
    if (minutes < 45) return "il y a $minutes minutes";
    if (minutes < 90) return "il y a environ 1 heure";
    if (hours < 24) return "il y a environ $hours heures";
    if (days == 1) return "il y a 1 jour";
    if (days < 30) return "il y a $days jours";
    if (days < 60) return "il y a environ 1 mois";
    if (days < 365) {
      final months = (days / 30).floor();
      return "il y a environ $months mois";
    }
    final years = (days / 365).floor();
    if (years == 1) return "il y a environ 1 an";
    return "il y a environ $years ans";
  }

  /// Formats report date matching web PhotoGallery.tsx 1:1:
  /// "Signalé le lun. 20 juil. 2026, 19:12"
  static String formatReportDateTime(dynamic dateVal) {
    if (dateVal == null) return '';
    DateTime date;
    if (dateVal is DateTime) {
      date = dateVal.toLocal();
    } else if (dateVal is String) {
      date = (DateTime.tryParse(dateVal) ?? DateTime.now()).toLocal();
    } else {
      return '';
    }

    const weekdays = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
    const months = [
      'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
      'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'
    ];

    final weekday = weekdays[(date.weekday - 1).clamp(0, 6)];
    final day = date.day;
    final month = months[(date.month - 1).clamp(0, 11)];
    final year = date.year;
    final hour = date.hour.toString().padLeft(2, '0');
    final minute = date.minute.toString().padLeft(2, '0');

    return 'Signalé le $weekday $day $month $year, $hour:$minute';
  }
}
