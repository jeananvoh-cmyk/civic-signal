# Civic Signal — Documentation des fonctionnalités

> **Mis à jour :** 16 mars 2026
> **Version :** Phase pilote — 7 communes d'Abidjan
> Ce document est versionné avec le code. Il doit être mis à jour à chaque nouvelle fonctionnalité.

---

## Table des matières

- [PARTIE 1 — Présentation fonctionnelle](#partie-1--présentation-fonctionnelle)
  - [Qu'est-ce que Civic Signal ?](#quest-ce-que-civic-signal-)
  - [À qui s'adresse l'application ?](#à-qui-sadresse-lapplication-)
  - [Les types de problèmes signalés](#les-types-de-problèmes-signalés)
  - [Parcours d'un signalement](#parcours-dun-signalement)
  - [Fonctionnalités citoyennes](#fonctionnalités-citoyennes)
  - [Fonctionnalités pour les opérateurs et mairies](#fonctionnalités-pour-les-opérateurs-et-mairies)
  - [Tableau de bord public](#tableau-de-bord-public)
  - [Système de priorisation](#système-de-priorisation)
  - [Garanties contre les abus](#garanties-contre-les-abus)
  - [Communes pilotes](#communes-pilotes)
  - [Références réglementaires](#références-réglementaires)
- [PARTIE 2 — Documentation technique](#partie-2--documentation-technique)
  - [Stack technologique](#stack-technologique)
  - [Architecture](#architecture)
  - [Pages et accès](#pages-et-accès)
  - [Base de données — Tables principales](#base-de-données--tables-principales)
  - [Edge Functions Supabase](#edge-functions-supabase)
  - [Logique métier — Fichiers lib/](#logique-métier--fichiers-lib)
  - [Scoring de priorité — Détail technique](#scoring-de-priorité--détail-technique)
  - [Système de relay opérateurs](#système-de-relay-opérateurs)
  - [Notifications push Web](#notifications-push-web)
  - [Flux de données clés](#flux-de-données-clés)
  - [Sécurité et RLS](#sécurité-et-rls)
  - [Fonctionnalités à venir](#fonctionnalités-à-venir)

---

# PARTIE 1 — Présentation fonctionnelle

*Cette section est destinée aux partenaires, mairies, institutions (PNUD, UE, etc.) et toute personne souhaitant comprendre ce que fait l'application sans entrer dans les détails techniques.*

---

## Qu'est-ce que Civic Signal ?

Civic Signal est une application citoyenne de signalement et de suivi des problèmes de services publics à Abidjan (Côte d'Ivoire). Elle permet aux habitants de signaler en temps réel les coupures d'eau, les coupures d'électricité et les problèmes d'infrastructure (voirie, éclairage public, etc.), et de s'assurer que ces signalements parviennent automatiquement aux opérateurs concernés.

**La valeur centrale :** un signalement seul peut être ignoré. Un signalement confirmé par plusieurs voisins du même quartier devient un fait documenté, horodaté, géolocalisé — difficile à ignorer.

---

## À qui s'adresse l'application ?

| Utilisateur | Rôle dans l'application |
|---|---|
| **Citoyens** | Signalent, confirment, suivent les problèmes de leur quartier |
| **CIE** (électricité) | Reçoit les alertes consolidées par commune |
| **SODECI** (eau) | Reçoit les alertes consolidées par commune |
| **Mairies** | Reçoivent les signalements de voirie, lampadaires, infrastructure |
| **Administrateurs** | Valident, modèrent, gèrent les relais et les statistiques |
| **Partenaires/Institutions** | Accèdent aux données agrégées via le tableau de bord public |

---

## Les types de problèmes signalés

### Coupures de services essentiels
- **Coupure d'eau** (SODECI) — interruption de distribution
- **Coupure d'électricité** (CIE) — interruption de courant

### Problèmes d'infrastructure (voirie, mairie)
- Nid-de-poule ou dégradation de chaussée
- Lampadaire cassé ou éclairage public défaillant
- Caniveau bouché ou inondation
- Dépôt illégal d'ordures
- Fuite d'eau sur la voie publique
- Tout autre problème de voirie

---

## Parcours d'un signalement

```
Citoyen signale
      ↓
Localisation GPS automatique (commune + quartier)
      ↓
Description + photo (optionnelle)
      ↓
Signalement créé et visible publiquement
      ↓
Les voisins du même quartier peuvent confirmer ("J'ai le même problème")
      ↓
À partir de 2 confirmations → email automatique envoyé à CIE ou SODECI
      ↓
La mairie reçoit les signalements de voirie manuellement via l'admin
      ↓
Suivi de l'état jusqu'à résolution
```

**Pour les infrastructures (voirie) :** le scoring s'active dès qu'un voisin a confirmé le signalement. La priorité monte avec la durée sans intervention et le nombre d'autres signalements au même endroit (détectés par GPS).

---

## Fonctionnalités citoyennes

### Signaler un problème
- Détection automatique de la commune et du quartier via GPS
- Choix du type de problème parmi les catégories définies
- Ajout d'une description libre et d'une photo
- Indication si des personnes vulnérables sont présentes (pour les coupures d'eau/électricité uniquement)
- Soumission en moins de 2 minutes

### Confirmer un problème de voisin
- Les habitants du même quartier (rayon ~200m) voient les signalements récents
- Ils peuvent appuyer d'un clic : "J'ai le même problème"
- Chaque confirmation renforce la crédibilité du signalement
- Possibilité d'indiquer si le problème a été résolu (avec durée estimée)

### Suivre ses signalements
- Page "Suivi" personnelle : liste de tous les signalements créés et confirmés
- Statuts : Nouveau / En cours de traitement / Résolu / Non pris en charge
- Durée depuis le signalement, avec indication si l'opérateur a été alerté

### Recevoir des notifications
- Notification quand un voisin confirme votre signalement
- Notification quand l'opérateur (CIE/SODECI) a été alerté
- Notification quand un signalement est résolu
- Notifications push Web (navigateur) par commune ou quartier, activables dans le profil
- Rappels si un signalement reste sans réponse après 7 jours

### Laisser un commentaire
- Sur chaque signalement, les citoyens peuvent laisser un commentaire ou une impression (max 5 par utilisateur)
- Permet de partager des observations complémentaires sans modifier le signalement

### Profil personnel
- Informations de contact, commune et quartier de résidence
- Statistiques personnelles (nombre de signalements, confirmations)
- Gestion des préférences de notification
- Possibilité de supprimer son compte et toutes ses données

---

## Fonctionnalités pour les opérateurs et mairies

### Réception automatique des alertes (CIE / SODECI)
- Dès qu'un signalement d'eau ou d'électricité atteint 2 confirmations citoyennes, un email est automatiquement envoyé à l'opérateur concerné
- L'email est consolidé par commune : il regroupe tous les signalements en attente de la même zone en un seul message
- Chaque email contient : commune, quartiers concernés, nombre de citoyens impactés, liens Google Maps, niveau de priorité

### Dashboard de relay (accès admin)
- Vue de tous les emails envoyés ou en attente, groupés par opérateur
- Mode test (emails redirigés vers une adresse test) et mode production
- Possibilité d'envoi manuel si le délai automatique est trop long
- Traçabilité : chaque email est loggé avec horodatage et statut (envoyé / erreur)

### Mairies pilotes
7 mairies ont été intégrées à la phase pilote pour les signalements de voirie :
Abobo, Adjamé, Bingerville, Cocody, Koumassi, Port-Bouët, Yopougon.

Chaque mairie dispose d'une adresse email dédiée dans le système.

### Statistiques et export
- Tableau de bord admin avec statistiques par commune, par type de service, par période
- Export en PDF, CSV ou Excel
- Données sur les populations vulnérables (bébés, femmes enceintes, personnes âgées) pour les cas de coupures

---

## Tableau de bord public

Accessible sans inscription, le tableau de bord public affiche :

- **Nombre de coupures actives** en temps réel (eau + électricité)
- **Graphique de tendances** : évolution sur 30 jours
- **Classement des communes** les plus touchées
- **Durée moyenne** des coupures par type de service
- **Carte interactive** des signalements actifs avec filtres

Ces données sont publiques et peuvent être citées ou utilisées par des institutions partenaires.

---

## Système de priorisation

Chaque signalement reçoit automatiquement un niveau de priorité de P1 (critique) à P4 (faible), calculé selon des critères objectifs.

### Pour les coupures d'eau et d'électricité

La priorité augmente avec :
- La **durée de la coupure** (plus c'est long, plus c'est urgent)
- Le **nombre de personnes impactées** déclaré par le ménage
- La **présence de personnes vulnérables** (nourrissons, femmes enceintes, personnes âgées)
- Le **nombre de confirmations** reçues de voisins
- La **concentration de signalements** dans le même quartier

Le scoring ne s'active que lorsque suffisamment de signalements confirmés existent dans un quartier — pour éviter les faux positifs.

### Pour les signalements d'infrastructure (voirie)

La priorité est calculée différemment, car un problème de voirie peut être grave même seul :
- Le scoring s'active dès **1 vérification citoyenne** (pas de seuil de quartier)
- La priorité monte avec la **durée sans intervention** (en jours)
- L'impact est mesuré par le **nombre d'autres signalements GPS** au même endroit — pas déclaré par le signalant (évite les abus)
- Une **zone sensible** (urgency haute) donne un bonus de 8 points

### Niveaux

| Niveau | Label | Signification |
|---|---|---|
| 🔴 P1 | Critique | Intervention immédiate requise |
| 🟠 P2 | Élevé | Traitement urgent |
| 🟡 P3 | Modéré | À traiter dans les jours suivants |
| 🟢 P4 | Faible | Signalement en attente ou situation stable |

---

## Garanties contre les abus

Plusieurs mécanismes protègent la fiabilité des données :

- **Une confirmation par utilisateur par signalement** — impossible de confirmer plusieurs fois
- **Localisation GPS vérifiée** — les voisins doivent être physiquement proches (~200m) pour confirmer
- **Le nombre de personnes impactées n'est pas utilisé pour l'infrastructure** — seul le GPS détermine l'impact (non déclarable librement)
- **Validation admin** avant que certains signalements apparaissent publiquement
- **Commentaires limités** à 5 par utilisateur par signalement, max 200 caractères
- **Suppression de compte** avec purge complète des données sur demande (conformité RGPD)

---

## Communes couvertes

SIGNA·CI couvre l'ensemble des 14 communes du Grand Abidjan :

| Commune | Population approx. | Rôle / Spécificité |
|---|---|---|
| Abobo | ~1 500 000 hab. | Grande commune populaire nord |
| Adjamé | ~500 000 hab. | Cœur commercial & gares routières |
| Anyama | ~250 000 hab. | Banlieue nord, Stade Ebimpé, ferroviaire |
| Attécoubé | ~350 000 hab. | Baie du Banco, quartiers lagunaires |
| Bingerville | ~150 000 hab. | Banlieue est résidentielle et historique |
| Cocody | ~700 000 hab. | Pôle résidentiel, universitaire & médical |
| Grand-Bassam | ~120 000 hab. | Ville historique UNESCO & balnéaire |
| Koumassi | ~500 000 hab. | Pôle artisanal & commercial sud |
| Marcory | ~300 000 hab. | Pôle économique, Zone 4, Biétry |
| Plateau | ~20 000 hab. (jour: ~1M) | Centre d'affaires & administratif |
| Port-Bouët | ~400 000 hab. | Zone aéroportuaire, portuaire & littorale |
| Songon | ~100 000 hab. | Banlieue ouest lagunaire en expansion |
| Treichville | ~200 000 hab. | Pôle portuaire, culturel & commercial historique |
| Yopougon | ~1 800 000 hab. | Plus grande commune résidentielle & industrielle |

---

## Références réglementaires

Les seuils de priorité pour les coupures sont calibrés sur la base des références suivantes :

**Eau :**
- Sphère Handbook (2018) — standard humanitaire international : 15 L/personne/jour minimum vital ; coupure sans alternative = urgence
- Adaptation au contexte climatique tropical d'Abidjan (chaleur + humidité : risque de déshydratation accéléré)

**Électricité :**
- Loi n° 2014-132 du 24 mars 2014 portant Code de l'Électricité de Côte d'Ivoire
- ANARE-CI — TMC national 2025 : 18,82 heures d'interruption annuelle moyenne
- Méthode IEEE 1366 (SAIDI/SAIFI) comme cadre de mesure de fiabilité réseau

**Infrastructure :**
- Charte des services publics municipaux — Sphère Handbook (2018)

> **Note :** Le cahier des charges contractuel CIE/SODECI n'étant pas public, une demande d'accès a été identifiée via la CAIDP (Commission d'Accès à l'Information d'Intérêt Public, Loi 2013-867). Si obtenu, les seuils contractuels ivoiriens remplaceront les adaptations actuelles.

---

# PARTIE 2 — Documentation technique

*Cette section est destinée aux développeurs qui travaillent sur le projet.*

---

## Stack technologique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Carte | Leaflet.js |
| Graphiques | Recharts |
| Emails | Resend (via Edge Function) |
| Push Web | Web Push API + VAPID (via Edge Function `send-push`) |
| Géocodage | OpenStreetMap Nominatim + Google Geocoding API (fallback) |
| Export | jsPDF + SheetJS |
| Hébergement | Vercel |

---

## Architecture

```
src/
├── pages/          # Pages React (routing via react-router-dom)
├── components/     # Composants réutilisables
├── lib/            # Logique métier pure (pas de React)
├── hooks/          # Custom React hooks
├── contexts/       # Contextes React (Auth, etc.)
├── integrations/
│   └── supabase/   # Client Supabase + types générés
└── assets/         # Images, logos

supabase/
├── functions/      # Edge Functions Deno
└── migrations/     # Migrations SQL ordonnées par timestamp
```

---

## Pages et accès

### Pages publiques (sans connexion)

| Page | Chemin | Rôle |
|---|---|---|
| Landing | `/` | Hero, stats en direct, CTA |
| Tableau de bord | `/tableau-de-bord` | Stats, graphiques, ranking communes |
| Carte | `/carte` | Carte Leaflet signalements actifs |
| Infrastructure | `/infrastructure` | Galerie signalements voirie |
| Commune | `/commune/:name` | Détail par commune |
| Historique | `/historique` | Signalements résolus/expirés |
| Détail signalement | `/signalement/:id` | Fiche complète + map |
| À propos | `/about` | Présentation projet |
| Politique vie privée | `/privacy` | CGU + RGPD |

### Pages authentifiées

| Page | Chemin | Rôle |
|---|---|---|
| Signaler | `/signaler` | Création signalement |
| Vérification | `/verification` | Corroborer signalements voisins |
| Suivi | `/suivi` | Mes signalements |
| Profil | `/profil` | Compte + préférences notifs |
| Installation PWA | `/installer` | Guide installation |

### Pages admin (`role: admin` ou `role: moderator`)

| Page | Chemin | Rôle |
|---|---|---|
| Overview | `/admin` | Dashboard KPI + toggles |
| Signalements | `/admin/reports` | Validation / rejet |
| Relay | `/admin/relay` | Envoi emails opérateurs |
| Quartiers | `/admin/quartiers` | Gestion aliases quartiers |
| Droits | `/admin/rights` | Gestion rôles utilisateurs |
| Utilisateurs | `/admin/users` | Recherche + gestion comptes |
| Suppressions | `/admin/deletions` | Audit suppressions comptes |
| Vulnérables | `/admin/vulnerable` | Analyse signalements vulnérables |
| Purge | `/admin/purge` | Archivage + nettoyage |
| Statistiques | `/admin/stats` | Données + export PDF/CSV/XLS |
| Audit | `/admin/audit` | Logs actions admin |
| Messagerie | `/admin/messaging` | Notifications de masse |

---

## Base de données — Tables principales

### `reports`
Signalement principal.

| Colonne | Type | Description |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users |
| `service_type` | text | `electricity` / `water` / `mairie` |
| `report_category` | text | `outage` / `infrastructure` |
| `status` | text | `active` / `resolved` / `expired` / `verifying` |
| `urgency` | text | `low` / `medium` / `high` / `critical` |
| `verifications` | int | Compteur confirmations voisins |
| `validated` | bool | Validé par admin |
| `commune` | text | Commune détectée |
| `quartier` | text | Quartier détecté |
| `latitude` / `longitude` | float | GPS |
| `impacted_people` | int | Personnes foyer (outages uniquement) |
| `babies` / `pregnant` / `elderly` | int | Personnes vulnérables (outages) |
| `repair_verifications` | int | Confirmations de réparation |
| `photo_url` | text | URL Supabase Storage |

### `corroborations`
Une ligne par (user × report). Empêche les doublons via contrainte UNIQUE.

| Colonne | Type | Description |
|---|---|---|
| `user_id` | uuid | FK → auth.users |
| `report_id` | uuid | FK → reports |
| `resolution_time_minutes` | int | Durée estimée si résolu |

### `relay_logs`
Traçabilité des emails envoyés aux opérateurs.

| Colonne | Type | Description |
|---|---|---|
| `report_id` | uuid | FK → reports |
| `operator` | text | `CIE` / `SODECI` / `MAIRIE` |
| `email_to` | text | Adresse destinataire |
| `status` | text | `pending` / `sent` / `error` |
| `sent_at` | timestamptz | Horodatage envoi |

**Trigger :** `trigger_relay_on_verification` — insère un `relay_log` quand `verifications` passe de <2 à ≥2 sur un signalement `outage`.

**Cron :** toutes les 5 minutes, traitement automatique des `relay_logs` en statut `pending`.

### `relay_config`
Configuration email opérateurs (clés/valeurs).

| Clé | Description |
|---|---|
| `test_mode` | `true` / `false` |
| `test_email` | Email de test |
| `email_cie` | Email production CIE |
| `email_sodeci` | Email production SODECI |
| `mairie_<slug>_email` | Email par mairie pilote |
| `mairie_<slug>_enabled` | `true` / `false` par mairie |

### `push_subscriptions`
Abonnements Web Push par device.

| Colonne | Type | Description |
|---|---|---|
| `user_id` | uuid | FK → auth.users |
| `endpoint` | text | URL push (navigateur) |
| `p256dh` / `auth` | text | Clés VAPID device |
| `commune` | text | Filtre commune |
| `quartier` | text | Filtre quartier |

### `report_comments`
Commentaires citoyens sur signalements.

| Colonne | Type | Description |
|---|---|---|
| `report_id` | uuid | FK → reports |
| `user_id` | uuid | FK → auth.users |
| `content` | text | 1–200 caractères |

Limite : max 5 commentaires par (user × report) — enforced par trigger SQL.

### `quartiers`
Référentiel des quartiers par commune.

| Colonne | Type | Description |
|---|---|---|
| `name` | text | Nom officiel |
| `commune` | text | Commune parent |
| `hidden` | bool | Masqué du sélecteur |
| `aliases` | jsonb | Variantes orthographiques |

---

## Edge Functions Supabase

### `relay-to-operator`
**Déclenchement :** POST HTTP — manuellement depuis `AdminRelayPage` ou par cron (toutes les 5 min).

**Rôle :** Envoie les emails consolidés aux opérateurs (CIE, SODECI, mairies).
- Regroupe les `relay_logs` par `(commune, operator, email_to)`
- Construit un email HTML avec tableau des signalements, liens Google Maps, priorité max
- Envoie via Resend API
- Met à jour `relay_logs.status` = `sent` ou `error`

**Variables d'environnement requises :**
- `RESEND_API_KEY`
- `RELAY_FROM_EMAIL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### `send-push`
**Déclenchement :** POST HTTP (par `report-reminders` ou admin `AdminMessagingPage`).

**Rôle :** Envoie des notifications Web Push aux abonnés d'une commune/quartier.
- Action `get-vapid-key` : retourne la clé publique VAPID
- Action `send` : envoie push aux abonnés filtrés
- Supprime automatiquement les abonnements invalides (codes 404/410)

**Variables d'environnement requises :**
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

### `report-reminders`
**Déclenchement :** Cron Supabase (récurrent).

**Rôle :** Gère le cycle de vie des signalements actifs.
- **14 jours** sans résolution → passe en `expired` + notification
- **7 jours** sans vérification → marqué "non pris en charge" + notification
- **2–7 jours** avec critiques → escalade urgency
- **1h** depuis le dernier rappel → push notification rappel

### `create-user`
**Déclenchement :** POST HTTP (admin uniquement).

**Rôle :** Crée un compte utilisateur Auth + profil + rôle depuis l'interface admin.

### `delete-account`
**Déclenchement :** POST HTTP (utilisateur authentifié).

**Rôle :** Suppression complète du compte en cascade.
Ordre : photos Storage → reports → corroborations → notifications → profil → auth.users → log deletion.

---

## Logique métier — Fichiers lib/

### `priority-score.ts`
Moteur de priorisation P1–P4. Deux algorithmes selon `report_category` :
- **`calculateInfraPriority()`** pour `infrastructure`
- **`calculatePriority()`** pour `outage` (eau/électricité) avec gate de zone

Voir section dédiée ci-dessous.

### `communes.ts`
- 7 communes pilotes avec coordonnées GPS, rayon, population, couleur
- `findNearestCommune(lat, lon)` — algorithme Haversine + détection zone pilote

### `geolocation.ts`
Résolution multi-tier de la commune à partir des coordonnées GPS :
1. GeoJSON polygon ray-cast (offline, immédiat)
2. Nominatim OSM reverse-geocode (~300ms)
3. Google Geocoding API (fallback payant)
4. Haversine distance (toujours disponible)

Cache TTL 5 minutes sur grille ~100m.

### `duration-confidence.ts`
Calcule la confiance sur la durée d'une coupure :
- `verified` — résolu + repair_confirmation OU ≥3 vérifications
- `estimated` — résolu sans confirmation
- `active` — toujours en cours
- `expired` — jamais résolu après 14j

### `export-pdf.ts`
Génère PDF (jsPDF) et CSV/XLS (SheetJS) pour l'admin. UTF-8 BOM pour compatibilité Excel.

### `quartiers.ts`
Mapping statique commune → liste de quartiers (source OpenStreetMap).

---

## Scoring de priorité — Détail technique

### Signalements INFRASTRUCTURE (`report_category = "infrastructure"`)

**Gate :** `verifications < 1` → P4 "En attente de vérification citoyenne"

**Calcul (score brut, pas de pondération service) :**

```
Score = durée_en_jours + zone_sensible + gps_corroboration + photo_votes + verifications
```

| Signal | Source | Points |
|---|---|---|
| >30j sans intervention | Durée objective | 30 |
| >14j sans intervention | Durée objective | 20 |
| >7j sans intervention | Durée objective | 12 |
| >3j sans intervention | Durée objective | 6 |
| >1j sans intervention | Durée objective | 2 |
| Zone sensible (`urgency=high`) | Binaire | +8 |
| ≥6 signalements GPS proches | `get_nearby_reports` (50m) | +22 |
| 3–5 signalements GPS proches | `get_nearby_reports` (50m) | +15 |
| 1–2 signalements GPS proches | `get_nearby_reports` (50m) | +8 |
| ≥6 votes photo | Futur | +12 |
| 3–5 votes photo | Futur | +7 |
| 1–2 votes photo | Futur | +3 |
| ≥5 vérifications voisins | `verifications` | +10 |
| 3–4 vérifications voisins | `verifications` | +6 |
| 1–2 vérifications voisins | `verifications` | +2 |

**Seuils `infraScoreToLevel` :** P1 ≥40, P2 ≥22, P3 ≥10, P4 <10

### Signalements OUTAGE (`report_category = "outage"`)

**Gate de zone :** nécessite `zoneContext` avec ≥50 signalements actifs dans le quartier ET ≥50% confirmés.

**Pondération service :** Eau ×1.5 (Sphère Handbook tropical), Électricité ×1.0.

**Calcul :**

```
Score = (durée + vulnérabilité + impact + vérifications + zone_crisis) × poids_service
```

Seuils eau (Sphère Handbook + adaptation tropicale) : >2h (4pts), >6h (12pts), >12h (22pts), >24h (32pts), >48h (40pts)

Seuils électricité (Code Électricité CI + ANARE-CI TMC) : >2h (4pts), >6h (10pts), >12h (16pts), >24h (24pts), >48h (30pts)

**Seuils `scoreToLevel` :** P1 ≥55, P2 ≥35, P3 ≥18, P4 <18

---

## Système de relay opérateurs

### Flux automatique
```
report.verifications >= 2 (outage)
        ↓
trigger_relay_on_verification (SQL trigger)
        ↓
INSERT relay_logs (status='pending')
        ↓
Cron toutes 5 min → /functions/v1/relay-to-operator
        ↓
Groupement par (commune, operator, email_to)
        ↓
Email Resend → opérateur
        ↓
relay_logs.status = 'sent' | 'error'
```

### Flux manuel (admin)
```
AdminRelayPage → sélection groupes → POST relay-to-operator { relay_ids }
        ↓
Email immédiat → opérateur
        ↓
relay_logs.status mis à jour
```

### Configuration (table `relay_config`)
- `test_mode=true` → tous les emails vers `test_email`
- `test_mode=false` → emails vers adresses production
- 7 mairies pilotes activables individuellement

---

## Notifications push Web

**Architecture VAPID :**
- Clés générées une fois, stockées en secrets Supabase
- Clé publique exposée via `send-push?action=get-vapid-key`
- Abonnements stockés dans `push_subscriptions` (un par device × commune)

**Déclencheurs :**
- Cron `report-reminders` → rappels si signalement sans réponse
- Admin `AdminMessagingPage` → campagnes manuelles par commune
- Trigger SQL → notification immédiate après corroboration

**Statut actuel :** Fonctionnel — clés VAPID configurées, Edge Function déployée.

---

## Flux de données clés

### Création d'un signalement
1. `ReportPage` → détection GPS multi-tier (`geolocation.ts`)
2. INSERT `reports` (status=`active`, verifications=0)
3. Upload photo → Supabase Storage
4. Notification in-app créée pour le reporter

### Corroboration d'un voisin
1. `NeighborCorroboration` → RPC `corroborate_report`
2. INSERT `corroborations` (contrainte UNIQUE user×report)
3. UPDATE `reports.verifications++`
4. Si `verifications >= 2` → trigger INSERT `relay_logs`
5. Notification au reporter

### Relay opérateur
1. Cron (5 min) → POST `relay-to-operator`
2. SELECT `relay_logs` WHERE `status='pending'`
3. Groupement + construction email HTML
4. Resend API → email opérateur
5. UPDATE `relay_logs.status='sent'`

---

## Sécurité et RLS

| Table | Lecture | Écriture |
|---|---|---|
| `reports` | Publique | Auth uniquement |
| `profiles` | Self | Self |
| `corroborations` | Publique | Auth (1 par user×report) |
| `notifications` | Self | Trigger SQL |
| `push_subscriptions` | Self | Self |
| `relay_logs` | Publique | Service role |
| `relay_config` | Publique | Service role |
| `report_comments` | Publique | Auth (max 5/user/report) |
| `user_roles` | Self | Admin uniquement |

---

## Fonctionnalités à venir

| Fonctionnalité | État | Description |
|---|---|---|
| Votes photo | Prévu | `photo_votes` câblé dans le scoring infra, système de vote à implémenter |
| Cahier des charges CIE/SODECI | En cours | Demande CAIDP — si obtenu, remplacera les seuils actuels |
| Intégration mairies supplémentaires | Prévu | Extension au-delà des 7 communes pilotes |
| Export données partenaires | Prévu | API publique pour institutions (PNUD, UE, etc.) |
| Application mobile native | Non démarré | PWA actuelle en attendant |
