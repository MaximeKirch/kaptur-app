# 🎯 Résumé de l'Implémentation - Système de Consentement

## 📅 Date : 8 mars 2026
## 🔄 Mise à jour : 28 mars 2026 - Intégration onboarding

## 🎬 Contexte

Apple a refusé la soumission de l'app Relevo (Guidelines 5.1.1 et 5.1.2) en raison de l'absence de consentement explicite pour l'envoi de données à des services IA tiers (OpenAI, Google Cloud).

## ✅ Solution Implémentée

**Approche hybride : AsyncStorage (cache local) + Base de données (backend)**

- AsyncStorage pour une réponse rapide et le fonctionnement offline
- Base de données pour la traçabilité légale (RGPD) et la synchro cross-device

---

## 📁 Fichiers Créés

### 1. `src/store/consentStore.ts`
**Rôle :** Store Zustand pour gérer le consentement

**Fonctionnalités :**
- `loadConsentStatus()` : Charge depuis AsyncStorage, puis fallback sur le backend
- `grantConsent()` : Sauvegarde le consentement (local + API)
- `revokeConsent()` : Révoque le consentement

**Statuts possibles :**
- `pending` : Pas encore de consentement donné
- `granted` : Consentement accordé
- `denied` : Consentement révoqué

---

### 2. `app/data-consent.tsx`
**Rôle :** Écran modal de consentement affiché AVANT le premier enregistrement

**Sections affichées :**
- ✅ **Données envoyées** : Audio, transcriptions
- ✅ **Services tiers** : OpenAI GPT-4, Google Cloud
- ✅ **Garanties** : HTTPS, RGPD, révocation possible
- ✅ **Disclaimer** : Sans consentement, impossible de créer des rapports

**Boutons :**
- "J'accepte et je continue" → Sauvegarde le consentement et retourne à l'écran principal
- "Refuser" → Retour sans sauvegarder (redemandera au prochain enregistrement)

---

### 3. `BACKEND_CONSENT_API.md`
**Rôle :** Documentation des endpoints à implémenter côté backend

**Endpoints spécifiés :**
- `GET /user/data-consent` : Récupère le consentement de l'utilisateur
- `POST /user/data-consent` : Enregistre/met à jour le consentement

**Schéma BDD :**
- Table `user_consents` avec colonnes : id, user_id, status, timestamp
- Contrainte UNIQUE sur user_id
- Migration SQL fournie (PostgreSQL)

---

### 4. `CONSENT_SYSTEM_README.md`
**Rôle :** Guide complet du système de consentement

**Contenu :**
- Architecture et flux utilisateur
- Comment tester le système
- Prochaines étapes (backend, conformité légale, App Store)
- Réponse suggérée à Apple
- FAQ

---

### 5. `TESTING_CHECKLIST.md`
**Rôle :** Checklist exhaustive de tests

**Types de tests :**
- Tests fonctionnels (acceptation, refus, révocation)
- Tests de sécurité (manipulation AsyncStorage, bypass)
- Tests backend (après implémentation)
- Tests multi-device (synchronisation)
- Tests UX/UI

---

### 6. `IMPLEMENTATION_SUMMARY.md` (ce fichier)
**Rôle :** Résumé de l'implémentation

---

## ✏️ Fichiers Modifiés

### 1. `app/(tabs)/index.tsx` (écran principal)

**Changements :**
- Import de `useConsentStore`
- Chargement du consentement au montage (`useEffect`)
- `handleStartRecording()` : Vérifie le consentement avant d'enregistrer
- `handleImportFile()` : Vérifie le consentement avant d'importer un fichier
- Redirection vers `/data-consent` si consentement manquant

**Sécurité :**
- ✅ Impossible d'enregistrer sans consentement
- ✅ Impossible d'importer un fichier sans consentement

---

### 2. `app/(tabs)/profile.tsx` (écran de profil)

**Changements :**
- Import de `useConsentStore`
- Chargement du consentement au montage
- Nouvelle section "Protection des données"
- Fonction `handleManageConsent()` pour gérer le consentement
- Fonction `getConsentStatusText()` pour afficher le statut

**UI ajoutée :**
- Section "Protection des données" avec :
  - "Consentement de traitement" (affiche "Accordé ✓" / "Révoqué" / "En attente")
  - Clic → Popup de révocation (si accordé) ou redirection vers `/data-consent` (si révoqué/en attente)

