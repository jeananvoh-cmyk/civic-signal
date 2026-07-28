# SIGNA·CI — Design Tokens Reference

Source : `src/index.css` — valeurs canoniques.
Notation : HSL sans `hsl()` (ex: `207 85% 36%` = `hsl(207deg 85% 36%)`).

---

## Surfaces

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `35 18% 96%` | `222 16% 14%` | Fond de page — ivoire subtil |
| `--foreground` | `220 18% 9%` | `210 20% 94%` | Texte principal |
| `--card` | `0 0% 100%` | `222 14% 20%` | Surface carte |
| `--card-foreground` | `220 18% 9%` | `210 20% 94%` | Texte sur carte |
| `--popover` | `0 0% 100%` | `222 14% 20%` | Dropdown, tooltip |
| `--popover-foreground` | `220 18% 9%` | `210 20% 94%` | Texte sur popover |
| `--muted` | `35 12% 92%` | `222 12% 22%` | Surface atténuée |
| `--muted-foreground` | `213 15% 45%` | `210 10% 62%` | Texte secondaire |

---

## Couleurs sémantiques

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | `207 85% 36%` | `207 82% 62%` | CTA principal, bleu institutionnel |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | Texte sur primary |
| `--secondary` | `213 27% 92%` | `222 12% 26%` | Bouton secondaire, surface |
| `--secondary-foreground` | `213 27% 30%` | `210 15% 86%` | Texte sur secondary |
| `--accent` | `29 70% 93%` | `29 45% 22%` | Terracotta très clair |
| `--accent-foreground` | `29 90% 28%` | `29 65% 75%` | Texte sur accent |
| `--accent-mid` | `29 65% 55%` | `29 60% 48%` | Terracotta actionnable (badges secondaires) |
| `--destructive` | `0 72% 51%` | `0 65% 62%` | Danger, suppression |
| `--destructive-foreground` | `0 0% 100%` | `0 0% 100%` | Texte sur destructive |

---

## Tokens domaine

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--water` | `193 78% 33%` | `193 70% 52%` | Eau / SODECI |
| `--water-foreground` | `0 0% 100%` | — | Texte sur water |
| `--water-light` | `193 60% 93%` | `193 55% 14%` | Surface eau (badge fond) |
| `--electricity` | `40 85% 45%` | `40 90% 58%` | Électricité / CIE |
| `--electricity-text` | `40 90% 22%` | `40 85% 80%` | Texte électricité sur fond clair |
| `--electricity-foreground` | `40 90% 10%` | — | Texte foncé sur badge électricité |
| `--electricity-light` | `40 70% 92%` | `40 65% 12%` | Surface électricité (badge fond) |
| `--infra` | `265 55% 52%` | `265 55% 70%` | Infrastructure / Mairie |
| `--infra-foreground` | `0 0% 100%` | `0 0% 100%` | Texte sur infra |
| `--infra-light` | `265 40% 93%` | `265 40% 18%` | Surface infra (badge fond) |

---

## Tokens état

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--success` | `150 60% 30%` | `150 52% 52%` | Résolution, validation |
| `--success-foreground` | `0 0% 100%` | `0 0% 100%` | Texte sur success |
| `--warning` | `30 90% 52%` | `32 90% 62%` | Attention, délai, GPS imprécis |
| `--warning-foreground` | `30 90% 10%` | `30 90% 10%` | Texte sur warning (foncé) |
| `--urgent` | `0 72% 51%` | `0 65% 62%` | Urgence — aligné sur --destructive |
| `--urgent-foreground` | `0 0% 100%` | `0 0% 100%` | Texte sur urgent |
| `--info` | `207 85% 36%` | `207 82% 62%` | **DEPRECATED** — alias de --primary |
| `--info-foreground` | `0 0% 100%` | `0 0% 100%` | **DEPRECATED** |

---

## Bordures & Inputs

| Token | Light | Dark |
|-------|-------|------|
| `--border` | `220 16% 88%` | `222 12% 28%` |
| `--input` | `220 16% 88%` | `222 12% 24%` |
| `--ring` | `207 85% 36%` | `207 82% 58%` |

---

## Géométrie

| Token | Valeur | Usage |
|-------|--------|-------|
| `--radius` | `0.625rem` | Arrondi des cartes, boutons, inputs |

Dérivés Tailwind :
- Boutons et cartes : `rounded-[--radius]` ou `rounded-lg` (≈ équivalent)
- Pills / badges : `rounded-full`
- Surfaces internes : `rounded-md`

