
# Correction de la creation de comptes en double

## Probleme identifie

Quand un utilisateur tente de creer un compte avec un email deja utilise, Supabase ne renvoie **pas d'erreur** (par securite, pour eviter l'enumeration d'emails). Il retourne un objet utilisateur "fantome" sans session. L'application affiche alors "Compte cree !" alors que rien ne s'est passe.

De meme, le champ `phone` dans la table `profiles` n'a pas de contrainte d'unicite, ce qui pourrait permettre des doublons.

## Plan de correction

### 1. Detection des inscriptions en double cote frontend

Dans `AuthPage.tsx`, apres l'appel `signUp`, verifier si l'utilisateur retourne est un "faux" utilisateur (indices : pas de session, et `identities` vide ou `created_at` ancien). Quand c'est le cas, afficher un message convivial au lieu du faux succes.

Detection :
- Si `result.data.user?.identities?.length === 0` : c'est un doublon email
- Afficher un message du type : "Il semble qu'un compte existe deja avec cet identifiant. Essayez de vous connecter ou utilisez 'Mot de passe oublie'."

### 2. Ajout d'une contrainte unique sur le telephone dans `profiles`

Migration SQL pour ajouter un index unique partiel sur la colonne `phone` (uniquement pour les valeurs non vides) :

```sql
CREATE UNIQUE INDEX profiles_phone_unique 
ON public.profiles (phone) 
WHERE phone IS NOT NULL AND phone != '';
```

### 3. Mise a jour du gestionnaire d'erreurs

Dans `error-utils.ts`, ajouter la gestion de l'erreur de contrainte unique sur le telephone (code `23505` avec mention de `phone`) pour afficher : "Ce numero de telephone est deja associe a un compte."

### 4. Message utilisateur convivial

Le message affiche en cas de doublon sera chaleureux et utile :
- **Email en double** : "Bonne nouvelle, vous avez deja un compte ! Connectez-vous avec cet email ou cliquez sur 'Mot de passe oublie' si necessaire."
- **Telephone en double** : "Ce numero de telephone est deja utilise par un autre compte."

## Details techniques

Fichiers modifies :
- `src/pages/AuthPage.tsx` : ajout de la detection `identities.length === 0` dans `handleSignup`
- `src/lib/error-utils.ts` : ajout du cas specifique pour la contrainte unique sur le telephone
- Migration SQL : ajout de l'index unique partiel sur `profiles.phone`