---

### 3. `src/hooks/useCreateJob.ts`

**Changements :**
- Import de `useConsentStore`
- **Double vérification de sécurité** : Vérifier le consentement au début de `mutationFn`
- Si `consentStatus !== "granted"` → Erreur `CONSENT_REQUIRED`
- Gestion de l'erreur dans `onError` avec alert appropriée

**Sécurité :**
- ✅ Même si quelqu'un appelle directement `createJob()`, le consentement est vérifié
- ✅ Protection contre les contournements frontend

---

## 🔐 Architecture de Sécurité

### Niveau 1 : UI (Blocage préventif)
- `handleStartRecording()` vérifie le consentement → Redirige vers `/data-consent`
- `handleImportFile()` vérifie le consentement → Redirige vers `/data-consent`

### Niveau 2 : Hook (Double vérification)
- `useCreateJob` vérifie le consentement → Erreur `CONSENT_REQUIRED`

### Niveau 3 : Backend (À implémenter)
- **OBLIGATOIRE** : Le backend doit vérifier le consentement en BDD avant TOUT traitement
- Rejeter les requêtes si `status !== "granted"` en BDD
- Ne JAMAIS se fier uniquement au frontend

**Important :** Le frontend peut être contourné. Le backend est la **source de vérité**.

---

## 🚀 Prochaines Étapes

### ⚠️ CRITIQUE (Bloquant pour Apple)

#### 1. Implémenter les endpoints backend
- [ ] Créer la table `user_consents` en BDD
- [ ] Implémenter `GET /user/data-consent`
- [ ] Implémenter `POST /user/data-consent`
- [ ] **CRUCIAL** : Vérifier le consentement dans `/process-voice` avant d'envoyer à OpenAI/Google

**Exemple de vérification backend (Node.js) :**
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

#### 2. Mettre à jour la politique de confidentialité

**URL :** https://getrelevo.com/privacy

**Sections à ajouter/modifier :**
- [ ] Mentionner explicitement OpenAI (GPT-4) et Google Cloud
- [ ] Expliquer quelles données sont envoyées (audio, transcriptions)
- [ ] Préciser la durée de conservation des données
- [ ] Mentionner le droit de révocation du consentement
- [ ] Ajouter les liens vers les politiques de confidentialité d'OpenAI et Google

**Exemple de texte :**
> "Pour générer vos rapports, nous utilisons des services d'intelligence artificielle tiers :
> - **OpenAI (GPT-4)** : Transcription et analyse de vos enregistrements audio
> - **Google Cloud Storage** : Stockage temporaire de vos fichiers audio (supprimés après traitement)
>
> Vos enregistrements audio et transcriptions sont envoyés à ces services pour traitement. Aucune donnée personnelle (email, nom) n'est partagée avec ces services.
>
> Vous devez donner votre consentement explicite avant toute création de rapport. Vous pouvez révoquer ce consentement à tout moment depuis votre profil."

#### 3. Tester le flux complet

**Tests à faire :**
- [ ] Premier lancement → Consentement demandé
- [ ] Acceptation → Enregistrement possible
- [ ] Révocation → Enregistrement bloqué
- [ ] Synchronisation BDD ↔ AsyncStorage
- [ ] Vérification backend (403 si pas de consentement)

**Voir :** `TESTING_CHECKLIST.md` pour la checklist complète

---

### 📝 NON-BLOQUANT (Mais recommandé)

#### 4. Améliorer la synchronisation cache/BDD

**Problème actuel :**
Si le consentement change en BDD (révocation depuis un autre device), le cache AsyncStorage peut être désynchronisé.

**Solution suggérée :**
Toujours récupérer la valeur du backend au chargement, même si AsyncStorage a une valeur. Utiliser AsyncStorage uniquement en fallback (offline).

**Modification dans `consentStore.ts` :**
```typescript
loadConsentStatus: async () => {
  try {
    set({ isLoading: true });

    // 1. Toujours essayer de récupérer depuis le backend (source de vérité)
    try {
      const response = await api.get("/user/data-consent");
      const { status, timestamp } = response.data;

      // Synchroniser AsyncStorage avec le backend
      await AsyncStorage.setItem(
        CONSENT_KEY,
        JSON.stringify({ status, timestamp })
      );
      set({ status, timestamp, isLoading: false });
      return;
    } catch (error) {
      console.log("Backend unavailable, using local cache");
    }

    // 2. Fallback : utiliser AsyncStorage si backend inaccessible
    const localConsent = await AsyncStorage.getItem(CONSENT_KEY);
    if (localConsent) {
      const parsed = JSON.parse(localConsent);
      set({ status: parsed.status, timestamp: parsed.timestamp, isLoading: false });
      return;
    }

    // 3. Aucun consentement trouvé
    set({ status: "pending", timestamp: null, isLoading: false });
  } catch (error) {
    console.error("Error loading consent:", error);
    set({ status: "pending", timestamp: null, isLoading: false });
  }
}
```