---

## Typographie

| Famille | Classe | Usage |
|---------|--------|-------|
| Inter | défaut (`font-sans`) | Tout le texte courant, UI, labels |
| Inter (condensé) | `.font-display` | Titres display — même police, `letter-spacing: -0.03em`, `font-feature-settings: "cv11"` |

Tailles canoniques :
| Classe Tailwind | px | Usage |
|-----------------|----|-------|
| `text-xs` | 12px | Labels, badges, metadata |
| `text-sm` | 14px | Corps secondaire, descriptions |
| `text-base` | 16px | Corps principal |
| `text-lg` | 18px | Sous-titres de section |
| `text-xl` | 20px | Titres de page mobile |
| `text-2xl` | 24px | Titres principaux |
| `text-3xl`+ | 30px+ | Display / hero uniquement |

**Règle :** jamais `text-[10px]` ou `text-[11px]` sur du contenu lisible — minimum `text-xs`.

---

## Ombres

| Token | Usage |
|-------|-------|
| `--shadow-card` | Ombre standard des cartes |
| `--shadow-elevated` | Cartes surélevées, modals |
| `--shadow-glow-water` | Glow décoratif eau |
| `--shadow-glow-electricity` | Glow décoratif électricité |

Tailwind : `.shadow-card`, `.shadow-elevated`.
Ne pas utiliser de valeurs arbitraires `shadow-[...]` quand un token existe.

---

## Gradients

| Token | Usage |
|-------|-------|
| `--gradient-hero` | Hero sections (fond foncé bleu-nuit) |
| `--gradient-hero-radial` | Superposition décorative sur hero |
| `--gradient-water` | Éléments eau |
| `--gradient-electricity` | Éléments électricité |
| `--gradient-glass` | Surfaces glassmorphism |

Tailwind : `.gradient-hero`, `.gradient-water`, `.gradient-electricity`.

---

## Thèmes alternatifs

### theme-ivoire (optionnel)
Active via `<html class="theme-ivoire">` — orange soleil + fond ivoire.
- `--primary` : `20 75% 50%` (orange)
- `--background` : `36 25% 95%`
- Ne pas hardcoder les valeurs ivoire — toujours passer par les tokens

---

## Charts (Recharts)

| Token | Light | Dark |
|-------|-------|------|
| `--chart-1` | `207 85% 36%` (bleu) | `207 82% 64%` |
| `--chart-2` | `193 78% 33%` (cyan eau) | `193 70% 54%` |
| `--chart-3` | `150 60% 30%` (vert) | `150 55% 52%` |
| `--chart-4` | `40 95% 50%` (ambre) | `40 90% 60%` |
| `--chart-5` | `29 85% 45%` (terracotta) | `29 72% 58%` |

---

## Animations

| Propriété | Valeur canonique |
|-----------|-----------------|
| Durée micro-interaction | `150ms` |
| Durée transition page | `200ms` |
| Durée max acceptable | `250ms` |
| Easing standard | `ease` / `cubic-bezier(0.4, 0, 0.2, 1)` |
| Framer Motion duration | `0.2` |
| Framer Motion exit/enter | `opacity: 0, x: ±20` |

Guard obligatoire : `motion-reduce:animate-none motion-reduce:transition-none` ou `@media (prefers-reduced-motion: reduce)`.

---

## Icônes

- Source unique : **lucide-react**
- `strokeWidth` par défaut : `1.8`
- `strokeWidth` état actif : `2.2`
- Tailles : `h-4 w-4` (labels) · `h-5 w-5` (CTAs) · `h-6 w-6` (headers)
- Décoratif : `aria-hidden="true"` obligatoire

---

## Spacing

Grille 4px (Tailwind `spacing: 0.25rem`) :

| Classe | px | Usage typique |
|--------|----|--------------|
| `p-1` | 4px | Micro-padding badges |
| `p-2` | 8px | Padding icon buttons |
| `p-3` | 12px | Cards compactes |
| `p-4` | 16px | Padding interne standard |
| `p-5` | 20px | Cards principales |
| `p-6` | 24px | Sections |
| `gap-2` | 8px | Entre icône et label |
| `gap-3` | 12px | Entre éléments d'une ligne |
| `gap-4` | 16px | Entre cards |

Jamais de valeurs arbitraires évitables : `p-[12px]` → `p-3`.
