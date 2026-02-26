

## Plan : Rappels automatiques et classification d'urgence par cron

### Architecture

Une edge function `report-reminders` exécutée par `pg_cron` toutes les 30 minutes. Elle :
1. Sélectionne les signalements `active` avec leur ancienneté
2. Envoie des notifications de rappel selon le calendrier défini
3. A T=24h sans réponse : archive les signalements (status → `expired`) OU les passe en `critical` s'il y a ≥10 signalements actifs dans le même quartier/service_type

### Calendrier de rappels

| Ancienneté | Action |
|---|---|
| ~3h | 1er rappel : "Coupure toujours active ?" |
| ~6h | 2ème rappel : "Toujours sans service ?" |
| 10h-12h | Rappel toutes les ~1h |
| 12h-24h | Rappel toutes les ~1h |
| ≥24h | Dernier rappel + archivage ou escalade critique |

### Changements base de données (migration)

1. Ajouter colonne `last_reminder_at timestamptz` et `reminder_count integer DEFAULT 0` à la table `reports` pour tracker les rappels envoyés et éviter les doublons
2. Ajouter valeur `'expired'` comme statut possible (pas de CHECK constraint existante, donc juste convention)

### Edge Function `report-reminders`

- Utilise le service role key pour accéder aux données
- Requête SQL : sélectionne les reports `active` avec `EXTRACT(EPOCH FROM (now() - created_at))/3600` pour calculer l'ancienneté en heures
- Logique de rappel basée sur `reminder_count` et `last_reminder_at` (au moins 55min depuis le dernier rappel pour les rappels horaires)
- Pour T=24h : compte les signalements actifs dans le même `quartier` + `service_type` → si ≥10, passe en `critical`, sinon archive en `expired`
- Insère les notifications via le service role (bypass RLS)

### Gestion des réponses utilisateur

- Le bouton "Résolu" sur la page `/verification` appelle déjà `resolve_report` → le signalement est fermé automatiquement (existe déjà)
- Les notifications de rappel seront cliquables et redirigeront vers `/verification` pour que l'utilisateur puisse confirmer "Toujours coupé" ou "Résolu"

### Cron Job (SQL insert, pas migration)

Planifier via `pg_cron` + `pg_net` un appel HTTP POST vers la edge function toutes les 30 minutes.

### Modifications NotificationBell

- Ajouter le traitement visuel des notifications de rappel (icône horloge, style distinct)
- Clic sur rappel → redirige vers `/verification?report=<id>`

### Fichiers concernés

1. **Nouvelle migration** : ajout `last_reminder_at`, `reminder_count` sur `reports`
2. **Nouveau** : `supabase/functions/report-reminders/index.ts`
3. **Modifier** : `supabase/config.toml` (verify_jwt = false pour report-reminders)
4. **Modifier** : `src/components/NotificationBell.tsx` (style rappels)
5. **SQL insert** : cron job `pg_cron`
6. **Modifier** : `src/integrations/supabase/types.ts` sera auto-régénéré

