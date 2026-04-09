# 🔐 RevenueCat - Correction Sécurité

**Date :** 28 mars 2026

## ⚠️ Problème identifié

L'implémentation initiale de RevenueCat comportait une **faille de sécurité critique** :

```typescript
// ❌ ANCIEN CODE (DANGEREUX)
const purchaseResult = await Purchases.purchasePackage(pack);
await api.post("/payments/add-credits", {
  transactionId: purchaseResult.customerInfo.originalAppUserId,
  productId: pack.product.identifier,
});
```

**Pourquoi c'est dangereux ?**
- N'importe qui peut appeler `/payments/add-credits` avec un transactionId forgé
- Aucune vérification de la validité de la transaction côté backend
- Risque de fraude : ajout de crédits gratuits

---

## ✅ Solution implémentée

### Architecture sécurisée avec Webhooks

```
1. Frontend → RevenueCat.purchasePackage()
2. RevenueCat → Valide l'achat avec l'App Store/Google Play
3. RevenueCat → Envoie un webhook au backend (automatique, sécurisé)
4. Backend → Vérifie le webhook et met à jour les crédits en BDD
5. Frontend → Appelle GET /auth/me pour récupérer les crédits mis à jour
```

### Retry avec Exponential Backoff

Pour gérer la latence du webhook, on utilise un système de retry intelligent :

- **Essai 1** : après 1 seconde
- **Essai 2** : après 2 secondes (si échec)
- **Essai 3** : après 4 secondes (si échec)
- **Total** : ~7 secondes maximum

```typescript
const fetchUpdatedCredits = async (initialCredits: number, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay));

    const response = await api.get("/auth/me");
    const newCredits = response.data.credits;

    if (newCredits > initialCredits) {
      setCredits(newCredits);
      return true; // ✅ Crédits mis à jour
    }
  }

  return false; // ⏳ Webhook pas encore arrivé
};
```

---

## 📋 Changements effectués dans `useRevenueCat.ts`

### 1. Suppression de l'entitlement "premium"

```diff
- if (purchaseResult.customerInfo.entitlements.active["premium"]) {
-   Alert.alert("Succès", "Achat effectué avec succès !");
- }
```

**Raison :** L'app utilise un modèle "pay-as-you-go" (crédits), pas d'abonnement premium.

### 2. Suppression de l'appel `/payments/add-credits`

```diff
- await api.post("/payments/add-credits", {
-   transactionId: purchaseResult.customerInfo.originalAppUserId,
-   productId: pack.product.identifier,
- });
```

**Raison :** Faille de sécurité. Les crédits sont maintenant ajoutés via webhook RevenueCat.

### 3. Ajout du retry avec exponential backoff

```typescript
const creditsUpdated = await fetchUpdatedCredits(currentCredits);

if (creditsUpdated) {
  Alert.alert("Succès ! 🎉", "Vos crédits ont été ajoutés à votre compte.");
} else {
  Alert.alert(
    "Achat en cours de traitement",
    "Votre achat a été validé. Vos crédits seront ajoutés dans quelques instants."
  );
}
```

---

## 🛠️ Configuration Backend requise

### 1. Webhook RevenueCat

**URL du webhook :** `https://api.relevo.com/webhooks/revenuecat`

**Events à écouter :**
- `INITIAL_PURCHASE` : Premier achat
- `NON_RENEWING_PURCHASE` : Achat non-récurrent (crédits)
- `RENEWAL` : Renouvellement (si abonnements futurs)

### 2. Endpoint Backend

```typescript
// POST /webhooks/revenuecat
app.post('/webhooks/revenuecat', async (req, res) => {
  try {
    const event = req.body;

    // Vérifier la signature du webhook (sécurité)
    if (!verifyRevenueCatSignature(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Extraire les infos
    const userId = event.app_user_id; // ID utilisateur
    const productId = event.product_id; // ID du produit acheté
    const transactionId = event.transaction_id;

    // Mapper productId → crédits
    const creditsToAdd = getCreditsForProduct(productId);

    // Mettre à jour les crédits en BDD
    await db.query(
      'UPDATE users SET credits = credits + $1 WHERE id = $2',
      [creditsToAdd, userId]
    );

    console.log(`✅ Added ${creditsToAdd} credits to user ${userId}`);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### 3. Mapping produits → crédits

```typescript
const PRODUCT_CREDITS_MAP = {
  'relevo_credits_5': 5,
  'relevo_credits_10': 10,
  'relevo_credits_25': 25,
  'relevo_credits_50': 50,
};

function getCreditsForProduct(productId: string): number {
  return PRODUCT_CREDITS_MAP[productId] || 0;
}
```

---

## 🧪 Tests à effectuer

### Test 1 : Achat réussi avec webhook rapide

1. Acheter un package de crédits
2. ✅ Vérifier que l'alerte "Achat validé" s'affiche
3. ✅ Vérifier que les crédits sont mis à jour en ~1-2 secondes
4. ✅ Vérifier que l'alerte "Succès ! 🎉" s'affiche

### Test 2 : Webhook lent (latence réseau)

1. Simuler un délai backend (ajouter un sleep dans le webhook)
2. ✅ Vérifier que le retry fonctionne (3 tentatives)
3. ✅ Vérifier que les crédits sont récupérés au 2e ou 3e essai

### Test 3 : Webhook en erreur

1. Désactiver temporairement le webhook backend
2. ✅ Vérifier que l'alerte "Achat en cours de traitement" s'affiche
3. ✅ Vérifier que les crédits s'affichent après redémarrage de l'app

### Test 4 : Annulation utilisateur

1. Commencer un achat et annuler sur l'écran de paiement
2. ✅ Vérifier qu'aucune alerte d'erreur ne s'affiche
3. ✅ Vérifier que `isPurchasing` revient à `false`

---

## 📊 Logs à surveiller

### Frontend (console.log)

```
🛒 Starting purchase...
✅ Purchase completed: { productId: "relevo_credits_10", transactionId: "..." }
🔄 Fetching credits (attempt 1/3)...
💰 Credits: 5 → 15
✅ Credits updated successfully!
```

### Backend (webhook)

```
📥 Webhook received: INITIAL_PURCHASE
👤 User ID: 12345
🎁 Product ID: relevo_credits_10
➕ Adding 10 credits
✅ Added 10 credits to user 12345
```

---

## 🔒 Sécurité renforcée

### Avant (❌ Vulnérable)
- Frontend contrôle l'ajout de crédits
- Pas de vérification de la transaction
- Risque de fraude élevé

### Après (✅ Sécurisé)
- Webhook signé par RevenueCat (impossible à forger)
- Backend vérifie la signature
- Frontend en lecture seule (GET /auth/me)
- Aucun risque de fraude

---

## 📝 Checklist de déploiement

- [x] Code frontend mis à jour (`useRevenueCat.ts`)
- [ ] Webhook backend implémenté et testé
- [ ] Signature RevenueCat vérifiée dans le webhook
- [ ] Mapping produits → crédits configuré
- [ ] Tests manuels effectués (4 scénarios ci-dessus)
- [ ] Monitoring des webhooks configuré (logs, alertes)
- [ ] Documentation backend mise à jour

---

## 🚀 Prochaines étapes

1. **Implémenter le webhook backend** (priorité haute)
2. **Tester en environnement sandbox** (RevenueCat sandbox mode)
3. **Vérifier les logs** pendant quelques achats tests
4. **Déployer en production** une fois validé

---

**Note :** Cette correction est **critique** pour la sécurité de l'app. Ne PAS déployer en production sans le webhook backend implémenté.
