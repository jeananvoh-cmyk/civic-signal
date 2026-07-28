# SIGNA·CI — Mood & Aesthetic Direction

## Brand Personality

**5 mots clés :** Institutionnel · Ancré · Solidaire · Direct · Lisible

SIGNA·CI est un outil civique, pas une app grand public. Son esthétique doit inspirer la confiance institutionnelle (on parle à CIE, SODECI, aux Mairies) tout en restant accessible à un citoyen d'Abidjan sur un téléphone Android d'entrée de gamme, en plein soleil.

Le modèle de référence est **viepublique.ci** (bleu institutionnel) croisé avec **Wave CI** (épuré, rapide, confiant). Ni froid ni clinique — chaleureux mais sérieux.

---

## Palette émotionnelle

| Émotion | Quand | Couleur dominante |
|---------|-------|------------------|
| Urgence / alerte | Coupure active, P1/P2 | `--destructive` (rouge) |
| Résolution / succès | Problème résolu, confirmation | `--success` (vert) |
| Action principale | Signaler, CTA primaire | `--primary` (bleu institutionnel) |
| Attention / prudence | GPS imprécis, délai | `--warning` (orange) |
| Eau | Signalement SODECI | `--water` (cyan) |
| Électricité | Signalement CIE | `--electricity` (ambre) |
| Infrastructure | Voirie, mairie | `--infra` (violet) |
| Repos / neutre | Fond, cartes | `--background` + `--muted` |

---

## Références visuelles

**À émuler :**
- viepublique.ci — autorité, bleu institutionnel, structure claire
- Wave CI — épuré, lisible, confiance immédiate, sans superflu décoratif
- Fix My Street UK (fonctionnel, pas joli — efficace)

**À éviter :**
- Startup silicon valley — trop décontracté pour un outil de crise civique
- Emojis décoratifs en excès — 1 emoji max par message, jamais dans les titres
- Dark patterns visuels — hiérarchie agressive, faux urgence marketing
- Illustrations complexes — les SVG décoratifs doivent être minimalistes et monochromes

---

## Iconographie

- Source unique : **lucide-react** — ni heroicons, ni material, ni FontAwesome
- Style : trait fin (strokeWidth 1.8 default, 2.2 sur état actif), angles arrondis
- Taille standard : `h-4 w-4` dans les labels, `h-5 w-5` dans les CTA, `h-6 w-6` dans les headers
- Icônes décoratives : `aria-hidden="true"` obligatoire

---

## Typographie

- **Inter** — unique police du projet : texte courant, labels, ET titres display (`.font-display` = Inter avec `letter-spacing: -0.03em`)
- Jamais de police décorative, script, condensed ou serif

---

## Espacement et structure

- Cartes : arrondis `--radius` (0.625rem) — ni sharp ni pill
- Surfaces : fond `--card` avec `shadow-card` — pas de box-shadow arbitraire
- Séparations : `border` Tailwind — pas de lignes décoratives ou de dégradés de séparation
- Dense mais respirant : padding interne minimum `p-4`, contenu dense acceptable dans les tableaux de données

---

## Do / Don't

| Do | Don't |
|----|-------|
| Fond ivoire subtil (`--background: 35 18% 96%`) | Blanc pur `#FFFFFF` comme fond de page |
| Bleu institutionnel `--primary` sur les actions | Bleu "startup" vif ou bleu royal |
| Orange terracotta `--accent-mid` pour les badges secondaires | Orange fluo ou rouge-orange pour les accents |
| Animations discrètes 150–250ms | Animations > 300ms ou effets de parallaxe |
| `motion-reduce:animate-none` sur toutes les animations | Animations sans guard prefers-reduced-motion |
| Photos réelles de terrain (coupures, chantiers CI) | Illustrations lifestyle ou stock photos génériques |
| Données temps réel apparentes (badge "Live") | Fausse fraîcheur (données statiques labellisées "live") |
