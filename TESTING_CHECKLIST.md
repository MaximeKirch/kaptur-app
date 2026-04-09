# Checklist de Tests - Système de Consentement

## ✅ Tests Fonctionnels

### 1. Premier lancement (sans consentement)

**Prérequis :** Réinitialiser AsyncStorage
```typescript
// Temporairement dans app/(tabs)/index.tsx (à supprimer après test)
import AsyncStorage from '@react-native-async-storage/async-storage';
useEffect(() => {
  AsyncStorage.removeItem('relevo_data_consent');
}, []);
```

**Scénario :**
- [ ] L'app démarre
- [ ] Aller sur l'onglet Enregistrement
- [ ] Cliquer sur le bouton "Enregistrer"
- [ ] ✅ **Attendu :** L'écran de consentement (`/data-consent`) s'affiche
- [ ] ✅ **Attendu :** Le texte explique clairement OpenAI et Google Cloud
- [ ] ✅ **Attendu :** Les sections "Données envoyées", "Services tiers", "Garanties" sont visibles

### 2. Acceptation du consentement

**Scénario :**
- [ ] Sur l'écran de consentement, cliquer sur "J'accepte et je continue"
- [ ] ✅ **Attendu :** Retour à l'écran d'enregistrement
- [ ] ✅ **Attendu :** Le bouton "Enregistrer" lance maintenant l'enregistrement (pas de redirection)
- [ ] ✅ **Attendu :** En console : aucun message d'erreur de consentement
- [ ] Vérifier AsyncStorage :
  ```javascript
  AsyncStorage.getItem('relevo_data_consent')
  // Doit retourner: {"status":"granted","timestamp":"..."}
  ```

### 3. Refus du consentement

**Prérequis :** Réinitialiser AsyncStorage

**Scénario :**
- [ ] Cliquer sur "Enregistrer"
- [ ] L'écran de consentement s'affiche
- [ ] Cliquer sur "Refuser" ou sur le X en haut
- [ ] ✅ **Attendu :** Retour à l'écran d'enregistrement
- [ ] Cliquer à nouveau sur "Enregistrer"
- [ ] ✅ **Attendu :** L'écran de consentement s'affiche à nouveau (pas de consentement stocké)

### 4. Profil - Visualisation du consentement

**Prérequis :** Avoir accordé le consentement

**Scénario :**
- [ ] Aller dans l'onglet "Profil"
- [ ] Trouver la section "Protection des données"
- [ ] ✅ **Attendu :** Une ligne "Consentement de traitement"
- [ ] ✅ **Attendu :** Valeur affichée : "Accordé ✓"
- [ ] Cliquer dessus
- [ ] ✅ **Attendu :** Popup de confirmation de révocation

### 5. Révocation du consentement

**Prérequis :** Avoir accordé le consentement

**Scénario :**
- [ ] Profil → Protection des données → Consentement de traitement
- [ ] Cliquer sur "Révoquer"
- [ ] ✅ **Attendu :** Popup "Révoquer le consentement"
- [ ] Confirmer la révocation
- [ ] ✅ **Attendu :** Message "Consentement révoqué"
- [ ] Retourner à l'onglet Enregistrement
- [ ] Cliquer sur "Enregistrer"
- [ ] ✅ **Attendu :** L'écran de consentement s'affiche à nouveau
- [ ] Vérifier AsyncStorage :
  ```javascript
  AsyncStorage.getItem('relevo_data_consent')
  // Doit retourner: {"status":"denied","timestamp":"..."}
  ```

### 6. Import de fichier audio (sans consentement)

**Prérequis :** Révoquer ou ne pas avoir de consentement

**Scénario :**
- [ ] Cliquer sur "Importer un fichier"
- [ ] Sélectionner un fichier audio
- [ ] ✅ **Attendu :** Le fichier est chargé (ReviewView)
- [ ] Cliquer sur "Analyser"
- [ ] ✅ **Attendu :** ???? (À définir - devrait-on aussi bloquer ici ?)

**Note :** Actuellement, le consentement n'est vérifié que pour `startRecording`, pas pour `importFile`. Il faudrait peut-être aussi vérifier avant `handleAnalyze` dans tous les cas.

### 7. Double vérification de sécurité (useCreateJob)

