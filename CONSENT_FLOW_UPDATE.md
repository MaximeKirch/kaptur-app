# Mise à Jour du Flux de Consentement - Option 1B

**Date :** 9 avril 2026
**Objectif :** Conformité avec Apple Guidelines 5.1.1(i) et 5.1.2(i)

---

## ✅ Changements Implémentés

### 1. Intégration du consentement dans l'onboarding

**Avant :**
```
Login → Onboarding (4 slides) → (Modal de consentement optionnelle) → App
                                → (Refuser) → App avec vérifications
```

**Après :**
```
Login → Onboarding (4 slides) → Écran de consentement (obligatoire)
                                → (Accepter) → App complète ✅
                                → (Refuser) → Écran d'explication
                                            → (Accepter finalement) → App complète ✅
                                            → (Continuer sans) → App avec empty state ⚠️
```

### 2. Fichiers Modifiés

#### `app/onboarding.tsx`
- ✅ Ne marque plus l'onboarding comme complété immédiatement
- ✅ Redirige TOUJOURS vers `/data-consent` après les 4 slides (sauf si déjà granted)
- ✅ Le consentement devient une étape obligatoire du processus d'onboarding

#### `app/data-consent.tsx`
- ✅ Supprimé le bouton de fermeture (croix)
- ✅ Bouton "Refuser" redirige vers `/consent-required` au lieu de `/(tabs)`
- ✅ Ajout d'un lien cliquable vers la privacy policy
- ✅ Marque l'onboarding comme complété lors de l'acceptation
- ✅ Présentation changée de "modal" à "fullscreen"

#### `app/consent-required.tsx` (NOUVEAU)
- ✅ Écran d'explication montré quand l'utilisateur refuse
- ✅ Explique clairement ce qui est possible/impossible sans consentement
- ✅ Deux boutons :
  - "J'accepte et je continue" → Accorde le consentement + accès complet
  - "Continuer sans cette fonction" → Marque comme refusé + accès limité
- ✅ Lien vers la privacy policy

#### `app/(tabs)/index.tsx`
- ✅ Import du nouveau composant `ConsentRequiredView`
- ✅ Affiche l'empty state si `consentStatus !== "granted"`
- ✅ Conserve les vérifications de sécurité existantes

#### `src/components/recorder/ConsentRequiredView.tsx` (NOUVEAU)
- ✅ Composant d'empty state pour l'écran d'enregistrement
- ✅ Icône de micro barrée
- ✅ Message explicatif clair
- ✅ Bouton "Donner mon consentement" → Ouvre `/data-consent`
- ✅ Lien "En savoir plus" → Ouvre `/consent-required`

#### `app/_layout.tsx`
- ✅ Ajout de la route `consent-required`
- ✅ Suppression de `presentation: "modal"` pour `data-consent`

---

## 🎯 Nouveau Flux Utilisateur

### Scénario 1 : Nouvel utilisateur qui accepte (flux nominal)

1. **Login/Register** ✅
2. **Onboarding** : 4 slides explicatives ✅
3. **Écran de consentement** :
   - Explication détaillée des services tiers
   - Données envoyées clairement listées
   - Lien vers privacy policy
4. **Clic sur "J'accepte et je continue"** ✅
5. **Accès complet à l'app** ✅

### Scénario 2 : Utilisateur qui refuse initialement

1. **Login/Register** ✅
2. **Onboarding** : 4 slides ✅
3. **Écran de consentement** ✅
4. **Clic sur "Refuser"** ⚠️
5. **Écran d'explication** (`/consent-required`) :
   - ✅ Ce qu'il peut faire : consulter anciens rapports, gérer compte
   - ❌ Ce qu'il ne peut pas faire : créer nouveaux rapports
6. **Deux choix :**
   - **Option A :** "J'accepte finalement" → Accès complet ✅
   - **Option B :** "Continuer sans" → Accès limité ⚠️

### Scénario 3 : Utilisateur avec accès limité

1. **Accès à l'app** avec `consentStatus: "denied"`
2. **Écran principal** : Affiche `ConsentRequiredView` (empty state)
   - Icône de micro barrée
   - Message : "Enregistrement désactivé"
   - Bouton "Donner mon consentement"
3. **Options :**
   - Cliquer sur "Donner mon consentement" → Ouvre `/data-consent`
   - Cliquer sur "En savoir plus" → Ouvre `/consent-required`
4. **Après acceptation** → Accès complet immédiat ✅

