# Politique de Sécurité & Divulgation Responsable — SIGNA·CI 🛡️

La sécurité des données citoyennes, la protection de la vie privée des résidents et l'intégrité de la plateforme SIGNA.ci sont nos priorités absolues.

---

## 📅 Versions Prises en Charge

Nous publions activement des correctifs de sécurité pour les versions suivantes :

| Composant | Version | Pris en charge |
| :--- | :--- | :---: |
| **Web & Capacitor** | `v1.x` (branche `main`) | ✅ Oui |
| **Flutter Mobile** | `v1.x` (branche `main`) | ✅ Oui |
| **Supabase Migrations & API** | `v1.x` | ✅ Oui |

---

## 🚨 Signaler une Vulnérabilité (Divulgation Responsable)

Si vous découvrez une faille de sécurité, une vulnérabilité dans le code ou une faiblesse dans les politiques de sécurité (Row Level Security Supabase, fuite potentielle de données personnelles) :

1. **Ne créez PAS d'Issue publique sur GitHub**.
2. Envoyez un rapport détaillé par courrier électronique à :
   📧 **`contact@signa.ci`** (ou via message direct à l'équipe principale de maintien).
3. **Contenu recommandé du rapport** :
   - Description claire de la vulnérabilité et de son impact potentiel.
   - Étapes de reproduction pas à pas (Proof of Concept / PoC).
   - Composants ou fichiers concernés.
   - Toute suggestion de correctif si vous en avez.

### Notre engagement de réponse
- **Accusé de réception** sous **48 heures**.
- **Évaluation et confirmation** de la sévérité sous **5 jours ouvrés**.
- **Déploiement d'un correctif de sécurité** prioritaire en production avant toute communication publique.
- Attribution et remerciement officiel dans les notes de version (sauf si vous préférez rester anonyme).

---

## 🔒 Principes de Sécurité & Protection de la Vie Privée

En tant que plateforme civique citoyenne en Côte d'Ivoire :
1. **Floutage GPS Public (~150 m)** : Toutes les coordonnées géographiques restituées par les API publiques et affichées sur les cartes interactives sont systématiquement bruitées/décalées pour empêcher l'identification de domiciles privés.
2. **Conformité Légale** : Le traitement des données est opéré dans le strict respect de la **Loi ivoirienne n° 2013-450** relative à la protection des données à caractère personnel.
3. **Zéro Commercialisation** : Les signalements et données d'infrastructures ne sont jamais vendus ni cédés à des tiers publicitaires.
