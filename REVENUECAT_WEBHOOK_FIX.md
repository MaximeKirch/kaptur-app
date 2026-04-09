# 🔧 Fix RevenueCat Webhook - User ID Anonyme

## 🔴 Problème

Le webhook RevenueCat envoie `app_user_id: "$RCAnonymousID:..."` au lieu de l'ID réel de l'utilisateur.

**Erreur Prisma :**
```
Record to update not found
```

**Cause :** RevenueCat utilise un ID anonyme car `Purchases.logIn(userId)` n'a pas été appelé au bon moment.

---

## ✅ Solution 1 : Corriger le webhookController.js

### Code corrigé avec gestion des achats anonymes

```javascript
exports.handleRevenueCatWebhook = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];

    // 1. Vérification sécurité
    if (authHeader !== REVENUECAT_SECRET) {
      console.warn("⚠️ Tentative d'accès non autorisée au webhook");
      return res.status(403).send("Forbidden");
    }

    const { event } = req.body;

    // 2. Filtrer les events non pertinents
    if (!event || event.type !== "NON_RENEWING_PURCHASE") {
      return res.status(200).send("Ignored event type");
    }

    // 3. Extraction des infos
    const appUserId = event.app_user_id;
    const productId = event.product_id;

    console.log(`💰 Achat reçu - User: ${appUserId} - Produit: ${productId}`);

    // 4. Détecter les achats anonymes
    if (appUserId.startsWith("$RCAnonymousID:")) {
      console.warn(`⚠️ Achat anonyme détecté: ${appUserId}`);
      console.warn("L'utilisateur n'était pas connecté lors de l'achat");

      // Option A : Ignorer l'achat anonyme
      return res.status(200).send("Anonymous purchase ignored");

      // Option B : Stocker dans une table temporaire pour traitement manuel
      // await prisma.pendingPurchase.create({
      //   data: {
      //     anonymousId: appUserId,
      //     productId,
      //     transactionId: event.transaction_id,
      //     createdAt: new Date(event.purchased_at_ms),
      //   }
      // });
      // return res.status(200).send("Anonymous purchase stored");
    }

    // 5. Déterminer le montant de crédits (FIX du bug includes)
    let creditsToAdd = 0;

    if (productId.includes("5_credits") || productId.includes("05_credits")) {
      creditsToAdd = 5;
    } else if (productId.includes("10_credits")) {
      creditsToAdd = 10;
    } else if (productId.includes("20_credits")) {
      creditsToAdd = 20;
    } else if (productId.includes("50_credits")) {
      creditsToAdd = 50;
    } else {
      console.warn(`⚠️ Produit non reconnu: ${productId}`);
      return res.status(200).send("Unknown product");
    }

    // 6. Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: appUserId },
      select: { id: true, credits: true }
    });

    if (!user) {
      console.error(`❌ Utilisateur non trouvé: ${appUserId}`);
      return res.status(404).send("User not found");
    }

    // 7. Mise à jour des crédits
    const updatedUser = await prisma.user.update({
      where: { id: appUserId },
      data: { credits: { increment: creditsToAdd } },
    });

    console.log(`✅ ${creditsToAdd} crédits ajoutés au user ${appUserId}`);
    console.log(`📊 Crédits: ${user.credits} → ${updatedUser.credits}`);

    res.status(200).send("Webhook processed");
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    res.status(500).send("Server Error");
  }
};
```

---

## ✅ Solution 2 : S'assurer que Purchases.logIn() est appelé

### Vérifier dans authStore.ts

Le code actuel appelle `Purchases.logIn()` uniquement lors du login :

```typescript
// authStore.ts - fonction login
if (user?.id) {
  try {
    const isConfigured = await Purchases.isConfigured();
    if (isConfigured) {
      await Purchases.logIn(user.id.toString());
      console.log("🔗 RevenueCat lié à l'utilisateur :", user.id);
    }
  } catch (e) {
    console.error("Erreur liaison RevenueCat", e);
  }
}
```

**Problème :** Si l'utilisateur ouvre l'app et est déjà connecté (token en cache), `login()` n'est pas appelé, donc `Purchases.logIn()` non plus.

### Fix : Appeler Purchases.logIn() dans checkAuth aussi