### Scénario 4 : Révocation du consentement

1. **Profil** → Section "Protection des données"
2. **Clic sur "Consentement de traitement"**
3. **Popup de révocation**
4. **Confirmer** → `consentStatus: "denied"`
5. **Écran principal** → Affiche `ConsentRequiredView`
6. **Peut ré-accepter à tout moment**

---

## 🔒 Points de Sécurité

### ✅ Multi-couches de vérification

1. **UI (Niveau 1)** : Empty state si pas de consentement
2. **Handlers (Niveau 2)** : Vérification dans `handleStartRecording()` et `handleImportFile()`
3. **Hook (Niveau 3)** : Double vérification dans `useCreateJob`
4. **Backend (Niveau 4)** : ⚠️ À IMPLÉMENTER - Vérification serveur OBLIGATOIRE

### ⚠️ Backend CRITIQUE

Le backend DOIT vérifier le consentement avant TOUT traitement :

```javascript
app.post('/process-voice', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  // VÉRIFICATION DU CONSENTEMENT
  const consent = await db.query(
    'SELECT status FROM user_consents WHERE user_id = $1',
    [userId]
  );

  if (!consent.rows[0] || consent.rows[0].status !== 'granted') {
    return res.status(403).json({
      error: 'Data consent required',
      code: 'CONSENT_REQUIRED'
    });
  }

  // OK, on peut traiter l'audio
  // ... envoi à OpenAI/Google ...
});
```

---

## 📝 Checklist Avant Soumission à Apple

### Code ✅
- [x] Consentement intégré dans l'onboarding (étape obligatoire)
- [x] Écran d'explication si refus
- [x] Empty state sur l'écran d'enregistrement
- [x] Lien vers privacy policy (cliquable)
- [x] Impossible de fermer l'écran de consentement sans réponse
- [x] Services tiers clairement identifiés (OpenAI Whisper, Google Gemini, AWS S3)
- [x] Données envoyées explicitement listées

### Backend ⚠️
- [ ] Implémenter `GET /user/data-consent`
- [ ] Implémenter `POST /user/data-consent`
- [ ] Créer la table `user_consents` en BDD
- [ ] **CRITIQUE** : Vérifier le consentement dans `/process-voice` AVANT envoi à OpenAI/Google
- [ ] Tester les endpoints avec Postman

### Privacy Policy ⚠️
- [ ] Mettre à jour https://getrelevo.com/privacy
- [ ] Mentionner explicitement OpenAI Whisper, Google Gemini, AWS S3
- [ ] Expliquer quelles données sont envoyées (audio, transcriptions)
- [ ] Préciser la durée de conservation (suppression après traitement)
- [ ] Mentionner le droit de révocation
- [ ] Ajouter les liens vers les privacy policies d'OpenAI et Google

### Tests ✅
- [ ] Tester le flux complet : Onboarding → Consentement → Acceptation
- [ ] Tester le refus → Écran d'explication → Acceptation finale
- [ ] Tester le refus → Continuer sans → Empty state affiché
- [ ] Tester la révocation depuis le profil
- [ ] Tester que l'enregistrement est bien bloqué sans consentement
- [ ] Tester le lien vers la privacy policy (ouvre Safari)
- [ ] Tester sur un appareil physique (pas seulement simulateur)

### App Store Connect ⚠️
- [ ] Préparer 3 screenshots :
  1. Écran de consentement avec services tiers listés
  2. Écran d'explication (consent-required)
  3. Empty state sur l'écran d'enregistrement
- [ ] Incrémenter le buildNumber dans app.json (actuellement "1" → "2")
- [ ] Créer un nouveau build : `eas build --platform ios --profile production`
- [ ] Soumettre avec réponse à Apple (voir template ci-dessous)

---

## 📮 Template de Réponse à Apple

