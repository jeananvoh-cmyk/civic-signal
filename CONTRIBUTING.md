# Guide de Contribution — SIGNA·CI 🇨🇮

Merci de votre intérêt pour contribuer à **SIGNA.ci**, la plateforme citoyenne et participative de suivi des pannes de réseaux (CIE · SODECI) et des dégradations de voirie (Mairies) en Côte d'Ivoire !

En tant que projet **Open Source sous licence AGPL-3.0**, SIGNA est un bien commun citoyen. Chaque contribution (code, documentation, signalement de bug, données cadastrales PADA) améliore le quotidien des résidents ivoiriens.

---

## 🏗️ 1. Architecture du Dépôt

Le projet est structuré sous forme de monorepo modulaire :

```
civic-signal/
├── web/              # Application Web & Mobile PWA / Capacitor (React 18, Vite, Tailwind CSS, Leaflet)
├── mobile/           # Application Mobile Android & iOS Native (Flutter 3.x, Dart, Riverpod, FlutterMap)
├── android/          # Conteneur natif Android pour Capacitor
├── supabase/         # Schémas SQL, Migrations, Politiques RLS, Triggers PostGIS & Edge Functions
├── docs/             # Documentation d'architecture, Open311 & spécifications API
└── .github/          # Workflows CI/CD GitHub Actions & Modèles d'Issues
```

---

## 🛠️ 2. Prérequis & Installation Locale

### A. Cloner le projet
```bash
git clone https://github.com/jeananvoh-cmyk/civic-signal.git
cd civic-signal
```

### B. Lancer l'environnement Web & Capacitor (`web/`)
1. **Installer les dépendances** :
   ```bash
   cd web
   npm install
   ```
2. **Configurer les variables d'environnement** :
   Copiez `.env.example` en `.env` :
   ```bash
   cp .env.example .env
   ```
   Renseignez votre URL Supabase locale ou de test et la clé anonyme publique (`VITE_SUPABASE_ANON_KEY`).

3. **Démarrer le serveur de développement** :
   ```bash
   npm run dev
   ```

4. **Lancer les tests et le linter** :
   ```bash
   npm test       # Exécute Vitest
   npm run lint   # Vérifie la conformité ESLint
   npm run build  # Teste la compilation Vite
   ```

---

### C. Lancer l'application Flutter Native (`mobile/`)
1. **Installer les dépendances Dart** :
   ```bash
   cd mobile
   flutter pub get
   ```
2. **Exécuter l'analyse statique et les tests** :
   ```bash
   flutter analyze
   flutter test
   ```
3. **Lancer sur un émulateur ou téléphone connecté** :
   ```bash
   flutter run
   ```

---

## 📋 3. Convention de Développement Dual (Web ⇄ Flutter)

Afin de maintenir une **parité stricte** entre la version Web/Capacitor et la version Flutter native :

1. **Source de Vérité Unique** : Les calculs de priorités, statuts de pannes et jointures d'adressage PADA sont portés par les **RPCs et fonctions SQL Supabase**.
2. **Double Validation** : Toute modification apportée au flux citoyen sur le Web doit être répercutée dans l'interface Flutter correspondante.
3. **Respect des Tokens de Design** : Utilisez les couleurs et variables partagées définies dans `docs/tokens.md` (Émeraude `#10b981`, Ambre `#f59e0b`, Bleu `#3b82f6`, Ardoise `#0f172a`).

---

## 🌿 4. Workflow Git & Branches

1. Créez une branche descriptive à partir de `main` :
   - `feat/nom-de-la-fonctionnalite` pour un ajout
   - `fix/nom-du-bug` pour une correction
   - `docs/amelioration` pour de la documentation
   - `pada/nouvelle-commune` pour l'enrichissement cadastral

2. Respectez les **Conventional Commits** :
   - `feat(web): add whatsapp share victory button`
   - `fix(mobile): resolve dark mode contrast in report details`
   - `docs(api): update open311 endpoint specification`
   - `test(pada): add address normalization unit test`

3. Poussez votre branche et ouvrez une **Pull Request (PR)** sur GitHub.

---

## ✅ 5. Checklist avant de soumettre une Pull Request

Avant d'ouvrir une PR, assurez-vous que :
- [ ] `npm test` passe à 100% dans `web/`.
- [ ] `npm run lint` ne retourne aucune erreur.
- [ ] `flutter analyze` et `flutter test` passent dans `mobile/`.
- [ ] Aucun secret ni clé d'API privée n'a été commité.
- [ ] La politique de confidentialité des coordonnées GPS (~150 m) est préservée.

---

## 🤝 6. Code de Conduite

En participant à ce projet, vous vous engagez à respecter le [Code de Conduite](CODE_OF_CONDUCT.md) fondé sur la bienveillance, le respect et la collaboration civique.
