# [Nom du composant]

> **Statut :** `stable` | `beta` | `expérimental` | `déprécié`
> **Depuis :** v[X.Y.Z] — **Dernière mise à jour :** v[X.Y.Z]

Une phrase : ce que fait le composant et dans quel contexte il s'utilise.

---

## Quand l'utiliser

- [Cas d'usage principal]
- [Cas d'usage secondaire]

**Ne pas utiliser** quand :

- [Contre-indication 1 — avec alternative suggérée]
- [Contre-indication 2]

---

## Exemple minimal

```tsx
import { NomComposant } from "@/components/ui/nom-composant";

<NomComposant variant="default">Label</NomComposant>
```

---

## Anatomie

```
┌─────────────────────────────────────┐
│  [Icône]  [Label]        [Slot droit]│
└─────────────────────────────────────┘
   ^          ^                ^
   icon       children         trailing
```

| Zone | Obligatoire | Description |
|------|------------|-------------|
| `icon` | Non | Icône lucide-react, `h-4 w-4` |
| `children` | Oui | Label textuel |
| `trailing` | Non | Badge, flèche, action secondaire |

---

## Variants

| Variant | Usage | Aperçu classe |
|---------|-------|---------------|
| `default` | Action principale | `bg-primary text-primary-foreground` |
| `secondary` | Action secondaire | `bg-secondary text-secondary-foreground` |
| `destructive` | Action destructive | `bg-destructive text-destructive-foreground` |
| `ghost` | Action tertiaire | `hover:bg-muted` |
| `outline` | Neutre avec bordure | `border border-border` |

## Tailles

| Size | Hauteur | Usage |
|------|---------|-------|
| `sm` | 32px | Actions compactes dans des listes |
| `default` | 40px | CTA standard |
| `lg` | 48px | CTA principal de page |
| `icon` | 40px | Bouton icon-only |
| `icon-sm` | 32px | Action secondaire icon-only |

---

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `variant` | `'default' \| 'secondary' \| 'destructive' \| 'ghost' \| 'outline'` | `'default'` | Style visuel |
| `size` | `'sm' \| 'default' \| 'lg' \| 'icon' \| 'icon-sm'` | `'default'` | Taille |
| `asChild` | `boolean` | `false` | Délègue le rendu à l'enfant via Radix Slot |
| `disabled` | `boolean` | `false` | État désactivé |
| `loading` | `boolean` | `false` | Affiche un spinner, bloque l'interaction |

Hérite de toutes les props HTML natives de `<button>`.

---

## États

| État | Comportement visuel | Accessibilité |
|------|--------------------|-|
| Default | — | — |
| Hover | `bg-primary/90` | — |
| Focus | `ring-2 ring-ring ring-offset-2` | Focus-visible visible |
| Active | `scale(0.96)` 100ms | — |
| Disabled | `opacity-50 cursor-not-allowed` | `aria-disabled="true"` |
| Loading | Spinner + `opacity-80` | `aria-busy="true"` |

---

## Accessibilité

- Toujours un label textuel explicite ou un `aria-label` (boutons icon-only obligatoire)
- Icônes décoratives : `aria-hidden="true"`
- Ne pas désactiver via CSS uniquement — utiliser la prop `disabled`
- Touch target minimum : `44×44px` — la taille `icon-sm` (32px) nécessite un padding wrapper si utilisée sur mobile

```tsx
// Bouton icon-only — correct
<Button size="icon" aria-label="Fermer la fenêtre">
  <X className="h-4 w-4" aria-hidden="true" />
</Button>
```

---

## Contenu

- Label : verbe d'action à l'impératif, 1–4 mots, sans point final
- Pas de majuscules en titre (`ENVOYER` → `Envoyer`)
- Variantes destructives : être explicite ("Supprimer le signalement", pas "Supprimer")

---

## Tokens utilisés

| Propriété | Token |
|-----------|-------|
| Couleur fond primary | `--primary` |
| Couleur texte primary | `--primary-foreground` |
| Radius | `--radius` |
| Ring focus | `--ring` |
| Transition | `150ms ease` |

---

## Composants associés

- [IconButton] — wrapper pour boutons icon-only avec zone de tap 44px garantie
- [ButtonGroup] — groupe de boutons liés sémantiquement

---

## Changelog

| Version | Changement |
|---------|-----------|
| v1.0.0 | `icon-sm` : hauteur 32px → 32px (conformité touch target 44px via wrapper) |
| v0.9.0 | Ajout variant `ghost` |
