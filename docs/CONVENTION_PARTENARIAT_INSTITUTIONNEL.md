# Cadre de Partenariat & Convention d'Intégration Institutionnelle 🇨🇮
### Programme Partenaires SIGNA.ci — CivicTech Côte d'Ivoire

---

## 🎯 1. Objet du Cadre de Partenariat

Ce document formalise les modalités de collaboration technique, légale et opérationnelle entre l'initiative citoyenne **SIGNA.ci** et les **Collectivités Territoriales (Mairies)**, les **Régulateurs Nationaux (ANARE-CI, ONEP, ONAD)** et les **Opérateurs Concessionnaires (CIE, SODECI)** en République de Côte d'Ivoire.

Ce modèle s'inspire directement du standard international **FixMyStreet Pro** (développé par l'organisation caritative britannique *mySociety* sous licence AGPLv3), adapté aux spécificités de l'adressage cadastral ivoirien (**PADA**).

---

## 🏛️ 2. Les 3 Niveaux d'Intégration

```
             ┌─────────────────────────────────────────────────────────────┐
             │       Grille des Niveaux d'Intégration SIGNA.ci             │
             └──────────────────────────────┬──────────────────────────────┘
                                            │
         ┌──────────────────────────────────┼──────────────────────────────────┐
         ▼                                  ▼                                  ▼
    [ NIVEAU 1 ]                       [ NIVEAU 2 ]                       [ NIVEAU 3 ]
  Données Ouvertes                   Portail Municipal                  Connecteur Métier
 (Open311 Standard)               (Services Techniques)                 (SIG / CRM / SLA)
  • 100% Libre & Gratuit           • Console par commune              • Webhooks & API sécurisée
  • Flux anonymisés (~150m)        • Traitement & Réponses            • Adresses PADA exactes
  • Pour universités & citoyens    • Rapports Conseil Municipal       • SLA 99.9% & Formation
```

### Niveau 1 : Accès Données Ouvertes (Open Data - Open311)
- **Cible** : Chercheurs, société civile, médias, citoyens, universités.
- **Accès** : Libre, gratuit et sans authentification restreinte.
- **Périmètre** : Flux JSON / GeoReport v2, coordonnées géographiques floutées (~150 m) pour préserver la vie privée des résidents.

### Niveau 2 : Portail Municipal & Console d'Intervention (Mairies & Régulateurs)
- **Cible** : Directions des Services Techniques Municipaux, Directions de la Salubrité, Services de Contrôle des Régulateurs.
- **Fonctionnalités** :
  - Console sécurisée filtrée sur le territoire communal (ex: Mairie de Cocody, Mairie de Yopougon).
  - Qualification des pannes (Éclairage public, Nids-de-poule, Caniveaux bouchés).
  - Mise à jour en temps réel des statuts (*« Pris en charge »*, *« Équipe dépêchée »*, *« Résolu avec photo de clôture »*).
  - Canal de réponse officiel certifié rassurant les administrés.
  - Export automatique des bilans mensuels pour les réunions de Conseil Municipal.

### Niveau 3 : Intégration Certifiée & Connecteurs Métiers (Pro / Entreprise Civique)
- **Cible** : Collectivités et régulateurs disposant de logiciels métiers existants (ArcGIS, QGIS, GMAO, CRM municipal).
- **Services Inclus** :
  - **API Bidirectionnelle & Webhooks** : Injection automatique des signalements dans la base de données interne de la Mairie et synchronisation automatique des clôtures.
  - **Précision Cadastrale PADA Intégrale** : Accès aux numéros de porte et points d'intérêt exacts pour les équipes d'intervention sur le terrain.
  - **Garantie de Service (SLA 99.9%)** : Hébergement dédié haute disponibilité et astreinte technique.
  - **Formation & Accompagnement** : Ateliers de formation sur site des agents municipaux et mise à disposition de kits de communication citoyenne (Affiches QR Codes pour les quartiers).

---

## 🔒 3. Conformité Légale & Protection des Données Personnelles

1. **Loi ivoirienne n° 2013-450** : Toutes les données collectées respectent scrupuleusement la législation ivoirienne sur la protection des données à caractère personnel.
2. **Confidentialité des Coordonnées Citoyennes** :
   - Les numéros de téléphone et emails des citoyens ne sont jamais cédés ni commercialisés.
   - Les équipes techniques partenaires accèdent uniquement aux informations nécessaires à la réalisation de l'intervention de maintenance.

---

## 📈 4. Financement & Pérennisation du Bien Commun

Les redevances de services et d'assistance technique perçues au titre du **Niveau 3** sont intégralement réinvesties dans :
- La maintenance et l'évolution de la plateforme Open Source.
- Les coûts d'infrastructure serveurs et base de données haute résilience.
- La rémunération des équipes locales de modération et de développement en Côte d'Ivoire.
- Des actions de sensibilisation civique et de distribution d'affiches QR Codes dans les quartiers précaires.

---

## 📬 5. Adhésion & Contact Institutionnel

Pour convenir d'une démonstration ou formaliser une convention de partenariat :
- 📧 **Courriel** : `partenaires@signa.ci`
- 🌐 **Espace Partenaires en ligne** : [https://signa.ci/partenaires](https://signa.ci/partenaires)
- 📍 **Siège** : Abidjan, République de Côte d'Ivoire
