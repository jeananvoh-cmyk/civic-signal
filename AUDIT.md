# Audit Architectural et UX/UI : SIGNA.ci

**Date :** Août 2024
**Projet :** SIGNA.ci (Web & Mobile)

---

## 1. Audit Architectural

L'application SIGNA.ci adopte une approche "monorepo" séparant de manière claire et modulaire l'application Web (React/Vite) et l'application mobile native (Flutter/Capacitor). Cette structure est excellente pour maintenir une base de code propre tout en visant plusieurs plateformes.

### 1.1 Backend & Base de Données (Supabase)
- **Points forts** : L'utilisation de Supabase avec PostgreSQL et PostGIS offre une infrastructure très robuste, particulièrement adaptée pour une application géolocalisée. La gestion de l'authentification et des politiques de sécurité (Row Level Security - RLS) permet un contrôle d'accès fin aux données.
- **Évolutivité** : Supabase permet d'évoluer (scaler) facilement, et le choix d'Open311 comme standard pour l'API garantit une interopérabilité solide avec les entités de régulation (ANARE-CI, ONEP) et les collectivités.

### 1.2 Application Web (`web/`)
- **Stack** : React 18, Vite, TypeScript.
- **State Management** : Utilisation de Contexts React (ex: `AuthContext.tsx`) combinée avec TanStack React Query pour la gestion des états asynchrones et la mise en cache. C'est une excellente pratique moderne.
- **Architecture** : Le code est bien compartimenté (`components/`, `contexts/`, `hooks/`, `pages/`, `lib/`).
- **Remarque / Recommandation** : Le bundle Vite sépare intelligemment les chunks (`vendor-maps`, `vendor-charts`, etc.). Veillez à maintenir cette optimisation si le nombre de composants cartographiques ou graphiques augmente.

### 1.3 Application Mobile (`mobile/`)
- **Stack** : Flutter 3.x, Dart.
- **State Management** : L'utilisation de `flutter_riverpod` est le standard actuel recommandé par la communauté pour une gestion d'état sûre et performante.
- **Architecture** : Structurée selon le principe du Feature-Driven Development ou Clean Architecture (`core/`, `data/`, `domain/`, `ui/features/`). Cela garantit que chaque fonctionnalité est isolée et facilement testable.
- **Spécificités** : La gestion "offline-first" est cruciale en Côte d'Ivoire. Les plugins comme `flutter_map` et `geolocator` sont bien intégrés.

---

## 2. Audit UX/UI

L'application se veut être un outil de "CivicTech", l'accessibilité et la clarté sont donc primordiales pour toucher un large public.

### 2.1 Version Web
- **Design System** : Utilisation de **Tailwind CSS** couplé avec **Radix UI** et le système de composants de type `shadcn/ui`. Cela garantit un design cohérent, moderne, et très accessible (support clavier et lecteurs d'écran via Radix).
- **Thématisation** : Gestion via des variables CSS et des classes utilitaires (`cn`). Les boutons, cartes (cards), et autres éléments de base sont bien standardisés.
- **Responsiveness** : Tailwind assure nativement une bonne adaptabilité sur mobile, tablette et desktop.

### 2.2 Version Mobile (Flutter)
- **Design System** : L'utilisation de `AppTheme` (`lib/core/theme/app_theme.dart`) avec Google Fonts (`Inter` et `Outfit`) et une palette de couleurs claires (Teal, Emerald, Rose) crée une identité visuelle forte et cohérente avec la version Web.
- **Thématisation** : Prise en charge native du Dark Mode et Light Mode de manière structurée.
- **UX** : L'utilisation de composants comme `pada_address_input.dart` ou `civic_photo_view.dart` montre une attention particulière portée aux spécificités locales (adressage PADA).

---

## 3. Recommandations & Axes d'Amélioration

1. **Partage de la logique métier (Web / Mobile)** :
   - *Constat* : Bien que le monorepo soit pratique, il y a inévitablement une duplication de la logique d'appel API et des modèles de données (Supabase) entre TypeScript (Web) et Dart (Mobile).
   - *Recommandation* : Envisager, si le besoin se fait sentir, de générer automatiquement les types/modèles Dart à partir de la base de données Supabase, comme cela est fait souvent en TypeScript.

2. **Accessibilité (A11y)** :
   - *Web* : Radix UI gère beaucoup de choses, mais veillez à auditer l'application finale avec des outils comme *Lighthouse* ou *axe-core* pour s'assurer que les contrastes de couleurs (notamment le primaryTeal) sont suffisants.
   - *Mobile* : Tester l'application Flutter avec des polices agrandies (accessibilité système) pour s'assurer que l'UI ne "casse" pas (overflows).

3. **Performance et Mode Hors-Ligne** :
   - *Mobile* : Valider rigoureusement le service `offline_queue_service.dart` pour la synchronisation différée. Assurez-vous que l'utilisateur est visuellement informé de l'état de la synchronisation (icône en attente, notification de succès).
   - *Web* : La configuration PWA (via `vite-plugin-pwa`) est mentionnée, vérifiez la mise en cache des assets statiques via les Service Workers (`web/src/sw.ts`).

4. **Tests** :
   - La suite de tests Web (Vitest) compte 71 tests passants, ce qui est excellent. Pour Flutter, assurez-vous de couvrir non seulement les services (unitaire), mais aussi les parcours critiques (widget testing) comme le signalement d'un incident hors-ligne.