```typescript
// authStore.ts - fonction checkAuth
checkAuth: async () => {
  try {
    // ... code existant ...

    if (token && refreshToken) {
      set({ token, refreshToken, isAuthenticated: true });

      // Charger les crédits depuis le cache local d'abord
      await useUserStore.getState().loadCredits();

      // Puis mettre à jour depuis l'API en background
      api
        .get("/auth/me")
        .then(async (res) => {
          set({ user: res.data });

          // Mettre à jour les crédits
          if (res.data.credits !== undefined) {
            useUserStore.getState().setCredits(res.data.credits);
          }

          // 🆕 IMPORTANT : Lier RevenueCat à l'utilisateur
          if (res.data.id) {
            try {
              const isConfigured = await Purchases.isConfigured();
              if (isConfigured) {
                await Purchases.logIn(res.data.id.toString());
                console.log("🔗 RevenueCat lié à l'utilisateur :", res.data.id);
              }
            } catch (e) {
              console.error("Erreur liaison RevenueCat", e);
            }
          }
        })
        .catch(() => null);
    } else {
      set({ isAuthenticated: false });
    }
  } catch (e) {
    console.error("checkAuth error:", e);
    set({ isAuthenticated: false });
  }
},
```

---

## ✅ Solution 3 : Restaurer les achats anonymes (optionnel)

Si un utilisateur a fait des achats avant de se connecter, RevenueCat peut restaurer ces achats.

### Ajouter une fonction dans useRevenueCat.ts

```typescript
const restorePurchases = async () => {
  try {
    console.log("🔄 Restoring purchases...");
    const purchaserInfo = await Purchases.restorePurchases();

    console.log("✅ Purchases restored:", purchaserInfo);

    // Forcer une mise à jour des crédits depuis le backend
    const response = await api.get("/auth/me");
    setCredits(response.data.credits);

    Alert.alert(
      "Achats restaurés",
      "Vos achats précédents ont été restaurés avec succès."
    );
  } catch (error) {
    console.error("❌ Restore purchases error:", error);
    Alert.alert(
      "Erreur",
      "Impossible de restaurer les achats."
    );
  }
};

return { packages, isPurchasing, buyPackage, restorePurchases };
```

---

## 🧪 Tests à effectuer

### Test 1 : Achat avec utilisateur connecté

1. ✅ Se connecter à l'app
2. ✅ Vérifier dans les logs : "🔗 RevenueCat lié à l'utilisateur : [UUID]"
3. ✅ Acheter un package
4. ✅ Vérifier que le webhook reçoit le vrai UUID (pas $RCAnonymousID)
5. ✅ Vérifier que les crédits sont ajoutés

### Test 2 : Achat en mode anonyme (cas edge)

1. Désinstaller l'app
2. Réinstaller et ouvrir SANS se connecter
3. Tester un achat
4. ✅ Le webhook devrait logger "⚠️ Achat anonyme détecté"
5. Se connecter ensuite
6. Appeler `restorePurchases()` pour récupérer l'achat

---

## 📋 Checklist de déploiement

- [ ] Corriger le bug `includes` dans webhookController.js
- [ ] Ajouter la détection des achats anonymes
- [ ] Ajouter `Purchases.logIn()` dans `checkAuth()`
- [ ] Tester avec un achat réel en sandbox
- [ ] Vérifier les logs webhook (doit afficher l'UUID réel)
- [ ] Vérifier que les crédits sont bien ajoutés en BDD

---

## 🔍 Debug : Comment vérifier que RevenueCat est bien lié

### Dans l'app (après login)

```typescript
// Ajouter temporairement dans authStore.ts après Purchases.logIn()
const customerInfo = await Purchases.getCustomerInfo();
console.log("👤 RevenueCat User ID:", customerInfo.originalAppUserId);
console.log("📧 Email:", customerInfo.email);
```

### Vérifier dans le webhook

Le champ `app_user_id` devrait être un UUID, pas `$RCAnonymousID:...`

**Correct :**
```json
"app_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

**Incorrect :**
```json
"app_user_id": "$RCAnonymousID:baaf0528b39b46b0a60e05ec1e25ca69"
```

---

## 🚀 Résumé

**Problème :** RevenueCat n'est pas lié à l'utilisateur réel
**Cause :** `Purchases.logIn()` n'est pas appelé au bon moment
**Solution :** Appeler `Purchases.logIn()` dans `checkAuth()` aussi

Une fois corrigé, le webhook recevra le vrai UUID de l'utilisateur et pourra mettre à jour les crédits en BDD.
