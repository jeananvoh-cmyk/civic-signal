# SIGNA-CI V2
## BLUEPRINT PRODUIT • UX • ARCHITECTURE • SÉCURITÉ
### Document maître pour la refonte Web + Mobile React / Capacitor

---

## 1. Vision produit
SIGNA-CI est une infrastructure civique qui permet aux citoyens de signaler, suivre et corroborer des problèmes affectant les services publics et les infrastructures, tout en donnant aux collectivités, opérateurs et régulateurs des outils adaptés à leur rôle.

**Principe directeur** : une même vérité opérationnelle — l’Incident — alimentée par des Signalements citoyens, des confirmations, des preuves et des mises à jour institutionnelles.

---

## 2. Décisions structurantes
- **Cible mobile** : React + Capacitor. Flutter devient legacy et ne doit plus recevoir de nouvelles fonctionnalités.
- **Un seul design system** pour Web et Mobile ; layouts différents selon le contexte.
- **Le citoyen utilise une expérience simple** : Accueil, Fil, Signaler, Carte, Moi.
- **Les professionnels utilisent un espace Web séparé par rôle** : Mairie, Opérateur, Régulateur.
- **Un Incident peut regrouper plusieurs Signalements citoyens**.
- **La localisation publique est une décision de sécurité côté serveur**, jamais uniquement côté UI.
- **Les photos originales et EXIF sensibles restent protégés** ; les médias publics sont nettoyés.
- **Le mode hors ligne est une capacité produit**, pas seulement une optimisation technique.

---

## 3. Cartographie cible — Mobile citoyen

| Onglet | Contenu principal | Action primaire |
| :--- | :--- | :--- |
| **Accueil** | État autour de moi, 3–5 catégories, incidents proches | Signaler |
| **Fil** | Incidents publics, mises à jour, confirmations | Ouvrir une fiche |
| **Signaler (+)** | Parcours guidé de création d’un signalement | Envoyer |
| **Carte** | Incidents publics + filtres + vue liste | Filtrer / ouvrir |
| **Moi** | Mon activité, notifications, profil, paramètres | Gérer mon activité |

**Navigation basse recommandée** : Accueil · Fil · + · Carte · Moi. Le bouton + est l’action centrale.

---

## 4. Cartographie cible — Web public

| Rubrique | Objectif |
| :--- | :--- |
| **Accueil** | Comprendre SIGNA-CI et accéder rapidement aux actions |
| **Signalements** | Explorer les problèmes publics sans exposer les données personnelles |
| **Carte** | Consulter les incidents publics avec filtres |
| **Transparence** | Statistiques, délais, résolution, données ouvertes, méthodologie |
| **Partenaires** | Expliquer la collaboration et les conditions de partenariat |
| **À propos** | Mission, gouvernance, fonctionnement, confidentialité, contact |

---

## 5. Espaces professionnels

| Rôle | Navigation cible |
| :--- | :--- |
| **Mairie** | Dashboard · Incidents · Carte opérationnelle · Interventions · Équipes · Performance |
| **Opérateur (CIE/SODECI/etc.)** | Dashboard · Incidents · Carte opérationnelle · Interventions · Performance · Équipes |
| **Régulateur** | Observatoire · Opérateurs · Territoires · Délais · Incidents chroniques · Données |

*Le portail technique des mairies et outils similaires ne doivent pas apparaître dans la navigation citoyenne.*

---

## 6. Modèle de domaine : Incident / Signalement
Le modèle recommandé sépare ce que le citoyen envoie de l’événement public traité.

| Objet | Rôle |
| :--- | :--- |
| **Incident** | Problème public unique pouvant regrouper plusieurs contributions |
| **Signalement** | Contribution initiale d’un citoyen |
| **Confirmation** | Indique qu’un autre citoyen est également concerné |
| **Preuve** | Photo ou information ajoutée à l’incident |
| **Mise à jour** | Évolution publiée par un acteur autorisé |
| **Intervention** | Action opérationnelle affectée à une équipe |
| **Résolution** | Clôture documentée de l’incident |

**Types initiaux** : `OUTAGE_ELECTRICITY`, `OUTAGE_WATER`, `PUBLIC_INFRASTRUCTURE`, `ROAD`.  
*Les catégories et organisations doivent rester configurables pour l’expansion africaine.*

---

## 7. Cycle de vie d’un incident
`Signalé` → `Qualifié` → `Confirmé` → `Transmis` → `Pris en charge` → `Intervention` → `Résolu` → `Vérifié/Clôturé`.

Les statuts visibles au citoyen doivent rester compréhensibles. Les statuts techniques internes peuvent être plus détaillés.

---