```
Hello Apple Review Team,

Thank you for your feedback regarding Guidelines 5.1.1(i) and 5.1.2(i).

We have implemented comprehensive improvements to ensure full compliance:

## ✅ Data Consent Integrated into Onboarding

The data consent screen is now a MANDATORY step of the onboarding process. Users
cannot access the app's recording features without seeing this screen first.

**Flow:**
1. User completes 4 onboarding slides
2. Immediately presented with a full-screen consent form (cannot be skipped)
3. Must explicitly choose to "Accept" or "Decline"

## ✅ Clear Third-Party Service Disclosure

The consent screen explicitly identifies all third-party AI services:

• **OpenAI Whisper**: Audio transcription (converts voice to text)
• **Google Gemini**: Text formatting and report structuring
• **AWS S3**: Temporary storage (deleted after processing)

## ✅ Data Collection Clearly Explained

Before any consent decision, users see:
• What data is sent: Audio recordings and text transcriptions
• Who receives it: OpenAI, Google, Amazon Web Services
• How it's protected: HTTPS encryption, GDPR compliance
• Retention policy: Audio deleted immediately after processing

## ✅ User Choice and Control

If user declines consent:
• Shown an explanation screen detailing what features are available/unavailable
• Can access profile, view old reports, manage account
• Cannot create new reports (clear empty state shown on recording screen)
• Can grant consent later at any time from profile or recording screen

If user accepts consent:
• Full access to all features immediately
• Can revoke consent anytime from Profile → Data Protection

## ✅ Privacy Policy

Our privacy policy (https://getrelevo.com/privacy) includes:
• Complete list of third-party services and their purposes
• Data collection, usage, and retention policies
• User rights under GDPR
• Consent management instructions

The policy is accessible via a clickable link on both the consent screen and
explanation screen.

## ✅ Technical Safeguards

• Frontend: UI blocks recording/import without consent
• Frontend: Secondary verification in submission hooks
• Backend: Server-side consent validation before processing (403 error if denied)
• Multi-layer security ensures no data sent without explicit permission

We believe this implementation fully addresses your concerns and meets Apple's
privacy standards. The consent is now clearly visible, upfront, and mandatory
before any data processing occurs.

Screenshots attached show:
1. The mandatory consent screen during onboarding
2. The explanation screen when consent is declined
3. The empty state on recording screen without consent

Please let us know if you need any additional information.

Best regards,
Maxime Kirch
Relevo Development Team
```

---

## 🚀 Commandes de Déploiement

### 1. Tester localement
```bash
# Simulateur iOS
npx expo start --ios

# Tester le flux :
# 1. Effacer l'app du simulateur
# 2. Relancer
# 3. Login → Onboarding → Consentement
```

### 2. Créer un nouveau build
```bash
# Incrémenter buildNumber dans app.json (1 → 2)
# Puis :
eas build --platform ios --profile production
```

### 3. Tester le build sur TestFlight
```bash
# Uploader vers App Store Connect (automatique après build)
# Tester sur appareil physique via TestFlight
```

### 4. Soumettre à Apple
```bash
# Via App Store Connect :
# 1. Ajouter les 3 screenshots dans "Review Information"
# 2. Copier-coller la réponse dans "Reply to Reviewer"
# 3. Soumettre pour review
```

---

## 📊 Différences Clés avec l'Ancienne Version

| Aspect | Avant ❌ | Après ✅ |
|--------|---------|----------|
| **Timing** | Modal après onboarding (optionnelle) | Étape obligatoire de l'onboarding |
| **Fermeture** | Bouton de fermeture (croix) | Impossible de fermer sans réponse |
| **Refus** | Accès à l'app quand même | Écran d'explication → Choix clair |
| **Empty state** | Vérification + redirection | Empty state permanent si refus |
| **Privacy policy** | Texte non cliquable | Lien cliquable vers le site |
| **Présentation** | Modal (dismissable) | Fullscreen (obligatoire) |
| **Services tiers** | Listés | Listés + expliqués + policy link |

---

## ⚠️ Points d'Attention

1. **Backend OBLIGATOIRE** : Sans les endpoints API, le consentement ne sera pas persisté correctement
2. **Privacy Policy** : DOIT être mise à jour avant soumission
3. **Tests physiques** : Tester sur un vrai iPhone, pas seulement simulateur
4. **Screenshots** : Prendre des screenshots haute résolution (iPhone 15 Pro Max recommandé)

---

## 🎉 Résultat Attendu

Avec ces changements :
- ✅ Le consentement est **visible et upfront** (affiché AVANT toute utilisation)
- ✅ Les services tiers sont **clairement identifiés**
- ✅ Les données envoyées sont **explicitement listées**
- ✅ L'utilisateur a un **choix clair** (accepter ou refuser)
- ✅ Les conséquences du refus sont **transparentes**
- ✅ La privacy policy est **facilement accessible**

**Apple devrait approuver cette version** car elle respecte pleinement les Guidelines 5.1.1(i) et 5.1.2(i). 🚀
