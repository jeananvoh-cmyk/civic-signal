# SIGNA·CI — Voice & Tone Guidelines

## Persona de marque

SIGNA·CI parle comme un **agent municipal compétent et bienveillant** — quelqu'un qui connaît Abidjan, qui comprend les galères du quotidien (coupure d'eau un vendredi soir, lampadaire cassé depuis des semaines) et qui prend l'utilisateur au sérieux.

Pas une startup. Pas un ministère froid. Un service de proximité.

---

## Registre vocal

| Dimension | Ce qu'on fait | Ce qu'on ne fait pas |
|-----------|--------------|---------------------|
| **Proximité** | Parler au citoyen directement ("Votre signalement", "Dans votre commune") | Tutoiement, argot nouchi, langage SMS |
| **Concision** | Labels courts, CTA en un verbe | Phrases longues, subordonnées, jargon technique |
| **Sérieux** | Ton factuel sur les incidents graves | Minimiser ("c'est juste une petite coupure") |
| **Chaleur** | Confirmer l'action de l'utilisateur, le remercier | Froid et clinique ("Opération effectuée") |
| **Localisation** | Communes d'Abidjan nommées, termes locaux CI | Termes génériques "votre ville", "dans la région" |

---

## CTAs — Verbes d'action

**Principes :**
- Toujours commencer par un **verbe à l'impératif ou à l'infinitif**
- Pas de point final sur les boutons
- Maximum 4 mots

| Contexte | Label correct | Labels à éviter |
|----------|--------------|-----------------|
| Soumettre un signalement | "Signaler" | "Envoyer", "Valider", "OK" |
| Confirmer résolution (eau/élec) | "C'est rétabli" | "Tout va bien !", "Résolu", "Confirmer" |
| Confirmer résolution (infra) | "C'est réparé" | "Problème résolu !", "Corriger" |
| Infirmer résolution (eau/élec) | "Toujours coupé" | "Toujours coupé chez moi", "Non" |
| Infirmer résolution (infra) | "Problème persiste" | "Non, le problème persiste", "Pas encore" |
| Supprimer | "Supprimer le signalement" | "Effacer", "Delete", "Retirer" |
| Partager | "Partager" | "Share", "Diffuser" |
| Localisation automatique | "Détecter ma position" | "GPS", "Localiser", "Ma position" |

---

## Toasts & Feedback

**Principe :** confirmer l'action faite, nommer ce qui s'est passé, 1 ligne.

| Événement | Toast correct | Toast à éviter |
|-----------|--------------|----------------|
| Signalement soumis | "Signalement envoyé" | "Succès !", "Opération réussie" |
| Corroboration ajoutée | "Corroboration ajoutée" | "Vote enregistré", "Merci" |
| Signalement résolu | "Signalement marqué comme résolu" | "Done !", "Mis à jour" |
| Erreur réseau | "Impossible d'envoyer. Vérifiez votre connexion." | "Error 500", "Une erreur s'est produite" |
| Hors ligne — action mise en queue | "Sauvegardé. Sera envoyé à la reconnexion." | "Hors ligne" seul |

---

## Messages d'état vide (empty states)

- Liste sans signalements : **"Tout va bien dans votre commune pour l'instant"** — suivi d'une phrase d'encouragement courte
- Pas d'emoji dans le titre, icône simple en `text-success`
- Jamais : "Aucun résultat", "Nothing here yet", "No data"

---

## Microcopy — Règles précises

### Nombres et unités
- `1 signalement` / `2 signalements` — toujours accordé
- `1 corroboration` / `3 corroborations`
- Jamais : "1 signalement(s)"

### Pluriels et accords
- `X signalement${X > 1 ? 's' : ''}` — accord systématique en JS
- `envoyé` / `envoyés` selon le nombre