## 8. Parcours de signalement
1. **Choisir le problème** : électricité, eau, voirie/infrastructure, autre catégorie disponible.
2. **Décrire en quelques mots** : la description doit rester modifiable avant et après envoi selon les règles métier.
3. **Localiser** : GPS actuel, carte ou position issue d’une photo si disponible ; l’utilisateur peut signaler depuis la galerie après avoir quitté le lieu.
4. **Ajouter des preuves** : jusqu’à 3 photos pour l’infrastructure si la règle métier le confirme ; prise directe possible après autorisation caméra.
5. **Vérifier les informations et la visibilité publique**.
6. **Envoyer ou mettre en file d’attente hors ligne**.
7. **Afficher immédiatement le statut et le numéro/référence de suivi**.

> **Important** : Ne pas demander le nombre de personnes impactées pour les incidents d’infrastructure si cette donnée n’est pas pertinente. Pour les coupures, elle peut rester une donnée métier si elle est justifiée.

---

## 9. Fiche Incident citoyenne
Une fiche unique doit servir de point d’entrée au suivi, à la corroboration et au partage.
- **Catégorie + titre clair**
- **Commune / zone publique adaptée**
- **Statut et chronologie**
- **Nombre de contributions/confirmations lorsque pertinent**
- **Photos publiques nettoyées**
- **Mises à jour de l’organisation responsable**
- **Actions** : *Je suis également concerné* · *Ajouter une information/photo* · *Partager*
- **Protection systématique de l’adresse personnelle et des coordonnées exactes du signaleur**

---

## 10. Fil des signalements
Le Fil est un flux civique, pas un réseau social. Il montre les infrastructures publiques et incidents pertinents, avec des mises à jour institutionnelles. Pas de likes, followers ou mécanique de popularité.  
**Actions recommandées** : Confirmer · Ajouter une information · Partager.

---

## 11. Cartes et confidentialité géographique

| Niveau | Exemple d’usage | Public |
| :--- | :--- | :--- |
| **PUBLIC_EXACT** | Infrastructure publique précisément localisable | Selon règle métier |
| **PUBLIC_APPROXIMATE** | Zone d’un incident | Oui |
| **PUBLIC_AREA** | Coupure / zone affectée | Oui |
| **PRIVATE_TECHNICAL** | Coordonnée exacte utile aux équipes | Non |
| **PRIVATE** | Donnée personnelle | Non |

*La précision publiée doit être déterminée par le backend/RLS/API. Le floutage frontend seul est insuffisant.*

---

## 12. Médias et EXIF
Les photos originales peuvent contenir GPS, date, appareil et autres métadonnées.  
**Architecture cible** : `original protégé` → `traitement` → `version publique nettoyée`. Les originaux ne doivent être accessibles qu’aux rôles autorisés.

---

## 13. Offline-first
Le citoyen doit pouvoir commencer et enregistrer un signalement sans réseau.  
Une file locale indique : `En attente d’envoi` → `Upload` → `Envoyé` → `Échec à réessayer`.  
Après reconnexion, la synchronisation est automatique. Les doublons peuvent être rapprochés côté serveur par proximité géographique, temps et catégorie.

---

## 14. Partage
Remplacer « Générateur d’affiche » par **« Partager »**.  
**Sous-actions** : WhatsApp · Copier le lien · Visuel/affiche · autres. Un partage doit pointer vers la fiche publique et ne jamais exposer l’adresse personnelle.

---

## 15. Mon activité / Profil / Paramètres

| Espace | Contenu |
| :--- | :--- |
| **Mon activité** | Mes signalements · En attente d’envoi · À confirmer · Historique |
| **Notifications** | Mises à jour utiles, invitations à confirmer, résolution, incidents proches |
| **Profil** | Identité minimale, commune si nécessaire, préférences |
| **Paramètres** | Compte · Notifications · Confidentialité · Localisation · Apparence · Langue · Données · Aide |

*Les outils de test, sandbox, injection ou bypass doivent être exclus de la production et protégés par build/feature flags.*

---

## 16. Dashboard professionnel
Les tableaux de bord doivent compter les **Incidents**, pas seulement les Signalements.  
*Exemple : 8 incidents actifs / 134 contributions associées.*

| Rôle | KPI prioritaires |
| :--- | :--- |
| **Mairie** | Incidents ouverts · pris en charge · résolus · délai médian · récurrence |
| **Opérateur** | Incidents actifs · volume de contributions · prise en charge · résolution · zones affectées |
| **Régulateur** | Volume · taux de résolution · délais · incidents chroniques · comparaison opérateurs/territoires |

---

## 17. Transparence
La page publique doit privilégier les données agrégées : volumes, statuts, délais, résolution, tendances, méthodologie et données ouvertes. Les coordonnées exactes et informations opérationnelles sensibles restent réservées.

---

