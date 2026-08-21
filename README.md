# SIGNA.ci — CivicTech Côte d'Ivoire 🇨🇮

<div align="center">

**Plateforme Citoyenne & Participative de Suivi des Réseaux et Dégradations d'Infrastructures Publiques**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![CI Pipeline](https://img.shields.io/badge/CI-GitHub%20Actions-brightgreen.svg)](.github/workflows/ci.yml)
[![Web / PWA](https://img.shields.io/badge/Web-React%2018%20%7C%20Vite-61dafb.svg)](web/)
[![Mobile](https://img.shields.io/badge/Mobile-Flutter%20%7C%20Capacitor-02569B.svg)](mobile/)
[![Backend](https://img.shields.io/badge/Backend-Supabase%20%7C%20PostgreSQL-3ECF8E.svg)](supabase/)
[![Open311 Standard](https://img.shields.io/badge/Standard-Open311%20Compliant-orange.svg)](docs/)

*Signaler · Suivre · Réparer — Pour des services publics transparents et performants au service de tous les Ivoiriens.*

</div>

---

## 🌟 À Propos de SIGNA.ci

**SIGNA.ci** est une initiative **CivicTech Open Source** conçue pour transformer la gestion des incidents d'infrastructures urbaines dans le Grand Abidjan et en Côte d'Ivoire. 

La plateforme permet aux résidents de documenter les incidents en quelques secondes, de corroborer les alertes entre voisins et d'accélérer l'intervention des opérateurs techniques et des collectivités locales.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                       SIGNA.ci 🇨🇮                           │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
   ⚡ ÉLECTRICITÉ (CIE)        💧 EAU POTABLE (SODECI)      🏛️ VOIRIE & INFRA (MAIRIES)
  - Coupures secteur / foyer - Coupures de fourniture   - Lampadaires & Éclairage public
  - Poteaux & fils tombés    - Fuites & canalisations   - Nids-de-poule & Chaussée
  - Transformateurs grillés  - Baisse de pression       - Caniveaux bouchés & Décharges
```

---

## ✨ Fonctionnalités Majeures

- 📍 **Adressage Cadastral PADA & Géo-repérage** : Sélection intuitive parmi les 14 communes du Grand Abidjan et leurs quartiers officiels, avec support des numéros de porte cadastraux PADA.
- 🤝 **Solidarité de Quartier & Corroboration** : Les voisins confirment les coupures en un clic pour valider la réalité terrain et augmenter le score d'urgence civique.
- 📶 **Mode Hors-Ligne & File d'Attente (Offline-First)** : Enregistrement local des signalements même en cas de coupure totale d'Internet avec synchronisation automatique au retour du réseau.
- 🛡️ **Confidentialité & Floutage GPS (~150 m)** : Les coordonnées affichées publiquement sur la carte sont automatiquement décalées pour protéger l'intimité des foyers (Loi ivoirienne n° 2013-450).
- 📊 **Tableau de Bord & Météo des Réseaux** : Indicateurs en temps réel, cartes choroplèthes, statistiques par commune et historique de résolution.
- 🌐 **Transparence Open Data (Open311)** : API publique documentée permettant l'interopérabilité avec les régulateurs (**ANARE-CI**, **ONEP**) et les services techniques municipaux.
- 💬 **Boucle de Partage WhatsApp** : Génération de fiches d'alertes et de victoires de quartier directement partageables dans les groupes de résidents.

---

## 🏛️ Architecture & Technologies

Le projet est conçu avec une architecture monorepo modulaire garantissant haute disponibilité et parité complète :

| Couche | Technologies Clés |
| :--- | :--- |
| **Frontend Web & PWA** | React 18, Vite, TypeScript, Tailwind CSS, Radix UI, Leaflet, Lucide Icons |
| **Mobile Hybride** | Capacitor 8 (Android & iOS) |
| **Mobile Natif** | Flutter 3.x, Dart, Riverpod, FlutterMap, Geolocator |
| **Backend & Base de Données** | Supabase, PostgreSQL 15, PostGIS, Row Level Security (RLS) |
| **Normes Civiques** | Open311 GeoReport v2, Cadastre PADA Côte d'Ivoire |

---

## 🚀 Démarrage Rapide en Local

### 1. Cloner le Dépôt
```bash
git clone https://github.com/jeananvoh-cmyk/civic-signal.git
cd civic-signal
```

### 2. Lancer la Version Web & Capacitor (`web/`)
```bash
cd web
npm install
cp .env.example .env
npm run dev
```
> Accédez à l'application sur `http://localhost:5173`.

Pour lancer les tests :
```bash
npm test        # Suite Vitest (71 tests passants)
npm run lint    # Analyse ESLint
```

### 3. Lancer la Version Mobile Flutter (`mobile/`)
```bash
cd ../mobile
flutter pub get
flutter test
flutter run
```

---

## 🤝 Comment Contribuer ?

Le projet est ouvert à toutes les contributions (développeurs, designers, cartographes, citoyens) !

1. Consultez le **[Guide de Contribution (CONTRIBUTING.md)](CONTRIBUTING.md)** pour connaître nos standards de code.
2. Respectez notre **[Code de Conduite (CODE_OF_CONDUCT.md)](CODE_OF_CONDUCT.md)**.
3. Pour proposer une nouvelle commune ou affiner les quartiers PADA, utilisez le template d'issue dédié.
4. Pour toute question de sécurité, consultez notre **[Politique de Sécurité (SECURITY.md)](SECURITY.md)**.

---

## 📜 Licence

Ce projet est distribué sous licence **GNU Affero General Public License v3.0 (AGPL-3.0)**. Consultez le fichier [LICENSE](LICENSE) pour plus d'informations.

---

<div align="center">

**SIGNA.ci — Fait avec cœur pour la Côte d'Ivoire 🇨🇮**

</div>
