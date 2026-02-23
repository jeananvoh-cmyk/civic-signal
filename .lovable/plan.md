

## Mise a jour des boutons Header : "S'identifier" et "S'inscrire"

L'image de reference montre deux boutons cote a cote :
- **"S'identifier"** : bouton outline (bordure arrondie, fond blanc/transparent, texte sombre)
- **"S'inscrire"** : bouton plein bleu avec texte blanc, coins arrondis

### Modifications prevues

**Fichier : `src/components/Header.tsx`**

1. **Desktop** (section visible quand `!user`) :
   - Remplacer le bouton "Connexion" par un bouton outline arrondi avec le label **"S'identifier"** (sans icone, style `rounded-full border`)
   - Remplacer le bouton "Rejoindre" + badge pulsant par un bouton plein bleu arrondi avec le label **"S'inscrire"** (sans icone, style `rounded-full bg-blue-600 text-white`)
   - Supprimer le badge jaune pulsant (petit point anime) pour un rendu plus epure comme sur la capture

2. **Mobile** (menu hamburger) :
   - Remplacer "Connexion" par **"S'identifier"**
   - Remplacer "Rejoindre SignalEnergie" par **"S'inscrire"**
   - Adapter les styles pour correspondre au meme esprit visuel (outline vs plein)

### Details techniques

- Bouton "S'identifier" : `className="rounded-full border-2 border-blue-600 bg-transparent text-blue-600 hover:bg-blue-50 px-5 py-2 text-sm font-semibold"`
- Bouton "S'inscrire" : `className="rounded-full bg-blue-600 text-white hover:bg-blue-700 px-5 py-2 text-sm font-semibold"`
- Les icones `LogIn` et `Heart` seront retirees des boutons pour correspondre au design epure de la capture
- Les liens pointent toujours vers `/auth?tab=login` et `/auth?tab=signup`

