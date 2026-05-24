# CHANGELOG — Design System SIGNA·CI

Format : [Semantic Versioning](https://semver.org/lang/fr/)
BREAKING = nécessite une migration active des composants consommateurs.

---

## [1.0.0] — 2026-05-24

Première version versionnée — design system stable en production sur signa.ci.

### Tokens
- `--urgent` aligné sur `--destructive` (light: `0 72% 51%`, dark: `0 65% 62%`)
  Raison : deux tokens rouges avec des valeurs légèrement différentes sans justification sémantique.

### Composants UI
- `Button` : `icon-sm` h-7→h-8 (conformité touch target 44px)
- `BottomNav` : FAB `transition-transform duration-150` ; badge `aria-hidden="true"`

### Accessibilité (WCAG 2.1 AA)
- `Header` : `<div onClick>` → `<button>` avec `aria-label` sur toggle thème mobile
- `Header` : `aria-haspopup="true"` → `aria-haspopup="menu"` sur dropdown
- `AdminOverviewPage` : KPI cards `role="button"` + `tabIndex={0}` + `onKeyDown`
- `ReportPage` : compteur +/- `aria-live="polite"`, `aria-label` sur chaque bouton
- `ReportPage` : input heure `<label htmlFor>` lié
- `VerificationPage` : datetime-local `<label htmlFor>` lié
- `VerificationPage` : SVG décoratif `aria-hidden="true"`
- 11 occurrences `text-[10px]`/`text-[11px]` → `text-xs` sur contenu lisible

### UX
- `ReportPage` étape 1 : grille de types scindée en deux sections labelisées
  ("Coupure de réseau" / "Problème d'infrastructure")
- `VerificationPage` : CTA binaires uniformes
  ("C'est rétabli" / "Toujours coupé" · "C'est réparé" / "Problème persiste")
- `VerificationPage` : delete dialog remplace textarea libre par chips preset
  (Doublon · Erreur de localisation · Problème résolu · Autre)
- `DashboardPage` : P1/P2 critiques affichés avant les CTAs citoyens
- `DashboardPage` : empty state "Tout va bien" quand aucune alerte critique
- `ReportDetailPage` : indicateur `X/3` sur l'étape corroborations de la timeline
- `ReportDetailPage` : seuil de corroboration lu depuis `relay_config`
  (clé `corroboration_threshold`, défaut : 3)

### Dark mode
- `ReportPage` : couleurs de sélection des cartes de type adaptées au thème
  via `useIsDark` hook (opacité `18` light → `2d` dark)

### Analytics
- Table `ux_events` (Supabase) : event, user_id, properties JSONB, created_at
  RLS : insert ouvert · select admin/moderator uniquement
- Hook `useAnalytics` : fire-and-forget, typage strict sur EventName
- Événements trackés :
  - `type_selected` (type_id, category, service)
  - `report_submitted` (commune, has_photo, impacted_people, has_vulnerable)
  - `verification_resolved` (report_id, category, service, time_to_decision_ms)
  - `verification_ongoing` (report_id, category, service, time_to_decision_ms)
  - `report_deleted` (report_id, reason_chip)

### Corrections
- `time_to_decision_ms` mesuré depuis `openResolveDialog` (non depuis le chargement de la page)
- `useAnalytics` : suppression du cast `as any` suite à la régénération des types Supabase
- `OfflineBar` : bannière warning quand `queue.length > 0` en ligne
  (bouton "Envoyer" manuel + bouton de fermeture)

### Infrastructure
- `useRelayConfig` hook : lecture générique depuis `relay_config` avec valeur par défaut
- `useIsDark` hook : MutationObserver sur `document.documentElement.classList`
- `package.json` : version `0.0.0` → `1.0.0`, name `vite_react_shadcn_ts` → `signa-ci`
- Types Supabase régénérés (inclut `ux_events`)

---

## DEPRECATED (prévu pour v2.0)

- `--info` : alias de `--primary`, aucune valeur sémantique distincte.
  Remplacement : utiliser `--primary` directement.
  Timeline : annoncé v1.0, suppression v2.0.