**Scénario :**
- [ ] Révoquer le consentement
- [ ] Essayer de créer un job (normalement impossible via l'UI)
- [ ] Si on appelle directement `createJob` via la console :
  ```javascript
  // Dans la console du navigateur/debugger
  const { mutate } = useCreateJob();
  mutate(formData);
  ```
- [ ] ✅ **Attendu :** Erreur "CONSENT_REQUIRED" interceptée
- [ ] ✅ **Attendu :** Alert "Consentement requis" affiché

---

## 🔒 Tests de Sécurité

### 8. Manipulation d'AsyncStorage (attaque locale)

**Scénario :**
- [ ] Manuellement modifier AsyncStorage pour mettre `status: "granted"` sans appel API
  ```javascript
  AsyncStorage.setItem('relevo_data_consent',
    JSON.stringify({status: "granted", timestamp: new Date().toISOString()})
  );
  ```
- [ ] Essayer d'enregistrer et d'analyser
- [ ] ✅ **Attendu :** L'enregistrement fonctionne localement
- [ ] ⚠️ **Important :** Le backend DOIT vérifier le consentement côté serveur avant de traiter

### 9. Bypass via import direct de l'API

**Scénario :**
- [ ] Essayer d'appeler directement `api.post('/process-voice', ...)` sans passer par `useCreateJob`
- [ ] ✅ **Attendu :** Le backend devrait rejeter la requête si le consentement n'est pas en BDD
- [ ] ⚠️ **À implémenter côté backend**

---

## 🌐 Tests Backend (après implémentation)

### 10. GET /user/data-consent (sans consentement)

**Requête :**
```bash
curl -X GET https://api.relevo.com/user/data-consent \
  -H "Authorization: Bearer <token>"
```

**Réponse attendue :**
```json
{
  "status": "pending",
  "timestamp": null
}
```

### 11. POST /user/data-consent (création)

**Requête :**
```bash
curl -X POST https://api.relevo.com/user/data-consent \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "granted",
    "timestamp": "2026-03-08T10:30:00.000Z"
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "status": "granted",
  "timestamp": "2026-03-08T10:30:00.000Z"
}
```

### 12. GET /user/data-consent (après création)

**Réponse attendue :**
```json
{
  "status": "granted",
  "timestamp": "2026-03-08T10:30:00.000Z"
}
```

### 13. Vérification du consentement avant traitement

**Scénario :**
- [ ] Révoquer le consentement en BDD
- [ ] Essayer d'envoyer un audio via POST /process-voice
- [ ] ✅ **Attendu :** Erreur 403 "Consent required"
- [ ] ✅ **Attendu :** Aucun appel à OpenAI/Google n'est fait

---

## 📱 Tests Multi-Device (après backend)

### 14. Synchronisation cross-device

**Scénario :**
- [ ] Device A : Accepter le consentement
- [ ] Device A : Vérifier que le consentement est en BDD
- [ ] Device B : Se connecter avec le même compte
- [ ] Device B : Vérifier que `loadConsentStatus()` charge "granted" depuis le backend
- [ ] ✅ **Attendu :** Pas besoin de redemander le consentement

### 15. Conflit AsyncStorage / BDD

**Scénario :**
- [ ] Device A : Consentement "granted" en local et en BDD
- [ ] Backend : Modifier manuellement le consentement en "denied"
- [ ] Device A : Redémarrer l'app
- [ ] ✅ **Attendu :** Le consentement local (AsyncStorage) affiche "granted" temporairement
- [ ] ✅ **Attendu :** Une fois le backend interrogé, il devrait se synchroniser sur "denied"
- [ ] ⚠️ **Problème potentiel :** Le code actuel ne met à jour AsyncStorage QUE si aucun cache local existe

**Fix suggéré dans `consentStore.ts` :**
```typescript
// Toujours vérifier le backend pour synchroniser
try {
  const response = await api.get("/user/data-consent");
  const { status, timestamp } = response.data;

  // Mettre à jour AsyncStorage avec la valeur du serveur (source de vérité)
  await AsyncStorage.setItem(
    CONSENT_KEY,
    JSON.stringify({ status, timestamp })
  );
  set({ status, timestamp, isLoading: false });
} catch (error) {
  // Utiliser le cache local si le backend est inaccessible
  console.log("Using local cache, backend unavailable");
}
```

---

## 🎯 Tests UX/UI

### 16. Lisibilité du texte

- [ ] L'écran de consentement est-il clair et compréhensible ?
- [ ] Les services tiers (OpenAI, Google) sont-ils bien identifiés ?
- [ ] Les garanties (chiffrement, RGPD, révocation) sont-elles mentionnées ?
- [ ] Le disclaimer (⚠️) est-il visible ?

### 17. Parcours fluide

- [ ] Le bouton "Refuser" ne donne pas l'impression d'être pénalisant
- [ ] Le bouton "J'accepte" est bien visible (primaire)
- [ ] Le retour arrière fonctionne (X en haut à gauche)

---

## 📊 Tests de Performance

### 18. Temps de chargement

- [ ] `loadConsentStatus()` ne bloque pas l'UI
- [ ] Le spinner de chargement s'affiche si nécessaire
- [ ] En mode offline, le cache AsyncStorage répond instantanément

---

## ⚠️ Points d'attention détectés

### Import de fichier
**Problème :** Le consentement n'est vérifié que pour `startRecording`, pas pour `importFile`.

**Impact :** Un utilisateur pourrait importer un fichier et l'analyser sans avoir donné son consentement.

**Solution suggérée :** Ajouter la vérification avant l'import aussi.

```typescript
// Dans app/(tabs)/index.tsx
const handleImportFile = () => {
  if (consentStatus !== "granted") {
    router.push("/data-consent");
    return;
  }
  importFile();
};

// Puis dans le JSX :
<IdleView onRecord={handleStartRecording} onImport={handleImportFile} />
```

### Synchronisation cache/BDD
**Problème :** Si le consentement change en BDD (révocation depuis un autre device), le cache local peut être désynchronisé.

**Solution :** Toujours récupérer la valeur du backend au chargement, même si AsyncStorage a une valeur.

---

## ✅ Checklist finale avant soumission App Store

- [ ] Tous les tests ci-dessus sont ✅
- [ ] Le backend valide le consentement avant TOUT appel à OpenAI/Google
- [ ] La politique de confidentialité sur getrelevo.com est mise à jour
- [ ] Le texte de l'écran de consentement respecte les guidelines Apple
- [ ] Capture d'écran de l'écran de consentement prête pour la review
- [ ] Réponse à Apple rédigée (voir CONSENT_SYSTEM_README.md)