## 18. Design system cible

| Élément | Règle |
| :--- | :--- |
| **Typographie** | Une famille sans-serif lisible ; hiérarchie courte et stable |
| **Espacement** | Échelle 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 |
| **Rayons** | 8 / 12 / 16 / 24 selon composant |
| **Boutons** | Primary · Secondary · Tertiary |
| **Couleurs** | Tokens : background, surface, text, border, brand, success, warning, danger, info |
| **Icônes** | Même famille visuelle partout ; catégories limitées sur l’accueil |
| **Dark mode** | Tokens dédiés, jamais simple inversion de couleurs |

*Les couleurs des opérateurs ne doivent pas devenir l’identité SIGNA-CI. Elles servent à identifier une catégorie ou une organisation.*

---

## 19. Architecture React / Capacitor cible
Organisation recommandée :  
`app/` · `features/auth` · `features/incidents` · `features/infrastructure` · `features/outages` · `features/map` · `features/feed` · `features/notifications` · `features/transparency` · `features/profile` · `features/pro/municipality` · `features/pro/operator` · `features/pro/regulator` · `components/ui` · `components/report` · `components/map` · `components/navigation` · `services` · `domain` · `lib`.

**Flux** : `UI` → `Use Case` → `Service` → `Supabase/API`.  
Éviter la logique métier et les requêtes directes dispersées dans les pages.

---

## 20. Sécurité P0
- **RLS explicite** par utilisateur, organisation et périmètre.
- **Le frontend ne peut pas décider seul** du rôle, organization_id, statut ou niveau de visibilité.
- **Coordonnées exactes et EXIF protégés** côté serveur.
- **Audit des variables d’environnement** ; utiliser `.env.example` et ne jamais versionner de secret.
- **OAuth Google** : navigateur système → callback/deep link → retour dans l’application Capacitor → session restaurée.
- **Tests d’accès négatifs** : un citoyen ne doit jamais pouvoir lire les données techniques d’un autre rôle.

---

## 21. Performance & résilience
- **Carte** : viewport + zoom + filtres + clustering ; ne pas charger toute la base.
- **Fil** : pagination par curseur.
- **Photos** : compression + thumbnails + chargement différé.
- **App** : cache et écrans légers sur Android milieu de gamme et réseau instable.
- **Pas de vidéo ou média lourd automatique.**

---

## 22. Tests de sortie

| Parcours | Test obligatoire |
| :--- | :--- |
| **Auth** | Google → navigateur → retour application → session |
| **Signalement** | GPS → photo → description → publication |
| **Offline** | Créer hors ligne → fermer → reconnexion → synchronisation |
| **Carte** | Aucune donnée privée visible publiquement |
| **Fiche** | Confirmation → ajout photo → partage |
| **Professionnel** | Organisation et périmètre correctement isolés |
| **Résolution** | Mise à jour → résolution → visibilité citoyenne |

---

## 23. Roadmap de mise en œuvre

| Phase | Livrable |
| :--- | :--- |
| **P0** | Sécurité, OAuth mobile, RLS, médias, confidentialité géographique |
| **P1** | Design system + navigation + modèle Incident/Signalement |
| **P2** | Signalement + fiche + Fil + Carte + corroboration |
| **P3** | Mon activité + notifications + profil |
| **P4** | Dashboards Mairie / Opérateur / Régulateur |
| **P5** | Transparence + Open Data |
| **P6** | Offline, Capacitor Android/iOS, tests E2E |
| **P7** | Performance, accessibilité, store readiness, migration Flutter |

---

## 24. Prompt de cadrage pour Antigravity
Ce document est la source de vérité produit. Ne pas réécrire tout le dépôt en une seule opération. Travailler par phases verticales, conserver les fonctionnalités déjà validées, supprimer les doublons après migration, écrire/adapter les tests à chaque tranche et ne jamais sacrifier les règles de confidentialité géographique pour simplifier l’UI. Toute nouvelle fonctionnalité doit être rattachée à un rôle, un objet de domaine et un parcours utilisateur explicite.

---

## 25. Critères « prêt pour utilisateurs »
- Un citoyen comprend quoi faire en moins de quelques secondes après ouverture.
- Le signalement est réalisable sans connaître le vocabulaire technique.
- Le suivi est accessible sans chercher un second écran caché.
- Le Fil et la Carte ne divulguent aucune donnée personnelle.
- Une coupure peut être corroborée sans créer inutilement un nouveau ticket.
- Une équipe professionnelle voit ses incidents et son périmètre, pas ceux des autres organisations.
- Le même design system est cohérent sur Web, Android et iOS.
- Les parcours critiques fonctionnent avec réseau instable et sont couverts par des tests.
- La sécurité est appliquée au backend et non uniquement à l’interface.