#### 5. Audit trail (historique des consentements)

**Optionnel mais recommandé pour la conformité RGPD :**
- Créer une table `user_consent_history` pour tracer tous les changements
- Enregistrer chaque changement de statut avec timestamp

**Schéma :**
```sql
CREATE TABLE user_consent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status consent_status NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. Analytics

**Métriques à surveiller :**
- Taux d'acceptation du consentement (combien d'utilisateurs acceptent vs refusent)
- Taux de révocation (combien révoquent après avoir accepté)
- Temps moyen avant acceptation
- Abandons lors de l'écran de consentement

**Implémentation :**
- Ajouter des events analytics dans `grantConsent()`, `revokeConsent()`, et sur l'écran `/data-consent`

---

## 📮 Réponse à Apple

Une fois tout implémenté et testé, répondre à Apple via App Store Connect :

**Template de réponse :**

```
Hello,

Thank you for your feedback regarding Guidelines 5.1.1 and 5.1.2.

We have implemented a comprehensive data consent system that fully complies with
your requirements:

1. **Clear Data Disclosure**
   Before any recording or analysis, users are presented with a dedicated consent
   screen that clearly explains:
   - What data is sent (audio recordings and transcriptions)
   - Who receives the data (OpenAI for AI processing, Google Cloud for temporary storage)
   - How data is protected (HTTPS encryption, GDPR compliance, deletion after processing)

2. **Explicit User Permission**
   Users must explicitly tap "I accept and continue" before creating any report.
   The app blocks all recording and import functionality until consent is granted.

3. **Easy Revocation**
   Users can revoke their consent at any time from the Profile → Data Protection section.
   Upon revocation, all processing capabilities are immediately disabled.

4. **Updated Privacy Policy**
   Our privacy policy (https://getrelevo.com/privacy) has been updated to include:
   - Complete list of third-party services (OpenAI GPT-4, Google Cloud Storage)
   - Data collection practices and retention policies
   - User rights under GDPR
   - Consent management and revocation process

The consent system uses a hybrid approach (local cache + database) to ensure legal
traceability while maintaining offline functionality.

Screenshots of the consent screen are attached for your review.

We believe this implementation fully addresses your concerns and meets Apple's
high standards for user privacy and data protection.

Please let us know if you need any additional information.

Best regards,
Relevo Team
```

**Documents à joindre :**
- [ ] Captures d'écran de l'écran de consentement (`/data-consent`)
- [ ] Capture d'écran de la section "Protection des données" dans le profil
- [ ] Lien vers la politique de confidentialité mise à jour

---

## 🎉 Résumé

### ✅ Ce qui est fait (Frontend)
- Store de consentement (`consentStore.ts`)
- Écran de consentement (`/data-consent`)
- Vérification avant enregistrement et import
- Double vérification de sécurité dans `useCreateJob`
- Section profil pour gérer le consentement
- Documentation complète (API, README, Tests)

### ⚠️ Ce qui reste à faire (Backend + Conformité)
- [ ] Implémenter les endpoints API (`GET` et `POST /user/data-consent`)
- [ ] Créer la table BDD `user_consents`
- [ ] Vérifier le consentement dans `/process-voice` avant d'envoyer à OpenAI/Google
- [ ] Mettre à jour la politique de confidentialité
- [ ] Tester le flux complet (voir `TESTING_CHECKLIST.md`)
- [ ] Soumettre à nouveau l'app avec réponse à Apple

---

## 📞 Besoin d'aide ?

Si vous avez des questions ou rencontrez des problèmes :
1. Consultez `CONSENT_SYSTEM_README.md` pour le guide complet
2. Consultez `TESTING_CHECKLIST.md` pour les tests
3. Consultez `BACKEND_CONSENT_API.md` pour l'implémentation backend

**Bonne chance pour la soumission ! 🚀**
