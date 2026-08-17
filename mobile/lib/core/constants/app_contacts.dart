/// Configuration centralisée des coordonnées & réseaux sociaux SIGNA-CI
class AppContacts {
  /// Numéro WhatsApp d'assistance (format international sans '+' ni espace pour wa.me)
  static const String whatsappPhone = '2250700000000';

  /// Message d'accueil pré-rempli
  static const String whatsappDefaultMessage = "Bonjour l'Équipe SIGNA-CI, j'ai besoin d'une assistance.";

  /// URL de discussion directe wa.me (ouvre automatiquement l'app WhatsApp ou WhatsApp Web)
  static String get whatsappChatUrl =>
      'https://wa.me/$whatsappPhone?text=${Uri.encodeComponent(whatsappDefaultMessage)}';

  /// URL du Canal Officiel WhatsApp SIGNA (alertes)
  static const String whatsappChannelUrl = 'https://whatsapp.com/channel/signa-ci';

  /// Page Facebook Officielle
  static const String facebookPageUrl = 'https://facebook.com/signa.ci';

  /// Groupe Facebook d'entraide
  static const String facebookGroupUrl = 'https://facebook.com/groups/signa.ci';

  /// Email support officiel
  static const String emailSupport = 'contact@signa.ci';
}
