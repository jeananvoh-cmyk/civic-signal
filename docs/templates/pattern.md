# [Nom du pattern]

> **Statut :** `stable` | `beta` | `expérimental`
> **Catégorie :** Navigation | Formulaire | Feedback | Données | Onboarding

Une phrase : quel problème ce pattern résout et pour qui.

---

## Problème

Décrire le problème utilisateur concret, ancré dans le contexte SIGNA·CI.

> Exemple : L'utilisateur vient de soumettre un signalement depuis une zone avec connexion intermittente. Il ne sait pas si l'envoi a réussi.

---

## Contexte d'usage

- **Écrans concernés :** [ReportPage, VerificationPage…]
- **Déclencheur :** [Événement qui active ce pattern]
- **Utilisateur cible :** [Citoyen lambda / Modérateur / Admin]
- **Contraintes :** [Mobile first, hors ligne possible, Android entrée de gamme…]

---

## Solution

Description en prose du comportement attendu. Répondre à :
- Qu'est-ce qui s'affiche ?
- Quand s'affiche-t-il ?
- Comment l'utilisateur interagit-il ?
- Comment disparaît-il ?

---

## Comportement détaillé

| Étape | Déclencheur | Résultat visible | État suivant |
|-------|-------------|-----------------|-------------|
| 1 | [Action utilisateur] | [Feedback immédiat] | [Étape 2] |
| 2 | [Condition système] | [Changement d'état] | [Résolution] |
| 3 | [Confirmation] | [État final] | — |

---

## Exemples

### Correct

```tsx
// Ce qu'il faut faire
<OfflineBar queue={queue} onFlush={flush} />
```

> Pourquoi c'est correct : [Explication courte]

### Incorrect

```tsx
// Ce qu'il ne faut pas faire
toast.error("Erreur réseau");
// Silencieux — l'utilisateur ne sait pas que son signalement est en queue
```

> Pourquoi c'est problématique : [Explication courte]

---

## Accessibilité

- [ ] Annonce `aria-live="polite"` sur les changements d'état non urgents
- [ ] Annonce `role="alert"` sur les états d'erreur urgents
- [ ] Fermeture possible au clavier (Escape ou bouton focusable)
- [ ] Focus géré correctement à l'ouverture et à la fermeture

---

## Patterns associés

- [Pattern connexe 1] — lien vers le fichier de pattern
- [Pattern connexe 2]

---

## Anti-patterns

| À éviter | Raison | Alternative |
|----------|--------|-------------|
| Toast seul pour une erreur réseau | Disparaît avant que l'utilisateur lise | Bannière persistante avec action |
| Spinner infini sans timeout | Anxiété utilisateur, pas de sortie | Timeout 30s + message d'erreur actionnable |
