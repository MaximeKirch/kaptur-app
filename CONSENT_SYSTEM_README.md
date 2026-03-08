# Système de Consentement pour les Données

## 📋 Vue d'ensemble

Ce système répond aux exigences d'Apple (Guidelines 5.1.1 et 5.1.2) en demandant explicitement le consentement de l'utilisateur avant d'envoyer des données à des services IA tiers (OpenAI, Google Cloud).

## 🏗️ Architecture

### Approche Hybride : AsyncStorage + Base de Données

1. **AsyncStorage (cache local)** :
   - Stockage rapide pour éviter des appels API répétés
   - Permet de fonctionner offline
   - Clé : `relevo_data_consent`

2. **Base de données (backend)** :
   - Traçabilité légale (RGPD)
   - Synchronisation cross-device
   - Révocation centralisée
   - Audit trail avec timestamp

## 📁 Fichiers créés/modifiés

### ✨ Nouveaux fichiers

1. **`src/store/consentStore.ts`** - Store Zustand pour gérer le consentement
   - `loadConsentStatus()` : Charge depuis AsyncStorage puis backend
   - `grantConsent()` : Enregistre le consentement (local + BDD)
   - `revokeConsent()` : Révoque le consentement

2. **`app/data-consent.tsx`** - Écran modal de consentement
   - Explique quelles données sont envoyées
   - Identifie les services tiers (OpenAI, Google)
   - Boutons "Accepter" / "Refuser"

3. **`BACKEND_CONSENT_API.md`** - Documentation des endpoints à implémenter côté backend

### ✏️ Fichiers modifiés

1. **`app/(tabs)/index.tsx`** - Écran principal d'enregistrement
   - Import du `useConsentStore`
   - Vérification du consentement avant `startRecording()`
   - Redirection vers `/data-consent` si consentement manquant

2. **`app/(tabs)/profile.tsx`** - Écran de profil
   - Nouvelle section "Protection des données"
   - Affichage du statut du consentement
   - Possibilité de révoquer le consentement

## 🔄 Flux utilisateur

### Premier enregistrement (sans consentement)

```
1. Utilisateur appuie sur "Enregistrer" 🎙️
2. App détecte consentStatus === "pending"
3. → Redirection vers /data-consent
4. Utilisateur lit les informations
5. Utilisateur accepte
6. → Consentement sauvegardé (AsyncStorage + API backend)
7. → Retour à l'écran principal
8. Utilisateur peut maintenant enregistrer ✅
```

### Révocation du consentement

```
1. Utilisateur va dans Profil
2. Section "Protection des données"
3. Clique sur "Consentement de traitement"
4. Popup de confirmation
5. Consentement révoqué
6. → Impossible d'enregistrer jusqu'à nouveau consentement
```

## 🧪 Comment tester

### 1. Tester le premier lancement (consentement manquant)

```bash
# Effacer AsyncStorage pour simuler un premier lancement
# Dans le simulateur iOS : Réinitialiser le contenu et les réglages
# Ou ajouter temporairement dans le code:
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.removeItem('relevo_data_consent');
```

1. Lancer l'app
2. Cliquer sur "Enregistrer"
3. ✅ Devrait afficher l'écran de consentement
4. Accepter
5. ✅ Devrait permettre l'enregistrement

### 2. Tester la révocation

1. Aller dans Profil
2. Cliquer sur "Consentement de traitement"
3. ✅ Devrait afficher "Accordé ✓"
4. Cliquer dessus → Popup de révocation
5. Révoquer
6. Retour à l'écran d'accueil
7. Cliquer sur "Enregistrer"
8. ✅ Devrait redemander le consentement

### 3. Tester la synchronisation BDD (après implémentation backend)

1. Accepter le consentement sur Device A
2. Vérifier en BDD que le consentement est bien enregistré
3. Se connecter sur Device B avec le même compte
4. ✅ Le consentement devrait être chargé depuis le backend

## 🚀 Prochaines étapes

### Backend (priorité haute)

- [ ] Implémenter les endpoints `/user/data-consent` (GET et POST)
- [ ] Créer la migration SQL pour la table `user_consents`
- [ ] Tester avec Postman
- [ ] Vérifier que le consentement est validé AVANT d'envoyer des données à OpenAI

### App mobile

- [ ] Tester le flux complet sur iOS et Android
- [ ] Vérifier que le texte respecte les guidelines d'Apple
- [ ] S'assurer que la politique de confidentialité sur getrelevo.com mentionne OpenAI et Google

### Conformité légale

- [ ] Mettre à jour la politique de confidentialité
- [ ] Ajouter une section sur les services tiers utilisés (OpenAI GPT-4, Google Cloud)
- [ ] Expliquer la durée de conservation des données
- [ ] Mentionner le droit de révocation

### App Store

- [ ] Répondre à Apple en expliquant le système mis en place
- [ ] Indiquer clairement :
  - ✅ Quelles données sont envoyées (audio, transcriptions)
  - ✅ À qui (OpenAI, Google Cloud)
  - ✅ Consentement demandé AVANT l'envoi
  - ✅ Révocation possible à tout moment
  - ✅ Politique de confidentialité mise à jour

## 📝 Réponse suggérée à Apple

```
Hello,

Thank you for your feedback regarding Guidelines 5.1.1 and 5.1.2.

We have implemented a comprehensive data consent system in our app:

1. **Data Disclosure**: Before any recording, users see a detailed consent screen
   explaining what data is sent (audio recordings, transcriptions) and to whom
   (OpenAI for AI processing, Google Cloud for temporary storage).

2. **User Consent**: Users must explicitly accept before creating any report.
   The consent screen clearly states:
   - What data is sent
   - Third-party services used (OpenAI GPT-4, Google Cloud)
   - Data retention policy
   - GDPR compliance

3. **Revocation**: Users can revoke consent at any time from their profile settings.

4. **Privacy Policy**: Our privacy policy (https://getrelevo.com/privacy) has been
   updated to include all data collection practices and third-party services.

The consent is stored both locally and in our backend database for legal
traceability and GDPR compliance.

Best regards,
Relevo Team
```

## 🔒 Considérations de sécurité

1. **Validation côté serveur** : Ne jamais se fier uniquement au cache local
2. **Double vérification** : Vérifier le consentement AVANT d'appeler OpenAI/Google
3. **Audit trail** : Garder un historique des changements de consentement
4. **RGPD** : Le consentement doit être libre, éclairé et spécifique
5. **Suppression de compte** : Le consentement doit être supprimé avec le compte

## 📊 Métriques à surveiller

- Taux d'acceptation du consentement
- Taux de révocation
- Temps moyen avant acceptation
- Abandon lors de l'écran de consentement

## ❓ FAQ

**Q: Que se passe-t-il si l'utilisateur refuse le consentement ?**
R: Il peut toujours utiliser l'app mais ne pourra pas créer de rapports. Il peut accepter plus tard depuis le profil.

**Q: Le consentement est-il synchronisé entre appareils ?**
R: Oui, une fois que le backend est implémenté, le consentement est stocké en BDD et synchronisé.

**Q: Que se passe-t-il en mode offline ?**
R: Le consentement est vérifié depuis AsyncStorage (cache local). Si non trouvé, l'écran de consentement s'affiche.

**Q: Peut-on analyser un fichier importé sans consentement ?**
R: Non, le consentement est requis pour TOUTE analyse (enregistrement ou import) car les données sont envoyées à OpenAI.