### Dates et temps
- Relatif pour < 24h : "il y a 2h", "il y a 35 min"
- Date complète pour > 24h : "lundi 19 mai", jamais "19/05"
- Durée estimée : "Estimé : 2–4h" — tiret demi-cadratif, pas trait d'union

### Labels de sections
- Capitalisation : **Première lettre uniquement** sur les titres de section
- "Coupure de réseau" — pas "COUPURE DE RÉSEAU" ni "Coupure De Réseau"
- Headers des cards : phrase nominale courte, sans verbe

---

## Vocabulaire SIGNA·CI

| Terme préféré | Terme à éviter |
|--------------|---------------|
| Signalement | Rapport, ticket, incident |
| Corroboration | Vote, upvote, confirmation communautaire |
| Commune | Ville, arrondissement, zone |
| Coupure | Panne, interruption de service, outage |
| Rétabli | Résolu (pour l'eau/électricité) |
| Réparé | Résolu (pour l'infrastructure) |
| Quartier | Secteur, area, localisation |
| Citoyen(ne) | Usager, utilisateur, client |
| Score citoyen | Points, réputation, karma |
| CIE | EECI, opérateur électricité |
| SODECI | Opérateur eau |

---

## Erreurs et états d'échec

**Ton :** factuel, jamais catastrophiste, toujours actionnable.

Structure : [Ce qui s'est passé] + [Que faire].

- "Impossible de charger les signalements. Tirez vers le bas pour réessayer."
- "Votre session a expiré. Reconnectez-vous pour continuer."
- "Photo trop lourde. Choisissez une image de moins de 10 Mo."

**Jamais :**
- "Une erreur inattendue est survenue" sans suite
- Codes d'erreur techniques exposés à l'utilisateur
- "Désolé pour la gêne occasionnée"

---

## Onboarding et premiers pas

- Bref : 3 étapes max, 1 phrase par étape
- Verbes d'action à la 2e personne : "Signalez une coupure", "Confirmez avec vos voisins"
- Pas de marketing : pas "Rejoignez la communauté !", pas "Transformez votre ville !"
- Terminer sur une action concrète : "C'est parti — signalez votre premier incident"

---

## Notifications push

Templates canoniques définis dans `src/lib/content.ts` (objet `PUSH`).

| Événement | Titre (max 50 chars) | Corps (max 100 chars) |
|-----------|---------------------|-----------------------|
| Nouveau signalement eau | "Coupure d'eau dans votre quartier" | "Vos voisins signalent une coupure SODECI. Confirmez si vous êtes aussi concerné(e)." |
| Nouveau signalement élec | "Coupure d'électricité dans votre quartier" | "Vos voisins signalent une coupure CIE. Confirmez si vous êtes aussi concerné(e)." |
| Nouveau signalement infra | "Problème d'infrastructure signalé" | "Vos voisins signalent un problème. Soutenez leur demande de réparation." |
| Corroboration reçue | "Votre signalement est confirmé" | "X voisin(s) a/ont confirmé votre signalement." |
| Rétablissement eau | "L'eau est rétablie" | "La coupure que vous avez signalée est résolue." |
| Rétablissement élec | "L'électricité est rétablie" | "La coupure que vous avez signalée est résolue." |
| Réparation infra | "Problème résolu" | "La réparation que vous avez demandée a été effectuée." |

**Règles push :**
- Pas d'emoji dans les titres push (risque d'affichage dégradé sur Android 8)
- Corps : une phrase, terminée par un point
- Toujours une action suggérée dans le corps (confirmer, soutenir, rien à faire)

---

## Accessibilité du langage

- Niveau B1 (CECRL) — phrases simples, vocabulaire courant
- Pas de nominalisation lourde ("la mise en œuvre de la résolution" → "résoudre")
- Pas d'anglicismes évitables dans l'UI ("dashboard" → "tableau de bord", "feed" → "fil")
- Exception tolérée : termes techniques UI universels en contexte (PDF, GPS, Wi-Fi)
