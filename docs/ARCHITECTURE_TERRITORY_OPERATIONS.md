# CivicSignal — Architecture Territoire / Opérations / Gouvernance

## Objectif

Cette note formalise le raccord entre la nouvelle UX CivicSignal et les capacités déjà présentes dans `main`, sans remplacer le gros frontend avant synchronisation.

## Architecture produit cible

Citoyen → Territoire → Opérations → Partenaire/Mairie → Administration/Gouvernance

La couche Territoire suit :

Commune → Quartier → Infrastructure → Événement → Signalement → Intervention.

## Correspondance avec l'existant

### Territoire

- `public.communes` contient les communes et leurs coordonnées centrales.
- `public.quartiers` contient les quartiers, leur commune, validation, alias et visibilité.
- `public.pada_communes`, `public.pada_voies` et `public.pada_roads` fournissent une base géographique/adressage complémentaire.
- `public.reports` porte déjà `commune`, `quartier`, latitude/longitude, catégorie et statut.

### Signalement / fil territorial

`public.reports` est la source métier principale. `public.report_status_history` permet de construire une timeline fiable des changements d'état. `public.corroborations`, `report_support_votes`, `report_comments` et `repair_confirmations` enrichissent le signalement.

Le futur « Fil des infrastructures » doit agréger ces événements plutôt que créer une seconde source de vérité.

### Opérations

- `public.reports` porte les statuts opérationnels et les informations opérateur.
- `public.relay_logs` trace les transmissions aux opérateurs.
- `public.report_status_history` porte l'historique public/interne et les délais estimés.
- `public.notifications` et `push_subscriptions` supportent les notifications.

### Partenaire / Mairie

- `public.partner_profiles` représente les partenaires.
- `public.user_roles` contient déjà le rôle `partner`.
- `public.commune_subscriptions` permet d'associer des utilisateurs à une commune.

### Administration / Gouvernance

- `public.user_roles` centralise les rôles applicatifs.
- `public.audit_logs` est la source du journal d'audit.
- `public.site_settings` porte la configuration de plateforme.
- `public.relay_config` porte la configuration du relais.
- Les Edge Functions sécurisées comprennent notamment `relay-to-operator`, `notify-partner`, `send-push`, `create-user` et les fonctions de rapports.

## Décision d'architecture

1. Ne pas dupliquer `commune`, `quartier` et `report` dans une nouvelle couche frontend autonome.
2. Construire les dashboards à partir des tables métier existantes.
3. Conserver `report_status_history` comme source de timeline.
4. Conserver `relay_logs` comme source de traçabilité des transmissions.
5. Garder les opérations privilégiées côté Edge Functions.
6. Synchroniser toute modification importante de `App.tsx` / gros fichiers frontend avec la version `main` actuelle avant remplacement.
7. Introduire les nouveaux composants par familles réutilisables plutôt que par duplication de pages.

## Palette UX de référence

- Civic Navy: `#0F172A`
- Civic Teal: `#0D9488`
- Slate: `#E2E8F0`
- Background: `#F7F9FA`
- États sémantiques : rouge / ambre / vert uniquement pour les états, priorités et alertes.

## Prochaine séquence d'implémentation

1. Mapper les routes existantes aux familles Territoire / Opérations / Partenaire / Admin.
2. Extraire les composants réutilisables des gros écrans existants.
3. Introduire les dashboards territoriaux sur les données réelles.
4. Raccorder le fil aux historiques et relay logs existants.
5. Vérifier les frontières Edge Functions et les appels privilégiés.
6. Tester Web/mobile et les flux offline avant toute migration destructive.
